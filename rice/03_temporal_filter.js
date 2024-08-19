/**
 * @name
 *      IRRIGATED RICE TEMPORAL FILTER
 * 
 * @description
 *  
 * @author
 *      Remap
 *      mapbiomas@remapgeo.com
 *
 * @version
 *  MapBiomas Collection 9.0
 * 
 */
 
var region_1 = ee.Geometry.Polygon(
  [[[-57.73937989965078, -25.785168855725107],
    [-57.73937989965078, -34.31178711066779],
    [-46.84094239965078, -34.31178711066779],
    [-46.84094239965078, -25.785168855725107]]], null, false)
var region_2 = ee.Geometry.Polygon(
  [[[-57.61012840705071, -5.256713410595688],
    [-57.61012840705071, -22.939681489060444],
    [-45.87672996955071, -22.939681489060444],
    [-45.87672996955071, -5.256713410595688]]], null, false)

var region_3 = ee.Geometry.Polygon(
  [[[-57.171780406506294, 0.2611131179188186],
    [-57.171780406506294, -5.202912000689628],
    [-45.855862437756294, -5.202912000689628],
    [-45.855862437756294, 0.2611131179188186]]], null, false);


var filters = require("users/your_user/your_path_to:temporal_spatial_filters.js");

var temporal = filters.temporal;
var spatial = filters.spatial; 

var brasil = ee.Image('projects/mapbiomas-workspace/AUXILIAR/ESTATISTICAS/COLECAO5/country-raster')

// set the input path to the raw classification result:
var input = 'users/your_username/MAPBIOMAS/C9/AGRICULTURE/RICE/RESULTS/RAW'

// set the path for the filtered result:
var output = 'users/your_username/MAPBIOMAS/C9/AGRICULTURE/RICE/RESULTS/TEMPORAL_FILTERED'

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

var filtersToApply_1 = [
temporal.build(temporal.getMovingWindow(startYear+1, endYear-1, 5), temporal.thresholdFilter(3)), 
]
var filtersToApply_2 = [
temporal.build(temporal.getMovingWindow(startYear+2, endYear-2, 5), temporal.thresholdFilter(3)),
temporal.build(temporal.getMovingWindow(startYear+1, endYear-1, 3), temporal.thresholdFilter(2))
]

var filteredCollection_1 = filters.applyFilters(filtersToApply_1, collection.map(function(img){return img.clip(region_1)}));
var filteredCollection_2 = filters.applyFilters(filtersToApply_2, collection.map(function(img){return img.clip(region_2.union(region_3))}));


var filtered_1 = filters.toBandsByYear(filteredCollection_1).byte()
var filtered_2 = filters.toBandsByYear(filteredCollection_2).byte()

var filtered = filtered_1.unmask(0,false).or(filtered_2.unmask(0,false))


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



