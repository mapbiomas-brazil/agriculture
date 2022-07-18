/**
 * @name
 *      SAVE MOSAIC FOR IRRIGATED RICE CLASSIFICATION
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
 

/************* DEFINE FUNCTIONS **************/

function filterLandsatCollection(landsatCollectionPath, roi, startDate, endDate){
  var filteredCollection = ee.ImageCollection(landsatCollectionPath)
      .filterDate(startDate, endDate)
      .filterBounds(roi);
  return filteredCollection;
}

var bandNames = ee.Dictionary({
  'LANDSAT_5': ['B1', 'B2', 'B3', 'B4', 'B5', 'B7', 'B6', 'BQA'],
  'LANDSAT_7': ['B1', 'B2', 'B3', 'B4', 'B5', 'B7', 'B6_VCID_1', 'BQA'],
  'LANDSAT_8': ['B2', 'B3','B4', 'B5', 'B6', 'B7', 'B10', 'BQA']
});

function padronizeBandNames(image){
  var oldBandNames = bandNames.get(image.get('SPACECRAFT_ID'))
  var newBandNames = ['blue', 'green', 'red',  'nir', 'swir1', 'swir2', 'tir1', 'BQA']
  return image.select(oldBandNames, newBandNames)
}

var qaBits57 = ee.List([
  [0, 0, 0], //  Designated Fill
  [1, 1, 0], // Designated Pixel
  [4, 4, 0], // cloud-free
  [7, 8, 1]  // Cloud Shadow Confidence is Low
]);

var qaBits8 = ee.List([
  [0, 0, 0],
  [1, 1, 0],
  [4, 4, 0],
  [5, 6, 1],
  [7, 8, 1],
  [11, 12, 1]
]);

function getQABits(image, start, end) {
    var pattern = ee.Number(ee.List.sequence(start, end).distinct().iterate(function(i, pattern){
      i = ee.Number(i);
      pattern = ee.Number(pattern);

      return pattern.add(ee.Number(2).pow(i));
    }, ee.Number(0)));

    return image.select(0).bitwiseAnd(pattern.int()).rightShift(start);
}

var qaBitsDict = ee.Dictionary({

  'LANDSAT_8': qaBits8,
  'LANDSAT_5': qaBits57,
  'LANDSAT_7': qaBits57
  
});

function maskClouds(image){
  var qaBits = ee.List(qaBitsDict.get(image.getString('SPACECRAFT_ID')));
  var bqa = image.select('BQA');


  var inital_state = ee.Dictionary({
    'bqa': bqa,
    'mask': ee.Image(1)  
  });
  
  var finalState = ee.Dictionary(qaBits.iterate(function(bits, state){
    bits = ee.List(bits);
    state = ee.Dictionary(state);
    
    var bqa = ee.Image(state.get('bqa'));
    var mask = ee.Image(state.get('mask'));

    var start = bits.getNumber(0);
    var end = bits.getNumber(1);
    var desired = bits.getNumber(2);

    var blueprint = getQABits(bqa, start, end).eq(desired);

    return ee.Dictionary({
        'bqa': bqa,
        'mask': mask.updateMask(blueprint)
    });
    
  }, inital_state));
  
  var cloudMask = ee.Image(finalState.get('mask'));

  return image.updateMask(cloudMask);
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
    
/************* END DEFINE FUNCTIONS**************/



/************* SETTINGS **************/

// set the output path for the classification results:

var outputCollection = 'users/your_username/MAPBIOMAS/C6/AGRICULTURE/RICE/RESULTS/MOSAIC'

// import states
var estados = ee.FeatureCollection('users/agrosatelite_mapbiomas/REGIONS/ibge_estados_2019')

// import grid to save rice mosaics
var gridRice = ee.FeatureCollection("users/agrosatelite_mapbiomas/COLECAO_6/GRIDS/GRID_BRAZIL_RICE")


// set year to map
var year = 2019


// set state to map

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
    bands: ['cei_EVI2','evi2_offseason', 'swir1_offseason', 'swir2_offseason', 'cei_NDWI'],
  },
  
  'TO': {
    uf: 'TO',
    season_startDate : (year) +'-04-01',
    season_endDate : year +'-07-30',
    offseason_startDate : (year - 1)  +'-08-01',
    offseason_endDate : (year - 1) +'-11-01',
    bands: ['swir2_offseason', 'cei_EVI2','evi2_offseason', 'swir1_offseason', 'cei_NDWI'],
  },
  
  
} 


/************* END SETTINGS **************/



// chose state to save mosaics

var select = ui.Select({
  items: Object.keys(settings_uf),
  onChange: function(key) {
  Map.layers().reset()

  // var state_uf = key
 

  var l5Collection = ee.ImageCollection(filterLandsatCollection("LANDSAT/LT05/C01/T1_TOA", gridRice, "2000-01-01", "2011-10-01"));
  var l7Collection1 = ee.ImageCollection(filterLandsatCollection("LANDSAT/LE07/C01/T1_TOA", gridRice, "2000-01-01", "2003-05-31"));
  var l7Collection2 = ee.ImageCollection(filterLandsatCollection("LANDSAT/LE07/C01/T1_TOA", gridRice, "2011-10-01", "2013-03-01"));
  var l8Collection = ee.ImageCollection(filterLandsatCollection("LANDSAT/LC08/C01/T1_TOA", gridRice, "2013-03-01", "2020-01-01"));
  
  var collection = l8Collection.merge(l5Collection).merge(l7Collection1).merge(l7Collection2)
                    .map(padronizeBandNames)
                    .map(maskClouds)
                  .map(getEVI2)
                  .map(getNDWI)
                  .map(getCeusius)


    // var key =   state_uf

    var year = settings_uf[key].ano
    
    var season_startDate = settings_uf[key].season_startDate
    var season_endDate = settings_uf[key].season_endDate
    var offseason_startDate = settings_uf[key].offseason_startDate
    var offseason_endDate = settings_uf[key].offseason_endDate
    
    
    // print (settings_uf[key].uf, settings_uf[key].season_startDate, settings_uf[key].season_endDate, settings_uf[key].offseason_startDate, settings_uf[key].offseason_endDate)
    
    var region = estados.filter(ee.Filter.equals('SIGLA_UF', settings_uf[key].uf))
    var grid = gridRice.filterBounds(region)
    
   
    
    var season_mosaic = collection.filterDate(season_startDate, season_endDate).filterBounds(grid).qualityMosaic('evi2')
    
    var WetNewNames = season_mosaic.bandNames().map(function(band) {
                              return ee.String(band).cat("_").cat('season')})
    season_mosaic = season_mosaic.rename(WetNewNames)
    
    
    var offseason_mosaic = collection.filterDate(offseason_startDate, offseason_endDate).filterBounds(grid).min()
    
    var DryNewNames = offseason_mosaic.bandNames().map(function(band) {
                              return ee.String(band).cat("_").cat('offseason')})
    offseason_mosaic = offseason_mosaic.rename(DryNewNames)
    
    var mosaic = season_mosaic.addBands(offseason_mosaic)
    
    // print (mosaic.bandNames())
    
    var ceiAgric   = mosaic.expression('100*(WET_max - DRY_min) / (100+WET_max + 100+DRY_min)', {
      'WET_max': mosaic.select(['evi2_season', 'ndwi_season']),
      'DRY_min': mosaic.select(['evi2_offseason', 'ndwi_offseason']),
    }).rename(['cei_EVI2', 'cei_NDWI'])

    var mosaic = mosaic.addBands(ceiAgric)
    
    var mosaicUnet = mosaic.select(settings_uf[key].bands)
    
    var mask_uf = ee.Image(1).clip(estados.filterMetadata('SIGLA_UF', 'equals', settings_uf[key].uf))
    
    Map.addLayer(mosaicUnet.updateMask(mask_uf), {min: 0, max:0.5}, settings_uf[key].uf + ' mosaic')
    Map.addLayer(grid, {}, settings_uf[key].uf + ' grid')
                      
                      
        
    var currentPoint = null;

    Map.onClick(function(latlong){
      var currentPoint = ee.Geometry.Point([latlong.lon, latlong.lat]);
      
      var roi = grid.filterBounds(currentPoint)
      var mosaic_toExport = mosaicUnet.unmask().clip(roi).multiply(255).int16()
      
      Export.image.toDrive({
        image: mosaic_toExport,
        description: 'mosaic_to_classify',
        folder: 'irrigated_rice/predict',
        fileNamePrefix: 'mosaic_to_classify',
        region: roi,
        crs: 'EPSG:3857',
        maxPixels: 1E13,
        shardSize: 32,
        scale: 30
      });
    })

      

    }

});





var header = ui.Label('Save Mosaic to Irrigated Rice  classification -  MapBiomas Collection 6', {fontSize: '24px', color: 'blue'});

var text2 = ui.Label('Choose a state to save mosaic: ', {fontSize: '14px', color: 'black'});
var text3 = ui.Label('Click on a polygon to export the mosaic to your Google Drive, then go to Google Colab and run sorting of the saved mosaic using U-net.', {fontSize: '12px', color: 'black'});

var toolPanel = ui.Panel([header, text2], 'flow', {width: '300px'});
ui.root.widgets().add(toolPanel);
toolPanel.add(select);
toolPanel.add(text3)