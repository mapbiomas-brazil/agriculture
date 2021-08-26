// Set the path to the normalization.js script you copied to your GEE account:
var getNormalizedCollection = require("users/your_username/repository:utils/normalization.js").getNormalizedCollection;

/************* SETTINGS **************/

// set the output path for the classification results:
var outputCollection = 'users/your_username/MAPBIOMAS/C6/AGRICULTURE/COFFEE/RESULTS/RAW'

// set the years you want to classify:
var years = [2016, 2017, 2018, 2019, 2020];

var cloudCover = 80;

var imagesLimit = 10;

// set the WRS (path and row) you want to classify:
var tiles = [[220, 73], [220, 74]]

var bands = ['BLUE', 'GREEN', 'RED', 'NIR', 'SWIR1', 'SWIR2']
var indexes = ['EVI2', 'NDWI']


var reducers = ee.Reducer.median()
  .combine(ee.Reducer.max(), null, true)
  .combine(ee.Reducer.percentile([80]), null, true)


var featureSpace = [
  'GREEN_median', 'RED_median', 'NIR_median', 'SWIR1_median', 'SWIR2_median', 'EVI2_median', 'NDWI_median',
  'GREEN_p80', 'RED_p80', 'NIR_p80', 'SWIR1_p80', 'SWIR2_p80', 'EVI2_p80', 'NDWI_p80',
  'EVI2_max', 'NDWI_max',
  'GREEN_qmo', 'RED_qmo', 'NIR_qmo', 'SWIR1_qmo', 'SWIR2_qmo', 'EVI2_qmo', 'NDWI_qmo',
];

var gridCollection = ee.FeatureCollection("users/agrosatelite_mapbiomas/COLECAO_6/GRIDS/BRASIL_COMPLETO");

// Samples

var randomForestTrees = 100;

// set the path to the training samples:
var trainingSamples = ee.FeatureCollection("users/your_username/MAPBIOMAS/C6/AGRICULTURE/COFFEE/SAMPLES");

/************* END SETTINGS **************/

function addSuffix(sufix) {
  return function (bandName) {
    return ee.String(bandName).cat(sufix)
  }
}

function filterCollection(collection, spacecraft) {
  return collection
    .filterMetadata('SPACECRAFT_ID', 'equals', spacecraft)
    .limit(imagesLimit, "CLOUD_COVER_LAND")
}

function getMosaic(collection) {
  var bandNames = collection.first().bandNames()

  var qmo = collection
    .qualityMosaic("EVI2")
    .rename(bandNames.map(addSuffix("_qmo")))

  var mosaic = ee.ImageCollection(collection)
    .reduce(reducers)
    .addBands(qmo)
    .multiply(10000)
    .toInt16()

  return mosaic
}

/************** MOSAIC GENERATION ***************/

years.forEach(function (year) {

  var startDate = ee.Date.fromYMD(year, 1, 1);
  var endDate = ee.Date.fromYMD(year + 1, 1, 1);

  tiles.forEach(function (tile) {
    var path = tile[0];
    var row = tile[1];

    var roi = gridCollection
      .filterMetadata('PATH', "equals", path)
      .filterMetadata('ROW', "equals", row)
      .first()
      .geometry()
      .buffer(-4200);

    var collection = ee.ImageCollection(getNormalizedCollection(roi.centroid(30), startDate, endDate, cloudCover, bands, true))

    collection = collection.map(function (image) {
      var cloudMask = image.select("QA_SCORE").eq(1)

      var evi2 = image.expression('EVI2=2.5 * ((i.NIR - i.RED) / (i.NIR + 2.4*i.RED + 1))', { i: image })
      var ndwi = image.expression('NDWI=(i.NIR - i.SWIR1) / (i.NIR + i.SWIR1)', { i: image })

      return image
        .addBands(evi2)
        .addBands(ndwi)
        .updateMask(cloudMask)
        .select(bands.concat(indexes))
    })


    var L8Mosaic = getMosaic(filterCollection(collection, 'LANDSAT_8'))
    var L7Mosaic = getMosaic(filterCollection(collection, 'LANDSAT_7'))
    var L5Mosaic = getMosaic(filterCollection(collection, 'LANDSAT_5'))

    var mosaic = null

    if (year >= 2013) {
      mosaic = L8Mosaic.unmask(L7Mosaic)
    } else
      if (year == 2012) {
        mosaic = L7Mosaic
      } else
        if (year >= 2003 && year < 2012) {
          mosaic = L5Mosaic.unmask(L7Mosaic)
        } else
          if (year >= 2000 && year < 2003) {
            mosaic = L7Mosaic.unmask(L5Mosaic)
          } else
            if (year < 2000) {
              mosaic = L5Mosaic
            }

    mosaic = mosaic
      .clip(roi)
      .select(featureSpace)
      .unmask()

    // Training //

    var training = trainingSamples.filterBounds(roi.buffer(100000))

    var classifier = ee.Classifier
      .smileRandomForest(randomForestTrees)
      .train(training, 'class', featureSpace);

    // Classification //

    var classified = mosaic.classify(classifier)
      .set('year', year)
      .rename(['classification'])

    // Visualization //
    var filename = year + '_' + path + '_' + row;

    Map.addLayer(mosaic, { bands: ['NIR_median', 'SWIR1_median', 'RED_median'], min: 0, max: 5000 }, 'Mosaic ' + filename);
    Map.addLayer(classified, { min: 0, max: 1 }, 'Classification ' + filename, false);

    // Exporting Results //


    Export.image.toAsset({
      image: classified.byte(),
      description: 'COFFEE_' + filename,
      assetId: outputCollection + '/' + filename,
      region: roi,
      scale: 30,
      maxPixels: 1.0E13
    })

  })
})