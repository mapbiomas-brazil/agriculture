<div>
    <img src='../assets/logo.png' height='auto' width='200' align='right'>
    <h1>Temporary Crops (Soybean, Cotton and Others)</h1>
</div>

Developed by ***Remap Geotecnologia Ltda***.

## About

This folder contains the scripts to classify and post-process the **Soybean, Cotton and Other Temporary Crops** classes. 

We recommend that you read the [Agriculture Appendix of the Algorithm Theoretical Basis Document (ATBD)](https://mapbiomas.org/download-dos-atbds), since important informations about the classification methodology can be found in there. 

## How to use

First, you need to copy the scripts in this folder and in the [utils folder](../utils) to your Google Earth Engine (**GEE**) account.

Then, in your **GEE** account, go to the **Assets tab**, create the following directory structure:

 - MAPBIOMAS/C7/AGRICULTURE/TEMPORARY_CROPS/RESULTS

and create one **Image Collections**:

 - MAPBIOMAS/C7/AGRICULTURE/TEMPORARY_CROPS/RESULTS/**RAW**

### Classification

To run the classification, follow these steps:

1. Open the script **agriculture/soybean_cotton_other_temporary_crops/01_classification.js**;

2. On **line 21** (variable `index`), set the path to the [indexes.js](../utils/indexes.js) script you copied to your GEE account;

3. On **line 23** (variable `getNormalizedCollection`), set the path to the [normalization.js](../utils/normalization.js) script you copied to your GEE account;

4. On **line 25** (variable `cloudLib`), set the path to the [cloud.js](../utils/cloud.js) script you copied to your GEE account;

3. On **line 45** (variable `outputCollection`), set the output path for the classification results;

4. On **line 48** (variable `years`), set the years you want to classify;
    
5. On **line 54** (variable `tiles`), set the WRS (path and row) you want to classify;
     
6. On **line 304** (variable `reference`), set the path to your reference map that will be used for sampling;
    
7. Run the script.

### Post-processing

To apply the temporal and spatial filters, follow these steps: 

1. Open the script **agriculture/soybean_cotton_other_temporary_crops/02_spatial_temporal_filter.js**;

2. On **line 20** (variable `filters`), set the path to the [temporal_spatial_filters.js](../utils/temporal_spatial_filters.js) script you copied to your GEE account;

3. On **line 26** (variable `input`), set the path to the raw classification result;

4. On **line 29** (variable `output`), set the path for the filtered result;

5. Run the script.

To separate the classes again, follow these steps:

1. Open the script **agriculture/soybean_cotton_other_temporary_crops/03_masked_temporary_crops.js**;

2. On **line 23** (variable `outputName`), set the path for the final result;

3. On **line 27** (variable `raw`), set the path to the raw classification result;

4. On **line 39** (variable `filtered_tc`), set the path to the filtered classification result;

5. Run the script.