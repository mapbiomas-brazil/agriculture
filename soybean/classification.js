// Set the path to the api.js script you copied to your GEE account:
var api = require('users/your_username/repository:utils/api.js');

// Set the path to the normalization.js script you copied to your GEE account:
var normalization = require("users/your_username/repository:utils/normalization.js");

/************* SETTINGS **************/

// set the output path for the classification results:
var outputCollection = 'users/your_username/MAPBIOMAS/C6/AGRICULTURE/SOYBEAN/RESULTS/RAW'

// set the years you want to classify:
var years = [2018, 2019, 2020];

var offset = 4;

var cloudCover = 90;

// set the WRS (path and row) you want to classify:
var tiles = [[220, 69], [220, 68]]

var bands = [
  api.Band.GREEN,
  api.Band.RED,
  api.Band.NIR,
  api.Band.SWIR1,
  api.Band.SWIR2,
  api.Band.TIR1,
  api.Band.EVI2,
  api.Band.NDWI,
  api.Band.CAI
]

var reducers = [
  api.Reducer.QMO(api.Band.EVI2),
  api.Reducer.MAX,
  api.Reducer.MIN,
  api.Reducer.MEDIAN,
  api.Reducer.STDV,
  api.Reducer.MEAN
]

// set the periods of the region you want to classify 
// more information about that you can read on the **ATBD Agriculture Appendix** (LINK)
var periods = {
  'AC_WET': '(Y-1)-11-15,(Y)-06-15',
  'AC_DRY': '(Y-1)-10-15,(Y-1)-12-15',
  'AC_ANNUAL': '(Y-1)-06-15,(Y)-06-15',

  'SB_WET_M1': '(Y-1)-11-15,(Y-1)-12-15',
  'SB_WET_M2': '(Y-1)-12-15,(Y)-01-15',
  'SB_WET_M3': '(Y)-01-15,(Y)-02-15',
  'SB_WET_M4': '(Y)-02-15,(Y)-03-15',
  'SB_WET_M5': '(Y)-03-15,(Y)-04-15',

  'SB_WET_FT3': '(Y-1)-11-15,(Y)-01-17',
  'SB_WET_LT3': '(Y)-02-11,(Y)-04-15'
}

var featureSpace = [
  'AC_WET_NIR_qmo', 'AC_WET_SWIR1_qmo', 'AC_WET_EVI2_qmo',
  'AC_WET_RED_max', 'AC_WET_SWIR1_max', 'AC_WET_SWIR2_max', 'AC_WET_TIR1_max', 'AC_WET_EVI2_max', 'AC_WET_NDWI_max', 'AC_WET_CAI_max',
  'AC_WET_GREEN_min', 'AC_WET_SWIR1_min', 'AC_WET_EVI2_min', 'AC_WET_NDWI_min', 'AC_WET_CAI_min',
  'AC_WET_GREEN_median', 'AC_WET_RED_median', 'AC_WET_SWIR1_median', 'AC_WET_SWIR2_median', 'AC_WET_NDWI_median', 'AC_WET_CAI_median',
  'AC_WET_RED_stdDev', 'AC_WET_SWIR1_stdDev', 'AC_WET_SWIR2_stdDev', 'AC_WET_TIR1_stdDev', 'AC_WET_EVI2_stdDev', 'AC_WET_NDWI_stdDev', 'AC_WET_CAI_stdDev',
  'AC_DRY_NDWI_qmo', 'AC_DRY_CAI_qmo',
  'AC_DRY_RED_max', 'AC_DRY_SWIR1_max', 'AC_DRY_SWIR2_max', 'AC_DRY_NDWI_max', 'AC_DRY_CAI_max',
  'AC_DRY_RED_min', 'AC_DRY_SWIR2_min', 'AC_DRY_EVI2_min', 'AC_DRY_NDWI_min', 'AC_DRY_CAI_min',
  'AC_DRY_GREEN_median', 'AC_DRY_RED_median', 'AC_DRY_SWIR1_median', 'AC_DRY_SWIR2_median', 'AC_DRY_EVI2_median', 'AC_DRY_NDWI_median',
  'AC_DRY_SWIR1_stdDev', 'AC_DRY_NDWI_stdDev',

  'SB_WET_M1_RED_mean', 'SB_WET_M1_NIR_mean', 'SB_WET_M1_SWIR1_mean', 'SB_WET_M1_SWIR2_mean', 'SB_WET_M1_NDWI_mean', 'SB_WET_M1_EVI2_mean',
  'SB_WET_M2_RED_mean', 'SB_WET_M2_NIR_mean', 'SB_WET_M2_SWIR1_mean', 'SB_WET_M2_SWIR2_mean', 'SB_WET_M2_NDWI_mean', 'SB_WET_M2_EVI2_mean',
  'SB_WET_M3_RED_mean', 'SB_WET_M3_NIR_mean', 'SB_WET_M3_SWIR1_mean', 'SB_WET_M3_SWIR2_mean', 'SB_WET_M3_NDWI_mean', 'SB_WET_M3_EVI2_mean',
  'SB_WET_M4_RED_mean', 'SB_WET_M4_NIR_mean', 'SB_WET_M4_SWIR1_mean', 'SB_WET_M4_SWIR2_mean', 'SB_WET_M4_NDWI_mean', 'SB_WET_M4_EVI2_mean',
  'SB_WET_M5_RED_mean', 'SB_WET_M5_NIR_mean', 'SB_WET_M5_SWIR1_mean', 'SB_WET_M5_SWIR2_mean', 'SB_WET_M5_NDWI_mean', 'SB_WET_M5_EVI2_mean',
  'SB_WET_FT3_RED_median', 'SB_WET_FT3_NIR_median', 'SB_WET_FT3_SWIR1_median', 'SB_WET_FT3_SWIR2_median', 'SB_WET_FT3_NDWI_median', 'SB_WET_FT3_EVI2_median',
  'SB_WET_LT3_RED_median', 'SB_WET_LT3_NIR_median', 'SB_WET_LT3_SWIR1_median', 'SB_WET_LT3_SWIR2_median', 'SB_WET_LT3_NDWI_median', 'SB_WET_LT3_EVI2_median',
  'SB_WET_FT3_RED_mean', 'SB_WET_FT3_NIR_mean', 'SB_WET_FT3_SWIR1_mean', 'SB_WET_FT3_SWIR2_mean', 'SB_WET_FT3_NDWI_mean', 'SB_WET_FT3_EVI2_mean',
  'SB_WET_LT3_RED_mean', 'SB_WET_LT3_NIR_mean', 'SB_WET_LT3_SWIR1_mean', 'SB_WET_LT3_SWIR2_mean', 'SB_WET_LT3_NDWI_mean', 'SB_WET_LT3_EVI2_mean'
];

var extraFeatureSpace = [
  'ANNUAL_NIR_cei',
  'ANNUAL_EVI2_cei',
  'ANNUAL_NDWI_cei'
];

var gridCollection = ee.FeatureCollection("users/agrosatelite_mapbiomas/COLECAO_6/GRIDS/BRASIL_COMPLETO");

// Samples

var randomForestTrees = 100;

// set the path to the training samples:
var trainingSamples = ee.FeatureCollection("users/your_username/MAPBIOMAS/C6/AGRICULTURE/SOYBEAN/SAMPLES");

/************* END SETTINGS **************/
function filterCollection(year, path, row, startDate, endDate, cloudCover, bands) {
  if (year >= 2000) {
    return ee.ImageCollection(normalization.get16Dayproduct(path, row, startDate, endDate, cloudCover, bands))
      .map(function (image) {
        var cloudMask = image.select('QA_SCORE').eq(1);
        return ee.Image(image).updateMask(cloudMask);
      })
  } else {
    var collection = ee.ImageCollection("LANDSAT/LT05/C01/T1_TOA")
      .filterDate(startDate, endDate)
      .filter(ee.Filter.and(
        ee.Filter.eq("WRS_PATH", path),
        ee.Filter.eq("WRS_ROW", row),
        ee.Filter.lte("CLOUD_COVER", cloudCover)
      ))

    return new api.ImageCollection(collection)
      .applyBuffer(-4200)
      .removeClouds()
      .buildBands(bands);

  }
}

/************** MOSAIC GENERATION ***************/

years.forEach(function (year) {

  var startDate = (year - (1 + offset)) + "-06-15";
  var endDate = year + "-06-15";

  tiles.forEach(function (tile) {
    var path = tile[0];
    var row = tile[1];

    var roi = gridCollection
      .filterMetadata('PATH', "equals", path)
      .filterMetadata('ROW', "equals", row)
      .first()
      .geometry()
      .buffer(-4200);

    var filteredCollection = filterCollection(year, path, row, startDate, endDate, cloudCover, null)

    var images = [];

    for (var periodName in periods) {
      var period = periods[periodName];

      var apiImage = new api.ImageCollection(filteredCollection)
        .filterByPeriod(year, period, offset, cloudCover)
        .buildBands(bands)
        .applyReducers(reducers);

      var eeImage = apiImage.getEEImage()

      eeImage = eeImage.rename(ee.Image(eeImage).bandNames().map(function (band) {
        return ee.String(periodName).cat('_').cat(band);
      }));

      eeImage = eeImage.float();

      images.push(eeImage);
    }

    var mosaic = ee.Image.cat(images).clip(roi)

    var cei = mosaic.expression('1000000 * (WET_max - DRY_min) / (1000000 + WET_max + 1000000 + DRY_min)', {
      'WET_max': mosaic.select(['AC_WET_NIR_qmo', 'AC_WET_EVI2_qmo', 'AC_WET_NDWI_qmo']),
      'DRY_min': mosaic.select(['AC_DRY_NIR_min', 'AC_DRY_EVI2_min', 'AC_DRY_NDWI_min']),
    }).rename(['ANNUAL_NIR_cei', 'ANNUAL_EVI2_cei', 'ANNUAL_NDWI_cei'])
      .int16();

    mosaic = mosaic.addBands(cei)

    var avaliableFeatureSpace = ee.List(featureSpace.concat(extraFeatureSpace))
      .filter(ee.Filter.inList("item", mosaic.bandNames()))

    mosaic = mosaic.select(avaliableFeatureSpace).unmask()

    // Training //

    var training = trainingSamples.filterBounds(roi.buffer(100000))

    var classifier = ee.Classifier
      .smileRandomForest(randomForestTrees)
      .train(training, 'class', avaliableFeatureSpace);

    // Classification //

    var classified = mosaic.classify(classifier)
      .set('year', year)
      .rename(['classification'])

    // Visualization //
    var filename = year + '_' + path + '_' + row;

    Map.addLayer(mosaic, { bands: ['AC_WET_NIR_qmo', 'AC_WET_SWIR1_qmo', 'AC_WET_RED_max'], min: 0, max: 0.5 }, 'Mosaic ' + filename);
    Map.addLayer(classified, { min: 0, max: 1 }, 'Classification ' + filename, false);

    // Exporting Results //
    Export.image.toAsset({
      image: classified.byte(),
      description: 'SOYBEAN_' + filename,
      assetId: outputCollection + '/' + filename,
      region: roi,
      scale: 30,
      maxPixels: 1.0E13
    })

  })
})