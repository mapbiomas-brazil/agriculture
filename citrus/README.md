<div>
    <img src='../assets/logo.png' height='auto' width='200' align='right'>
    <h1>Citrus</h1>
</div>

Developed by ***Remap Geotecnologia Ltda***.

## About

This folder contains the scripts to classify and post-process the **Citrus** subclass. 

We recommend that you read the [Agriculture Appendix of the Algorithm Theoretical Basis Document (ATBD)](https://mapbiomas.org/download-dos-atbds), since important informations about the citrus classification methodology can be found in there. 

## How to use

First, you need to copy the scripts in this folder (javascript only) and in the [utils folder](../utils) to your Google Earth Engine (**GEE**) account.

Then, in your **GEE** account, go to the **Assets tab**, create the following directory structure:

 - MAPBIOMAS/C7/AGRICULTURE/CITRUS/RESULTS

and create one **Image Collections**:

 - MAPBIOMAS/C7/AGRICULTURE/CITRUS/RESULTS/**RAW**

### Mosaics
To generate mosaics for classification, follow these steps:

1. Open the script **agriculture/citrus/01_save_mosaics.js**;

2. On **line 18** you can change the region you want to classify by importing the geometry to the map;

3. On **line 27** (variable `year`, may be another line if you imported the geometry to the map), set the year you want to classify;

4. Run the script, a mosaic will be exported to your Google Drive in folder **MAPBIOMAS-PRIVATE-CITRUS**;

### Classification 

Copy the script [semantic_segmentation.ipynb](./semantic_segmentation.ipynb) to your Google Drive, open it in Google Colab and follow the instructions there.

### Post-processing
    
To run the post-processing, follow these steps:

1. Download the raw results from your Google Drive, folder **MAPBIOMAS-PRIVATE-CITRUS/PREDICTED**

2. Upload the classification results to Google Earth Engine, in the **RAW** collection you created before;

3. You must set a `year` property to every classification result you uploaded, with it's respective year;

4. Open the script **agriculture/citrus/03_spatial_temporal_filter.js**;

5. On **line 17** (variable `filters`), set the path to the [temporal_spatial_filters.js](../utils/temporal_spatial_filters.js) script you copied to your GEE account;

6. On **line 23** (variable `input`), set the path to the raw classification result;

7. On **line 26** (variable `output`), set the path for the filtered result;

8. Run the script.