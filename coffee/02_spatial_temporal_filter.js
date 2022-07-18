/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var geometry = 
    /* color: #d63000 */
    /* shown: false */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Geometry.Polygon(
        [[[-55.574917984519466, -10.356219818551628],
          [-55.574917984519466, -25.679367708429723],
          [-38.348355484519466, -25.679367708429723],
          [-38.348355484519466, -10.356219818551628]]], null, false);
/***** End of imports. If edited, may not auto-convert in the playground. *****/
/**
 * @name
 *      SPATIAL TEMPORAL COFFEE FILTER C7
 * 
 * @description
 *      Filter script for MapBiomas Collection 7 Coffee class.
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



// set the input path to the raw classification result:
var input = 'users/your_username/MAPBIOMAS/C7/AGRICULTURE/COFFEE/RESULTS/RAW'

// set the path and name for the filtered result:
var output = 'users/your_username/MAPBIOMAS/C7/AGRICULTURE/COFFEE/RESULTS/TEMPORAL_SPATIAL_FILTERED'

var rawCollection = ee.ImageCollection(input)

var brasil = ee.Image('projects/mapbiomas-workspace/AUXILIAR/ESTATISTICAS/COLECAO5/country-raster')

var years = ee.List([rawCollection.aggregate_min('year'), rawCollection.aggregate_max('year')]).getInfo()

var startYear = years[0]
var endYear = years[1]



// APPLY FILTERS
var filtersToApply = [
  spatial.build(spatial.minConnnectedPixels(6)),
  
  temporal.build(temporal.getMovingWindow(startYear+1, startYear+1, 3), temporal.thresholdFilter(2)), // 3 years window
  temporal.build(temporal.getMovingWindow(startYear+2, endYear-2, 5), temporal.thresholdFilter(3)), // 5 years window
  temporal.build(temporal.getMovingWindow(endYear-1, endYear-1, 3), temporal.thresholdFilter(2)), // 3 years window

  spatial.build(spatial.minConnnectedPixels(6)),
]

var filteredCollection = filters.applyFilters(filtersToApply, rawCollection)


// filled

filteredCollection = filteredCollection
    .merge(
      ee.ImageCollection([
        ee.Image(0).rename("b1").set("year", startYear-1),
        ee.Image(0).rename("b1").set("year", endYear+1),
      ])
    )
    .sort("year");

var filled = ee.List.sequence(startYear, endYear).map(function(year) {
  var before = filteredCollection.filterMetadata('year', 'less_than', year).sum()
  var thisYear = filteredCollection.filterMetadata('year', 'equals', year).first().unmask()
  var after = filteredCollection.filterMetadata('year', 'greater_than', year).sum()
  
  return thisYear.or(before.and(after)).set('year', year)
})

filteredCollection = ee.ImageCollection(filled)



// Last year
filteredCollection = filteredCollection.filter(ee.Filter.neq('year', endYear))
    .merge(
      ee.ImageCollection([
        filteredCollection.filterMetadata('year', 'equals', endYear-1).max(),
        filteredCollection.filterMetadata('year', 'equals', endYear).max()
        ]).max().set('year', endYear)
    )
    .sort("year");


// to bands
var raw = filters.toBandsByYear(rawCollection)
var filtered = filters.toBandsByYear(filteredCollection)


// First year = y.and(y+1)
var filtered_first = filtered.select('b'+startYear).unmask().and(filtered.select('b'+startYear+1).unmask())
filtered = filtered.addBands(filtered_first, null, true)


// mask states
var states = ee.FeatureCollection('users/agrosatelite_mapbiomas/REGIONS/ibge_estados_2019')
  .filter(ee.Filter.inList('SIGLA_UF', ['ES','MG', 'SP', 'BA', 'PR', 'GO', 'DF']))
  
var mask = ee.Image(0).paint(states, 1);


raw = raw.updateMask(mask);
filtered = filtered.updateMask(mask);

  
Map.addLayer(raw.selfMask(), { bands: 'b2017', palette: ['RED']}, 'Raw')
Map.addLayer(filtered.selfMask(), { bands: 'b2017', palette: ['BLUE']}, 'Filtered')


 Export.image.toAsset({
   image: filtered.byte(), 
   description: 'COFFEE_FILTERED', 
   assetId: output,
   region: brasil.geometry(30).bounds(30), 
   scale: 30, 
   maxPixels: 10e10
 })

