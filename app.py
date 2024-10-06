from flask import Flask, jsonify, request
from flask_cors import CORS, cross_origin

from astroquery.ipac.nexsci.nasa_exoplanet_archive import NasaExoplanetArchive
from astropy import units as u
from astropy.coordinates import SkyCoord
import numpy as np
import pandas as pd
from flask_cors import CORS, cross_origin


app = Flask(__name__)
CORS(app)
app.config['CORS_HEADERS'] = 'Content-Type'

@app.route('/stars', methods=['GET'])
@cross_origin()
def get_exoplanets():

    mag_limit = request.args.get('mag', default=5, type=float)
    planet = request.args.get('planet', default='TRAPPIST-1 b', type=str)
    print(mag_limit, planet)

    # Query NASA Exoplanet Archive
    result = NasaExoplanetArchive.query_criteria(
        table="pscomppars",
        select="top 10 pl_name, ra, dec, sy_dist",
        where=f"pl_name like '{planet}'"
    )
    
    # Extract coordinates and distance
    ra = result['ra'][0]    # Right ascension
    dec = result['dec'][0]  # Declination
    distance = result['sy_dist'][0]  # Distance in parsecs

    # Convert to Cartesian coordinates
    exoplanet_coord = SkyCoord(ra=ra, dec=dec, distance=distance)
    exoplanet_cartesian = exoplanet_coord.cartesian
    exo_x = exoplanet_cartesian.x.value.item()
    exo_y = exoplanet_cartesian.y.value.item()
    exo_z = exoplanet_cartesian.z.value.item()

    # Load the CSV data
    df = pd.read_csv('hipparcos.csv')
    df = df[["HIP", "Vmag", "RAdeg", "DEdeg", "Plx", "SpType"]]
    df.rename(columns={'RAdeg': 'ra', 'DEdeg': 'dec', 'Plx':'parallax'}, inplace=True)
    df.dropna(inplace=True)
    
    # Calculate additional columns
    df["dist"] = 1000/df["parallax"]
    df["abs_mag"] = df["Vmag"] - 5 * np.log10(df["dist"]) + 5



    df["x"] = df["dist"] * np.cos(np.radians(df["dec"])) * np.cos(np.radians(df["ra"]))
    df["y"] = df["dist"] * np.cos(np.radians(df["dec"])) * np.sin(np.radians(df["ra"]))
    df["z"] = df["dist"] * np.sin(np.radians(df["dec"]))


    df["x"] = df["x"] - exo_x
    df["y"] = df["y"] - exo_y
    df["z"] = df["z"] - exo_z


    df["dist_exo"] = np.linalg.norm(df[['x', 'y', 'z']], axis=1)
    df["app_mag"] = df["abs_mag"] + 5 * np.log10(df["dist_exo"]) - 5

    filtered_df = df[df["app_mag"]<mag_limit]
    filtered_df = filtered_df[["x", "y", "z", "app_mag", 'SpType']]
    skycoord = SkyCoord(x=filtered_df["x"], y=filtered_df["y"], z=filtered_df["z"], representation_type='cartesian').spherical

    filtered_df["SKY"] = skycoord
    filtered_df["ra"] = skycoord.lon.deg
    filtered_df["dec"] = skycoord.lat.deg
    filtered_df["dist"] = skycoord.distance

    output = filtered_df[['ra', 'dec', 'dist', 'app_mag', 'SpType']].to_dict(orient='records')

    return jsonify(output)

if __name__ == '__main__':
    app.run(debug=True)
