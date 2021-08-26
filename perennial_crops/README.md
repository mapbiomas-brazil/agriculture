<div>
    <img src='../assets/logo.png' height='auto' width='200' align='right'>
    <h1>Perennial Crops</h1>
</div>

Developed by ***Agrosatélite Geotecnologia Aplicada Ltda***.

## About

This folder contains the scripts to classify and post-process the **Perennial Crop** class. 

We recommend that you read the [Agriculture Appendix of the Algorithm Theoretical Basis Document (ATBD)](https://mapbiomas.org/download-dos-atbds), since important informations about the classification methodology can be found in there. 

## How to use

First, you need to copy the scripts in this folder and in the [utils folder](../utils) to your Google Earth Engine (**GEE**) account.

Then, in your **GEE** account, go to the **Assets tab**, create the following directory structure:

 - MAPBIOMAS/C6/AGRICULTURE/PERENNIAL_CROPS/RESULTS

and create one **Image Collections**:

 - MAPBIOMAS/C6/AGRICULTURE/PERENNIAL_CROPS/RESULTS/**RAW**

### Classification

To run the classification, follow these steps:

1. Open the script **agriculture/perennial_crops/classification.js**;

2. On **line 2** (variable `api`), set the path to the [api.js](../utils/api.js) script you copied to your GEE account;

3. On **line 7** (variable `outputCollection`), set the output path for the classification results;

4. On **line 10** (variable `years`), set the years you want to classify;
    
5. On **line 17** (variable `tiles`), set the WRS (path and row) you want to classify;
    
6. On **line 42** (variable `periods`), set the periods of the region you want to classify (more information about that you can read on the [ATBD Agriculture Appendix](https://mapbiomas.org/download-dos-atbds));
    
7. On **line 67** (variable `imageCollection`), set the collection you want to use to create the mosaics;

8. On **line 70** (variable `reference`), set the path to your reference map that will be used for sampling;
    
9. Run the script.

### Post-processing

To apply the temporal and spatial filters, follow these steps: 

1. Open the script **agriculture/perennial_crops/temporal_spatial_filter.js**;

2. On **line 2** (variable `input`), set the path to the raw classification result;

3. On **line 5** (variable `output`), set the path for the filtered result;

4. Run the script.