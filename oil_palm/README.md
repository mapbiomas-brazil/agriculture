<div>
    <img src='../assets/logo.png' height='auto' width='200' align='right'>
    <h1>Oil Palm</h1>
</div>

Developed by ***Agrosatélite Geotecnologia Aplicada Ltda***.

## About

This folder contains the scripts to classify and post-process the **Oil Palm** subclass. 

We recommend that you read the [Agriculture Appendix of the Algorithm Theoretical Basis Document (ATBD)](https://mapbiomas.org/download-dos-atbds), since important informations about the oil palm classification methodology can be found in there. 

## How to use

First, you need to copy the scripts in this folder (javascript only) and in the [utils folder](../utils) to your Google Earth Engine (**GEE**) account.

Then, in your **GEE** account, go to the **Assets tab**, create the following directory structure:

 - MAPBIOMAS/C8/AGRICULTURE/OIL_PALM/RESULTS

and create one **Image Collections**:

 - MAPBIOMAS/C8/AGRICULTURE/OIL_PALM/RESULTS/**RAW**

### Mosaics
To generate mosaics for training or classification, follow these steps:

1. Open the script **agriculture/oil_palm/01_save_mosaics.js**;

2. On **line 19** you can change the regions you want to classify by importing the a new geometry. The script was built to use points as input geometries, that will be used as centroids for the images;

3. On **line 51** (variable `training_label`, may be another line if you imported the geometry to the map), you may set your reference map to extract your label from. Only necessary if you want to export mosaics to train a model;

4. On **line 56 and 57** (variables `start_date` and `end_date`), you can set your time window to filter images for the mosaics.

5. As default two export tasks for each given point will be made, one containing the mosaic and another containing a class mask. Only training a model requires both. You can comment from **line 125** to **line 1135** if only mosaics for classification are needed. You can also change the output folder in your drive by altering **lines 106** and **107**, but if you remember to also change in following scripts. 

6. Run the script. Run the tasks.

### Model Training (optional) 

Copy the script [02_train.ipynb](./02_train.ipynb) to your Google Drive, open it in Google Colab and follow the instructions there.

### Classification

Copy the script [03_predict.ipynb](./03_predict.ipynb) to your Google Drive, open it in Google Colab and follow the instructions there.

### Post-processing
    
Post-processing is mostly for filtering a time-series of classifications.To run the post-processing, follow these steps:

1. Download the raw results from your Google Drive.

2. Upload the classification results to Google Earth Engine, in the **RAW** collection you created before. You must set a `year` property to every classification result you uploaded, with it's respective year;

3. Open the script **agriculture/oil_palm/03_spatial_temporal_filter.js**;

4. On **line 17** (variable `filters`), set the path to the [temporal_spatial_filters.js](../utils/temporal_spatial_filters.js) script you copied to your GEE account;

5. On **line 23** (variable `collection`), set the path to the raw classification result;

6. On **line 26** (variable `output_collection`), set the path for the filtered result;

8. Run the script.