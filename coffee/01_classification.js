/**
 * @name
 *      COFFEE CLASSIFICATION C7
 * 
 * @description
 *      Classification script for MapBiomas Collection 9 Coffee class.
 * 
 * @author
 *      Remap
 *      mapbiomas@remapgeo.com
 *
 * @version
 *  MapBiomas Collection 9.0
 *   
 */



// Set the path to the normalization.js script you copied to your GEE account:
var getNormalizedCollection = require("users/your_user/your_repository:utils/normalization.js").getNormalizedCollection;
 

// ============================================================================
//                                  IMPORTS
// ============================================================================

// Landsat Grid Collection (with peak vegetation month as a property) 
var gridCollection = ee.FeatureCollection("users/mapbiomas1/PUBLIC/GRIDS/BRASIL_COMPLETO_PEAK")

// Subtiles for stratified sampling
var SubTile = ee.FeatureCollection("users/mapbiomas1/PUBLIC/GRIDS/SUBTILES")

// ============================================================================
//                                  SETTINGS
// ============================================================================

// set the output path for the classification results:
var outputCollection = 'users/your_username/MAPBIOMAS/C7/AGRICULTURE/COFFEE/RESULTS/RAW/'

// set the years you want to classify:
var years = [2020];

var cloudCover = 80;

var imagesLimit = 10;

var randomForestTrees = 100; 

var trainingSamplesNumber = 10000;

// set the WRS (path and row) you want to classify:
var tiles = [ [221, 76], [221, 75], [221, 74] ]

var bands = ['BLUE', 'GREEN', 'RED', 'NIR', 'SWIR1', 'SWIR2']
var indexes = ['EVI2', 'NDWI']


var reducers = ee.Reducer.median()
  .combine(ee.Reducer.mean(), null, true)
  .combine(ee.Reducer.max(), null, true)
  .combine(ee.Reducer.min(), null, true)
  .combine(ee.Reducer.stdDev(), null, true)
  .combine(ee.Reducer.percentile([20,80]), null, true)


var featureSpace = [
    'BLUE_mean', 'GREEN_mean', 'RED_mean', 'NIR_mean', 'SWIR1_mean', 'SWIR2_mean',
    'EVI2_mean', 'NDWI_mean',

    'BLUE_stdDev', 'GREEN_stdDev', 'RED_stdDev', 'NIR_stdDev', 'SWIR1_stdDev', 'SWIR2_stdDev',
    'EVI2_stdDev', 'NDWI_stdDev',

    'BLUE_min', 'GREEN_min', 'RED_min', 'NIR_min', 'SWIR1_min', 'SWIR2_min',
    'EVI2_min', 'NDWI_min',

    'BLUE_p20', 'GREEN_p20', 'RED_p20', 'NIR_p20', 'SWIR1_p20', 'SWIR2_p20',
    'EVI2_p20', 'NDWI_p20',

    'BLUE_median', 'GREEN_median', 'RED_median', 'NIR_median', 'SWIR1_median', 'SWIR2_median',
    'EVI2_median', 'NDWI_median',

    'BLUE_p80', 'GREEN_p80', 'RED_p80', 'NIR_p80', 'SWIR1_p80', 'SWIR2_p80',
    'EVI2_p80', 'NDWI_p80',

    'BLUE_max', 'GREEN_max', 'RED_max', 'NIR_max', 'SWIR1_max', 'SWIR2_max',
    'EVI2_max', 'NDWI_max',

    'BLUE_qmo', 'GREEN_qmo', 'RED_qmo', 'NIR_qmo', 'SWIR1_qmo', 'SWIR2_qmo', 
    'EVI2_qmo', 'NDWI_qmo'
];



// ============================================================================
//                                  FUNCTIONS
// ============================================================================

function addSuffix(sufix) {
  return function(bandName) {
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

function calcArea(geom, image) {
  return image.multiply(ee.Image.pixelArea()).multiply(0.0001).reduceRegions({
    collection: geom,
    reducer: ee.Reducer.sum(),
    scale: 30,
  });
}

// ============================================================================
//                                  MOSAIC
// ============================================================================

years.forEach(function(year) {
 
  var startDate = ee.Date.fromYMD(year, 1, 1);
  var endDate = ee.Date.fromYMD(year + 1, 1, 1);
  
  tiles.forEach(function(tile) {
    var path = tile[0];
    var row = tile[1];

    var roi = gridCollection
      .filterMetadata('PATH', "equals", path)
      .filterMetadata('ROW', "equals", row)
      .first()
      .geometry()
      .buffer(-4200);
    
    var collection = ee.ImageCollection(getNormalizedCollection(roi.centroid(30), startDate, endDate, cloudCover, bands, true))

    collection = collection.map(function(image) {
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
  
  
  // ============================================================================
  //                        STRARTIFIED SAMPLING
  // ============================================================================

    
    // Reference map for sampling
    // **NOTE: the reference map used for MapBiomas coffee is not public.
    //         The MapBiomas classification is used here as an example. 
    var reference = ee.Image('projects/mapbiomas-workspace/public/collection6/mapbiomas_collection60_integration_v1')
                            .select('classification_'+year)
                            .remap([46], [1]) // Coffee
   
   var arearoi = roi.area().divide(1e4);

    var subtiles = SubTile.filterBounds(roi);
    
    Map.addLayer(subtiles,{},'subtiles', false)

    var reference = reference
      .unmask()
      .clip(roi);
    var noncoffee = reference.eq(0);
    var coffee = reference.eq(1);

    var area_coffee = calcArea(subtiles, coffee);
    var area_noncoffee = calcArea(subtiles, noncoffee);

    var area_coffee = area_coffee.select(["Id", "sum"], ["Id", "coffee"]);
    var area_noncoffee = area_noncoffee.select(
      ["Id", "sum"],
      ["Id", "noncoffee"]
    );

    // Attempt a join
    var toyFilter = ee.Filter.equals({
      leftField: "Id",
      rightField: "Id",
    });

    var innerJoin = ee.Join.inner();
    var toyJoin = innerJoin.apply(area_coffee, area_noncoffee, toyFilter);

    var totalAreas = toyJoin.map(function (pair) {
      var f1 = ee.Feature(pair.get("primary"));
      var f2 = ee.Feature(pair.get("secondary"));
      return f1.set(f2.toDictionary());
    });

    var sumAreas = totalAreas.map(function (feature) {
      return feature.set(
        "total",
        ee
          .Number(feature.get("coffee"))
          .add(ee.Number(feature.get("noncoffee")))
      );
    }); 
    
    var percent_area_subtile = sumAreas
      .map(function (feature) {
        var new_feat_percCoffee = feature.set(
          "percentual_coffee",
          ee
            .Number(feature.get("coffee"))
            .divide(ee.Number(feature.get("total")))
            .add(0.1)
        );
        var new_feat_perNonCoffee = new_feat_percCoffee.set(
          "percentual_noncoffee",
          ee
            .Number(new_feat_percCoffee.get("noncoffee"))
            .divide(ee.Number(new_feat_percCoffee.get("total")))
            .subtract(0.1)
        );
        var new_total = new_feat_perNonCoffee.set(
          "percentual_tile",
          ee
            .Number(new_feat_perNonCoffee.get("total"))
            .divide(ee.Number(arearoi))
        );
        return new_total;
      })
    
    // Samples  //
    var train = mosaic
      .unmask()
      .addBands(reference.select([0], ["class"]).unmask());

    var trainingSamples = percent_area_subtile
      .map(function (subtile) {
        var areas = ee.Dictionary({
          interest: subtile.get("percentual_coffee"),
          other: subtile.get("percentual_noncoffee"),
        });

        var trainingSamplesSubTile = ee
          .Number(trainingSamplesNumber)
          .multiply(ee.Number(subtile.get("percentual_tile")));
        var interest = ee.Number(areas.get("interest"));
        var other = ee.Number(areas.get("other"));
        var sample = ee.Number(trainingSamplesSubTile);

        var samples = train.stratifiedSample({
          numPoints: 1,
          classBand: "class",
          region: subtile.geometry(),
          scale: 30,
          seed: 11,
          classValues: [0, 1],
          classPoints: [
            sample.multiply(other).int(),
            sample.multiply(interest).int(),
          ],
          tileScale: 4,
          geometries: true,
        });
        return samples;
      })
      .flatten();

    var training = trainingSamples.filterBounds(roi.buffer(100000))
    var classifier = ee.Classifier
      .smileRandomForest(randomForestTrees)
      .train(training, 'class', featureSpace);

    // Classification //
    
    var classified = mosaic.classify(classifier)
      .set('year', year)
      .rename(['classification'])

    // Visualization //
    var filename = year + '_' + path + '' + row;
    
    Map.addLayer(mosaic, {bands: ['NIR_median', 'SWIR1_median', 'RED_median'], min: 0, max: 5000}, 'Mosaic ' + filename);
    Map.addLayer(classified, {min: 0, max: 1}, 'Classification ' + filename, false);

    // Exporting Results //
    

    Export.image.toAsset({
      image: classified.byte(), 
      description: 'COFFEE_RAW_' + filename, 
      assetId: outputCollection + filename, 
      region: roi, 
      scale: 30, 
      maxPixels: 1.0E13
    })
    
  })
})