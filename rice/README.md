<div>
    <img src='../assets/logo.png' height='auto' width='200' align='right'>
    <h1>Rice (Irrigated)</h1>
</div>

Developed by ***Remap Geotecnologia Ltda***.

## About

This folder contains the scripts to classify and post-process the **irrigated rice** subclass.

We recommend that you read the [Agriculture Appendix of the Algorithm Theoretical Basis Document (ATBD)](https://mapbiomas.org/download-dos-atbds), since important informations about the classification methodology can be found in there.

## How to use

### Classification

#### To classify using the trained MapBiomas Neural Network 

1. Open the script **agriculture/rice/01_save_mosaic_to_classify.js** (or this one in [GEE](https://code.earthengine.google.com/797aa36ede2caf55a72f0bdc42dc4f35)) and chose the state and year to classify. After, click on the grid to save the mosaic to classify. 

2. Open the script **agriculture/rice/02_semantic_segmentation_rice_classify** (or this one in [Colab](https://colab.research.google.com/drive/1HFGCsVNk7-ADuXuv_tUrYRll58f5qPX4?usp=sharing)). 

#### To train your own Neural Network

1. Open [this script](https://colab.research.google.com/drive/1C-ut9LLjuYH0hVXgvJK0kdD_i69AIpkJ?usp=sharing) and save the mosaics and labels;

2. Open and run [this script](https://colab.research.google.com/drive/194eOqVKdq8gtAoVA2iFdtBEn5QRMWRVx?usp=sharing).

#### Classification using Random Forest

1. Open the script **agriculture/rice/02_temporal_filter.js**;

2. On **line 66** (variable `outputCollection`), set the path to save the ImageCollection raw classification result;

3. On **line 74** (variable `selected_UFs`), set the UF for each Brazilian state you want to classify (considering the options available on `settings_uf`);

4. Run the script.

### Post-processing

To run the post-processing, follow these steps:

1. Open the script **agriculture/rice/03_temporal_filter.js**;

2. On **line 34** (variable `filters`), set the path to the [temporal_spatial_filters.js](../utils/temporal_spatial_filters.js) script you copied to your GEE account;

3. On **line 42** (variable `input`), set the path to the ImageCollection raw classification result;

4. On **line 45** (variable `output`), set the path to the filtered result;

5. Run the script.
