// set the path to the api.js script you copied to your GEE account:
var api = require('users/your_username/repository_name:utils/api.js');

/************* SETTINGS **************/

// set the output path for the classification results:
var outputCollection = 'users/your_username/MAPBIOMAS/C5/AGRICULTURE/TEMPORARY_PERENNIAL/RESULTS/RAW';

// set the years you want to classify:
var years = [2018];

var cloudCover = 90;

var offset = 2;

// set the WRS (path and row) you want to classify:
var tiles = [[221, 74]];

var bands = [
  api.Band.BLUE, 
  api.Band.GREEN, 
  api.Band.RED, 
  api.Band.NIR, 
  api.Band.SWIR1, 
  api.Band.SWIR2, 
  api.Band.EVI2, 
  api.Band.TIR1, 
  api.Band.NDWI, 
  api.Band.CAI
]

var reducers = [
  api.Reducer.QMO(api.Band.EVI2), 
  api.Reducer.MAX, 
  api.Reducer.MIN, 
  api.Reducer.MEDIAN, 
  api.Reducer.STDV
]

// set the periods of the region you want to classify 
// more information about that you can read on the ATBD Agriculture Appendix
var periods = {
  'WET': '(Y-1)-11-15,(Y)-06-15', 
  'DRY': '(Y-1)-10-15,(Y-1)-12-15'
} //WET and DRY

var featureSpace = [
  'WET_NIR_qmo', 'WET_SWIR1_qmo', 'WET_EVI2_qmo',
  'WET_RED_max', 'WET_SWIR1_max', 'WET_SWIR2_max', 'WET_TIR1_max', 'WET_EVI2_max', 'WET_NDWI_max' , 'WET_CAI_max',
  'WET_GREEN_min','WET_SWIR1_min', 'WET_EVI2_min', 'WET_NDWI_min', 'WET_CAI_min',
  'WET_GREEN_median', 'WET_RED_median', 'WET_SWIR1_median', 'WET_SWIR2_median', 'WET_NDWI_median', 'WET_CAI_median',
  'WET_RED_stdDev', 'WET_SWIR1_stdDev', 'WET_SWIR2_stdDev', 'WET_TIR1_stdDev', 'WET_EVI2_stdDev', 'WET_NDWI_stdDev', 'WET_CAI_stdDev',
  'DRY_NDWI_qmo','DRY_CAI_qmo', 
  'DRY_RED_max', 'DRY_SWIR1_max', 'DRY_SWIR2_max', 'DRY_NDWI_max', 'DRY_CAI_max',
  'DRY_RED_min', 'DRY_SWIR2_min', 'DRY_EVI2_min', 'DRY_NDWI_min', 'DRY_CAI_min', 
  'DRY_BLUE_median' , 'DRY_GREEN_median', 'DRY_RED_median', 'DRY_SWIR1_median', 'DRY_SWIR2_median', 'DRY_EVI2_median','DRY_NDWI_median', 
  'DRY_SWIR1_stdDev', 'DRY_NDWI_stdDev',
]

var extraFeatureSpace = [
  'ANNUAL_NIR_cei', 
  'ANNUAL_EVI2_cei', 
  'ANNUAL_NDWI_cei'
];

// set the collection you want to use to create the mosaics:
var imageCollection = ee.ImageCollection("LANDSAT/LC08/C01/T1_TOA");

// set the path to you reference map that will be used for sampling
var referenceCollection = ee.ImageCollection("users/your_username/MAPBIOMAS/C5/AGRICULTURE/TEMPORARY_PERENNIAL/REFERENCE_MAP");

var gridCollection = ee.FeatureCollection("users/agrosatelite_mapbiomas/COLECAO_5/PUBLIC/GRIDS/BRASIL");

var trainingSamples = 10000;

var randomForestTrees = 100;

/************* END SETTINGS **************/

/************* FUNCTIONS **************/

years.forEach(function(year){
  tiles.forEach(function(wrs){
    
    // Geração dos Mosaicos
    
    var filteredCollection = imageCollection
      .filterMetadata('WRS_PATH', "equals", wrs[0])
      .filterMetadata('WRS_ROW', "equals", wrs[1]);
      
    var roi = gridCollection
      .filterMetadata('PATH', "equals", wrs[0])
      .filterMetadata('ROW', "equals", wrs[1])
      .first()
      .geometry()
      .buffer(-4000);

    var images = [];
    
    for(var period in periods){
      var dates = periods[period];
      
      var apiImagesByPeriod = new api.ImageCollection(filteredCollection)
        .filterByPeriod(year, dates, offset, cloudCover)
        .applyBuffer(-4200)
        .removeClouds()
        .buildBands(bands);
      
      var apiImage = apiImagesByPeriod
        .applyReducers(reducers);
      
      var eeImage = apiImage.getEEImage();
      
      eeImage = eeImage.rename(ee.Image(eeImage).bandNames().map(function(band){
        return ee.String(period).cat('_').cat(band);
      }));
      
      images.push(eeImage);
    }
    
    var mosaic = ee.Image.cat(images).unmask(null);
    
    var cei   = mosaic.expression('100*(WET_max - DRY_min) / (100+WET_max + 100+DRY_min)', {
      'WET_max': mosaic.select(['WET_NIR_qmo', 'WET_EVI2_qmo', 'WET_NDWI_qmo']),
      'DRY_min': mosaic.select(['DRY_NIR_min', 'DRY_EVI2_min', 'DRY_NDWI_min']),
    }).rename(['ANNUAL_NIR_cei', 'ANNUAL_EVI2_cei', 'ANNUAL_NDWI_cei']);
    
    
    mosaic = mosaic
      .addBands(cei)
    
    var filename = " " + wrs[0]+ wrs[1]  +  '_' + year;
    var mosaicFilename = filename + "_mosaic";
    
    Map.addLayer(mosaic, {bands: ['WET_NIR_qmo', 'WET_SWIR1_qmo', 'WET_RED_qmo'], min: 0, max: 0.5}, mosaicFilename);
    
    mosaic = mosaic
      .select(featureSpace.concat(extraFeatureSpace))
      .multiply(10000)
      .clip(roi);
 
    // Sampling //
    
    var reference = referenceCollection
      .filterMetadata('year', 'equals', year)
      .mosaic()
      .unmask(null);
      
    var train = mosaic
      .addBands(reference.select([0], ["class"]));
      
    var training = train.sample({
      'region': roi,
      'scale': 30,
      'numPixels': trainingSamples,
      'tileScale': 4
    });
    
    // Training //

    var classifier = ee.Classifier
      .randomForest(randomForestTrees)
      .train(training, 'class', featureSpace.concat(extraFeatureSpace));
    

    // Classification //
    
    var classified = mosaic.classify(classifier)
  	  .set('year', year)
  	  .rename(['classification'])

    
    // Visualizing results //
     
    var referenceFilename = filename + "_reference";
    var classificationFilename = filename + "_classification";
    
    Map.addLayer(reference, {min: 0, max: 1},referenceFilename, false);
    Map.addLayer(classified, {min: 0, max: 1}, classificationFilename, false);
    
    // Exporting Results //
    
    roi.evaluate(function(geometry){
      
      var filename = year + '_' + wrs[0] + '_' + wrs[1];

      Export.image.toAsset({
        image: classified.byte(), 
        description: 'temporary_perennial_' + filename, 
        assetId: outputCollection + '/' + filename, 
        region: geometry, 
        scale: 30, 
        maxPixels: 1.0E13
      });

    });
    
  });
});

/************* END FUNCTIONS **************/