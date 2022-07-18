/**
 * @name
 *      TEMPORARY CROPS CLASSIFICATION C7 (SOY, COTTON and OTHER TEMPORARY CROPS)
 * 
 * @description
 *      Classification script for Soybean, Cotton and Other Temporary Crops.
 * 
 * @author
 *      Agrosatélite
 *      mapbiomas@agrosatelite.com.br
 *
 * @version
 *  MapBiomas Collection 7.0
 *   
 */

 

// Set the path to the scripts you copied to your GEE account:
//Indexes
  var index = require('users/agrosatelite_mapbiomas/mapbiomas_tutorial:collection7/utils/indexes.js');
//Normalization
  var getNormalizedCollection = require("users/agrosatelite_mapbiomas/mapbiomas_tutorial:collection7/utils/normalization.js").getNormalizedCollection;
//Cloud Mask
  var cloudLib = require("users/agrosatelite_mapbiomas/mapbiomas_tutorial:collection7/utils/cloud.js");


  
// ============================================================================
//                                  IMPORTS
// ============================================================================

// Landsat Grid Collection (with peak vegetation month as a property) 
var gridCollection = ee.FeatureCollection("users/agrosatelite_mapbiomas/COLECAO_7/GRIDS/BRASIL_COMPLETO_PEAK")

// Subtiles for stratified sampling
var SubTile = ee.FeatureCollection("users/agrosatelite_mapbiomas/COLECAO_7/GRIDS/SUBTILES")


// ============================================================================
//                                  INPUTS
// ============================================================================

// Set the output destination
var outputCollection = 'users/your_username/MAPBIOMAS/C7/AGRICULTURE/TEMPORARY_CROPS/RESULTS/RAW/'

// Set target years
var years = [2020]

// Set offset years for the mosaic
var offset = 2

// Set the path/row for the Landsat scenes
var tiles = [
              [224, 80],
            ]

// Set the amount of samples to be used
var trainingSamplesNumber = 10000

// Mosaic parameters
var bands = ['BLUE', 'GREEN', 'RED', 'NIR', 'SWIR1', 'SWIR2']
var indexes = ['EVI2', 'CAI', 'SAVI', 'NDWI'];

var cloudCover = 80

var reducers = ee.Reducer.median()
  .combine(ee.Reducer.mean(), null, true)
  .combine(ee.Reducer.max(), null, true)
  .combine(ee.Reducer.min(), null, true)
  .combine(ee.Reducer.stdDev(), null, true)
  .combine(ee.Reducer.percentile([20,80]), null, true)
  
  
// ============================================================================
//                                  FUNCTIONS
// ============================================================================


function addSuffix(sufix) {
  return function(bandName) {
    return ee.String(bandName).cat(sufix)
  }
}

function filterCollection(collection, spacecraft) {
  return collection
    .filterMetadata('SPACECRAFT_ID', 'equals', spacecraft)
    
}

function getMosaic(collection) {
  var bandNames = collection.first().bandNames()
  
  var qmo = collection
    .qualityMosaic("EVI2")
    .rename(bandNames.map(addSuffix("_qmo")))

  var mosaic = ee.ImageCollection(collection)
    .reduce(reducers)
    .addBands(qmo)


  return mosaic
}

function get_collection (image){
  var cloudMask = image.select("QA_SCORE").eq(1)
  var res_img =  image.select(bands).updateMask(cloudMask)
  
  return index.calculateIndexes(res_img, indexes);
}


function filter_TOAcollection(collection, roi, start_date, end_date, max_cloud_cover){
  return  collection.filterBounds(roi)
        .filterDate(start_date, end_date)
        .filterMetadata("CLOUD_COVER_LAND", "less_than", max_cloud_cover)
        .map(function(img){
          var res_img =  img.updateMask(cloudLib.cloudMask(img).not()).select(['B1', 'B2', 'B3', 'B4', 'B5', 'B7'], ee.List(bands))
          return index.calculateIndexes(res_img, indexes)
        })
    }

function applyContrast(image, roi){
  
  var stats = image.reduceRegion({
    reducer: ee.Reducer.percentile([2, 98]),
    geometry: roi, 
    scale: 30,
    maxPixels: 1E13
  });
    
  var imageVis = image.bandNames().iterate(function(bandName, currentImage){
      bandName = ee.String(bandName);
      currentImage = ee.Image(currentImage);
      
      var p2 = bandName.cat(ee.String('_p2'));
      var p98 = bandName.cat(ee.String('_p98'));
      
      return currentImage.addBands(currentImage.select(bandName)
        .clamp(stats.getNumber(p2), stats.getNumber(p98)), null, true);
        
    }, image);
  
  return ee.Image(imageVis);
}

function calcArea(geom, image) {
  return image.multiply(ee.Image.pixelArea()).multiply(0.0001).reduceRegions({
    collection: geom,
    reducer: ee.Reducer.sum(),
    scale: 30,
  });
}




// ============================================================================
//                                  MOSAIC
// ============================================================================

years.forEach(function(year){
  
  tiles.forEach(function (tile) {
  
      var path = tile[0];
      var row = tile[1];
      
      var roi = ee.Feature(gridCollection
        .filterMetadata('PATH', "equals", path)
        .filterMetadata('ROW', "equals", row)
        .first())
    
      Map.addLayer(roi)
      Map.centerObject(roi,11)
    
  
 
        var peak_month = ee.Number(roi.get('peak_' + year))
        
  
          var periods = {
            'WET': {
              'Start': ee.Date.fromYMD(year, peak_month,01).advance(-3, 'month'),
              'End': ee.Date.fromYMD(year, peak_month,01).advance(3, 'month')
            },
            'DRY': {
              'Start': ee.Date.fromYMD(year, peak_month,01).advance(-5, 'month'),
              'End': ee.Date.fromYMD(year, peak_month,01).advance(-3, 'month')
            },
            'ANNUAL': {
              'Start': ee.Date.fromYMD(year, peak_month,01),
              'End': ee.Date.fromYMD(year, peak_month,01).advance(12, 'month')
            }
          };
          
         
          
          var wetDryCol = ee.ImageCollection([]);
          var listNames = ee.List([]);
          
          
          Object.keys(periods).forEach(function (key) {
                  var startDate = periods[key].Start;
                  var endDate = periods[key].End;
                  
                  var collections = ee.ImageCollection(ee.List.sequence(0, offset).map(function(off){
                    
                            off = ee.Number(off)
                              
                            var off_start = ee.Date(startDate).advance(off.multiply(-1), 'year')
                            var off_end = ee.Date(endDate).advance(off.multiply(-1), 'year')
                            
                            var off_collection = ee.ImageCollection(ee.Algorithms.If(ee.Number(year).gt(ee.Number(2000)),
                                                  ee.ImageCollection(getNormalizedCollection(roi.geometry().centroid(30), off_start, off_end, cloudCover, bands, true)).map(get_collection), 
                                                  filter_TOAcollection(ee.ImageCollection("LANDSAT/LT05/C01/T1_TOA"), roi.geometry().centroid(30), off_start, off_end, cloudCover)))
                            
                            var mosaic = ee.Algorithms.If(
                                          off_collection.size().gt(1),
                                          getMosaic(off_collection).clip(roi).unmask(),
                                          ee.Image(0)
                                          )
                            
      
                        return ee.Image(mosaic).set('period', key).set('offset', off)
                            
                        }));
                            
  
                  var result_offset = ee.List.sequence(offset, 0, -1).iterate(function(off, prev){
                    off = ee.Number(off)
                    prev = ee.Image(prev)
                    
                    var off_mosaic = collections.filter(ee.Filter.eq('offset', off)).mosaic().selfMask()
                    
                    off_mosaic = ee.Algorithms.If(
                                          off_mosaic.bandNames().size().neq(1),
                                          off_mosaic,
                                          prev
                                          )
                    
                    var blend = prev.blend(off_mosaic)
                    
                    return blend.copyProperties(off_mosaic, ['period'])
                    
                    }, ee.Image(0))
                    
                  result_offset = ee.Image(result_offset)
                    
                  var rename = result_offset.bandNames().map(function (band) {
                        return ee.String(band).cat('_').cat(key);
                      });
                        
                  var mosaic = result_offset.rename(rename);
                  
                  wetDryCol = wetDryCol.merge(mosaic);
                  listNames = listNames.cat(mosaic.bandNames());
                            
            });
                          
              var mosaic = wetDryCol.toBands().rename(listNames);
              
             
                  
                
          var cei = mosaic.expression('1000000 * (WET_max - DRY_min) / (1000000 + WET_max + 1000000 + DRY_min)', {
            'WET_max': mosaic.select([
              'NIR_qmo_WET',
              'EVI2_qmo_WET',
              'NDWI_qmo_WET'
            ]),
            'DRY_min': mosaic.select([
              'NIR_p20_WET',
              'EVI2_p20_WET',
              'NDWI_p20_WET'
            ])
          }).rename([
            'NIR_cei_WET',
            'EVI2_cei_WET',
            'NDWI_cei_WET'
          ]);
          
          
          mosaic = mosaic.addBands(cei).unmask().clip(roi).multiply(10000).int16();
          
          
        
        
          
          Map.addLayer(mosaic, {bands: ['NIR_p80_WET', 'SWIR1_qmo_WET', 'RED_p20_WET'], min:0, max: 3000}, 'Mosaic')
  
  
  
  // ============================================================================
  //                        STRARTIFIED SAMPLING
  // ============================================================================
     
          
          // Reference map for sampling
          // **NOTE: the reference map used for MapBiomas temporary crops is not public.
          //         The MapBiomas classification is used here as an example. 
          var reference = ee.Image('projects/mapbiomas-workspace/public/collection6/mapbiomas_collection60_integration_v1')
                                  .select('classification_'+year)
                                  .remap([39,41,62], [1,2,3]) // Soybean, Other Temporary Crops, Cotton
                                    
          
     
          var roi_geometry = roi.geometry()
          
          var arearoi = roi_geometry.area().divide(1e4);
      
          var subtiles = SubTile.filterBounds(roi_geometry);
      
          var reference = reference
            .unmask()
            .clip(roi_geometry);
          
          var others = reference.eq(0)
          var soybean = reference.eq(1)
          var otc = reference.eq(2)
          var cotton = reference.eq(3)
      
          var others_area = calcArea(subtiles, others);
          var soybean_area = calcArea(subtiles, soybean);
          var otc_area = calcArea(subtiles, otc);
          var cotton_area = calcArea(subtiles, cotton);
      
          var area_others = others_area.select(["Id", "sum"],["Id", "others"]);
          var area_soybean = soybean_area.select(["Id", "sum"], ["Id", "soybean"]);
          var area_otc = otc_area.select(["Id", "sum"], ["Id", "otc"]);
          var area_cotton = cotton_area.select(["Id", "sum"], ["Id", "cotton"]);
      
          /////////////////
          var sumAreas = subtiles.map(function(ft){
            var id_filter = ee.Filter.eq('Id', ft.get('Id'))
            
            ft = ft.set('others', area_others.filter(id_filter).first().get('others'),
                        'soybean', area_soybean.filter(id_filter).first().get('soybean'),
                        'otc', area_otc.filter(id_filter).first().get('otc'),
                        'cotton', area_cotton.filter(id_filter).first().get('cotton')
                        )
            
            return ft.set('total', ft.getNumber('others')
                              .add(ft.getNumber('soybean'))
                              .add(ft.getNumber('otc'))
                              .add(ft.getNumber('cotton')))
      
          })
        
        
          /////////////////
           var percent_area_subtile = sumAreas
            .map(function (feature) {
              var feat_soybean = feature.set(
                "percentual_soybean",
                ee
                  .Number(feature.get("soybean"))
                  .divide(ee.Number(feature.get("total")))
                  .add(0.10)
              );
              var feat_others = feat_soybean.set(
                "percentual_others",
                ee
                  .Number(feat_soybean.get("others"))
                  .divide(ee.Number(feat_soybean.get("total")))
                  .subtract(0.10)
              );
              var feat_otc = feat_others.set(
                "percentual_otc",
                ee
                  .Number(feat_others.get("otc"))
                  .divide(ee.Number(feat_others.get("total")))
      
              );
              var feat_cotton = feat_otc.set(
                "percentual_cotton",
                ee
                  .Number(feat_otc.get("cotton"))
                  .divide(ee.Number(feat_otc.get("total")))
      
              );
              var new_total = feat_cotton.set(
                "percentual_tile",
                ee
                  .Number(feat_cotton.get("total"))
                  .divide(ee.Number(arearoi))
              );
              return new_total;
            })
            
         
          
          /******** SAMPLES **************/
      
          var train = mosaic
            .unmask()
            .addBands(reference.select([0], ["class"]).unmask());
      
          var training = percent_area_subtile
            .map(function (subtile) {
              var areas = ee.Dictionary({
                others: subtile.get("percentual_others"),
                soybean: subtile.get("percentual_soybean"),
                otc: subtile.get("percentual_otc"),
                cotton: subtile.get("percentual_cotton"),
              });
      
              var trainingSamplesSubTile = ee
                .Number(trainingSamplesNumber)
                .multiply(ee.Number(subtile.get("percentual_tile")));
              var others = ee.Number(areas.get("others"));
              var soybean = ee.Number(areas.get("soybean"));
              var otc = ee.Number(areas.get("otc"));
              var cotton = ee.Number(areas.get("cotton"));
             
              var sample = ee.Number(trainingSamplesSubTile);
      
              var samples = train.stratifiedSample({
                numPoints: 1,
                classBand: "class",
                region: subtile.geometry(),
                scale: 30,
                seed: 11,
                classValues: [0, 1, 2, 3],
                classPoints: [
                  sample.multiply(others).int(),
                  sample.multiply(soybean).int(),
                  sample.multiply(otc).int(),
                  sample.multiply(cotton).int(),
                ],
                tileScale: 4,
                geometries: true,
              });
              return samples;
            })
            .flatten();
      
  
  // ============================================================================
  //                                  CLASSIFICATION
  // ============================================================================
  
  
            var classifier = ee.Classifier
                  .smileRandomForest(100)
                  .train(training, 'class', mosaic.bandNames());
            
            
            // Feature Selection
            var dict_featImportance = classifier.explain();
            
            var importance_values = ee.Dictionary(dict_featImportance.get('importance')).values()
            var importance_keys = ee.Dictionary(dict_featImportance.get('importance')).keys()
            
            var top_values = importance_values.filter(ee.Filter.gt('item', importance_values.reduce(ee.Reducer.percentile([70]))))
            var top_keys = top_values.map(function(value){
              return importance_keys.get(importance_values.indexOf(value))
            })
  
           
            
            var classifier = ee.Classifier
                  .smileRandomForest(100)
                  .train(training, 'class', top_keys);
            
            var classified = mosaic.classify(classifier);
            
            
            var vis= {palette:['RED', 'GREEN', 'BLUE'], min:1, max: 3}
            Map.addLayer(refMap.clip(roi_geometry), vis, 'refMap')
            Map.addLayer(classified.selfMask(), vis, 'classified')
  
            var filename = path+''+row+'_'+year
            
            Export.image.toAsset({
                  image: classified.byte().set('year',year), 
                  description: 'TEMPORARY_CROPS_RAW_' + filename, 
                  assetId: outputCollection + filename, 
                  region: roi, 
                  scale: 10, 
                  maxPixels: 1.0E13
                })
          
  
  })
    
  
})



