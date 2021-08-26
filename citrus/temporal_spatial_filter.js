var filters = require('users/your_username/repository:utils/temporal_spatial_filters.js');

var temporal = filters.temporal;
var spatial = filters.spatial;

// set the input path to the raw classification result:
var input = 'users/your_username/MAPBIOMAS/C6/AGRICULTURE/CITRUS/RESULTS/RAW'

// set the path for the filtered result:
var output = 'users/your_username/MAPBIOMAS/C6/AGRICULTURE/CITRUS/RESULTS/TEMPORAL_SPATIAL_FILTERED'

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
  temporal.build(temporal.getMovingWindow(startYear + 1, startYear + 1, 3), temporal.thresholdInclusionFilter(2)),
  temporal.build(temporal.getMovingWindow(startYear + 2, endYear - 2, 5), temporal.thresholdInclusionFilter(3)),
  temporal.build(temporal.getMovingWindow(endYear - 1, endYear - 1, 3), temporal.thresholdInclusionFilter(2)),

  temporal.build(temporal.getMovingWindow(startYear + 1, startYear + 1, 3), temporal.thresholdExclusionFilter(2)),
  temporal.build(temporal.getMovingWindow(startYear + 2, endYear - 2, 5), temporal.thresholdExclusionFilter(3)),
  temporal.build(temporal.getMovingWindow(endYear - 1, endYear - 1, 3), temporal.thresholdExclusionFilter(2)),
]

var filteredCollection = filters.applyFilters(filtersToApply, collection);

var firstYear = filteredCollection.filterMetadata('year', 'less_than', startYear + 2).and()
var lastYear = filteredCollection.filterMetadata('year', 'greater_than', endYear - 2).or()

filteredCollection = filteredCollection
  .filter(ee.Filter.inList('year', [startYear, endYear]).not())
  .merge(ee.ImageCollection([firstYear.set('year', startYear), lastYear.set('year', endYear)]))


filteredCollection = filteredCollection
  .filter(ee.Filter.inList('year', [startYear, endYear]).not())
  .map(function (current) {
    var year = current.getNumber('year')

    var prior = filteredCollection.filterMetadata('year', 'less_than', year).max().rename('class')
    var after = filteredCollection.filterMetadata('year', 'greater_than', year).max().rename('class')

    return current.or(prior.and(after)).set('year', year)
  })
  .merge(filteredCollection.filter(ee.Filter.inList('year', [startYear, endYear])))
  .sort('year')


var raw = filters.toBandsByYear(collection)
var filtered = filters.toBandsByYear(filteredCollection)

var visYear = endYear

Map.addLayer(raw.selfMask(), { bands: 'b' + visYear, palette: ['RED'] }, 'Raw ' + visYear)
Map.addLayer(filtered.selfMask(), { bands: 'b' + visYear, palette: ['BLUE'] }, 'Filtered ' + visYear)

Export.image.toAsset({
  image: filtered.unmask().byte(),
  description: 'CITRUS_TEMPORAL_SPATIAL_FILTER',
  assetId: output,
  region: brasil.geometry(30).bounds(30),
  scale: 30,
  maxPixels: 10e10
})