<div>
    <img src='https://agrosatelite.com.br/wp-content/uploads/2019/02/logo_horizontal_negativo.png' height='auto' width='200' align='right'>
    <h1>Soybean</h1>
</div>

Developed by ***Agrosatélite Geotecnologia Aplicada Ltda***.

## About

This folder contains the scripts to classify and post-process the **Soybean** subclass. 

We recommend that you read the [Agriculture Appendix of the Algorithm Theoretical Basis Document (ATBD)](https://mapbiomas.org/download-dos-atbds), since important informations about the soybean classification methodology can be found in there. 

## How to use

First, you need to copy the scripts in this folder and in the [utils folder](../utils) to your Google Earth Engine (**GEE**) account.

Then, in your **GEE** account, go to the **Assets tab** and create the following directory structure:

 - MAPBIOMAS/C5/AGRICULTURE/SOYBEAN/RESULTS

and create one **Image Collections**:

 - MAPBIOMAS/C5/AGRICULTURE/SOYBEAN/RESULTS/**RAW**
 
You must provide the training samples in a **Feature Collection**:

 - MAPBIOMAS/C5/AGRICULTURE/SOYBEAN/**SAMPLES**


### Classification 

To run the classification, follow these steps:

1. Open the script **agriculture/soybean/classification.js**;

2. On **line 2** (variable `api`), set the path to the [api.js](../utils/api.js) script you copied to your GEE account;

3. On **line 5** (variable `normalization`), set the path to the [normalization.js](../utils/normalization.js) script you copied to your GEE account;

4. On **line 10** (variable `outputCollection`), set the output path for the classification results;

5. On **line 13** (variable `years`), set the years you want to classify;
    
6. On **line 20** (variable `tiles`), set the WRS (path and row) you want to classify;
    
7. On **line 45** (variable `periods`), set the periods of the region you want to classify (more information about that you can read on the [ATBD Agriculture Appendix](https://mapbiomas.org/download-dos-atbds));

8. On **line 96** (variable `trainingSamples`), set the path to your training samples;
        
9. Run the script.

### Post-processing
    
To run the post-processing, follow these steps:

1. Open the script **agriculture/soybean/temporal_spatial_filter.js**;

2. On **line 2** (variable `input`), set the input path to the raw classification result;

3. On **line 5** (variable `output`), set the path for the filtered result;

4. On **lines 8 and 9** (variables `startYear` and `endYear`), set the years interval you want to filter;

5. Run the script.