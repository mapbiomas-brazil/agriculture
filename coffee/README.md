<div>
    <img src='../assets/logo.png' height='auto' width='200' align='right'>
    <h1>Coffee</h1>
</div>

Developed by ***Remap Geotecnologia Ltda***.

## About

This folder contains the scripts to classify and post-process the **Coffee** subclass. 

We recommend that you read the [Agriculture Appendix of the Algorithm Theoretical Basis Document (ATBD)](https://mapbiomas.org/download-dos-atbds), since important informations about the coffee classification methodology can be found in there. 

## How to use

First, you need to copy the scripts in this folder and in the [utils folder](../utils) to your Google Earth Engine (**GEE**) account.

Then, in your **GEE** account, go to the **Assets tab**, create the following directory structure:

 - MAPBIOMAS/C7/AGRICULTURE/COFFEE/RESULTS

and create one **Image Collections**:

 - MAPBIOMAS/C7/AGRICULTURE/COFFEE/RESULTS/**RAW**
 

### Classification 

To run the classification, follow these steps:

1. Open the script **agriculture/coffee/01_classification.js**;

2. On **line 20** (variable `getNormalizedCollection`), set the path to the [normalization.js](../utils/normalization.js) script you copied to your GEE account;

3. On **line 38** (variable `outputCollection`), set the output path for the classification results;

4. On **line 41** (variable `years`), set the years you want to classify;
    
5. On **line 52** (variable `tiles`), set the WRS (path and row) you want to classify;

6. On **line 206** (variable `reference`), set the path to your reference map;
        
7. Run the script.

### Post-processing
    
To run the post-processing, follow these steps:

1. Open the script **agriculture/coffee/02_spatial_temporal_filter.js**;

2. On **line 33** (variable `filters`), set the path to the [temporal_spatial_filters.js](../utils/temporal_spatial_filters.js) script you copied to your GEE account;

3. On **line 41** (variable `input`), set the path to the raw classification result;

4. On **line 44** (variable `output`), set the path for the filtered result;

5. Run the script.