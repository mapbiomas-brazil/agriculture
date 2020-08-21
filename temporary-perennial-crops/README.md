<div>
    <img src='https://agrosatelite.com.br/wp-content/uploads/2019/02/logo_horizontal_negativo.png' height='auto' width='200' align='right'>
    <h1>Temporary and Perennial Crops</h1>
</div>

Developed by ***Agrosatélite Geotecnologia Aplicada Ltda***.

## About

This folder contains the scripts to classify, separate and post-process the **Temporary Crop and Perenial Crop** classes. 

We recommend that you read the [Agriculture Appendix of the Algorithm Theoretical Basis Document (ATBD)](https://mapbiomas.org/download-dos-atbds), since important informations about the classification and separation methodology can be found in there. 

## How to use

First, you need to copy the scripts in this folder and in the [utils folder](../utils) to your Google Earth Engine (**GEE**) account.

Then, in your **GEE** account, go to the **Assets tab** and create the following directory structure:

 - MAPBIOMAS/C5/AGRICULTURE/TEMPORARY_PERENNIAL/RESULTS

and three **Image Collections**:

 - MAPBIOMAS/C5/AGRICULTURE/TEMPORARY_PERENNIAL/RESULTS/**RAW**
 - MAPBIOMAS/C5/AGRICULTURE/TEMPORARY_PERENNIAL/RESULTS/**SEPARATION**
 - MAPBIOMAS/C5/AGRICULTURE/TEMPORARY_PERENNIAL/**REFERENCE_MAP**

On the **REFERENCE_MAP** collection, you must provide reference maps for the sampling, with a property `year` with the year of the map.

You also need to provide the training samples for the crops separation in **Feature Collection**:

 - MAPBIOMAS/C5/AGRICULTURE/TEMPORARY_PERENNIAL/**SAMPLES**

### Classification

To run the classification, follow these steps:

1. Open the script **agriculture/temporary_perennial/classification.js**;

2. On **line 2** (variable `api`), set the path to the [api.js](../utils/api.js) script you copied to your GEE account;

3. On **line 7** (variable `outputCollection`), set the output path for the classification results;

4. On **line 10** (variable `years`), set the years you want to classify;
    
5. On **line 17** (variable `tiles`), set the WRS (path and row) you want to classify;
    
6. On **line 42** (variable `periods`), set the periods of the region you want to classify (more information about that you can read on the [ATBD Agriculture Appendix](https://mapbiomas.org/download-dos-atbds));
    
7. On **line 67** (variable `imageCollection`), set the collection you want to use to create the mosaics;

8. On **line 70** (variable `referenceCollection`), set the path to your reference map that will be used for sampling;
    
9. Run the script.

### Post-processing

To apply the temporal and spatial filters, follow these steps: 

1. Open the script **agriculture/temporary_perennial/temporal_spatial_filter.js**;

2. On **line 2** (variable `input`), set the input path to the raw classification result;

3. On **line 5** (variable `output`), set the path for the filtered result;
    
4. On **lines 8 and 9** (variables `startYear` and `endYear`), set the year range you want to apply this script;

5. Run the script.

### Crops separation

To run the separatino os temporaryand perennial crops, follow these steps: 

1. Open the script **agriculture/temporary_perennial/separation.js**;

2. On **line 2** (variable `api`), set the path to the [api.js](../utils/api.js) script you copied to your GEE account;

3. On **line 5** (variable `normalization`), set the path to the [normalization.js](../utils/normalization.js) script you copied to your GEE account;

4. On **line 10** (variable `input`), set the input path to the filtered classification result;

5. On **line 13** (variable `outputCollection`), set the output path for the classification results;

6. On **line 16** (variable `years`), set the years you want to classify;
    
7.  On **line 23** (variable `tiles`), set the WRS (path and row) you want to classify;
    
8.  On **line 45** (variable `periods`), set the periods of the region you want to classify (more information about that you can read on the [ATBD Agriculture Appendix (ATBD)](https://mapbiomas.org/download-dos-atbds));

9. On **line 75** (variable `trainingSamples`), set the path to your training samples;
    
10.  Run the script.

### Temporary crop post-processing

To run the temporary crops post-processing, follow these steps:

1. Open the script **agriculture/temporary_perennial/temporary_temporal_spatial_filter.js**;
    
2. On **line 2** (variable `input`), set the input path to the raw separation result;

3. On **line 5** (variable `output`), set the path for the temporary crop filtered result;

4. On **line 8** (variable `classOfInterest`), set the pixel value of the temporary crop as noted on the crops separation map;
    
5. On **lines 11 and 12** (variables `startYear` and `endYear`), set the range of years you want to filter;

6. Run the script.

### Perennial crop post-processing

To run the perennial crops post-processing, follow these steps:

1. Open the script **agriculture/temporary_perennial/perennial_temporal_spatial_filter.js**;

2. On **line 2** (variable `input`), set the input path to the raw separation result;

3. On **line 5** (variable `output`), set the path for the temporary crop filtered result;
    
4. On **line 8** (variable `classOfInterest`), set the pixel value of the perennial crop as noted on the crops separation map;
    
5.  On **lines 11 and 12** (variables `startYear` and `endYear`), set the range of years you want to filter;

6. Run the script.