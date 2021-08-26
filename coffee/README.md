<div>
    <img src='../assets/logo.png' height='auto' width='200' align='right'>
    <h1>Coffee</h1>
</div>

Developed by ***Agrosatélite Geotecnologia Aplicada Ltda***.

## About

This folder contains the scripts to classify and post-process the **Coffee** subclass. 

We recommend that you read the [Agriculture Appendix of the Algorithm Theoretical Basis Document (ATBD)](https://mapbiomas.org/download-dos-atbds), since important informations about the coffee classification methodology can be found in there. 

## How to use

First, you need to copy the scripts in this folder and in the [utils folder](../utils) to your Google Earth Engine (**GEE**) account.

Then, in your **GEE** account, go to the **Assets tab**, create the following directory structure:

 - MAPBIOMAS/C6/AGRICULTURE/COFFEE/RESULTS

and create one **Image Collections**:

 - MAPBIOMAS/C6/AGRICULTURE/COFFEE/RESULTS/**RAW**
 
You must provide the training samples in a **Feature Collection**:

 - MAPBIOMAS/C6/AGRICULTURE/COFFEE/**SAMPLES**


### Classification 

To run the classification, follow these steps:

1. Open the script **agriculture/coffee/classification.js**;

2. On **line 5** (variable `getNormalizedCollection`), set the path to the [normalization.js](../utils/normalization.js) script you copied to your GEE account;

3. On **line 10** (variable `outputCollection`), set the output path for the classification results;

4. On **line 13** (variable `years`), set the years you want to classify;
    
5. On **line 20** (variable `tiles`), set the WRS (path and row) you want to classify;

6. On **line 45** (variable `trainingSamples`), set the path to your training samples;
        
7. Run the script.

### Post-processing
    
To run the post-processing, follow these steps:

1. Open the script **agriculture/coffee/temporal_spatial_filter.js**;

2. On **line 2** (variable `filters`), set the path to the [temporal_spatial_filters.js](../utils/temporal_spatial_filters.js) script you copied to your GEE account;

3. On **line 8** (variable `input`), set the path to the raw classification result;

4. On **line 11** (variable `output`), set the path for the filtered result;

5. Run the script.