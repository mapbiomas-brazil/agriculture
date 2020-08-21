// set the path to the api.js script you copied to your GEE account:
var api = require('users/your_username/repository_name:utils/api.js');

// set the path to the normalization.js script you copied to your GEE account:
var normalization = require("users/your_username/repository:utils/normalization.js");
 
/************* SETTINGS **************/

// set the input path to the filtered classification result:
var input = 'users/your_username/MAPBIOMAS/C5/AGRICULTURE/TEMPORARY_PERENNIAL/RESULTS/TEMPORAL_SPATIAL_FILTERED'

// set the output path for the classification results:
var outputCollection = 'users/your_username/MAPBIOMAS/C5/AGRICULTURE/TEMPORARY_PERENNIAL/RESULTS/SEPARATION'

// set the years you want to classify:
var years = [2016, 2017, 2018];

var offset = 1;

var cloudCover = 90;

// set the WRS (path and row) you want to classify:
var tiles = [ [221, 74] ]

var bands = [
  api.Band.RED, 
  api.Band.NIR, 
  api.Band.SWIR1,
  api.Band.EVI2,
  api.Band.NDWI, 
]

var reducers = [
  api.Reducer.QMO(api.Band.EVI2), 
  api.Reducer.MAX, 
  api.Reducer.MIN, 
  api.Reducer.MEDIAN,
  api.Reducer.STDV,
  api.Reducer.MEAN,
  api.Reducer.PERCENTILE([10, 90])
]

//set the periods of the region you want to classify
// more information about that you can read on the ATBD Agriculture Appendix
var periods = {
  'AC_WET': '(Y-1)-10-15,(Y)-06-15', 
  'AC_DRY': '(Y-1)-06-15,(Y-1)-12-15',

  'PER_ANNUAL': '(Y-1)-06-15,(Y)-06-15'
}

var featureSpace = [
    'PER_ANNUAL_EVI2_stdDev', 'PER_ANNUAL_EVI2_min', 'PER_ANNUAL_EVI2_p10', 'PER_ANNUAL_EVI2_median', 
    'PER_ANNUAL_EVI2_mean', 'AC_DRY_EVI2_min',  'AC_WET_NDWI_stdDev', 'AC_WET_EVI2_stdDev', 'AC_WET_NDWI_min',
];

var extraFeatureSpace = [
  'ANNUAL_NIR_cei', 
  'ANNUAL_EVI2_cei', 
  'ANNUAL_NDWI_cei'
];

var amplitude = [
  'EVI2',
]

var gridCollection = ee.FeatureCollection("users/agrosatelite_mapbiomas/COLECAO_5/PUBLIC/GRIDS/BRASIL");

var agriculture = ee.Image(input)

// Samples
var randomForestTrees = 100; 

// set the path to your training samples:
var trainingSamples = ee.FeatureCollection("users/your_username/MAPBIOMAS/C5/AGRICULTURE/TEMPORARY_PERENNIAL/SAMPLES");

/************* END SETTINGS **************/

var concat = function(stringList, prefix, sufix) {
  prefix = ee.String(prefix)
  sufix = ee.String(sufix)
  
  var result = ee.List(stringList).iterate(function(string, list) {
    var newString = prefix.cat(string).cat(sufix)
    
    return ee.List(list).add(newString)
  }, ee.List([]))
  
  return result
}


/************** MOSAIC GENERATION ***************/

years.forEach(function(year) {
 
  var startDate = (year - (1 + offset) ) + "-06-15";
  var endDate = year + "-06-15";

  tiles.forEach(function(tile) {
    var path = tile[0];
    var row = tile[1];

    var roi = gridCollection
      .filterMetadata('PATH', "equals", path)
      .filterMetadata('ROW', "equals", row)
      .first()
      .geometry()
      .buffer(-4200);
    
    var filteredCollection = ee.ImageCollection(
      normalization.get16Dayproduct(
        path, 
        row, 
        startDate, 
        endDate, 
        cloudCover, 
        ["BLUE", "RED", "NIR", "SWIR1", "SWIR2"]
      ))
      .map(function (image) {
        var cloudMask = image.select('QF').eq(1);
        return ee.Image(image).updateMask(cloudMask);
      })

    var images = [];
    
    for (var periodName in periods) {
      var period = periods[periodName];

      var apiImage = new api.ImageCollection(filteredCollection)
        .filterByPeriod(year, period, offset, cloudCover)
        .buildBands(bands)
        .applyReducers(reducers);

      var eeImage = apiImage.getEEImage()
      
      eeImage = eeImage.rename(ee.Image(eeImage).bandNames().map(function(band){
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
    
    mosaic = mosaic.addBands(cei);
    
    if (amplitude.length > 0) {
      var ampMosaic = mosaic.expression({
          expression: 'MAX - MIN', 
          map: {
            MIN: mosaic.select(concat(amplitude, 'AC_DRY_', '_p10')),
            MAX: mosaic.select(concat(amplitude, 'AC_WET_', '_p90'))
          }
        })
        .rename(concat(amplitude, 'ANNUAL_', '_amplitude'))
        .int16();
        
      mosaic = mosaic.addBands(ampMosaic)
    } 
    
    mosaic = mosaic
      .select(featureSpace.concat(extraFeatureSpace))
      .unmask()

    var agricultureMask = agriculture.select('.*' + year + '.*')
      .eq(1)
      .unmask()


    // Training //

    var training = trainingSamples.filterBounds(roi.buffer(100000))

    var classifier = ee.Classifier
      .randomForest(randomForestTrees)
      .train(training, 'class', featureSpace.concat(extraFeatureSpace));

    // Classification //
    
    var classified = mosaic
      .updateMask(agricultureMask)
      .classify(classifier)
      .set('year', year)
      .rename(['classification'])


    // Visualization //
    var filename = year + '_' + path + '_' + row;
    
    Map.addLayer(mosaic.updateMask(agricultureMask), {min: 0, max: 1, bands: ['PER_ANNUAL_EVI2_stdDev'], palette: ['RED', 'ORANGE', 'YELLOW', 'GREEN']}, 'Mosaic ' + filename);
    Map.addLayer(classified, {min: 0, max: 3, palette: ['WHITE', 'RED', 'BLUE']}, 'Classification ' + filename, false);
    
    // Exporting Results //
    
    roi.evaluate(function(geometry){
      var filename = year + '_' + path + '_' + row;

      Export.image.toAsset({
        image: classified.byte(), 
        description: 'CROPS_SEPARATION_' + filename, 
        assetId: outputCollection + '/' + filename, 
        region: geometry, 
        scale: 30, 
        maxPixels: 1.0E13
      })
    });  
    
  })
})
