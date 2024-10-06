from astroquery.ipac.nexsci.nasa_exoplanet_archive import NasaExoplanetArchive
from astropy import units as u
from astropy.coordinates import SkyCoord
from astroquery.gaia import Gaia
import numpy as np

query = """
    SELECT TOP 100 ra, dec, parallax
    FROM gaiadr3.gaia_source
    WHERE ra BETWEEN 0 AND 360 AND dec BETWEEN -90 AND 90
    """

job = Gaia.launch_job(query)
results = job.get_results()

stars = []
for row in results:
    if row["parallax"] > 0:  # Ensure parallax is positive to avoid division by zero
        distance = 1000 / row["parallax"]  # Distance in parsecs
        stars.append({"ra": row["ra"], "dec": row["dec"], "dist": distance})



result = NasaExoplanetArchive.query_criteria(table="pscomppars", select="top 10 pl_name,ra,dec,sy_dist",
                                    where="disc_facility like '%TESS%'") 


ra = result['ra'][0]    # Right ascension
dec = result['dec'][0]  # Declination
distance = result['sy_dist'][0]  # Distance in parsecs (st_dist is the stellar distance)


exoplanet_coord = SkyCoord(ra=ra, dec=dec, distance=distance)
exoplanet_cartesian = exoplanet_coord.cartesian

star_coords_list = []
for star in stars:
    star_coord = SkyCoord(ra=star["ra"] * u.deg, dec=star["dec"] * u.deg, distance=star["dist"] * u.pc)
    star_coords_list.append(star_coord)



for i in range(len(star_coords_list)):
    star_coords_list[i] = star_coords_list[i].cartesian
    star_coords_list[i] = star_coords_list[i] - exoplanet_cartesian


exoplanet_cartesian = exoplanet_cartesian-exoplanet_cartesian

for i in range(len(star_coords_list)):
        star_coords_list[i] = star_coords_list[i] - exoplanet_cartesian
        relative_skycoord = SkyCoord(x=star_coords_list[i].x, 
                                y=star_coords_list[i].y, 
                                z=star_coords_list[i].z, 
                                representation_type='cartesian')
        relative_skycoord = relative_skycoord.spherical
        ra_value = relative_skycoord.lon.deg.filled(np.nan).item()  # RA in degrees
        dec_value = relative_skycoord.lat.deg.filled(np.nan).item()  # Dec in degrees
        distance_value = relative_skycoord.distance.pc.filled(np.nan).item()  # Distance in parsecs

        star_coords_list[i] = {
            "RA": ra_value,
            "Dec": dec_value,
            "Distance (pc)": distance_value
        }


print(star_coords_list[0])

# print(exoplanet_cartesian)
# print(star_coords_list[0])


