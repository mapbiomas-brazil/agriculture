var NORMALIZATION_BANDS = ['BLUE', 'GREEN', 'RED', 'NIR', 'SWIR1', 'SWIR2'];

var NORMALIZATION_TARGET = ee.Image('users/agrosatelite_mapbiomas/COLECAO_5/BLARD/MODIS_2000_2019_NORMALIZATION_TARGET')
  .select(NORMALIZATION_BANDS)
  .divide(10000);

var SPATIAL_RESOLUTION = 30;
var DEFAULT_MAX_CLOUD_COVER = 90;

var BRIGHT_OBJECTS_THRESHOLD = 0.5;
var CFACTOR = 0.03;

var MIN_PSINV_PIXELS_COUNT = 5000;

var COEFFICIENTS = ee.FeatureCollection('users/agrosatelite_mapbiomas/BLARD/NORMALIZATION/COEFFICIENTS');

var COEFFS_FIELD = 'NORMALIZATION_COEFFICIENTS';
var JOIN_FIELD = 'LANDSAT_SCENE_ID';

var spacecrafts = {
  LANDSAT_8: {
    id: "LANDSAT/LC08/C01/T1_TOA",
    bands: {
      from: ["B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B9", "B10", "B11", "BQA",],
      to: ["COASTAL", "BLUE", "GREEN", "RED", "NIR", "SWIR1", "SWIR2", "PAN", "CIRRUS", "TIR1", "TIR2", "BQA"]
    },
    qa_scores: {
      2: [1536],
      3: [2],
      4: [6144],
      5: [384],
      6: [96],
    }
  },
  LANDSAT_7: {
    id: "LANDSAT/LE07/C01/T1_TOA",
    bands: {
      from: ["B1", "B2", "B3", "B4", "B5", "B6_VCID_1", "B6_VCID_2", "B7", "B8", "BQA"],
      to: ["BLUE", "GREEN", "RED", "NIR", "SWIR1", "TIR1", "B6_VCID_2", "SWIR2", "PAN", "BQA"]
    },
    qa_scores: {
      2: [1536],
      5: [384],
      6: [96],
    }
  },
  LANDSAT_5: {
    id: "LANDSAT/LT05/C01/T1_TOA",
    bands: {
      from: ["B1", "B2", "B3", "B4", "B5", "B6", "B7", "BQA"],
      to: ["BLUE", "GREEN", "RED", "NIR", "SWIR1", "TIR1", "SWIR2", "BQA"]
    },
    qa_scores: {
      2: [1536],
      5: [384],
      6: [96],
    }
  }
}

function get16Dayproduct(path, row, startDate, endDate, cloudCover, exportBands) {
  exportBands = exportBands || ['BLUE', 'GREEN', 'RED', 'NIR', 'SWIR1', 'SWIR2']

  var landsatROI = ee.FeatureCollection("users/agrosatelite_mapbiomas/COLECAO_5/PUBLIC/GRIDS/BRASIL")
    .filterMetadata("PATH", "equals", path)
    .filterMetadata("ROW", "equals", row)
    .first()
    .geometry();


  var normalizedCollection = getNormalizedCollection(landsatROI, startDate, endDate, cloudCover, null, true);

  var intervals = ee.List(getIntervals(startDate, endDate));

  var imagesByPeriods = intervals.map(function (feature) {
    feature = ee.Feature(feature);

    var startDate = ee.Date(feature.get("startDate"));
    var endDate = ee.Date(feature.get("endDate"));

    var filteredCollection = normalizedCollection.filterDate(startDate, endDate);

    return filteredCollection
      .set("IMAGES_COUNT", filteredCollection.size())
      .set("INTERVAL", feature.get("interval"))
      .set("START_DATE", startDate)
      .set("END_DATE", endDate)
  })

  var products = ee.FeatureCollection(imagesByPeriods)
    .filterMetadata("IMAGES_COUNT", 'greater_than', 0)
    .map(function (filteredCollection) {
      filteredCollection = ee.ImageCollection(filteredCollection)

      var startDate = ee.Date(filteredCollection.get("START_DATE"));

      var mosaic = getQualityMosaic(filteredCollection)

      var extraBands = mosaic.select("TIR1", "QA_SCORE").multiply([10, 1]);

      var finalMosaic = mosaic
        .clip(landsatROI)
        .select(exportBands)
        .multiply(10000) // scale: 0.0001
        .addBands(extraBands, null, true) // scale: 0.1
        .int16()
        .copyProperties(filteredCollection, ["IMAGES_COUNT", "INTERVAL", "START_DATE", "END_DATE"])
        .set("system:time_start", ee.Date(startDate).millis())
        .set("WRS_PATH", path)
        .set("WRS_ROW", row)
        .set("SPACECRAFT_ID", "BLARD");

      return finalMosaic;
    });

  return ee.ImageCollection(products);
}

function getIntervals(startDateInput, endDateInput) {
  startDateInput = ee.Date(startDateInput);
  endDateInput = ee.Date(endDateInput);
  var dates = ee.List([startDateInput.get("year"), endDateInput.get("year")])
    .distinct()
    .iterate(function (year, list) {
      year = ee.Number.parse(year);
      list = ee.List(list);

      for (var i = 1; i <= 23; i++) {
        var startDOY = ((i * 16) - 15);
        var endDOY = (((i + 1) * 16) - 15);

        var startDate = ee.Date.parse("Y D", ee.String(year).cat(" " + startDOY));
        var endDate = ee.Date.parse("Y D", ee.String(year).cat(" " + endDOY));

        if (i >= 5) {
          startDate = ee.Date.parse("Y D", ee.String(year).cat(" " + (startDOY - 1)));
          if (i >= 23) {
            endDate = ee.Date.parse("Y D", ee.String(year.add(1)).cat((" " + 1)));
          } else {
            endDate = ee.Date.parse("Y D", ee.String(year).cat(" " + (endDOY - 1)));
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

function getQualityMosaic(collection) {
  collection = collection.map(function (image) {
    var score = image.select("QA_SCORE")

    var ndvi = image.normalizedDifference(["NIR", "RED"])
      .clamp(0, 1)
      .rename("NDVI");

    var qualityFlag = score
      .multiply(-1)
      .add(ndvi)
      .updateMask(score.eq(0).not()) // exclude 0: nodata
      .float()
      .rename("QF");

    return image.addBands(qualityFlag);
  });

  return collection.qualityMosaic("QF")
}

function getNormalizedCollection(roi, startDate, endDate, maxCloudCover, bands, useExportedCoeffs) {
  var collection = getLandsatCollection(roi, startDate, endDate, maxCloudCover);

  return applyNormalization(collection, bands, useExportedCoeffs);
}

function getLandsatCollection(roi, startDate, endDate, maxCloudCover) {
  maxCloudCover = maxCloudCover || DEFAULT_MAX_CLOUD_COVER;

  function filter(spacecraft) {
    return ee.ImageCollection(spacecraft.id)
      .filterBounds(roi)
      .filterDate(startDate, endDate)
      .filterMetadata("CLOUD_COVER", "less_than", maxCloudCover)
      .select(spacecraft.bands.from, spacecraft.bands.to)
      .map(function (image) {
        return addQAScore(image, spacecraft.qa_scores, "BQA")
      })
  }

  var landsat5 = filter(spacecrafts.LANDSAT_5);
  var landsat7 = filter(spacecrafts.LANDSAT_7);
  var landsat8 = filter(spacecrafts.LANDSAT_8);

  var collection = landsat5.merge(landsat7).merge(landsat8);

  return collection;
}

function applyNormalization(collection, bands, useExportedCoeffs) {

  if (useExportedCoeffs && COEFFICIENTS) {
    collection = joinCoefficients(collection);
  } else {
    collection = prepareToNormalization(collection);
    useExportedCoeffs = false;
  }

  var correctedCollection = collection.map(function (originalImage) {
    return normalizeImage(originalImage, bands, useExportedCoeffs);
  });

  return correctedCollection;
}

function joinCoefficients(collection) {
  collection = ee.ImageCollection(collection);

  var startMillis = collection.aggregate_min('system:time_start')
  startMillis = ee.List([startMillis, 0]).reduce(ee.Reducer.firstNonNull())

  var startDate = ee.Date(startMillis).advance(-1, 'day');

  var endMilles = collection.aggregate_max('system:time_start')
  endMilles = ee.List([endMilles, 0]).reduce(ee.Reducer.firstNonNull())

  var endDate = ee.Date(endMilles).advance(1, 'day');

  var coefficients = COEFFICIENTS.filterDate(startDate, endDate);

  collection = ee.Join
    .saveFirst({ matchKey: COEFFS_FIELD })
    .apply({
      primary: collection,
      secondary: coefficients,
      condition: ee.Filter.equals({
        leftField: JOIN_FIELD,
        rightField: JOIN_FIELD
      })
    });

  return ee.ImageCollection(collection);
}

function prepareToNormalization(collection) {
  return collection
    .map(addPseudoInvariantObjectsBand)
    .map(countPseudoInvariantPixels)
    .filterMetadata('PSINV_PIXELS_COUNT', 'not_less_than', MIN_PSINV_PIXELS_COUNT);
}


function addPseudoInvariantObjectsBand(image) {
  var cloudMask = image.select("QA_SCORE").eq(1);
  var normalizationTargetMask = NORMALIZATION_TARGET.mask().reduce(ee.Reducer.allNonZero());

  var psInvPixelsMask = NORMALIZATION_TARGET
    .select("RED", "SWIR1")
    .subtract(image.select("RED", "SWIR1"))
    .abs()
    .lt(CFACTOR)
    .reduce(ee.Reducer.allNonZero());

  var brightObjectsMask = image.select("RED").lte(BRIGHT_OBJECTS_THRESHOLD);

  var finalMask = image
    .select(NORMALIZATION_BANDS)
    .mask()
    .reduce(ee.Reducer.allNonZero())
    .updateMask(psInvPixelsMask)
    .updateMask(normalizationTargetMask)
    .updateMask(brightObjectsMask)
    .updateMask(cloudMask)
    .rename('PSINV_PIXELS_MASK');


  return image.addBands(finalMask);
}


function countPseudoInvariantPixels(image) {
  var psInvMask = image.select('PSINV_PIXELS_MASK');

  var psInvPixelsCount = psInvMask
    .reduceRegion({
      reducer: ee.Reducer.count(),
      geometry: image.geometry(),
      scale: SPATIAL_RESOLUTION,
      maxPixels: 10E10,
    })
    .values()
    .getNumber(0);

  return image.set('PSINV_PIXELS_COUNT', psInvPixelsCount);
}

function normalizeImage(image, bands, useExportedCoeffs) {
  bands = bands || NORMALIZATION_BANDS;
  useExportedCoeffs = useExportedCoeffs !== false; // set default to true

  var coefficients = null;

  if (useExportedCoeffs) {
    coefficients = getCoefficientsFromProperties(image, bands);
  } else {
    coefficients = calculateCoefficients(image, bands);
  }

  var gain = coefficients.getArray('gain');
  var offset = coefficients.getArray('offset');

  var gainImg = ee.Image(gain).arrayFlatten([bands]);
  var offsetImg = ee.Image(offset).arrayFlatten([bands]);

  var normalizedImage = image.select(bands).multiply(gainImg).add(offsetImg);

  var bandsToReturn = ee.List(bands).cat(['BQA', 'QA_SCORE', 'TIR1']).distinct();

  return image
    .addBands(normalizedImage, null, true)
    .select(bandsToReturn)
    .set(COEFFS_FIELD, {
      gain: ee.Dictionary.fromLists(bands, gain.toList()),
      offset: ee.Dictionary.fromLists(bands, offset.toList())
    });
}

function getCoefficientsFromProperties(image, bands) {
  var sortedBands = ee.List(NORMALIZATION_BANDS).sort();

  var coeffs = ee.Feature(image.get(COEFFS_FIELD));

  var gain = coeffs.select(['.*_gain'], sortedBands);
  var offset = coeffs.select(['.*_offset'], sortedBands);

  return ee.Dictionary({
    'gain': ee.Feature(gain).toArray(bands),
    'offset': ee.Feature(offset).toArray(bands)
  });
}

function calculateCoefficients(image, bands) {
  var sortedBands = ee.List(bands).sort();
  var mask = image.select('PSINV_PIXELS_MASK');

  var tempBandsImg = sortedBands.map(composeName("img_"));
  var tempBandsRef = sortedBands.map(composeName("ref_"));

  image = image.select(sortedBands, tempBandsImg);
  var target = NORMALIZATION_TARGET.select(sortedBands, tempBandsRef);

  var stats = (image
    .addBands(target)
    .updateMask(mask)
    .reduceRegion({
      reducer: ee.Reducer.mean().combine(ee.Reducer.stdDev(), null, true),
      geometry: image.geometry(),
      scale: SPATIAL_RESOLUTION,
      maxPixels: 1E13,
    }));

  stats = ee.Feature(null, stats);

  function select(pattern) {
    return ee.Feature(stats.select(pattern, sortedBands));
  }

  var imageMeans = select(['img_.*_mean']).toArray(bands);
  var imageStdDev = select(['img_.*_stdDev']).toArray(bands);

  var targetMeans = select(['ref_.*_mean']).toArray(bands);
  var targetStdDev = select(['ref_.*_stdDev']).toArray(bands);

  var gain = targetStdDev.divide(imageStdDev);
  var offset = targetMeans.subtract(gain.multiply(imageMeans));

  var coefficients = ee.Dictionary({
    'gain': gain,
    'offset': offset
  });

  return coefficients;
}

function composeName(prefix, sufix) {
  prefix = prefix || '';
  sufix = sufix || '';
  return function (name) {
    return ee.String(prefix).cat(name).cat(sufix);
  };
}

function addQAScore(image, bitmasksScores, qualityBand) {
  qualityBand = image.select(qualityBand || "BQA")
  var bestScore = qualityBand.gte(0).int().rename('mask');

  var scoredList = Object.keys(bitmasksScores)
    .map(function (score) {
      score = parseInt(score, 10);
      var bitmasks = ee.List(bitmasksScores[score]);

      var mask = getMaskFromBitmaskList(qualityBand, bitmasks, 'or');
      var scoredMask = mask.multiply(score);

      return scoredMask.int().rename('mask');
    });

  scoredList = ee.List(scoredList).add(bestScore);

  var scored = ee.ImageCollection
    .fromImages(scoredList)
    .max()
    .rename(["QA_SCORE"]);

  return image.addBands(scored);
}

function getMaskFromBitmaskList(qualityBand, bitmasks, reducer, reverse) {
  reducer = {
    'and': ee.Reducer.allNonZero,
    'or': ee.Reducer.anyNonZero
  }[reducer || 'or'];

  bitmasks = ee.Image.constant(bitmasks);

  var mask = qualityBand
    .bitwiseAnd(bitmasks)
    .eq(bitmasks)
    .reduce(reducer());

  if (reverse)
    mask = mask.not();

  return mask;
}

exports.getNormalizedCollection = getNormalizedCollection;
exports.applyNormalization = applyNormalization;
exports.get16Dayproduct = get16Dayproduct;


