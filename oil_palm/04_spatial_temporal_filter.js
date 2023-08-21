/**
 * @name
 *      OIL PALM SPATIAL AND TEMPORAL FILTERS
 * 
 * @description
 *      Script to apply filter to the Oil Palm classification.
 * 
 * @author
 *      Agrosatélite
 *      mapbiomas@agrosatelite.com.br
 *
 * @version
 *  MapBiomas Collection 8.0
 * 
 */
 
var filters = require('users/agrosatelite_mapbiomas/mapbiomas_tutorial:collection8/utils/temporal_spatial_filters.js');

var temporal = filters.temporal; 
var spatial = filters.spatial;


var collection = ee.ImageCollection('users/your_username/MAPBIOMAS/C8/AGRICULTURE/CITRUS/RESULTS/RAW')
var output_collection = 'users/your_username/MAPBIOMAS/C8/AGRICULTURE/CITRUS/RESULTS/';
var filename = 'Filtered_Oil_Palm'

var filtersToApply = [
  spatial.build(spatial.minConnnectedPixels(6)),
  
  temporal.build(temporal.getMovingWindow(1986, 2000, 7), temporal.thresholdFilter(3)), 
  temporal.build(temporal.getMovingWindow(2000, 2021, 5), temporal.thresholdFilter(3)), 
  temporal.build(temporal.getMovingWindow(2019, 2022, 3), temporal.thresholdFilter(2)), 


  spatial.build(spatial.minConnnectedPixels(6)),
]


var filteredCollection = filters.applyFilters(filtersToApply, collection);

var filteredCollection = filteredCollection
  .merge(ee.ImageCollection([
    ee.Image(0).rename('b1').set('year', 1984),
    ee.Image(0).rename('b1').set('year', 2023)
  ]))
  .sort('year')


var filtered = filters.toBandsByYear(filteredCollection).updateMask(ee.Image(0).clip(areas_excluir).unmask(1, false)).unmask()

Export.image.toAsset({
  image: filtered.unmask().byte(),
  description: filename, 
  assetId: output_collection + filename,
  region: geometry, 
  scale: 30, 
  maxPixels: 10e10
})