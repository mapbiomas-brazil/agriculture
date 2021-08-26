/**********************
 * Filter Functions
 **********************/

function applyFilters(filters, collection) {
  return pipe(filters)(collection);
}

function temporal(movingWindow, filter) {
  return function (collection) {
    return movingWindow(filter, collection);
  };
}

function spatial(filter) {
  return function (collection) {
    return collection.map(filter);
  };
}

function pipe(filters) {
  return filters.reduce(function (f1, f2) {
    return function (collection) {
      return f2(f1(collection));
    };
  });
}

/**********************
 * Temporal Filters
 **********************/

// Moving window

function getMovingWindow(from, to, offsets) {
  var allYears = ee.List.sequence(from, to);
  var newNames = allYears.map(toString);

  if (!Array.isArray(offsets)) {
    var offset = ee.Number(offsets).divide(2).floor()
    offsets = [offset, offset];
  }
  var yearsToFilter = ee.List.sequence(from, to);

  return function (callback, collection) {

    var filtered = yearsToFilter.iterate(function (year, filteredCollection) {
      filteredCollection = ee.ImageCollection(filteredCollection);
      year = ee.Number(year);

      var current = filteredCollection.filterMetadata('year', 'equals', year).first();
      var window = slice(filteredCollection, year, offsets);

      var filteredImg = callback(window, current, year).set('year', year);

      return filteredCollection
        .filterMetadata('year', 'not_equals', year)
        .merge(ee.ImageCollection([filteredImg]));

    }, collection);

    return ee.ImageCollection(filtered).sort('year');
  };
}

function slice(collection, currentYear, offsets) {
  var from = ee.Number(currentYear).subtract(offsets[0]);
  var to = ee.Number(currentYear).add(offsets[1]);

  return ee.ImageCollection(collection)
    .filter(ee.Filter.and(
      ee.Filter.gte('year', from), ee.Filter.lte('year', to)
    ));
}

// threshold

function thresholdFilter(threshold) {
  return function (window, center, year) {
    window = ee.ImageCollection(window);

    return window.sum().gte(threshold);
  };
}

function thresholdInclusionFilter(threshold) {
  return function (window, center, year) {
    window = ee.ImageCollection(window);

    return center.or(window.sum().gte(threshold));
  };
}

function thresholdExclusionFilter(threshold) {
  return function (window, center, year) {
    window = ee.ImageCollection(window);

    return center.and(window.sum().gte(threshold));
  };
}

// Pattern substitution

function substitutePattern(from, to, collection, substitution) {
  from = ee.Number(from)
  to = ee.Number(to)

  var find = ee.Image.constant(substitution[0])
  var replace = ee.Image.constant(substitution[1])

  var years = collection.aggregate_array('year')

  var offset = find.bandNames().size();

  var startAt = years.indexOf(from);
  var stopAt = years.indexOf(to).subtract(offset).add(1)

  var result = ee.List.sequence(startAt, stopAt).iterate(function (position, image) {
    image = ee.Image(image)

    var indexes = ee.List.sequence(position, null, null, offset);

    var toFilter = image.select(indexes)

    var match = toFilter.eq(find).reduce(ee.Reducer.allNonZero());

    var keep = toFilter.and(match.not())
    var replaced = ee.Image(replace).and(match)

    var filtered = keep.or(replaced)

    return image.addBands(filtered, null, true)


  }, collection.toBands())

  result = ee.Image(result)

  var filteredCollection = ee.Dictionary
    .fromLists(result.bandNames(), years)
    .map(function (band, year) {
      return result.select([band]).set('year', year)
    })
    .values()


  return ee.ImageCollection(filteredCollection).sort('year');
}


/**********************
 * Spatial Filters
 **********************/

function minConnnectedPixels(minConnectedPixel, eightConnected) {
  eightConnected = eightConnected !== false;

  return function (image) {
    var connPixels = image.unmask()
      .connectedPixelCount({
        maxSize: ee.Number(minConnectedPixel).multiply(2),
        eightConnected: eightConnected
      });

    var mode = image.unmask()
      .focal_mode(2, 'square', 'pixels')
      .updateMask(connPixels.lte(minConnectedPixel));

    var filtered = image.blend(mode);

    return filtered;
  };
}

function dilation(radius, kernelType, units, iterations, kernel) {
  return function (image) {
    return image.focal_max(radius, kernelType, units, iterations, kernel);
  }
}

function erosion(radius, kernelType, units, iterations, kernel) {
  return function (image) {
    return image.focal_min(radius, kernelType, units, iterations, kernel);
  }
}

function opening(radius, kernelType, units, iterations, kernel) {
  var _erosion = erosion(radius, kernelType, units, iterations, kernel);
  var _dilation = dilation(radius, kernelType, units, iterations, kernel);

  return function (image) {
    return _dilation(_erosion(image))
  }
}

function closing(radius, kernelType, units, iterations, kernel) {
  var _erosion = erosion(radius, kernelType, units, iterations, kernel);
  var _dilation = dilation(radius, kernelType, units, iterations, kernel);

  return function (image) {
    return _erosion(_dilation(image))
  }
}


/**********************
 * Utils
 **********************/

function toBandsByYear(collection) {
  var years = collection.aggregate_array('year');

  var newNames = years.map(function (year) {
    return ee.String('b').cat(ee.String(ee.Number(year).int()));
  });

  return ee.ImageCollection(collection).toBands().rename(newNames);
}

function bandsToCollection(image, startYear, endYear, bandName) {
  bandName = bandName || 'classification'

  var collection = ee.List.sequence(startYear, endYear).map(function (year) {
    year = ee.Number(year).int()
    var band = image.select(ee.String('.*').cat(year).cat('.*'))

    return band.byte().rename(bandName).set('year', year)
  })

  return ee.ImageCollection(collection);
}

function toString(value) {
  return ee.String(ee.Number(value).int());
}

exports = {
  toBandsByYear: toBandsByYear,
  bandsToCollection: bandsToCollection,
  applyFilters: applyFilters
};

exports.temporal = {
  build: temporal,
  getMovingWindow: getMovingWindow,
  thresholdFilter: thresholdFilter,
  substitutePattern: substitutePattern,
  thresholdInclusionFilter: thresholdInclusionFilter,
  thresholdExclusionFilter: thresholdExclusionFilter
};

exports.spatial = {
  build: spatial,
  minConnnectedPixels: minConnnectedPixels,
  dilation: dilation,
  erosion: erosion,
  opening: opening,
  closing: closing
};
