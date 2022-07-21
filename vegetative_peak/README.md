<div>
    <img src='../assets/logo.png' height='auto' width='200' align='right'>
    <h1>Vegetative Peak</h1>
</div>

Developed by ***Agrosatélite Geotecnologia Aplicada Ltda***.

## About

This folder contains the scripts to calculate the **Vegetative Peak** month of temporary crops. This was used in Collection 7 to define the periods for the mosaics used in the classification of soybean, cotton and other temporary crops. 

This is an optional step in the classification, since we left this information already available in [this GEE asset](https://code.earthengine.google.com/?asset=users/agrosatelite_mapbiomas/COLECAO_7/GRIDS/BRASIL_COMPLETO_PEAK).

We recommend that you read the [Agriculture Appendix of the Algorithm Theoretical Basis Document (ATBD)](https://mapbiomas.org/download-dos-atbds), since important informations about the methodology can be found in there. 

## How to use

You need to copy the scripts in this folder and in the [utils folder](../utils) to your Google Earth Engine (**GEE**) account.


1. Open the script **agriculture/vegetative_peak/00_vegetative_peak.js**;

2. On **line 33** (variable `years`) set the years you want to calculate;

3. On **line 52** (variable `output`) set the output destination;

4. On **line 66** (variable `full_ref`) set your reference map;

5. Run de script.