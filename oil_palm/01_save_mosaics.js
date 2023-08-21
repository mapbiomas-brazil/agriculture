
/**
 * @name
 *      SAVE MOSAIC FOR OIL PALM CLASSIFICATION
 * 
 * @description
 *      Script to export mosaic for Oil Palm classification. Classification step 
 *      in Google Colab.
 * 
 * @author
 *      Agrosatélite
 *      mapbiomas@agrosatelite.com.br
 *
 * @version
 *  MapBiomas Collection 8.0
 * 
 */

var centroides_tiles_treino = /* color: #d63000 */ee.FeatureCollection(
  [ee.Feature(ee.Geometry.Point([-48.835275453248734, -2.569465894325886]),{"system:index": "0"}),
  ee.Feature(ee.Geometry.Point([-48.46195369235967, -2.7878789223772924]),{"system:index": "1"}),
  ee.Feature(ee.Geometry.Point([-48.147470049781546, -2.872919088487117]),{  "system:index": "2"}),
  ee.Feature(ee.Geometry.Point([-49.18374745263257, -2.862623535761055]),{  "system:index": "3"}),
  ee.Feature(ee.Geometry.Point([-49.02121889361455, -2.78065401390402]),{  "system:index": "4"}),
  ee.Feature(ee.Geometry.Point([-48.91822206744268, -2.6626842291266017]),{  "system:index": "5"}),
  ee.Feature(ee.Geometry.Point([-48.531504473768805, -2.4648697329143907]),{  "system:index": "6"}),
  ee.Feature(ee.Geometry.Point([-48.62707718166272, -2.260898969132136]),{  "system:index": "7"}),
  ee.Feature(ee.Geometry.Point([-48.502107699240845, -2.1126915935315282]),{  "system:index": "8"}),
  ee.Feature(ee.Geometry.Point([-48.87426956447522, -2.2677600627833954]),{  "system:index": "9"}),
  ee.Feature(ee.Geometry.Point([-48.828950960959595, -2.039954961142617]),{  "system:index": "10"}),
  ee.Feature(ee.Geometry.Point([-48.03184028104474, -2.4797970208249716]),{  "system:index": "11"}),
  ee.Feature(ee.Geometry.Point([-48.29825873807599, -2.1559659424449586]),{  "system:index": "12"}),
  ee.Feature(ee.Geometry.Point([-47.25588241165727, -1.3984308731668011]),{  "system:index": "13"}),
  ee.Feature(ee.Geometry.Point([-48.05376449173539, -1.2075928708680932]),{  "system:index": "14"}),
  ee.Feature(ee.Geometry.Point([-60.57953419000505, 0.11170372275832625]),{  "system:index": "15"}),
  ee.Feature(ee.Geometry.Point([-60.5108696392238, 0.3739997215432566]),{  "system:index": "16"}),
  ee.Feature(ee.Geometry.Point([-60.6976372173488, -0.10252955019544614]),{  "system:index": "17"}),
  ee.Feature(ee.Geometry.Point([-60.468297617739424, 0.45914150630518163]),{  "system:index": "18"}),
  ee.Feature(ee.Geometry.Point([-48.052975596021874, -1.8962537785752978]),{  "system:index": "19"}),
  ee.Feature(ee.Geometry.Point([-48.08799451692031, -1.9669380743513907]),{  "system:index": "20"}),
  ee.Feature(ee.Geometry.Point([-47.960278452467186, -2.044481474258408]),{  "system:index": "21"}),
  ee.Feature(ee.Geometry.Point([-47.87650770051406, -1.9950737143313346]),{  "system:index": "22"}),
  ee.Feature(ee.Geometry.Point([-48.171765268873436, -2.0252675241029845]),{  "system:index": "23"}),
  ee.Feature(ee.Geometry.Point([-48.309094370435936, -2.0081120188566994]),{  "system:index": "24"}),
  ee.Feature(ee.Geometry.Point([-48.16936200959609, -1.8042912632986803]),{  "system:index": "25"}),
  ee.Feature(ee.Geometry.Point([-48.10207074983047, -1.7878198672060117]),{  "system:index": "26"}),
  ee.Feature(ee.Geometry.Point([-48.31969320250789, -2.5586955150251827]),{  "system:index": "27"}),
  ee.Feature(ee.Geometry.Point([-60.696480384027545, -0.05259262242568806]),{  "system:index": "28"})
]);

var training_label = ee.Image("users/your_username/assets/reference_map_oil_palm")

var standardizeImage = require("users/agrosatelite_mapbiomas/mapbiomas_tutorial:collection8/utils/standardize_images.js").standardizeImage
var maskClouds = require("users/agrosatelite_mapbiomas/mapbiomas_tutorial:collection8/utils/cloud.js").maskCloudsC2

var startDate = '2020-01-01'
var endDate = '2021-01-01'

var maxCloudCover = 80
var bands = ['RED', 'NIR', 'SWIR1']


//  Criar tiles padronizados de 256 x 256 px
var chirp_scale                 = 30,
    chirp_size                  = 260,
    chirp_size_m                = chirp_scale * chirp_size

var new_tiles = ee.FeatureCollection(centroides_tiles_treino.map(function(ft){
          var chirp = ft.centroid().buffer(chirp_size_m/2).bounds()
          
          return chirp
  })
)


function getCollection (roi){
  
  var roi = roi.geometry()
  
  var filters = ee.Filter.and(
      ee.Filter.bounds(roi),
      ee.Filter.date(startDate, endDate),
      ee.Filter.lt('CLOUD_COVER', maxCloudCover)
    )
  
  var ls5 = ee.ImageCollection("LANDSAT/LT05/C02/T1_TOA").filter(filters)
  var ls7 = ee.ImageCollection("LANDSAT/LE07/C02/T1_TOA").filter(filters)
  var ls8 = ee.ImageCollection("LANDSAT/LC08/C02/T1_TOA").filter(filters)
  var ls9 = ee.ImageCollection("LANDSAT/LC09/C02/T1_TOA").filter(filters)
  
  var full_col = ls5.merge(ls7).merge(ls8).merge(ls9)
                  .map(standardizeImage)
                  .map(maskClouds)
                  .select(bands)

  
  return full_col
}


new_tiles.evaluate(function(feat){
    
      var mosaic_feat = feat.features.map(function(roi) {
  
        var tile_id = roi.id
        var folder_name_mosaic = 'oil_palm_train'
        var folder_name_masks = 'oil_palm_train'
        
              var mosaic = getCollection(ee.Feature(roi)).median().float()
              var label = training_label.clip(ee.Feature(roi)).byte()

            // exporting results
            Export.image.toDrive({
                image: mosaic.select(['RED','NIR', 'SWIR1']), 
                description: 'mosaic_' +tile_id, 
                folder: folder_name_mosaic, 
                fileNamePrefix: 'mosaic_'+tile_id, 
                region: ee.Feature(roi).geometry(), 
                scale: 30,
                maxPixels: 10e10, 
                fileFormat: 'GEOTIFF',
                crs: 'EPSG:3857'
              })
        
            Export.image.toDrive({
                image: label, 
                description: 'mask_' +tile_id, 
                folder: folder_name_masks, 
                fileNamePrefix: 'mask_'+tile_id, 
                region: ee.Feature(roi).geometry(),
                scale: 30,
                maxPixels: 10e10, 
                fileFormat: 'GEOTIFF',
                crs: 'EPSG:3857'
              }) 

              })
           
      return mosaic_feat

  })
