
/**
 * @name
 *      VEGETATIVE PEAK
 * 
 * @description
 *      This script calculates the month of peak vegetation in a given year, using a quality mosaic of MODIS-EVI2.
 *      The core processing is at the pixel level, but the export is reduced by the mode of each feature in the
 *      given collection (Landsat scenes as default).
 *      For years before 2000, where there are no MODIS imagery, the peak month is equal to the mode of the years
 *      after 2000. Thus, it is necessary that the list of years contains years after 2000 for them to be calculated.
 * 
 * @author
 *      Agrosatélite
 *      mapbiomas@agrosatelite.com.br
 *
 * @version
 *  MapBiomas Collection 7.0
 *   
 */



//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//                                                   INPUTS
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

// harmonization package import
var harmonization = require('users/agrosatelite_mapbiomas/mapbiomas_tutorial:collection7/utils/harmonization.js');


// select target years
var years = [2021, 2020,2019,2018,2017,2016,2015,2014,2013,2012,2011,
            2010,2009,2008,2007,2006,2005,2004,2003,2002,2001,2000]


// set the number of harmonics for the harmonization
var harmonics = 5;

// set visualization parameters
var palette = ['#1a9850','#a6d96a', '#d9ef8b', '#fdae61', '#f46d43', '#d73027', '#f46d43', '#fdae61',  '#d9ef8b', '#a6d96a','#1a9850']
var vis = {min: 1, max: 12, palette: palette}


// import feature collection to be used in the mode reducer (usually Landsat Scenes)
var region = ee.FeatureCollection("users/agrosatelite_mapbiomas/COLECAO_7/GRIDS/BRASIL_COMPLETO")
                      .filterMetadata('AC_WRS', 'equals', 1);
                      
// define output destination folder
var output = 'users/your_username/MAPBIOMAS/C7/AGRICULTURE/VEGETATIVE_PEAK/';                      


//Map.centerObject(region)

// empty collection for further use
var col = ee.ImageCollection([])


//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//           Reference Maps
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

// reference from previous mapBiomas classifications
var full_ref =  ee.Image('projects/mapbiomas-workspace/public/collection6/mapbiomas_collection60_integration_v1')
          .select('classification_' + 2020)
          .remap([39, 41, 40], [99, 99, 99])
          .eq(99)
          


//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//                                                   FUNCTIONS
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

// function to add days and months
var addDependents = function(image) {

    var date = ee.Date(image.date())
    var month = ee.Number.parse(date.format('M'))
    var doy = ee.Number.parse(date.format('D'))
    return image
    .addBands(ee.Image(doy).rename('day').toInt())
    .addBands(ee.Image(month).rename('month').toInt())
  };




//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//                                                 ANNUAL LOOP
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>


years.forEach(function(year){
  

  // setting start and end date based on crop calendar
  var startDate = ee.Date.fromYMD({year: year-1, month: 10, day: 1})
  var endDate = ee.Date.fromYMD({year: year, month: 9, day: 30})
  
  
  // filtering the MODIS collection
  var collection = ee.ImageCollection('MODIS/006/MOD13Q1')
  .filterDate(startDate, endDate)
  .map(function(image){
    // EVI2 calculation
    return image.addBands(image.expression('2.5 * ((NIR - RED) / (NIR + 2.4*RED + 1))', {
      'NIR': image.select('sur_refl_b02'),//.divide(Factor),
      'RED': image.select('sur_refl_b01')//.divide(Factor)
    }).rename('EVI2'))
    .updateMask(full_ref)
  })
    .map(addDependents)
    .select(['EVI2', 'day', 'month'])
    

  // harmonization
  var toHarmonize = ['EVI2'];
  var harmonizationResults = harmonization.harmonizeLandsat(collection, startDate, toHarmonize, harmonics);

  var harmonicTrendCoefficients = ee.Image(harmonizationResults.get('coefficients'));
  var harmonizedCollection = ee.ImageCollection(harmonizationResults.get('harmonizedCollection'));

     
  // combining the MODIS collection with the harmonized
  collection = collection.combine(harmonizedCollection);
  

  // calculation of the greenest mosaic (qualityMosaic of EVI2)
  var greenest = collection.qualityMosaic('fitted_EVI2')//.aside(print)  
  var percentil = collection.select('fitted_EVI2').reduce(ee.Reducer.percentile([40, 50]));
  
  
  
  var mosaic = greenest.select(['month', 'day'])
  //print(mosaic, 'mosaic')
  
  
  //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  //            Winter Mask
  //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  
  // filtering winter crops
  var winter =  mosaic.select('month')
              .remap([5, 6, 7, 8], [99, 99, 99, 99])
              .eq(99)

  var startDate = ee.Date.fromYMD({year: year-1, month: 10, day: 1})
  var endDate = ee.Date.fromYMD({year: year, month: 4, day: 30})
  
  
  var collection_summer = collection.filterDate(startDate, endDate)
        .map(function(image){
          return image.updateMask(winter)
        })
  
  
  // calculation of the greenest mosaic (qualityMosaic of EVI2)
  var greenest_summer = collection_summer.qualityMosaic('fitted_EVI2')//.aside(print)  
  var percentil_summer = collection_summer.select('fitted_EVI2').reduce(ee.Reducer.percentile([40, 50]));
  
  
  var mosaic_summer = greenest_summer.select(['month', 'day'])
  //print(mosaic_summer, 'mosaic_summer')
  

  //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  //            Update Peak
  //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

  // updating the mosaic when the winter peak is higher but 
  // the summer peak is close to the winter peak
  
  // select when summer is greater or equal to 0.9x the winter peak
  
  // Map.addLayer(greenest_summer, {},'greenest_summer', false)
  // Map.addLayer(greenest, {},'greenest', false)
  
  var summer_mask = greenest_summer.select('fitted_EVI2').gte(greenest.select('fitted_EVI2').multiply(0.9))
    .eq(1).selfMask()
    
  // creating a mask with pixels to be changed
  var masked_mosaic_summer = mosaic_summer.updateMask(summer_mask)

  // updating the selected pixels
  var final_mosaic = mosaic.blend(masked_mosaic_summer)


  //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  //       Collection and Export
  //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  
  // collection with all the years
  col = col.merge(ee.Image(final_mosaic))
  // print(col, "col")
  // print(final_mosaic, 'final_mosaic')
 
  // reduce the month by the grid
  var RegionGreenestDay = final_mosaic.select('month')
  .reduceRegions({
  collection: region,
  reducer: ee.Reducer.mode(),
  scale: 500,
  tileScale: 16
  });
  
  
  region = region.map(function(tile){
    var same_tile = RegionGreenestDay.filter(ee.Filter.eq('PATHROW', tile.getNumber('PATHROW'))).first()
    return tile.set(ee.String('peak_').cat(ee.String(ee.Number(year).int16())), same_tile.getNumber('mode').int())  
  })
  
  
  //print(region)
     

})//.aside(print)



// Set the peaks in years from 1985 to 1999 as the mode of the rest

region = region.map(function(tile){
  
  var mode = ee.Number(
    tile.toDictionary(tile.select(['peak_.*']).propertyNames())
        .values()
        .reduce(ee.Reducer.mode())
        ).int16()
  
  var final_tile = ee.Feature(ee.List.sequence(1985,1999).iterate(function(year, t){
    t = ee.Feature(t)
    year = ee.Number(year).int16()
    
    var property = ee.String('peak_').cat(ee.String(year))
    
    return t.set(property, mode)
    
  }, tile))
  
  return final_tile
  
})

print(region)

Export.table.toAsset({
  collection: region,
  description: 'VEGETATIVE_PEAK_GRID',
  assetId: output+'VEGETATIVE_PEAK_GRID'
})



