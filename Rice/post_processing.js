var UIUtils = require('users/agrosatelite_mapbiomas/packages:UIUtils.js')
var filters = require("users/agrosatelite_mapbiomas/packages:temporal_spatial_filters.js");

var temporal = filters.temporal;
var spatial = filters.spatial;

var brasil = ee.Image('projects/mapbiomas-workspace/AUXILIAR/ESTATISTICAS/COLECAO5/country-raster')

// set the input path to the raw classification result:
var input = 'users/your_username/MAPBIOMAS/C6/AGRICULTURE/RICE/RESULTS/RAW'

// set the path for the filtered result:
var output = 'users/your_username/MAPBIOMAS/C6/AGRICULTURE/RICE/RESULTS/TEMPORAL_FILTERED'

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

  temporal.build(temporal.getMovingWindow(1986, 2019, 3), temporal.thresholdFilter(2)), 

]


var filteredCollection = filters.applyFilters(filtersToApply, collection);


var filtered = filters.toBandsByYear(filteredCollection).byte()

var filtered = filtered.unmask().or(rice_raw.unmask())

var raw = filters.toBandsByYear(collection).byte()


var result2020 = filtered.select('b2020').unmask().or(filtered.select('b2019').unmask()).byte()
var result1985 = filtered.select('b1985').unmask().or(filtered.select('b1986').unmask()).byte()
var rice_ft = filtered.addBands(result2020,['b2020'], true).addBands(result1985,['b1985'], true)

Map.addLayer(result2020.selfMask())




Export.image.toAsset({
  image: filtered.unmask().byte(),
  description: 'RICE_TEMPORAL_FILTER',
  assetId: output,
  region: brasil.geometry(30).bounds(30),
  scale: 30,
  maxPixels: 10e10
})
