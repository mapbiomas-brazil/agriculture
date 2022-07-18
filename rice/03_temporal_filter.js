/**
 * @name
 *      IRRIGATED RICE TEMPORAL FILTER
 * 
 * @description
 *  
 * @author
 *      Agrosatélite
 *      mapbiomas@agrosatelite.com.br
 *
 * @version
 *  MapBiomas Collection 7.0
 * 
 */
 


var filters = require("users/agrosatelite_mapbiomas/mapbiomas_tutorial:collection7/utils/temporal_spatial_filters.js");

var temporal = filters.temporal;
var spatial = filters.spatial; 

var brasil = ee.Image('projects/mapbiomas-workspace/AUXILIAR/ESTATISTICAS/COLECAO5/country-raster')

// set the input path to the raw classification result:
var input = 'users/your_username/MAPBIOMAS/C7/AGRICULTURE/RICE/RESULTS/RAW'

// set the path for the filtered result:
var output = 'users/your_username/MAPBIOMAS/C7/AGRICULTURE/RICE/RESULTS/TEMPORAL_FILTERED'

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

  temporal.build(temporal.getMovingWindow(startYear+1, endYear-1, 3), temporal.thresholdFilter(2)), 

]


var filteredCollection = filters.applyFilters(filtersToApply, collection);


var filtered = filters.toBandsByYear(filteredCollection).byte()

var filtered = filtered.unmask().or(rice_raw.unmask())

var raw = filters.toBandsByYear(collection).byte()


var finalYear = filtered.select('b'+endYear).unmask().or(filtered.select('b'+endYear-1).unmask()).byte()
var firstYear = filtered.select('b'+startYear).unmask().or(filtered.select('b'+startYear+1).unmask()).byte()
var rice_ft = filtered.addBands(finalYear,['b'+endYear], true).addBands(firstYear,['b'+startYear], true)

Map.addLayer(rice_ft.selfMask())




Export.image.toAsset({
  image: rice_ft.unmask().byte(),
  description: 'RICE_TEMPORAL_FILTER',
  assetId: output,
  region: brasil.geometry(30).bounds(30),
  scale: 30,
  maxPixels: 10e10
})



