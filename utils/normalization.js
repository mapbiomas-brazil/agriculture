var cloudLib = require("users/username/repository:utils/cloud.js");
    
var MODIS_COL = "MODIS/006/MOD09A1";
var MODIS_CADENCE = 8;
var MODIS_CLOUDMASK = mod09a1MaskClouds;
var MODIS_BANDS = ["sur_refl_b03", "sur_refl_b04", "sur_refl_b01", "sur_refl_b02", "sur_refl_b06", "sur_refl_b07"];
var MODIS_BANDS_SCALES = [0.0001, 0.0001, 0.0001, 0.0001, 0.0001, 0.0001]; 
var MODIS_QABAND = "StateQA";

var LANDSAT_5_BANDS = ["B1", "B2", "B3", "B4", "B5", "B7"];
var LANDSAT_7_BANDS = ["B1", "B2", "B3", "B4", "B5", "B7"];
var LANDSAT_8_BANDS = ["B2", "B3","B4", "B5", "B6", "B7"];
var NEW_BANDS       = ["BLUE", "GREEN", "RED", "NIR", "SWIR1", "SWIR2"];

var LANDSAT_7_THERMAL_BAND = "B6_VCID_1";
var LANDSAT_5_THERMAL_BAND = "B6";
var LANDSAT_8_THERMAL_BAND = "B10";
var NEW_THERMAL_BAND = "TIR1";

var PSINV_PIXELS_BAND = "PSINV_PIXELS_MASK";

var NORMALIZATION_TARGET = "users/agrosatelite_mapbiomas/COLECAO_5/PUBLIC/BLARD/MODIS_2000_2019_NORMALIZATION_TARGET";

var CFACTOR = 0.05;

var MIN_PSINV_PIXELS_COUNT = 5000;

var debug = false;

function applyHistogramMatching(landsatImage){
  landsatImage = ee.Image(landsatImage);
    
  var qaBand = landsatImage.select("BQA");
  var thermalBand = landsatImage.select(NEW_THERMAL_BAND);

  var roi = landsatImage.geometry();
  var normalizationTarget = ee.Image(getNormalizationTarget(roi));
  
  var landsatCloudMask = ee.Image(cloudScore(landsatImage)).eq(1);
  var landsatPseudoInvariantMask = landsatCloudMask.updateMask(landsatImage.select(PSINV_PIXELS_BAND));
  
  var intercalibration = ee.Image(intercalibrate(
    landsatImage,
    landsatPseudoInvariantMask,
    30,
    normalizationTarget,
    landsatPseudoInvariantMask,
    30,
    ee.List(NEW_BANDS)
  ));

  return ee.Image(intercalibration
    .addBands(thermalBand)
    .addBands(qaBand)
    .copyProperties(landsatImage, landsatImage.propertyNames()));
}

// Intercalibration

function intercalibrate(image, imageMask, imageScale, reference, referenceMask, referenceScale, bands){
  
  image = image.select(bands);
  reference = reference.select(bands);
  
  var bandsMean = bands.map(function(band){return ee.String(band).cat("_mean")});
  var bandsStdev = bands.map(function(band){return ee.String(band).cat("_stdDev")});
  
  var imageROI = image.geometry();
  
  var reduceMean = function(img, mask, scale) {
    return img
      .updateMask(mask)
      .reduceRegion({
        reducer: ee.Reducer.mean().combine(ee.Reducer.stdDev(), null, true),
        geometry: imageROI, 
        scale: scale,
        maxPixels: 1E13,
        bestEffort: true, 
        tileScale: 4
      });
  };
  
  var mask = imageMask.eq(1).and(referenceMask.eq(1));
  
  var imageStats = reduceMean(image, mask, imageScale);
  var referenceStats = reduceMean(reference, mask, referenceScale);

  var image_means = ee.Image.constant(imageStats.values(bandsMean));
  var image_stdDev = ee.Image.constant(imageStats.values(bandsStdev));
  
  var reference_means = ee.Image.constant(referenceStats.values(bandsMean));
  var reference_stdDev = ee.Image.constant(referenceStats.values(bandsStdev));
  
  var a = reference_stdDev.divide(image_stdDev);
  var b = reference_means.subtract(a.multiply(image_means));
  
  if(debug){
    print(ee.Dictionary({"gain": a, "bias": b}));
  }

  var inter = image.multiply(a).add(b).clip(imageROI);
  
  return ee.Image(inter.copyProperties(image, image.propertyNames()));
}

function padronizeLandsatBands(image){
  var qa = image.select("BQA").int();
  var renamedImage = ee.Image(ee.Algorithms.If(ee.Algorithms.IsEqual("LANDSAT_5", image.get('SPACECRAFT_ID')),
    image.select(LANDSAT_5_BANDS.concat([LANDSAT_5_THERMAL_BAND, "BQA"]), NEW_BANDS.concat([NEW_THERMAL_BAND, "BQA"])),
    ee.Algorithms.If(ee.Algorithms.IsEqual("LANDSAT_7", image.get('SPACECRAFT_ID')),
      image.select(LANDSAT_7_BANDS.concat([LANDSAT_7_THERMAL_BAND, "BQA"]), NEW_BANDS.concat([NEW_THERMAL_BAND, "BQA"])),
      ee.Algorithms.If(ee.Algorithms.IsEqual("LANDSAT_8", image.get('SPACECRAFT_ID')),
        image.select(LANDSAT_8_BANDS.concat([LANDSAT_8_THERMAL_BAND, "BQA"]), NEW_BANDS.concat([NEW_THERMAL_BAND, "BQA"])),
        ee.Image(0)
      ))));
      
  return ee.Image(renamedImage
    .addBands(renamedImage.select(NEW_BANDS.concat([NEW_THERMAL_BAND])).float(), null, true)
    .addBands(qa, null, true)
    .copyProperties(image, image.propertyNames()));
}

function getQABits(image, start, end) {
    var pattern = 0;
    for (var i = start; i <= end; i++) {
       pattern += 1 << i;
    }
    return image.select(0).bitwiseAnd(pattern).rightShift(start);
}

/*
  return 1 cloud 0 no cloud
*/
function mod09a1MaskClouds(image) {
  // Select the QA band.
  var qa = image.select('StateQA');
  
  //  0 - Good data, use with confidence 
  //  1 - Marginal data, useful but look at detailed QA for more information  
  
  var cloudFree = getQABits(qa, 0, 1).eq(0);
  var cloudShadowFree = getQABits(qa, 2).eq(0);
  var land = getQABits(qa, 3, 5).eq(1);
  var cirrusFree = getQABits(qa, 8, 9).eq(0); 
  
  var mask = cloudFree.and(cloudShadowFree).and(land).and(cirrusFree);
  
  return mask.not();
}

/*
      Normalization target
*/
function getNormalizationTarget(roi, build){
  var build = build | false;
  
  if(build){
    var modisCollection = ee.ImageCollection(MODIS_COL)
    .filterDate("2000-01-01", "2020-01-01")
    .map(function(image){
      var clippedImage = image.clip(roi);
      var cloudMask = MODIS_CLOUDMASK(clippedImage);
      var maskedImage = clippedImage.updateMask(cloudMask.not());
      var renamedImage = maskedImage.select(MODIS_BANDS, NEW_BANDS);
      var ndvi = renamedImage.normalizedDifference(["NIR", "RED"]).rename("NDVI");
      return ee.Image(renamedImage.addBands(ndvi).copyProperties(image));
    });
    
    var modis75thPercentile = modisCollection
      .select("NDVI")
      .reduce(ee.Reducer.percentile([75]));
      
    var averageModisAbove75thPercentile = modisCollection
      .map(function(image){
        var goodPixelsMask = image.select("NDVI").gt(modis75thPercentile);
        return image.updateMask(goodPixelsMask);
      })
      .mean()
      .clip(roi);
    
    // Export.image.toAsset({
    //   image: averageModisAbove75thPercentile.select(NEW_BANDS).int32(),
    //   description: "normalizationTarget",
    //   assetId: NORMALIZATION_TARGET,
    //   scale: 500, 
    //   maxPixels: 1E13, 
    //   region: roi, 
    // })
    
    return ee.Image(averageModisAbove75thPercentile
      .select(NEW_BANDS)
      .multiply(MODIS_BANDS_SCALES));
      
  }else{
    return ee.Image(NORMALIZATION_TARGET)
      .clip(roi)
      .select(NEW_BANDS)
      .multiply(MODIS_BANDS_SCALES);
  }
}

/*
  Pseudo-Invariant Objects
*/
function getPseudoInvariantObjects(landsatImage, normalizationTarget){
  landsatImage = ee.Image(landsatImage);
  normalizationTarget = ee.Image(normalizationTarget);
  
  var landsatCloudMask = ee.Image(cloudScore(landsatImage)).eq(1);


  var normalizationTargetMask = normalizationTarget.select(0).mask();

  
  var differenceLandsatMODIS = normalizationTarget
  .select("RED", "SWIR1")
  .subtract(landsatImage.select("RED", "SWIR1"))
  .abs();

  var pseudoInvariantMask =  differenceLandsatMODIS.select("RED", "SWIR1").lt(CFACTOR);
  pseudoInvariantMask = pseudoInvariantMask.select("RED").and(pseudoInvariantMask.select("SWIR1"));

  var brightObjects = landsatImage.select("RED").gt(0.5);
  
  var landsatNDVI = landsatImage.normalizedDifference(["NIR", "RED"]).rename("NDVI");
  
  pseudoInvariantMask = pseudoInvariantMask
    .updateMask(normalizationTargetMask)
    .updateMask(brightObjects.not())
    .updateMask(landsatCloudMask);
    
  pseudoInvariantMask = pseudoInvariantMask.updateMask(pseudoInvariantMask);
  
  return pseudoInvariantMask;
}

function addPseudoinvariantMask(landsatImage){
    var roi = landsatImage.geometry();

    var normalizationTarget = ee.Image(getNormalizationTarget(roi));
    var pseudoInvariantMask = getPseudoInvariantObjects(landsatImage, normalizationTarget);

    var psinvCount = pseudoInvariantMask.reduceRegion({
            reducer: ee.Reducer.count(),
            geometry: roi,
            scale: 30,
            maxPixels: 10E10,
            tileScale: 4
        }).values().getNumber(0);

    return ee.Image(landsatImage)
        .addBands(pseudoInvariantMask.select([0], [PSINV_PIXELS_BAND]))
        .set('PSINV_PIXELS_COUNT', psinvCount);
}

function getIntervals(startDateInput, endDateInput){
  startDateInput = ee.Date(startDateInput);
  endDateInput = ee.Date(endDateInput);
  var dates = ee.List([startDateInput.get("year"), endDateInput.get("year")])
    .distinct()
    .iterate(function(year, list){
      year = ee.Number.parse(year);
      list = ee.List(list);
      
      for(var i=1; i<=23; i++){
        var startDOY = ((i * 16) - 15);
        var endDOY = (((i+1) * 16) - 15);
        
        var startDate = ee.Date.parse("Y D", ee.String(year).cat(" " + startDOY));
        var endDate = ee.Date.parse("Y D", ee.String(year).cat(" " + endDOY));
        
        if(i >= 5){
          startDate = ee.Date.parse("Y D", ee.String(year).cat(" " +(startDOY-1)));
          if(i >= 23){
            endDate = ee.Date.parse("Y D", ee.String(year.add(1)).cat((" " + 1)));
          }else{
            endDate = ee.Date.parse("Y D", ee.String(year).cat(" " + (endDOY-1)));
          }
        }
        
        var feature = ee.Feature(null, {
          "startDate": startDate,
          "endDate": endDate,
          "interval": i
        });
        list = list.add(feature);
      }
      return list;
    }, ee.List([]));
  
  dates = ee.List(dates)
    .filter(ee.Filter.greaterThanOrEquals("startDate", startDateInput))
    .filter(ee.Filter.lessThanOrEquals("endDate", ee.Date(endDateInput).advance(1, 'day')));
    
  return dates;
}

function filterLandsatCollection(landsatCollection, path, row, startDate, endDate, cloudCover){
  var filteredCollection = landsatCollection
    .filterMetadata("WRS_PATH", "equals", path)
    .filterMetadata("WRS_ROW", "equals", row)
    .filterMetadata("CLOUD_COVER", "less_than", cloudCover)
    .filterDate(startDate, endDate)
    
  return filteredCollection;
}

function filterLandsatCollectionByROI(landsatCollection, roi, startDate, endDate, cloudCover){
  var filteredCollection = landsatCollection
    .filterDate(startDate, endDate)
    .filterMetadata("CLOUD_COVER", "less_than", cloudCover)
    .filterBounds(roi)
    
  return filteredCollection;
}

function getLandsatCollection(path, row, startDate, endDate, cloudCover){
  var landsat5RawCollection = filterLandsatCollection(ee.ImageCollection("LANDSAT/LT05/C01/T1_TOA"), path, row, startDate, endDate, cloudCover);
  
  var landsat7RawCollection = filterLandsatCollection(ee.ImageCollection("LANDSAT/LE07/C01/T1_TOA"), path, row, startDate, endDate, cloudCover);
  
  var landsat8RawCollection = filterLandsatCollection(ee.ImageCollection("LANDSAT/LC08/C01/T1_TOA"), path, row, startDate, endDate, cloudCover);
  
  var landsatCollection = landsat8RawCollection.merge(landsat5RawCollection).merge(landsat7RawCollection);
  return landsatCollection;
}

function getLandsatCollectionByROI(roi, startDate, endDate, cloudCover){
  var landsat5RawCollection = filterLandsatCollectionByROI(ee.ImageCollection("LANDSAT/LT05/C01/T1_TOA"), roi, startDate, endDate, cloudCover);
  
  var landsat7RawCollection = filterLandsatCollectionByROI(ee.ImageCollection("LANDSAT/LE07/C01/T1_TOA"), roi, startDate, endDate, cloudCover);
  
  var landsat8RawCollection = filterLandsatCollectionByROI(ee.ImageCollection("LANDSAT/LC08/C01/T1_TOA"), roi, startDate, endDate, cloudCover);
  
  var landsatCollection = landsat8RawCollection.merge(landsat5RawCollection).merge(landsat7RawCollection);
  return landsatCollection;
}

function getNormCollection(landsatCollection){
    var landsatNormCollection = landsatCollection
    .map(padronizeLandsatBands)
    .map(addPseudoinvariantMask)
    .filterMetadata('PSINV_PIXELS_COUNT', 'not_less_than', MIN_PSINV_PIXELS_COUNT)
    .map(applyHistogramMatching)
    .map(function(image){
      var newImage = image;
      
      var qualityFlag = ee.Image(cloudLib.cloudScore(newImage))
        .rename("QF");
      
      var ndvi = image.normalizedDifference(["NIR", "RED"])
        .clamp(0, 1)
        .rename("NDVI");
      
      var inverseQualityFlag = qualityFlag
        .multiply(-1)
        .add(ndvi)
        .updateMask(qualityFlag.eq(0).not()) // exclude 0: nodata
        .float()
        .rename("INVERSE_QF");
      
      
      var normImage = newImage
        .addBands(qualityFlag)
        .addBands(inverseQualityFlag)
        .set("SPACECRAFT_ID", "BLARD");
      
      return normImage;
    });
    
  return landsatNormCollection;
}

function getLandsatNormCollection(path, row, startDate, endDate, cloudCover){
  var landsatCollection = getLandsatCollection(path, row, startDate, endDate, cloudCover);
  var landsatNormCollection = getNormCollection(landsatCollection);
  return landsatNormCollection;
}

function getLandsatNormCollectionByROI(roi, startDate, endDate, cloudCover){
  var landsatCollection = getLandsatCollectionByROI(roi, startDate, endDate, cloudCover);
  var landsatNormCollection = getNormCollection(landsatCollection);
  return landsatNormCollection;
}

function get16Dayproduct(path, row, startDate, endDate, cloudCover, exportBands){
  var landsatROI = ee.FeatureCollection("users/agrosatelite_mapbiomas/COLECAO_5/PUBLIC/GRIDS/BRASIL")
    .filterMetadata("PATH", "equals", path)
    .filterMetadata("ROW", "equals", row)
    .first()
    .geometry();
    
  var landsatNormCollection = ee.ImageCollection(getLandsatNormCollection(path, row, startDate, endDate, cloudCover));
    
  var intervals = ee.List(getIntervals(startDate, endDate));
  
  var products = ee.ImageCollection(intervals.map(function(feature){
    feature = ee.Feature(feature);
    
    var startDate = ee.Date(feature.get("startDate"));
    var endDate = ee.Date(feature.get("endDate"));
    
    var filteredNormCollection = landsatNormCollection
      .filterDate(startDate, endDate);

    var filteredNormMosaic = filteredNormCollection
      .qualityMosaic("INVERSE_QF")
      .clip(landsatROI);
    
    if(exportBands.indexOf('TIR1') !== -1){
      var extraBands = filteredNormMosaic
        .select("TIR1", "QF")
        .multiply([10, 1]);
    }else{
      var extraBands = filteredNormMosaic
        .select("QF");
    }
  
    var landsatNormMosaic = filteredNormMosaic
      .select(exportBands)
      .multiply(10000) // scale: 0.0001
      .addBands(extraBands, null, true) // scale: 0.1
      .int16()
      .set("system:time_start", startDate.millis())
      .set("WRS_PATH", path)
      .set("WRS_ROW", row)
      .set("SPACECRAFT_ID", "BLARD")
      .set("START_DATE", startDate)
      .set("END_DATE", endDate)
      .set("IMAGES_COUNT", filteredNormCollection.size())
      .set("INTERVAL", feature.get("interval"));
    
    var finalProduct = ee.Image(ee.Algorithms.If(
      filteredNormCollection.size().gte(1),
      landsatNormMosaic,
      ee.Image(0)
    ));
    
    return finalProduct;
  }));
  
  var validProducts = products.filterMetadata("SPACECRAFT_ID", "equals", "BLARD");

  return validProducts;
}

function get16DayproductByROI(roi, startDate, endDate, cloudCover, exportBands){
  
  var landsatNormCollection = ee.ImageCollection(getLandsatNormCollectionByROI(roi, startDate, endDate, cloudCover));
    
  var intervals = ee.List(getIntervals(startDate, endDate));
  
  var products = ee.ImageCollection(intervals.map(function(feature){
    feature = ee.Feature(feature);
    
    var startDate = ee.Date(feature.get("startDate"));
    var endDate = ee.Date(feature.get("endDate"));
    
    var filteredNormCollection = landsatNormCollection
      .filterDate(startDate, endDate);

    var filteredNormMosaic = filteredNormCollection
      .qualityMosaic("INVERSE_QF")
      .clip(roi);
    
    if(exportBands.indexOf('TIR1') !== -1){
      var extraBands = filteredNormMosaic
        .select("TIR1", "QF")
        .multiply([10, 1]);
    }else{
      var extraBands = filteredNormMosaic
        .select("QF");
    }
  
    var landsatNormMosaic = filteredNormMosaic
      .select(exportBands)
      .multiply(10000) // scale: 0.0001
      .addBands(extraBands, null, true) // scale: 0.1
      .int16()
      .set("system:time_start", startDate.millis())
      .set("SPACECRAFT_ID", "BLARD")
      .set("START_DATE", startDate)
      .set("END_DATE", endDate)
      .set("IMAGES_COUNT", filteredNormCollection.size())
      .set("INTERVAL", feature.get("interval"));
    
    var finalProduct = ee.Image(ee.Algorithms.If(
      filteredNormCollection.size().gte(1),
      landsatNormMosaic,
      ee.Image(0)
    ));
    
    return finalProduct;
  }));
  
  var validProducts = products.filterMetadata("SPACECRAFT_ID", "equals", "BLARD");

  return validProducts;
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

exports.padronizeLandsatBands = padronizeLandsatBands;
exports.applyHistogramMatching = applyHistogramMatching;
exports.getNormalizationTarget = getNormalizationTarget;
exports.getPseudoInvariantObjects = getPseudoInvariantObjects;

exports.getLandsatCollection = getLandsatCollection;
exports.getLandsatCollectionByROI = getLandsatCollectionByROI;

exports.getLandsatNormCollection = getLandsatNormCollection;

exports.get16Dayproduct = get16Dayproduct;
exports.get16DayproductByROI = get16DayproductByROI;
