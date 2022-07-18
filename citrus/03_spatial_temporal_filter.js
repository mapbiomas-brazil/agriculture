/**
 * @name
 *      CITRUS SPATIAL TEMPORAL FILTER
 * 
 * @description
 *      Filter script for the citrus class in Mapbiomas Collection 7.
 * 
 * @author
 *      Agrosatélite
 *      mapbiomas@agrosatelite.com.br
 *
 * @version
 *  MapBiomas Collection 7.0
 * 
 */
 
var filters = require('users/agrosatelite_mapbiomas/mapbiomas_tutorial:collection7/utils/temporal_spatial_filters.js');

var temporal = filters.temporal;
var spatial = filters.spatial;

// set the path to the ras classification result:
var input = 'users/your_username/MAPBIOMAS/C7/AGRICULTURE/CITRUS/RESULTS/RAW'

// set the path for the filtered result:
var output = 'users/your_username/MAPBIOMAS/C7/AGRICULTURE/CITRUS/RESULTS/'

var brasil = ee.Image('projects/mapbiomas-workspace/AUXILIAR/ESTATISTICAS/COLECAO5/country-raster')

var collection = ee.ImageCollection(input)

print (collection.aggregate_array('year'))

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
var lastYearImg = filteredCollection.filter(ee.Filter.inList('year', [endYear - 1, endYear])).or();


var mask = filteredCollection.filter(ee.Filter.inList('year', [endYear - 3, endYear - 2, endYear - 1])).or();
var lastYear = lastYearImg.updateMask(mask)

filteredCollection = filteredCollection
  .filter(ee.Filter.inList('year', [startYear, endYear]).not())
  .merge(ee.ImageCollection([firstYear.set('year', startYear), lastYear.set('year', endYear)]))



// filled

var filteredCollection = filteredCollection
  .merge(ee.ImageCollection([
    ee.Image(0).rename('classification').set('year', startYear - 1),
    ee.Image(0).rename('classification').set('year', endYear + 1)
  ]))
  .sort('year')

var filled = ee.ImageCollection(
  ee.List.sequence(startYear, endYear).map(function(year) {
      var before = filteredCollection.filterMetadata('year', 'less_than', year).sum()
      var thisYear = filteredCollection.filterMetadata('year', 'equals', year).first().unmask()
      var after = filteredCollection.filterMetadata('year', 'greater_than', year).sum()
      
      return thisYear.or(before.and(after)).set('year', year)
  })
).aside(print)


var raw = filters.toBandsByYear(collection)
var filtered = filters.toBandsByYear(filled)


var visYear = endYear

Map.addLayer(raw.selfMask(), { bands: 'b' + visYear, palette: ['RED'] }, 'Raw ' + visYear)
Map.addLayer(filtered.selfMask(), { bands: 'b' + visYear, palette: ['BLUE'] }, 'Filtered ' + visYear)

Export.image.toAsset({
  image: filtered.unmask().byte(),
  description: 'CITRUS_TEMPORAL_SPATIAL_FILTER',
  assetId: output + 'CITRUS_TEMPORAL_SPATIAL_FILTER',
  region: brasil.geometry(30).bounds(30),
  scale: 30,
  maxPixels: 10e10
})