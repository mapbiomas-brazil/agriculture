var INDEX_EXPRESSIONS = {
  EVI: 'EVI = 2.5 * ((i.NIR − i.RED)/(i.NIR + 6 * i.RED − 7.5 * i.BLUE + 1))',
  EVI2: 'EVI2 = 2.5 * (i.NIR - i.RED) / (i.NIR + 2.4 * i.RED + 1)',
  NDVI: 'NDVI = (i.NIR - i.RED) / (i.NIR + i.RED)',
  NDWI: 'NDWI = (i.NIR - i.SWIR1) / (i.NIR + i.SWIR1)',
  MNDWI: 'MNDWI = (i.GREEN - i.SWIR1) / (i.GREEN + i.SWIR1)',
  CAI: 'CAI = i.SWIR2 / i.SWIR1',
  LAI: 'LAI = (0.3977 * exp(2.5556 * (i.NIR - i.RED) / (i.NIR + i.RED)))',
  AWEI_NSH: 'AWEI_NSH = 4 * (i.GREEN - i.SWIR1) -  0.25 * i.NIR + 2.75 * i.SWIR2',
  AWEI_SH: 'AWEI_SH = i.BLUE + 2.5 * i.GREEN - 1.5 * (i.NIR + i.SWIR1) - 0.25 * i.SWIR2',
  MSAVI2: 'MSAVI2 = (2 * i.NIR + 1 - sqrt((2 * i.NIR + 1)**2 - 8 * (i.NIR - i.RED))) / 2',
  BSI: 'BSI = (i.SWIR2 + i.RED) - (i.SWIR2 - i.BLUE) / (i.SWIR2 + i.RED) + (i.SWIR2 - i.BLUE)',
  CEI: 'CEI = (10**6 * (i.MAX - i.MIN) / (10**6 + i.MAX + 10**6 + i.MIN))',
  GNDVI: 'GNDVI = ((i.NIR - i.GREEN) / (i.NIR + i.GREEN))',
  MVI: 'MVI = ((i.NIR - i.SWIR1) / (i.NIR + i.SWIR1))',
  SR: 'SR = i.NIR / i.RED',
  CMRI: 'CMRI = i.EVI2 - i.NDWI',
  MMRI: 'MMRI = ((i.MNDWI > 0 ? i.MNDWI : i.MNDWI * -1) - (i.NDVI > 0 ? i.NDVI : i.NDVI * -1))/((i.MNDWI > 0 ? i.MNDWI : i.MNDWI * -1) + (i.NDVI > 0 ? i.NDVI : i.NDVI * -1))',
  SAVI: 'SAVI = 1.5 * (i.NIR - i.RED)/(i.NIR + i.RED + 0.5)',
  GCVI: 'GCVI = (i.NIR/i.GREEN - 1)', //ATBD CERRADO
  HALLCOVER: 'HALLCOVER = (-i.RED * 0.017 - i.NIR * 0.007 - i.SWIR2 * 0.079 + 5.22)',//ATBD CERRADO
  PRI: 'PRI = (i.BLUE - i.GREEN)/(i.BLUE + i.GREEN)', //ATBD CERRADO
  GRVI: 'GRVI = (i.GREEN - i.RED) / (i.GREEN + i.RED)',
  RDVI: 'RDVI = (i.NIR - i.RED) / sqrt(i.NIR + i.RED)'
};


function calculateIndex(image, index) {
  var expression = INDEX_EXPRESSIONS[index];
  var calculated = image.expression(expression, {i: image});

  return image.addBands(calculated, null, true);
}


function calculateIndexes(image, indexes) {
  indexes.forEach(function(index) {
    image = calculateIndex(image, index);
  });
  
  return image
}

exports.calculateIndexes = calculateIndexes
exports.calculateIndex = calculateIndex
