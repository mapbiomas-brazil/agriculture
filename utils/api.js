// We create an object with the name Band and freeze its properties. 
// This object stored the name of all possible bands and indexes that we can use.
// This object will work as a Java Enumeration.

var Factor = 10000;

var Band = Object.freeze({
  BLUE: "BLUE", 
  GREEN: "GREEN", 
  RED: "RED", 
  NIR: "NIR", 
  SWIR1: "SWIR1", 
  SWIR2: "SWIR2", 
  TIR1: "TIR1", 
  TIR2: "TIR2", 
  EVI2: "EVI2", 
  NDWI: "NDWI", 
  NDVI: "NDVI", 
  CAI: "CAI", 
  CEI: "CEI", 
  LAI: 'LAI', 
  MNDWI: "MNDWI", 
  AWEI_NSH: "AWEI_NSH", 
  AWEI_SH: "AWEI_SH",
  MSAVI2: "MSAVI2",
  BSI: 'BSI'
});


// Similar to the previous object. 
// This object store the name of all possible Reducers that can use.
var Reducer = Object.freeze({
  MIN: "min", 
  MAX: "max", 
  MEAN: "mean",
  STDV: "sqdv", 
  MEDIAN: "median", 
  COUNT: "count",
  SUM: "sum",
  QMO: function(band){
    return {
      'reducer': 'qmo',
      'band': band
    };
  }, 
  PERCENTILE: function(percentiles){
    return {
      'reducer': 'percentile',
      'percentiles': percentiles
    };
  }, 
});

// This object store the name of all satellites/sensors that can use.
var Sensor = Object.freeze({
  L5: "LANDSAT_5", 
  L7: "LANDSAT_7", 
  L8: "LANDSAT_8", 
  S2A: "Sentinel-2A", 
  S2B: "Sentinel-2B",
  BLARD: "BLARD"
});

// Bits used for calculating the cloud mask of Landsat 5 and Landsat 7 satellites/sensors.
var qaBits57 = [ 
  [0, 0, 0],
  [1, 1, 0],
  [4, 4, 0],
  [5, 6, 1],
  [7, 8, 1]
];

// Bits used for calculating the cloud mask of Landsat 8 satellite/sensor.
var qaBits8 = [
  [0, 0, 0],
  [1, 1, 0],
  [4, 4, 0],
  [5, 6, 1],
  [7, 8, 1],
  [11, 12, 1]
];

/************ Classes definition with ECMAScript 5 (2009) *************/

function Image(image) {
  this.image = image;
}

Image.prototype = {
  constructor: Image,
  getEEImage: function(){
    return this.image;
  },
  removeClouds: function(){
    var maskS2clouds = function (image) {
      var qa = image.select('QA60');
      // Bits 10 and 11 are clouds and cirrus, respectively.
      var cloudBitMask = Math.pow(2, 10);
      var cirrusBitMask = Math.pow(2, 11);
      // Both flags should be set to zero, indicating clear conditions.
      var mask = qa.bitwiseAnd(cloudBitMask).eq(0).and(
                 qa.bitwiseAnd(cirrusBitMask).eq(0));
      // Return the masked and scaled data.
      return image.updateMask(mask)
    }
    
    var calcMask = function(image, qaBits){
      var bqa = image.select(['BQA'])
      for(var k=0; k<qaBits.length; k++){
          var start  = qaBits[k][0]
          var end    = qaBits[k][1]
          var desired= qaBits[k][2]
          var pattern = 0
          for(var i=start; i<end + 1; i++){
              pattern = pattern + Math.pow(2, i)
          }
          var blueprint = ee.Image(bqa).bitwiseAnd(parseInt(pattern)).rightShift(start).eq(desired)
          image = image.updateMask(blueprint)
      }
      return image;
    }
    
    var newImage = ee.Image(ee.Algorithms.If(ee.List([Sensor.L5, Sensor.L7]).containsAll([this.image.get('SPACECRAFT_ID')]), 
          calcMask(this.image, qaBits57), 
          ee.Algorithms.If(ee.List([Sensor.L8]).containsAll([this.image.get('SPACECRAFT_ID')]),
            calcMask(this.image, qaBits8),
            ee.Algorithms.If(ee.List([Sensor.S2A, Sensor.S2B]).containsAll([this.image.get('SPACECRAFT_NAME')]),
              maskS2clouds(this.image),
              ee.Image(0)))));
              
    return new Image(newImage);
  },
  buildBands: function(bands) {
    var blue = ee.Algorithms.If(ee.List([Sensor.L5, Sensor.L7]).containsAll([this.image.get('SPACECRAFT_ID')]),
      this.image.select(['B1'], [Band.BLUE]).multiply(Factor).int16(),
      ee.Algorithms.If(ee.List([Sensor.L8]).containsAll([this.image.get('SPACECRAFT_ID')]),
        this.image.select(['B2'], [Band.BLUE]).multiply(Factor).int16(),
        ee.Algorithms.If(ee.List([Sensor.S2A, Sensor.S2B]).containsAll([this.image.get('SPACECRAFT_NAME')]),
        this.image.select(['B2'], [Band.BLUE]).int16(),
        this.image.select(Band.BLUE))));
              
    var green =  ee.Algorithms.If(ee.List([Sensor.L5, Sensor.L7]).containsAll([this.image.get('SPACECRAFT_ID')]),
        this.image.select(['B2'], [Band.GREEN]).multiply(Factor).int16(),
      ee.Algorithms.If(ee.List([Sensor.L8]).containsAll([this.image.get('SPACECRAFT_ID')]),
        this.image.select(['B3'], [Band.GREEN]).multiply(Factor).int16(),
        ee.Algorithms.If(ee.List([Sensor.S2A, Sensor.S2B]).containsAll([this.image.get('SPACECRAFT_NAME')]),
        this.image.select(['B3'], [Band.GREEN]).int16(),
        this.image.select(Band.GREEN))));
              
    var red = ee.Algorithms.If(ee.List([Sensor.L5, Sensor.L7]).containsAll([this.image.get('SPACECRAFT_ID')]),
      this.image.select(['B3'], [Band.RED]).multiply(Factor).int16(),
      ee.Algorithms.If(ee.List([Sensor.L8]).containsAll([this.image.get('SPACECRAFT_ID')]),
        this.image.select(['B4'], [Band.RED]).multiply(Factor).int16(),
        ee.Algorithms.If(ee.List([Sensor.S2A, Sensor.S2B]).containsAll([this.image.get('SPACECRAFT_NAME')]),
          this.image.select(['B4'], [Band.RED]).int16(),
          this.image.select(Band.RED))));
              
    var nir = ee.Algorithms.If(ee.List([Sensor.L5, Sensor.L7]).containsAll([this.image.get('SPACECRAFT_ID')]),
      this.image.select(['B4'], [Band.NIR]).multiply(Factor).int16(),
      ee.Algorithms.If(ee.List([Sensor.L8]).containsAll([this.image.get('SPACECRAFT_ID')]),
        this.image.select(['B5'], [Band.NIR]).multiply(Factor).int16(),
        ee.Algorithms.If(ee.List([Sensor.S2A, Sensor.S2B]).containsAll([this.image.get('SPACECRAFT_NAME')]),
        this.image.select(['B8'], [Band.NIR]).int16(),
        this.image.select(Band.NIR))));
              
    var swir1 = ee.Algorithms.If(ee.List([Sensor.L5, Sensor.L7]).containsAll([this.image.get('SPACECRAFT_ID')]),
      this.image.select(['B5'], [Band.SWIR1]).multiply(Factor).int16(),
      ee.Algorithms.If(ee.List([Sensor.L8]).containsAll([this.image.get('SPACECRAFT_ID')]),
        this.image.select(['B6'], [Band.SWIR1]).multiply(Factor).int16(),
        ee.Algorithms.If(ee.List([Sensor.S2A, Sensor.S2B]).containsAll([this.image.get('SPACECRAFT_NAME')]),
        this.image.select(['B11'], [Band.SWIR1]).int16(),
        this.image.select(Band.SWIR1))));
              
    var swir2 = ee.Algorithms.If(ee.List([Sensor.L5, Sensor.L7, Sensor.L8]).containsAll([this.image.get('SPACECRAFT_ID')]),
      this.image.select(['B7'], [Band.SWIR2]).multiply(Factor).int16(),
        ee.Algorithms.If(ee.List([Sensor.S2A, Sensor.S2B]).containsAll([this.image.get('SPACECRAFT_NAME')]),
        this.image.select(['B12'], [Band.SWIR2]).int16(),
          this.image.select(Band.SWIR2)));
            
    var tir1 = ee.Algorithms.If(ee.List([Sensor.L5]).containsAll([this.image.get('SPACECRAFT_ID')]),
      this.image.select(['B6'], [Band.TIR1]).int16(),
      ee.Algorithms.If(ee.List([Sensor.L7]).containsAll([this.image.get('SPACECRAFT_ID')]),
        this.image.select(['B6_VCID_2'], [Band.TIR1]).int16(),
        ee.Algorithms.If(ee.List([Sensor.L8]).containsAll([this.image.get('SPACECRAFT_ID')]),
          this.image.select(['B10'], [Band.TIR1]).int16(),
            this.image.select(Band.TIR1))));
    
    var tir2 = ee.Algorithms.If(ee.List([Sensor.L8]).containsAll([this.image.get('SPACECRAFT_ID')]),
      this.image.select(['B11'], [Band.TIR2]).int16(),
      this.image.select(Band.TIR2).int16());
                 
    var evi2 = this.image.expression('2.5 * ((NIR - RED) / (NIR + 2.4*RED + 1))', {
      'NIR': ee.Image(nir).divide(Factor),
      'RED': ee.Image(red).divide(Factor)
    }).select([0], [Band.EVI2])
      .multiply(Factor).int16();
          
    var ndwi = this.image.expression('(NIR - SWIR1) / (NIR + SWIR1)', {
      'NIR' : nir,
      'SWIR1': swir1,
    }).select([0], [Band.NDWI])
      .multiply(Factor).int16();
          
    var ndvi = this.image.expression('(NIR - RED) / (NIR + RED)', {
      'RED' : red,
      'NIR': nir
    }).select([0], [Band.NDVI])
      .multiply(Factor).int16();
            
    var cai = this.image.expression('SWIR2 / SWIR1', {
      'SWIR1': swir1,
      'SWIR2': swir2,
    }).select([0], [Band.CAI])
      .multiply(Factor).int16();
          
    var lai = this.image.expression('0.3977 * (2.5556 * (NIR - RED)/(NIR + RED))', {
      'NIR': ee.Image(nir).divide(Factor),
      'RED': ee.Image(red).divide(Factor),
    }).select([0], [Band.LAI])
      .multiply(Factor).int16();
          
    var mndwi = this.image.expression('(GREEN - SWIR1) / (GREEN + SWIR1)', {
      'GREEN': green,
      'SWIR1': swir1,
    }).select([0], [Band.MNDWI])
      .multiply(Factor).int16();
          
    var awei_nsh = this.image.expression('4 * (GREEN - SWIR1) -  0.25 * NIR + 2.75 * SWIR2', {
      'GREEN': ee.Image(green).divide(Factor),
      'NIR': ee.Image(nir).divide(Factor),
      'SWIR1': ee.Image(swir1).divide(Factor),
      'SWIR2': ee.Image(swir2).divide(Factor),
    }).select([0], [Band.AWEI_NSH])
      .multiply(Factor).int16();
    
    var awei_sh = this.image.expression('BLUE + 2.5 * GREEN - 1.5 * (NIR + SWIR1) - 0.25 * SWIR2', {
      'BLUE': ee.Image(blue).divide(Factor), 
      'GREEN': ee.Image(green).divide(Factor),
      'NIR': ee.Image(nir).divide(Factor),
      'SWIR1': ee.Image(swir1).divide(Factor),
      'SWIR2': ee.Image(swir2).divide(Factor),
    }).select([0], [Band.AWEI_SH])
      .multiply(Factor).int16();
    
    var msavi2 = this.image.expression('(2 * NIR + 1 - sqrt( (2 * NIR + 1)**2 - 8 * (NIR - RED))) / 2', {
      'RED': ee.Image(red).divide(Factor), 
      'NIR': ee.Image(nir).divide(Factor),
    }).select([0], [Band.MSAVI2])
      .multiply(Factor).int16();

    var bsi = this.image.expression('(SWIR2 + RED) - (SWIR2 - BLUE) / (SWIR2 + RED) + (SWIR2 - BLUE)', {
      'BLUE': blue,
      'RED': red, 
      'SWIR2': swir2
    }).select([0], [Band.BSI])
      .multiply(Factor).int16();
    
    var temp_bands = [];
    for(var i=0; i<bands.length; i++){
      var band = bands[i];
      
      if(band === Band.BLUE){
        temp_bands.push(blue)
      }
      
      if(band === Band.GREEN){
        temp_bands.push(green)
      }
      
      if(band === Band.RED){
        temp_bands.push(red)
      }
      
      if(band === Band.NIR){
        temp_bands.push(nir)
      }
      
      if(band === Band.SWIR1){
        temp_bands.push(swir1)
      }
      
      if(band === Band.SWIR2){
        temp_bands.push(swir2)
      }
      
      if(band === Band.TIR1){
        temp_bands.push(tir1)
      }
      
      if(band === Band.TIR2){
        temp_bands.push(tir2)
      }
      
      if(band === Band.EVI2){
        temp_bands.push(evi2)
      }
      
      if(band === Band.NDWI){
        temp_bands.push(ndwi)
      }
      
      if(band === Band.NDVI){
        temp_bands.push(ndvi)
      }
      
      if(band === Band.CAI){
        temp_bands.push(cai)
      }
      
      if(band === Band.LAI){
        temp_bands.push(lai)
      }
      
      if(band === Band.MNDWI){
        temp_bands.push(mndwi)
      }
      if(band === Band.AWEI_NSH){
        temp_bands.push(awei_nsh)
      }
      if(band === Band.AWEI_SH){
        temp_bands.push(awei_sh)
      }
      if(band === Band.MSAVI2){
        temp_bands.push(msavi2)
      }
      if(band === Band.BSI){
        temp_bands.push(bsi)
      }      
    }
    
    var newImage = ee.Image.cat(temp_bands);
    return new Image(newImage);
  },
  toString: function(){
    return "This is not a ee.Image. Please, use the print(image.getEEImage()).";
  }
};

function ImageCollection(imageCollection) {
  this.imageCollection = imageCollection;
}

ImageCollection.prototype = {
  constructor: ImageCollection,
  getEEImageCollection: function(){
    return this.imageCollection;
  },
  filterByPeriod: function(year, period, offset, cloudCover){
    if(cloudCover === undefined){
      cloudCover = 100;
    }
    var parse_period = function(date_format, year){
        var year_format = date_format.match(/\(([^)]+)\)/)[0];
        year = new Function('return ' + year_format.replace('Y', year)); //eval alternative
        var date = date_format.replace(year_format, year);
        return date;
    };
    
    var initialPeriod = period.split(',')[0];
    var finalPeriod   = period.split(',')[1];
    
    var filter = null;
    
    for(var i=0; i <=offset; i++){
        var localInitialPeriod = parse_period(initialPeriod, year - i)
        var localFinalPeriod   = parse_period(finalPeriod, year - i)
        
        var filterDate = ee.Filter.date(localInitialPeriod, localFinalPeriod);
        
        if(filter === null){
          filter = filterDate;
        }else{
          filter = ee.Filter.or(filter, filterDate);
        }
    }
    
    var collection = this.imageCollection.filter(filter);
      
    collection = collection.map(function(image){
      return ee.Image(ee.Algorithms.If(ee.List([Sensor.L5, Sensor.L7, Sensor.L8]).containsAll([image.get('SPACECRAFT_ID')]),
          image.set("CLOUD", image.get("CLOUD_COVER")),
          ee.Algorithms.If(ee.List([Sensor.S2A, Sensor.S2B]).containsAll([image.get('SPACECRAFT_NAME')]),
            image.set("CLOUD", image.get("CLOUDY_PIXEL_PERCENTAGE")),
            ee.Algorithms.If(ee.List([Sensor.BLARD]).containsAll([image.get('SPACECRAFT_ID')]),
              image.set("CLOUD", 0),
              image
            )
          )
        ));
    }).filterMetadata("CLOUD", "less_than", cloudCover);
    
    
    var newImageCollection = ee.ImageCollection(collection);
    
    return new ImageCollection(newImageCollection);
  },
  removeClouds:  function(){
    var newImageCollection = this.imageCollection.map(function(image){
      var apiImage = new Image(image)
        .removeClouds();
      return apiImage.getEEImage();
    });
    return new ImageCollection(newImageCollection);
  }, 
  buildBands: function(bands){
    var newImageCollection = this.imageCollection.map(function(image){
      var apiImage = new Image(image)
        .buildBands(bands);
      return apiImage.getEEImage();
    });
    return new ImageCollection(newImageCollection);
  },
  applyReducers: function(reducers){
    var bands = Object.keys(Band);
    var newImageCollection = ee.ImageCollection(ee.Algorithms.If(
      ee.Number(this.imageCollection.size()).eq(0), 
      ee.ImageCollection(ee.Image(Array(bands.length)).rename(bands)),
      this.imageCollection)
    );

    var reducer = [];
    for(var i=0; i<reducers.length; i++){
      if(reducers[i] == Reducer.MAX){
        reducer.push(ee.Reducer.max()); 
      }
      if(reducers[i] == Reducer.MIN){
        reducer.push(ee.Reducer.min());
      }
      if(reducers[i] == Reducer.MEDIAN){
        reducer.push(ee.Reducer.median()); 
      }
      if(reducers[i] == Reducer.MEAN){
        reducer.push(ee.Reducer.mean()); 
      }
      if(reducers[i] == Reducer.STDV){
        reducer.push(ee.Reducer.stdDev());  
      }
      if(reducers[i] == Reducer.COUNT){
        reducer.push(ee.Reducer.count());
      }
      if(reducers[i] == Reducer.SUM){
        reducer.push(ee.Reducer.sum());
      }
    }
    
    var qmo = null;
    var percentile = null;
    
    bands.forEach(function(band){
      reducers.forEach(function(reducer){
        if(typeof(reducer) == typeof({})){
          if(reducer["reducer"] === 'qmo'){
            var bandReducer = Band[reducer["band"]];
            qmo = newImageCollection.qualityMosaic(bandReducer);
            qmo = qmo.rename(ee.List(qmo.bandNames()).map(function(band){
              return ee.String(band).cat("_").cat("qmo");
            }));
          }
          
          if(reducer["reducer"] === 'percentile'){
            var percentiles = reducer["percentiles"];
            percentile = newImageCollection.reduce(ee.Reducer.percentile(percentiles));
          }
        }
      });
    });
  
    var image = null;
    if(reducer.length > 0){
      reducer = ee.List(reducer);
      image = newImageCollection.reduce(
        ee.Algorithms.If(
          ee.Number(reducer.size()).gte(2), 
          reducer.slice(1).iterate(function(r, list){
            return ee.Reducer(list).combine({'reducer2': r, 'sharedInputs':true}) },reducer.get(0)
          ),
          reducer.get(0)
        )
      );
    }
    
    var imagesResult = [];
    if(image !== null){
      imagesResult.push(image);
    }
    if(qmo !== null){
      imagesResult.push(qmo);
    }
    if(percentile !== null){
      imagesResult.push(percentile);
    }
    
    var result = ee.Image.cat(imagesResult);
    
    return new Image(result.set('system:index', ee.String(ee.Image(newImageCollection.first()).get('system:index')).slice(0,16)));
  },
  applyBuffer: function(buffer){
    var newImageCollection = this.imageCollection.map(function(image){
      return image.clip(image.geometry().buffer(buffer));
    });
    
    return new ImageCollection(newImageCollection);
  },
  applyBRDFCorrection: function(){
    var newImageCollection = this.imageCollection.map(function(image){
      var apiImage = new Image(image).applyBRDFCorrection();
      return apiImage.getEEImage();
    });
    return new ImageCollection(newImageCollection);
  },
  clipByGeometry: function(geometry){
    var newImageCollection = this.imageCollection.map(function(image){
      return image.clip(geometry);
    });
    return new ImageCollection(newImageCollection);
  },
  applyMap: function(f){
    var newImageCollection = this.imageCollection.map(f);
    return new ImageCollection(newImageCollection);
  },
  toString: function(){
    return "This is not a ee.ImageCollection. Please, use the print(image.getEEImageCollection()).";
  }
};

exports.Band = Band;
exports.Reducer = Reducer;
exports.Sensor = Sensor;
exports.Image = Image;
exports.ImageCollection = ImageCollection;