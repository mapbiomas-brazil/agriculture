<div>
    <img src='../assets/logo.png' height='auto' width='200' align='right'>
    <h1>Sugar Cane</h1>
</div>

Developed by ***Remap Geotecnologia Ltda***.

## About

This folder contains the scripts to classify and post-process the **Sugar Cane** subclass. 

We recommend that you read the [Agriculture Appendix of the Algorithm Theoretical Basis Document (ATBD)](https://mapbiomas.org/download-dos-atbds), since important informations about the sugar cane classification methodology can be found in there. 

## How to use

First, you need to copy the scripts in this folder and in the [utils folder](../utils) to your Google Earth Engine (**GEE**) account.

Then, in your **GEE** account, go to the **Assets tab** and create the following directory structure:

 - MAPBIOMAS/C7/AGRICULTURE/SUGARCANE/RESULTS

and two **Image Collections**:

 - MAPBIOMAS/C7/AGRICULTURE/SUGARCANE/RESULTS/**RAW**
 - MAPBIOMAS/C7/AGRICULTURE/SUGARCANE/**REFERENCE_MAP**

On the **REFERENCE_MAP** collection, you must provide a reference map for the sampling, with pixel values of 1 for sugar cane and 0 for other classes.

### Classification

To run the classification, follow these steps:

1. Open the script **agriculture/sugarcane/01_classification.js**;

2. On **line 20** (variable `api`), set the path to the [api.js](../utils/api.js) script you copied to your GEE account;

3. On **line 25** (variable `outputCollection`), set the output path for the classification results;
  
4. On **line 28**  (variable `years`), set the years you want to classify;
    
5. On **line 35** (variable `tiles`), set the WRS (path and row) you want to classify;
    
6. On **line 54** (variable `periods`), set the periods of the region you want to classify (more information about that you can read on the [ATBD Agriculture Appendix](https://mapbiomas.org/download-dos-atbds));
    
7. On **line 73** (variable `imageCollection`), set the collection you want to use to create the mosaics;

8. On **line 76** (variable `reference`), set the path to your reference map that will be used for sampling;
   
9. Run the script.

### Post-processing

To apply the temporal and spatial filters, follow these steps: 

1. Open the script **agriculture/sugarcane/02_spatial_temporal_filter.js**;

2. On **line 18** (variable `filters`), set the path to the [temporal_spatial_filters.js](../utils/temporal_spatial_filters.js) script you copied to your GEE account;

3. On **line 24** (variable `input`), set the path to the raw classification result;

4. On **line 27** (variable `output`), set the path for the filtered result;

5. Run the script.