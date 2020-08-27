// set the input path to the raw separation result:
var input = 'users/your_username/MAPBIOMAS/C5/AGRICULTURE/TEMPORARY_PERENNIAL/RESULTS/SEPARATION';

// set the path for the temporary crop filtered result:
var output = 'users/your_username/MAPBIOMAS/C5/AGRICULTURE/TEMPORARY_PERENNIAL/RESULTS/PERENNIAL_CROP_TEMPORAL_SPATIAL_FILTERED';

// set the pixel value of the perennial crop as noted on the crops separation map:
var classOfInterest = 2

// set the range of years you want to filter:
var startYear = 2016
var endYear = 2018

var results = ee.List.sequence(startYear, endYear)
	.map(function(year) {
		var yearlyMosaic = ee.ImageCollection(input)
      .filterMetadata('year', 'equals', year)
      .map(function(image) {
        return image.eq(classOfInterest)
      })
      .or()
      .set('year', year);

		return yearlyMosaic
	})

results = ee.ImageCollection(results)

var brasilMask = ee.Image("users/agrosatelite_mapbiomas/COLECAO_5/PUBLIC/GRIDS/BIOMAS_IBGE_250K_BUFFER");

// convert to perennial crop intervals of 1 year with 2 adjacent years of perennial crops
var incOffset = [1, 2]
var incThreshold = 2

// excludes intervals of perennial crops with less than 5 years
var excOffsets1 = [1, 4]

// excludes 2 years or less intervals of perennial crops in the beginning of the serie (1985-1986)
var excOffsets2 = [2, 2]
var excThreshold2 = 3

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

function applyTemporalInclusionFilter(offsets, threshold) {
  return function (thisYear, processed) {
    thisYear = ee.Image(thisYear).unmask()
    processed = ee.ImageCollection(processed)    
    
    var year = thisYear.getNumber('year')
    var window = getWindow(processed, year, offsets)
    
    var prior = window.filterMetadata('year', 'less_than', year)
    var next = window.filterMetadata('year', 'greater_than', year)
    
    var filtered = thisYear.unmask()
      .or(prior.and().unmask().and(next.or()))
      .set('year', year)
    
    return processed
      .filterMetadata('year', 'not_equals', year)
      .merge(ee.ImageCollection([ filtered ]))
  }
}

function applyTemporalExclusionFilter1(offsets) {
  return function(thisYear, processed) {
    thisYear = ee.Image(thisYear).unmask()
    processed = ee.ImageCollection(processed)    
    
    var year = thisYear.getNumber('year')
    var window = getWindow(processed, year, offsets)
    
    var prior = window.filterMetadata('year', 'less_than', year)
    var next = window.filterMetadata('year', 'greater_than', year)
    
    var filtered = thisYear.unmask().and(prior.and().unmask().or(next.and().unmask()))
      .set('year', year)
  
    return processed
      .filterMetadata('year', 'not_equals', year)
      .merge(ee.ImageCollection([ filtered ]))
  }
}

function applyTemporalExclusionFilter2(offsets, threshold) {
  return function(thisYear, processed) {
    thisYear = ee.Image(thisYear).unmask()
    processed = ee.ImageCollection(processed)    
    
    var year = thisYear.getNumber('year')
    var window = getWindow(processed, year, offsets)
    
    var filtered = thisYear.unmask().and(window.sum().unmask().gte(threshold))
      .set('year', year)
  
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

// temporal filter for inclusion
var filter = applyTemporalInclusionFilter(incOffset, incThreshold)
var temporalFiltered = ee.ImageCollection(
  spatialFiltered
    .filter(ee.Filter.rangeContains('year', startYear + 1, endYear - 1))
    .iterate(filter, spatialFiltered)
)

// temporal filter for exclusion
filter = applyTemporalExclusionFilter1(excOffsets1)
temporalFiltered = ee.ImageCollection(
  temporalFiltered
    .filter(ee.Filter.rangeContains('year', startYear + 1, endYear - 1))
    .iterate(filter, temporalFiltered)
)

// temporal filter for exclusion in the beginning of the serie
filter = applyTemporalExclusionFilter2(excOffsets2, excThreshold2)
temporalFiltered = ee.ImageCollection(
  temporalFiltered
    .filter(ee.Filter.rangeContains('year', startYear , startYear + 1))
    .iterate(filter, temporalFiltered)
)

spatialFiltered = toBands(spatialFiltered)

var finalResult = toBands(temporalFiltered)
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
  description: 'PERENNIAL_POST_PROCESSING', 
  assetId: output, 
  region: brasilMask.geometry(), 
  scale: 30, 
  maxPixels: 10e10
})


