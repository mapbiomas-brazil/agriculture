/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var geometry = /* color: #98ff00 */ee.Geometry.Point([-54.275403435416706, 2.7572551967601986]);
/***** End of imports. If edited, may not auto-convert in the playground. *****/
function cloudMask(image){
  /*
  Returns a cloud mask with 1=cloud and 0=non cloud
  */
  var qaBits57 = [
    [0, 0, 0],
    [1, 1, 0],
    [4, 4, 0],
    [5, 6, 1],
    [7, 8, 1]
  ]
  
  var qaBits8 = [
    [0, 0, 0],
    [1, 1, 0],
    [4, 4, 0],
    [5, 6, 1],
    [7, 8, 1],
    [11, 12, 1]
  ]
  
  var maskS2clouds = function (image) {
    var qa = image.select('QA60');
    // Bits 10 and 11 are clouds and cirrus, respectively.
    var cloudBitMask = Math.pow(2, 10);
    var cirrusBitMask = Math.pow(2, 11);
    // Both flags should be set to zero, indicating clear conditions.
    var mask = qa.bitwiseAnd(cloudBitMask).eq(0).and(qa.bitwiseAnd(cirrusBitMask).eq(0));
    // Return the masked and scaled data.
    return mask
  }
  
  var calcMask = function(image, qaBits){
    var bqa = image.select(['BQA'])
    var cloud_mask = ee.Image(1).rename('BQA')
    for(var k=0; k<qaBits.length; k++){
        var start  = qaBits[k][0]
        var end    = qaBits[k][1]
        var desired= qaBits[k][2] 
        var pattern = 0
        for(var i=start; i<end + 1; i++){
            pattern = pattern + Math.pow(2, i)
        }
        var blueprint = ee.Image(bqa).bitwiseAnd(parseInt(pattern)).rightShift(start).eq(desired)
        cloud_mask = cloud_mask.updateMask(blueprint)
    }
    return cloud_mask
  }
  
  return ee.Image(ee.Algorithms.If(ee.List(["LANDSAT_5", "LANDSAT_7"]).containsAll([image.get('SPACECRAFT_ID')]), 
        calcMask(image, qaBits57), 
        ee.Algorithms.If(ee.List(["LANDSAT_8"]).containsAll([image.get('SPACECRAFT_ID')]),
          calcMask(image, qaBits8),
          ee.Algorithms.If(ee.List(["Sentinel-2A", "Sentinel-2B"]).containsAll([image.get('SPACECRAFT_NAME')]),
            maskS2clouds(image),
            ee.Image(0)))))
        .unmask()
        .not()
        .clip(image.geometry())
}

function cloudScore(image){
  /*
    0: Nodata
    1: Clear sky
    2: Snow/Ice
    3: Terrain Occlusion
    4: Cirrus
    5: Cloud shadow
    6: Cloud
  */
  var qaBits57 = [
    //  Bits 9-10: Snow / Ice Confidence    0: Not Determined 1: Low 2: Medium 3: High
    [9, 10, 3, 2],
    
    // //  Bits 7-8: Cloud Shadow Confidence  0: Not Determined 1: Low 2: Medium 3: High
    [7, 8, 3, 5],
    
    //  Bits 5-6: Cloud Confidence         0: Not Determined 1: Low 2: Medium 3: High
    [5, 6, 3, 6],
  ]
  
  var qaBits8 = [
    //  Bits 9-10: Snow / Ice Confidence    0: Not Determined 1: Low 2: Medium 3: High
    [9, 10, 3, 2],
    
    //  Bit 1:  Terrain Occlusion          0:no 1:yes
    [1, 1, 1, 3], 
    
    //  Bits 11-12: Cirrus Confidence     0: Not Determined 1: Low 2: Medium 3: High 
    [11, 12, 3, 4],

    //  Bits 7-8: Cloud Shadow Confidence  0: Not Determined 1: Low 2: Medium 3: High
    [7, 8, 3, 5],
  
    // //  Bits 5-6: Cloud Confidence         0: Not Determined 1: Low 2: Medium 3: High
    [5, 6, 3, 6], 
  ]
  
  var calcMask = function(image, qaBits){
    var bqa = image.select('BQA');
    var cloud_mask = bqa.eq(bqa).rename('QF');
    for(var k=0; k<qaBits.length; k++){
        var start   = qaBits[k][0];
        var end     = qaBits[k][1];
        var desired = qaBits[k][2];
        var QFValue = qaBits[k][3];
        
        var blueprint = getQABits(bqa, start, end).eq(desired).multiply(QFValue);
        // Map.addLayer(blueprint, {min:0, max: 1}, start + "-" + end + "=" + desired, false);
        cloud_mask = cloud_mask.blend(blueprint.selfMask())
    }
    return cloud_mask.unmask().byte();
  }
   
  return ee.Image(ee.Algorithms.If(ee.List(["LANDSAT_5", "LANDSAT_7"]).containsAll([image.get('SPACECRAFT_ID')]), 
        calcMask(image, qaBits57), 
        ee.Algorithms.If(ee.List(["LANDSAT_8"]).containsAll([image.get('SPACECRAFT_ID')]),
          calcMask(image, qaBits8),
            ee.Image(1))))
        .clip(image.geometry())
}

function getQABits(image, start, end) {
    var pattern = 0;
    for (var i = start; i <= end; i++) {
       pattern += 1 << i;
    }
    return image.select(0).bitwiseAnd(pattern).rightShift(start);
};

// var col = ee.ImageCollection('LANDSAT/LC08/C01/T1_TOA')
//   .filterDate("2019-06-01", "2019-10-01")
//   .filterBounds(geometry)

// var image = col.first()

// var cMask = cloudMask(image);
// var cScore = cloudScore(image)

// Map.addLayer(image.select("B5", "B6", "B4"), {'min': 0.1, 'max': 0.4})
// Map.addLayer(cMask, {'min': 0, 'max': 1}, "cMask", false)
// Map.addLayer(cScore, {'min': 0, 'max': 6, 'palette': 'ffffff,3b5cff,25f5ff,7e8bc8,ffe73f,ff9425,ff0000'})

exports.cloudMask = cloudMask;
exports.cloudScore = cloudScore;
exports.getQABits = getQABits;