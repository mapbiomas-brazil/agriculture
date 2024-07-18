/**
 * @name
 *      TEMPORARY CROPS SPATIAL-TEMPORAL FILTERS C7 (SOY, COTTON and OTHER TEMPORARY CROPS)
 * 
 * @description
 *      Filter for Temporary Crops. All classes above are unified for the filter. The result 
 *      is used in the next step as a Temporary Crops mask for the raw classifications of
 *      Soybean and Cotton.
 * 
 * @author
 *      Remap
 *      mapbiomas@remapgeo.com
 *
 * @version
 *  MapBiomas Collection 9.0
 * 
 */


var filters = require('users/your_user/your_repository:utils/temporal_spatial_filters.js');

var temporal = filters.temporal;
var spatial = filters.spatial;

// set the input path to the raw classification result:
var input = 'users/your_username/MAPBIOMAS/C7/AGRICULTURE/TEMPORARY_CROPS/RESULTS/RAW'

// set the path for the filtered result:
var output = 'users/your_username/MAPBIOMAS/C7/AGRICULTURE/TEMPORARY_CROPS/RESULTS/TEMPORAL_SPATIAL_FILTERED'

var brasil = ee.Image('projects/mapbiomas-workspace/AUXILIAR/ESTATISTICAS/COLECAO5/country-raster')

var collection = ee.ImageCollection(input)
                    .map(function(img){return img.gte(1).copyProperties(img)}) //Unifies all classes in the RAW collection

var years = ee.List([collection.aggregate_min('year'), collection.aggregate_max('year')])

var startYear = ee.Number(years.get(0))
var endYear = ee.Number(years.get(1))

collection = ee.List.sequence(startYear, endYear)
	.map(function(year) {
		var yearlyMosaic = collection
      .filter(ee.Filter.eq('year', year))
      .or()
      .set('year', year);

		return yearlyMosaic
	})

collection = ee.ImageCollection(collection)

var filtersToApply = [
  spatial.build(spatial.minConnnectedPixels(6)),
  temporal.build(temporal.getMovingWindow(startYear.add(1), endYear.subtract(1), 3), temporal.thresholdFilter(2)),
  spatial.build(spatial.minConnnectedPixels(6)),
]

var filteredCollection = filters.applyFilters(filtersToApply, collection);

var firstYear = filteredCollection.filterMetadata('year', 'equals', startYear.add(1)).first();

filteredCollection = filteredCollection
  .filter(ee.Filter.inList('year', [startYear]).not())
  .merge(ee.ImageCollection([
    firstYear.set('year', startYear)
  ]))
  .sort('year')




var filteredCollection = filteredCollection
  .merge(ee.ImageCollection([
    ee.Image(0).rename('b1').set('year', startYear.subtract(1)),
    ee.Image(0).rename('b1').set('year', endYear.add(1))
  ]))
  .sort('year')

var filled = ee.List.sequence(startYear, endYear).map(function(year) {
  var before = filteredCollection.filterMetadata('year', 'less_than', year).sum()
  var thisYear = filteredCollection.filterMetadata('year', 'equals', year).first().unmask()
  var after = filteredCollection.filterMetadata('year', 'greater_than', year).sum()
  
  var final_years = filteredCollection.filter(ee.Filter.gte('year', endYear.subtract(1))).sum().eq(2)
  
  return thisYear.or(before.and(after).and(final_years)).set('year', year)
})

filteredCollection = ee.ImageCollection(filled).sort('year')



var raw = filters.toBandsByYear(collection)
var filtered = filters.toBandsByYear(filteredCollection)

var visYear = 2020

Map.addLayer(raw.selfMask(), { bands: 'b' + visYear, palette: ['RED']}, 'Raw ' + visYear)
Map.addLayer(filtered.selfMask(), { bands: 'b'  + visYear, palette: ['BLUE']}, 'Filtered '  + visYear)

Export.image.toAsset({
  image: filtered.unmask().byte(), 
  description: 'SOYBEAN_SPATIAL_TEMPORAL_FILTER', 
  assetId: output,
  region: brasil.geometry(30).bounds(30), 
  scale: 30, 
  maxPixels: 10e10
})