/**
 * @name 
 *      MapBiomas Random Forest Classification
 *  
 * @description
 *  
 * @author
 *      Remap
 *      mapbiomas@remapgeo.com
 *
 * @version
 *  MapBiomas Colection 9.0
 * 
 */
 

function filterLandsatCollection(landsatCollectionPath, roi, startDate, endDate){
    var filteredCollection = ee.ImageCollection(landsatCollectionPath)
        .filterDate(startDate, endDate)
        .filterBounds(roi);
    return filteredCollection;
  }
  
  var bandNames = ee.Dictionary({
    'LANDSAT_5': ['B1', 'B2', 'B3', 'B4', 'B5', 'B7', 'B6', 'QA_PIXEL'],
    'LANDSAT_7': ['B1', 'B2', 'B3', 'B4', 'B5', 'B7', 'B6_VCID_1','QA_PIXEL'],
    'LANDSAT_8': ['B2', 'B3','B4', 'B5', 'B6', 'B7', 'B10', 'QA_PIXEL'],
    'LANDSAT_9': ['B2', 'B3','B4', 'B5', 'B6', 'B7', 'B10', 'QA_PIXEL']
  });
  
  
  function padronizeBandNames(image){
    var oldBandNames = bandNames.get(image.get('SPACECRAFT_ID'));
    var newBandNames = ['blue', 'green', 'red', 'nir', 'swir1', 'swir2', 'tir1', 'BQA'];
    return image.select(oldBandNames, newBandNames);
  }

  function maskClouds(image){
    var qa = image.select('BQA')
    var mask = qa.bitwiseAnd(1 << 3).and(qa.bitwiseAnd(1 << 8).or(qa.bitwiseAnd(1 << 9))) // Cloud with any confidence level
              .or(qa.bitwiseAnd(1 << 1)) // Dilated cloud  
              .or(qa.bitwiseAnd(1 << 4).and(qa.bitwiseAnd(1 << 10).or(qa.bitwiseAnd(1 << 11)))) // Cloud shadow
              .or(qa.bitwiseAnd(1 << 5)) // Snow  
              .or(qa.bitwiseAnd(1 << 7)) // Water  
              .or(qa.bitwiseAnd(1 << 14).and(qa.bitwiseAnd(1 << 15))) // Cirrus (high confidence)
    
    return image.updateMask(mask.not())
  }

  function getCeusius(image){
      var tirC = image.select('tir1').subtract(273.5).divide(100).rename('TIR1_c')
      return image.addBands(tirC)}
  
  function getEVI2(image){
      var exp = '2.5 * (b("nir") - b("red")) / (b("nir") + (2.4 * b("red")) + 1)'
      var evi2 = image.expression(exp).rename(["evi2"])
      return image.addBands(evi2)}
  
  function getNDWI(image){
      var exp = 'float(b("nir") - b("swir1"))/(b("nir") + b("swir1"))'
      var ndwi = image.expression(exp).rename(["ndwi"])
      return image.addBands(ndwi)}
      
  
  // set the output path for the classification results:
  var outputCollection = 'users/your_username/MAPBIOMAS/C6/AGRICULTURE/RICE/RESULTS/MOSAIC'
  
  // import states
  var estados = ee.FeatureCollection('projects/mapbiomas-workspace/AUXILIAR/estados-2016')
    
  var PA = ee.Feature(ee.Geometry.Polygon([[[-49.149348825021846, -0.5775343224299616],[-49.149348825021846, -1.1516738488867537],[-48.44313392023669, -1.1516738488867537],[-48.44313392023669, -0.5775343224299616]]], null, false),{"system:index": "0","id": 1});
  var gridRice = ee.FeatureCollection("users/testesMapBiomas/Teste_Arroz/GRID_ARROZ_2").merge(PA)
  
  var reference = ee.Image('users/your_user/assets/COLECAO_9/RICE/RICE_REFERENCE')
  
  var cloudCoverValue = 80
  
  var years = [2023]
  
  var selected_UFs = ['SC']
  
  var settings_uf = {
      
    'RS': {
      uf: 'RS',
      season_startDate : (year - 1) +'-10-01',
      season_endDate : year +'-04-01',
      offseason_startDate : (year - 1)  +'-10-01',
      offseason_endDate : year +'-01-01',
      bands: ['cei_EVI2', 'swir1_season', 'swir2_season', 'TIR1_c_season']
    },
    
    'SC': {
      uf: 'SC',
      season_startDate : (year - 1) +'-10-01',
      season_endDate : year +'-04-30',
      offseason_startDate : year  +'-01-01',
      offseason_endDate : year +'-07-30',
      bands: ['cei_EVI2', 'cei_NDWI', 'swir2_offseason'],
    },
    'PR': {
      uf: 'PR',
      season_startDate : (year - 1) +'-10-01',
      season_endDate : year +'-04-30',
      offseason_startDate : year  +'-01-01',
      offseason_endDate : year +'-07-30',
      bands: ['cei_EVI2', 'cei_NDWI', 'swir2_offseason'],
    },
      'MS': {
      uf: 'MS',
      season_startDate : (year - 1) +'-10-01',
      season_endDate : year +'-04-30',
      offseason_startDate : year  +'-01-01',
      offseason_endDate : year +'-07-30',
      bands: ['cei_EVI2', 'cei_NDWI', 'swir2_offseason'],
    },
    
    'TO': {
      uf: 'TO',
      season_startDate : (year) +'-04-01',
      season_endDate : year +'-07-30',
      offseason_startDate : (year - 1)  +'-08-01',
      offseason_endDate : (year - 1) +'-11-01',
      bands: ['swir2_offseason', 'cei_EVI2','evi2_offseason', 'swir1_offseason', 'cei_NDWI'],
    },
      'GO': {
      uf: 'GO',
      season_startDate : (year) +'-04-01',
      season_endDate : year +'-07-30',
      offseason_startDate : (year - 1)  +'-08-01',
      offseason_endDate : (year - 1) +'-11-01',
      bands: ['swir2_offseason', 'cei_EVI2','evi2_offseason', 'swir1_offseason', 'cei_NDWI'],
    },
    
    'PA': {
      uf: 'PA',
      season_startDate : (year - 1) +'-08-01',
      season_endDate : (year) +'-01-30',
      offseason_startDate : (year - 1)  +'-05-01',
      offseason_endDate : (year - 1) +'-08-01',
      bands: ['swir2_offseason', 'cei_EVI2','evi2_offseason', 'swir1_offseason', 'cei_NDWI'],
    },
    
  }
  
  years.forEach(function(year){
  
    selected_UFs.forEach(function(key){
      
      var state = settings_uf[key];
  
      var region = estados.filter(ee.Filter.equals('SIGLA_UF', settings_uf[key].uf))
      var grid = gridRice.filterBounds(region.geometry())
  
      var l5Collection = ee.ImageCollection(filterLandsatCollection("LANDSAT/LT05/C02/T1_TOA", grid, "1984-01-01", "2011-10-01", cloudCoverValue));
      var l7Collection1 = ee.ImageCollection(filterLandsatCollection("LANDSAT/LE07/C02/T1_TOA", grid, "1999-01-01", "2003-05-31", cloudCoverValue));
      var l7Collection2 = ee.ImageCollection(filterLandsatCollection("LANDSAT/LE07/C02/T1_TOA", grid, "2011-10-01", "2013-03-01", cloudCoverValue));
      var l8Collection = ee.ImageCollection(filterLandsatCollection("LANDSAT/LC08/C02/T1_TOA", grid, "2013-03-01", "2030-01-01", cloudCoverValue));
      var l9Collection = ee.ImageCollection(filterLandsatCollection("LANDSAT/LC09/C02/T1_TOA", grid, "2019-03-01", "2030-01-01", cloudCoverValue));
      
      var collection = l8Collection.merge(l9Collection).merge(l7Collection1).merge(l7Collection2).merge(l5Collection)
        .map(padronizeBandNames)
        .map(maskClouds)
        .map(getEVI2)
        .map(getNDWI)
        .map(getCeusius)
  
      var season_startDate = settings_uf[key].season_startDate
      var season_endDate = settings_uf[key].season_endDate
      var offseason_startDate = settings_uf[key].offseason_startDate
      var offseason_endDate = settings_uf[key].offseason_endDate
    
      var season_mosaic = collection.filterDate(season_startDate, season_endDate).filterBounds(grid).qualityMosaic('evi2')
      
      var WetNewNames = season_mosaic.bandNames().map(function(band) {
                                return ee.String(band).cat("_").cat('season')})
      season_mosaic = season_mosaic.rename(WetNewNames)
      
      var offseason_mosaic = collection.filterDate(offseason_startDate, offseason_endDate).filterBounds(grid).min()
      
      var DryNewNames = offseason_mosaic.bandNames().map(function(band) {
                                return ee.String(band).cat("_").cat('offseason')})
      offseason_mosaic = offseason_mosaic.rename(DryNewNames)
      
      var mosaic = season_mosaic.addBands(offseason_mosaic)
  
      
      var ceiAgric   = mosaic.expression('100*(WET_max - DRY_min) / (100+WET_max + 100+DRY_min)', {
        'WET_max': mosaic.select(['evi2_season', 'ndwi_season']),
        'DRY_min': mosaic.select(['evi2_offseason', 'ndwi_offseason']),
      }).rename(['cei_EVI2', 'cei_NDWI'])
  
      var mosaic = mosaic.addBands(ceiAgric)
      
      var mosaicUnet = mosaic//.select(settings_uf[key].bands)
      
      var mask_uf = ee.Image(1).clip(estados.filterMetadata('SIGLA_UF', 'equals', settings_uf[key].uf))
  
      var img_col = ee.ImageCollection([])
      var list = ee.List([])
      
      grid.evaluate(function(gr){
  
        var result =  gr.features.map(function(id){
  
          var filename = id.properties.id + '_' + year
          var roi = ee.Feature(id)
             
          var mosaic_toExport = mosaicUnet.unmask().clip(roi)
  
          var train = mosaic_toExport
              .addBands(reference.clip(roi).select([0], ["class"]));
        
          var training = train.sample({
            'region': region.geometry(),
            'scale': 30,
            'numPixels': 1000,
            'tileScale': 4,
            'geometries': true
          });
          
          var classifier = ee.Classifier
                .smileRandomForest(100)
                .train(training, 'class', mosaic_toExport.bandNames());
  
          var classifier_prob = classifier.setOutputMode('PROBABILITY')
          var classified_prob = mosaic_toExport.classify(classifier_prob)
          var img_max_prop = classified_prob.multiply(100).toInt8().rename(key)
  
          return img_max_prop
        })
      
        img_col = img_col.merge(ee.ImageCollection(result))
       
        var result_img = img_col.max()
  
        Export.image.toAsset({
          image: result_img.set('year', year), 
          description: 'RICE_' + key + '_' + year, 
          assetId: outputCollection + '/' +  'RICE_' + key + '_' + year, 
          region: grid, 
          scale: 30, 
          maxPixels: 1.0E13
        })
  
      })                  
  
    })
    
  })
  
  
  