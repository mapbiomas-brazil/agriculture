// set the input path to the raw classification result:
var input = 'users/your_username/MAPBIOMAS/C5/AGRICULTURE/SUGARCANE/RESULTS/RAW';

// set the path for the filtered result:
var output = 'users/your_username/MAPBIOMAS/C5/AGRICULTURE/SUGARCANE/RESULTS/TEMPORAL_SPATIAL_FILTERED';

// set the years interval you want to filter
var startYear = 2015
var endYear = 2019

var brasilMask = ee.Image("users/agrosatelite_mapbiomas/COLECAO_5/PUBLIC/GRIDS/BIOMAS_IBGE_250K_BUFFER");

var classOfInterest = 1;
var years = range(startYear, endYear - startYear + 1);

/** TEMPORAL FILTER SETTINGS **/
var offset = 2;
var globalThreshold = 2;

/** SPATIAL FILTER SETTINGS **/
var minConnectPixel = 6

var imageCollection = ee.List.sequence(startYear, endYear)
  .map(function(year) {
    var yearMosaic = ee.ImageCollection(input)
      .filterMetadata('year', 'equals', year)
      .max();
    
    return yearMosaic.set('year', year)
  })

var collection = ee.ImageCollection(imageCollection).sort('year').toList(40);

function range(start, count) {
  return Array.apply(0, Array(count))
    .map(function (element, index) { 
      return index + start;  
  });
}

var breakList = function(list, index, offset, min, max, threshold){
  var start = index - offset
  var end = index + offset
  if(start < min){
    threshold = 1 + threshold + start
    start = min
  }
  if(end > max){
    threshold = 1 + threshold + (max - end)
    end = max
  }
  var left = list.slice(start, index)
  var center = ee.Image(list.get(index))
  var right = list.slice(index + 1, end + 1)
  return [left, center, right, threshold]
}

var images = [];

for(var index=0; index <= years.length - 1; index++) {
  
  /** TEMPORAL FILTER **/
  
  var nodes = breakList(collection, index, offset, 0, years.length - 1, globalThreshold);
  var left = nodes[0] 
  var center = nodes[1] 
  var right = nodes[2] 
  var threshold = nodes[3]
  
  var year = years[index];

  center = center.unmask(null).eq(classOfInterest);
  left = ee.ImageCollection(left);
  right = ee.ImageCollection(right);

  var sides = ee.ImageCollection(left.merge(right)).map(function(img){
    return ee.Image(img).eq(classOfInterest);
  }).sum();
  
  var mask = center.add(sides.eq(0)).neq(2);
  var image = center.add(sides).gte(threshold + 1);

  var temporalFiltered = ee.Image(center.add(image)).updateMask(mask).gte(1)
    .set('year', year);

  collection = collection.set(index, temporalFiltered);

  /** SPATIAL_FILTER **/

  var kernel_ = [[1, 1, 1, 1, 1],
            [1, 2, 2, 2, 1],
            [1, 2, 2, 2, 1],
            [1, 2, 2, 2, 1],
            [1, 1, 1, 1, 1]];
            
  var kernel = ee.Kernel.fixed(5, 5, kernel_, -2, -2, false);
  
  var temporalSpatialFiltered = temporalFiltered
    .unmask(null)
    .convolve(kernel)
    .gte(15)
    .selfMask();
   
  images.push(temporalSpatialFiltered.rename("classification_" + year));
}

var image = ee.Image(images);

var vis = {
  bands: ['classification_' + endYear],
  min: 0,
  max: 1,
  palette: ['WHITE', 'BLACK'],
  format: 'png'
}

var raw = ee.ImageCollection(imageCollection).filterMetadata('year', 'equals', endYear).first().rename('classification_' + endYear)

Map.addLayer(raw.unmask(), vis, 'Raw')
Map.addLayer(image.unmask(), vis, 'Temporal-Spatial Filtered')


var filename = 'suga_cane_temporal_filter';

Export.image.toAsset({
  image: image.byte(),
  description: filename,
  assetId: output,
  scale: 30,
  region: brasilMask.geometry(),
  maxPixels: 1.0E13,
});