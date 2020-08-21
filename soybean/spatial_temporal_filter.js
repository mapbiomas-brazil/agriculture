// set the input path to the raw classification result:
var input = 'users/yout_username/MAPBIOMAS/C5/AGRICLUTURE/SOYBEAN/RESULTS/RAW'

// set the path for the filtered result:
var output = 'users/yout_username/MAPBIOMAS/C5/AGRICLUTURE/SOYBEAN/SOYBEAN/RESULTS/TEMPORAL_SPATIAL_FILTERED'

// set the years interval you want to filter:
var startYear = 2017
var endYear = 2019

var results = ee.List.sequence(startYear, endYear)
	.map(function(year) {
		var yearlyMosaic = ee.ImageCollection(input)
      .filterMetadata('year', 'equals', year)
      .or()
      .set('year', year);

		return yearlyMosaic
	})

results = ee.ImageCollection(results)

var brasilMask = ee.Image("users/agrosatelite_mapbiomas/COLECAO_5/PUBLIC/GRIDS/BIOMAS_IBGE_250K_BUFFER");

var offsets = [1, 1]
var threshold = 2
var thresholdFirstYear = 2
var thresholdLastYear = 1

var kernelGrid = [
  [1, 1, 1, 1, 1],
  [1, 2, 2, 2, 1],
  [1, 2, 2, 2, 1],
  [1, 2, 2, 2, 1],
  [1, 1, 1, 1, 1]
]
          
var kernel = ee.Kernel.fixed(5, 5, kernelGrid, -2, -2, false)

/*
 * Functions
 */


function getWindow(col, year, offsets) {
  var start = year.subtract(offsets[0])
  var end = year.add(offsets[1])
  
  return col.filter(ee.Filter.rangeContains('year', start, end))
}

function applySpatialFilter(thisYear) {
  var filtered = thisYear.unmask().convolve(kernel).gte(15).unmask()
  return ee.Image(filtered).set('year', thisYear.getNumber('year'))
}

function applyTemporalFilter(threshold) {
  return function (thisYear, processed) {
    thisYear = ee.Image(thisYear).unmask()
    processed = ee.ImageCollection(processed)    
    
    var year = thisYear.getNumber('year')
    
    var window = getWindow(processed, year, offsets)
    var sum = window.sum().unmask()
    
    var filtered = sum.unmask().gte(threshold).set('year', year)
    
    return processed
      .filterMetadata('year', 'not_equals', year)
      .merge(ee.ImageCollection([ filtered ]))
  }
}

function toBands(collection) {
  var renamedBands = collection.map(function(image) {
    var year = image.getNumber('year').int()
    return image.rename(ee.String(year))
  })
  
  var image = renamedBands.toBands()
  
  var newNames = image.bandNames().map(function(name) {
    return ee.String('classification_').cat(ee.String(name).split('_').getString(-1))
    // return ee.String(name).split('_').getString(-1)
  })
  
  return image.rename(newNames)
    .select(newNames.sort())
}

function filterByYear(collection, year) {
  return collection.filterMetadata('year', 'equals', year).first()
}

/*
 * Post processing
 */

var spatialFiltered = results.map(applySpatialFilter).sort('year')

var firstYear = filterByYear(spatialFiltered, startYear)
var lastYear = filterByYear(spatialFiltered, endYear)

var temporalFiltered1 = ee.ImageCollection(
  spatialFiltered
    .filter(ee.Filter.rangeContains('year', startYear + 1, endYear - 1))
    .iterate(applyTemporalFilter(threshold), spatialFiltered)
)

var temporalFiltered2 = ee.ImageCollection(
  spatialFiltered
    .filterMetadata('year', 'equals', startYear)
    .iterate(applyTemporalFilter(thresholdFirstYear), temporalFiltered1)
)

var temporalFiltered3 = ee.ImageCollection(
  spatialFiltered
    .filterMetadata('year', 'equals', endYear)
    .iterate(applyTemporalFilter(thresholdLastYear), temporalFiltered2)
)

spatialFiltered = toBands(spatialFiltered)

var finalResult = toBands(temporalFiltered3)
var rawResult = toBands(results).unmask()

var vis = {
  bands: ['classification_' + endYear],
  min: 0,
  max: 1,
  palette: ['WHITE', 'BLACK'],
  format: 'png'
}

Map.addLayer(rawResult.unmask(), vis, 'Raw')
Map.addLayer(finalResult.unmask(), vis, 'Temporal-Spatial Filtered')

Export.image.toAsset({
  image: finalResult, 
  description: 'SOYBEAN_POST_PROCESSING', 
  assetId: output, 
  region: brasilMask.geometry(), 
  scale: 30, 
  maxPixels: 10e10
})
