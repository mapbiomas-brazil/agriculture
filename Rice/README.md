<div>
    <img src='https://agrosatelite.com.br/wp-content/uploads/2019/02/logo_horizontal_negativo.png' height='auto' width='200' align='right'>
    <h1>Irrigated rice</h1>
</div>

Developed by ***Agrosatélite Geotecnologia Aplicada***.

## About

This folder contains the scripts to classify and post-process the **irrigated rice** subclass.

We recommend that you read the [Irrigation Appendix of the Algorithm Theoretical Basis Document (ATBD)](https://mapbiomas.org/download-dos-atbds), since important informations about the classification methodology can be found in there.

### How to use

#### To classify using the MapBiomas Neural Network treined

Open the script save_mosaic_to_classify.js (or https://code.earthengine.google.com/797aa36ede2caf55a72f0bdc42dc4f35) and chose the state to classify and the year. After, click on the grid to save the mosaic to classify. Then, open the colab script:  https://colab.research.google.com/drive/1HFGCsVNk7-ADuXuv_tUrYRll58f5qPX4?usp=sharing

#### To train your own Neural Network

1. Open the script https://colab.research.google.com/drive/1C-ut9LLjuYH0hVXgvJK0kdD_i69AIpkJ?usp=sharing and save the mosaics and labels;

2. Open and run the script: https://colab.research.google.com/drive/194eOqVKdq8gtAoVA2iFdtBEn5QRMWRVx?usp=sharing.


### Post-processing

To run the post-processing, follow these steps:

1. Open the script **irrigation/Irrigated-rice/post_processing.js **;

2. On **line 10** (variable `input`), set the path to the ImageCollection raw classification result;

3. On **line 13** (variable `output`, set the path to the filtered result;

4. On **lines 36** (variables `startYear` and `endYear`), set the years interval you want to filter and the desired threshold;

5. Run the script.
