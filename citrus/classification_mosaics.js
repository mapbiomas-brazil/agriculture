// you can import this geometry to the map and move to elsewhere
var geometry =
  /* color: #d63000 */
  /* displayProperties: [
    {
      "type": "rectangle"
    }
  ] */
  ee.Geometry.Polygon(
    [[[-49.37140889889588, -22.188240856482484],
    [-49.37140889889588, -22.277224362483903],
    [-49.25759740597596, -22.277224362483903],
    [-49.25759740597596, -22.188240856482484]]], null, false);

var getNormalizedCollection = require("users/agrosatelite_mapbiomas/mapbiomas_tutorial:collection6/utils/normalization.js").getNormalizedCollection;

// set the year you want to classify
var year = 2020

var roi = geometry // you can change the region of interest on the map

var startDate = year + '-01-01'
var endDate = (year + 1) + '-01-01'
var maxCloudCover = 80
var maxImages = 5;

var bands = ['RED', 'NIR', 'SWIR1']

var wrsGrid = ee.FeatureCollection('users/agrosatelite_mapbiomas/COLECAO_6/GRIDS/BRASIL_COMPLETO')
  .filterBounds(geometry)
  .aside(Map.addLayer, {}, 'wrs', false)

var collection = wrsGrid.map(function (wrsRoi) {
  var images = getNormalizedCollection(wrsRoi.geometry(30).centroid(30), startDate, endDate, maxCloudCover)

  var spacecraft = 'LANDSAT_8'

  if (year === 2012) {
    spacecraft = 'LANDSAT_7'
  }

  if (year < 2012) {
    spacecraft = 'LANDSAT_5'
  }

  return images
    .filterMetadata('SPACECRAFT_ID', 'equals', spacecraft)
    .limit(maxImages, 'CLOUD_COVER_LAND')
})

collection = ee.ImageCollection(collection)
  .flatten()
  .map(function (image) {
    image = ee.Image(image)

    var cloudMask = image.select(['QA_SCORE']).eq(1);

    return image
      .updateMask(cloudMask)
      .select(ee.List(bands));
  })

var mosaic = ee.ImageCollection(collection)
  .median()
  .multiply(10000)
  .int16()

Map.addLayer(mosaic, { bands: ['NIR', 'SWIR1', 'RED'] }, 'Mosaic')

Export.image.toDrive({
  image: mosaic.select(bands).set('year', year),
  description: 'CITRUS_MOSAIC_' + year,
  folder: 'MAPBIOMAS-PRIVATE',
  fileNamePrefix: 'CITRUS_MOSAIC_' + year,
  region: geometry,
  scale: 30,
  maxPixels: 10e10,
  fileFormat: 'GEOTIFF',
  crs: 'EPSG:3857'
})

