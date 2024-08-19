var propertiesDict = ee.Dictionary({
    'LANDSAT_4': {
      'C1': {
        'TOA': {
          'bands': ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'BQA'],
          'newBandNames': ['BLUE', 'GREEN', 'RED', 'NIR', 'SWIR1', 'TIR1', 'SWIR2', 'BQA'],
          'scaleFactors': [1, 1, 1, 1, 1, 1, 1, 1],
          'offset': [0, 0, 0, 0, 0, 0, 0, 0]
        },
      },
      'C2': {
        'TOA': {
          'bands': ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'QA_PIXEL'],
          'newBandNames': ['BLUE', 'GREEN', 'RED', 'NIR', 'SWIR1', 'TIR1', 'SWIR2', 'BQA'],
          'scaleFactors': [1, 1, 1, 1, 1, 1, 1, 1],
          'offset': [0, 0, 0, 0, 0, 0, 0, 0]
        },
        'SR': {
          'bands': ['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7', 'QA_PIXEL'],
          'newBandNames': ['BLUE', 'GREEN', 'RED', 'NIR', 'SWIR1', 'SWIR2', 'BQA'],
          'scaleFactors': [0.0000275, 0.0000275, 0.0000275, 0.0000275, 0.0000275, 0.0000275, 1],
          'offset': [-0.2, -0.2, -0.2, -0.2, -0.2 ,-0.2 , 0]
        }
      }
    },
    'LANDSAT_5': {
      'C1': {
        'TOA': {
          'bands': ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'BQA'],
          'newBandNames': ['BLUE', 'GREEN', 'RED', 'NIR', 'SWIR1', 'TIR1', 'SWIR2', 'BQA'],
          'scaleFactors': [1, 1, 1, 1, 1, 1, 1, 1],
          'offset': [0, 0, 0, 0, 0, 0, 0, 0]
        },
      },
      'C2': {
        'TOA': {
          'bands': ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'QA_PIXEL'],
          'newBandNames': ['BLUE', 'GREEN', 'RED', 'NIR', 'SWIR1', 'TIR1', 'SWIR2', 'BQA'],
          'scaleFactors': [1, 1, 1, 1, 1, 1, 1, 1],
          'offset': [0, 0, 0, 0, 0, 0, 0, 0]
        },
        'SR': {
          'bands': ['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7', 'QA_PIXEL'],
          'newBandNames': ['BLUE', 'GREEN', 'RED', 'NIR', 'SWIR1', 'SWIR2', 'BQA'],
          'scaleFactors': [0.0000275, 0.0000275, 0.0000275, 0.0000275, 0.0000275, 0.0000275, 1],
          'offset': [-0.2, -0.2, -0.2, -0.2, -0.2 ,-0.2 , 0]
        }
      }
    },
    'LANDSAT_7': {
      'C1': {
        'TOA': {
          'bands': ['B1', 'B2', 'B3', 'B4', 'B5', 'B7', 'BQA'],
          'newBandNames': ['BLUE', 'GREEN', 'RED', 'NIR', 'SWIR1', 'SWIR2', 'BQA'],
          'scaleFactors': [1, 1, 1, 1, 1, 1, 1],
          'offset': [0, 0, 0, 0, 0, 0, 0]
        },
      },
      'C2': {
        'TOA': {
          'bands': ['B1', 'B2', 'B3', 'B4', 'B5', 'B7', 'QA_PIXEL'],
          'newBandNames': ['BLUE', 'GREEN', 'RED', 'NIR', 'SWIR1', 'SWIR2', 'BQA'],
          'scaleFactors': [1, 1, 1, 1, 1, 1, 1],
          'offset': [0, 0, 0, 0, 0, 0, 0]
        },
        'SR': {
          'bands': ['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7', 'QA_PIXEL'],
          'newBandNames': ['BLUE', 'GREEN', 'RED', 'NIR', 'SWIR1', 'SWIR2', 'BQA'],
          'scaleFactors': [0.0000275, 0.0000275, 0.0000275, 0.0000275, 0.0000275, 0.0000275, 1],
          'offset': [-0.2, -0.2, -0.2, -0.2, -0.2 ,-0.2 , 0]
        }
      }
    },  
    'LANDSAT_8': {
      'C1': {
        'TOA': {
          'bands': ['B2', 'B3','B4', 'B5', 'B6', 'B7', 'B10', 'B11', 'BQA'],
          'newBandNames': ['BLUE', 'GREEN', 'RED', 'NIR', 'SWIR1', 'SWIR2', 'TIR1', 'TIR2', 'BQA'],
          'scaleFactors': [1, 1, 1, 1, 1, 1, 1, 1, 1],
          'offset': [0, 0, 0, 0, 0, 0, 0, 0 ,0]
        },
      },
      'C2': {
        'TOA': {
          'bands': ['B2', 'B3','B4', 'B5', 'B6', 'B7', 'B10', 'B11', 'QA_PIXEL'],
          'newBandNames': ['BLUE', 'GREEN', 'RED', 'NIR', 'SWIR1', 'SWIR2', 'TIR1', 'TIR2', 'BQA'],
          'scaleFactors': [1, 1, 1, 1, 1, 1, 1, 1, 1],
          'offset': [0, 0, 0, 0, 0, 0, 0, 0 ,0]
        },
        'SR': {
          'bands': ['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7', 'QA_PIXEL'],
          'newBandNames': ['BLUE', 'GREEN', 'RED', 'NIR', 'SWIR1', 'SWIR2', 'BQA'],
          'scaleFactors': [0.0000275, 0.0000275, 0.0000275, 0.0000275, 0.0000275, 0.0000275, 1],
          'offset': [-0.2, -0.2, -0.2, -0.2, -0.2 ,-0.2 , 0]
        }
      }
    },  
    'LANDSAT_9': {
      'C2': {
        'TOA': {
          'bands': ['B2', 'B3','B4', 'B5', 'B6', 'B7', 'B10', 'B11', 'QA_PIXEL'],
          'newBandNames': ['BLUE', 'GREEN', 'RED', 'NIR', 'SWIR1', 'SWIR2', 'TIR1', 'TIR2', 'BQA'],
          'scaleFactors': [1, 1, 1, 1, 1, 1, 1, 1, 1],
          'offset': [0, 0, 0, 0, 0, 0, 0, 0 ,0]
        },
        'SR': {
          'bands': ['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7', 'QA_PIXEL'],
          'newBandNames': ['BLUE', 'GREEN', 'RED', 'NIR', 'SWIR1', 'SWIR2', 'BQA'],
          'scaleFactors': [0.0000275, 0.0000275, 0.0000275, 0.0000275, 0.0000275, 0.0000275, 1],
          'offset': [-0.2, -0.2, -0.2, -0.2, -0.2 ,-0.2 , 0]
        }
      }
    },  
    'Sentinel-2A': {
      'C1': {
        'TOA-SR': {
          'bands': ['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B8A', 'B11', 'B12', 'QA60'],
          'newBandNames': ['BLUE', 'GREEN', 'RED', 'RE1', 'RE2', 'RE3', 'NIR', 'RE4', 'SWIR1', 'SWIR2', 'BQA'],
          'scaleFactors': [0.0001, 0.0001, 0.0001, 0.0001, 0.0001, 0.0001, 0.0001, 0.0001, 0.0001, 0.0001, 1],
          'offset': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        }
      }
    },  
    'Sentinel-2B': {
      'C1': {
        'TOA-SR': {
          'bands': ['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B8A', 'B11', 'B12', 'QA60'],
          'newBandNames': ['BLUE', 'GREEN', 'RED', 'RE1', 'RE2', 'RE3', 'NIR', 'RE4', 'SWIR1', 'SWIR2', 'BQA'],
          'scaleFactors': [0.0001, 0.0001, 0.0001, 0.0001, 0.0001, 0.0001, 0.0001, 0.0001, 0.0001, 0.0001, 1],
          'offset': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        }
      }
    },
    'MODIS': {
      'C1': {
        'SR': {
          'bands': ['sur_refl_b03', 'sur_refl_b04', 'sur_refl_b01', 'sur_refl_b02', 'sur_refl_b06', 'sur_refl_b07', 'StateQA'],
          'newBandNames': ['BLUE', 'GREEN', 'RED', 'NIR', 'SWIR1', 'SWIR2', 'BQA'],
          'scaleFactors': [1, 1, 1, 1, 1, 1, 1],
          'offset': [0, 0, 0, 0, 0, 0, 0]
        }
      }
    }
  });
  
  
  
  
    
  function getLandsatProperties(landsatImage){
    var landsatProperties =  landsatImage.toDictionary(landsatImage.propertyNames());
    
    return landsatProperties
      .set('SATELLITE_NAME', landsatProperties.getString('SPACECRAFT_ID'))
      .set('CLOUD_COVER', landsatProperties.getNumber('CLOUD_COVER'))
      .set('COLLECTION', ee.String('C').cat(ee.String(landsatProperties.getNumber('COLLECTION_NUMBER').int())))
      .set('REFLECTANCE', ee.Algorithms.If(
                                            landsatImage.bandNames().containsAll(['SR_B2', 'SR_B3', 'SR_B4']),
                                            'SR',
                                            'TOA'
                                          ));
  }
  
  function getSentinelProperties(sentinelImage){
    var sentinelProperties = sentinelImage.toDictionary(sentinelImage.propertyNames());
    
    return sentinelProperties
      .set('SATELLITE_NAME', sentinelProperties.getString('SPACECRAFT_NAME'))
      .set('CLOUD_COVER', sentinelProperties.getNumber('CLOUDY_PIXEL_PERCENTAGE'))
      .set('COLLECTION', 'C1')
      .set('REFLECTANCE', 'TOA-SR');
  }
  
  function getMODISProperties(modisImage){
    return ee.Dictionary({
      'SATELLITE_NAME': 'MODIS',
      'COLLECTION': 'C1',
      'REFLECTANCE': 'SR'
    });
  }
  
  function getProperties(image){
    return ee.Dictionary(ee.Algorithms.If(ee.List(['LANDSAT_5', 'LANDSAT_7', 'LANDSAT_8', 'LANDSAT_9']).containsAll([image.get('SPACECRAFT_ID')]), 
      getLandsatProperties(image), 
      ee.Algorithms.If(ee.List(['Sentinel-2A', 'Sentinel-2B']).containsAll([image.get('SPACECRAFT_NAME')]),
        getSentinelProperties(image),
        getMODISProperties(image)
      )
    ));
  }
  
  function standardizeImage(image){
    var imageProperties = getProperties(image);
    
    var properties = ee.Dictionary(ee.Dictionary(ee.Dictionary(
                        propertiesDict
                        .get(imageProperties.get('SATELLITE_NAME')))
                        .get(imageProperties.get('COLLECTION')))
                        .get(imageProperties.get('REFLECTANCE')));
  
    var renamedImage = image.select(properties.get('bands'), properties.get('newBandNames'));
    
    var reescaledImage = renamedImage.multiply(ee.Number(ee.List(properties.get('scaleFactors')))).add(ee.Number(ee.List(properties.get('offset'))));
    return ee.Image(reescaledImage.setMulti(imageProperties)); 
  }
  
  exports.standardizeImage = standardizeImage;