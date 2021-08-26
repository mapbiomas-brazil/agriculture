// Set the path to the temporal_spatial_filters.js script you copied to your GEE account:
var filters = require('users/your_username/repository:utils/temporal_spatial_filters.js');

var temporal = filters.temporal;
var spatial = filters.spatial;

// set the input path to the raw classification result:
var input = 'users/your_username/MAPBIOMAS/C6/AGRICULTURE/TEMPORARY_CROPS/RESULTS/RAW';

// set the path for the filtered result:
var output = 'users/your_username/MAPBIOMAS/C6/AGRICULTURE/TEMPORARY_CROPS/RESULTS/TEMPORAL_SPATIAL_FILTERED';

var brasil = ee.Image('projects/mapbiomas-workspace/AUXILIAR/ESTATISTICAS/COLECAO5/country-raster')

var collection = ee.ImageCollection(input)

var years = ee.List([collection.aggregate_min('year'), collection.aggregate_max('year')]).getInfo()

var startYear = years[0]
var endYear = years[1]

collection = ee.List.sequence(startYear, endYear)
  .map(function (year) {
    var yearlyMosaic = collection
      .filterMetadata('year', 'equals', year)
      .or()
      .set('year', year);

    return yearlyMosaic
  })

collection = ee.ImageCollection(collection)


var filtersToApply = [
  spatial.build(spatial.minConnnectedPixels(6)),
  temporal.build(temporal.getMovingWindow(startYear + 1, startYear + 1, 3), temporal.thresholdFilter(2)), // 3 years window, 1986 only
  temporal.build(temporal.getMovingWindow(startYear + 2, endYear - 2, 5), temporal.thresholdFilter(3)), // 5 years window, 1987 to 2018
  temporal.build(temporal.getMovingWindow(endYear - 1, endYear - 1, 3), temporal.thresholdFilter(2)), // 3 years window, 2019 only
  spatial.build(spatial.minConnnectedPixels(6)),
]

var filteredCollection = filters.applyFilters(filtersToApply, collection);

var firstYearImg = filteredCollection.filter(ee.Filter.inList('year', [startYear, startYear + 1])).and();
var lastYearImg = filteredCollection.filter(ee.Filter.inList('year', [endYear - 1, endYear])).and();

filteredCollection = filteredCollection
  .filter(ee.Filter.inList('year', [startYear, endYear]).not())
  .merge(ee.ImageCollection([
    firstYearImg.set('year', startYear),
    lastYearImg.set('year', endYear)
  ]))
  .sort('year')

// to ensure consistence
filtersToApply = [
  temporal.build(temporal.getMovingWindow(startYear + 1, endYear - 1, 3), temporal.thresholdFilter(2)), // 3 years window
]

filteredCollection = filters.applyFilters(filtersToApply, filteredCollection);

var raw = filters.toBandsByYear(collection)
var filtered = filters.toBandsByYear(filteredCollection)

var visYear = endYear

Map.addLayer(raw.selfMask(), { bands: 'b' + visYear, palette: ['RED'] }, 'Raw ' + visYear)
Map.addLayer(filtered.selfMask(), { bands: 'b' + visYear, palette: ['BLUE'] }, 'Filtered ' + visYear)

Export.image.toAsset({
  image: filtered.unmask().byte(),
  description: 'TEMPORARY_CROPS_TEMPORAL_SPATIAL_FILTER',
  assetId: output,
  region: brasil.geometry(30).bounds(30),
  scale: 30,
  maxPixels: 10e10
})

