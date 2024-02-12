from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from db.database import SessionLocal

api_router = APIRouter(prefix="/api/v0")

gpc_quality_data = "high"

# Extract the data by locode, year and sector/subsector
def db_query(source_name, locode, year, GPC_refno):
    with SessionLocal() as session:
        query = text(
            """
            SELECT * FROM citywide_emissions
            WHERE source_name = :source_name
            AND "GPC_refno" = :GPC_refno
            AND locode = :locode
            AND year = :year;
            """
        )
        params = {"source_name": source_name, "locode": locode, "year": year, "GPC_refno": GPC_refno}
        result = session.execute(query, params).fetchall()

    return result


@api_router.get("/source/{source_name}/city/{locode}/{year}/{GPC_refno}")
def get_emissions_by_locode_and_year(source_name: str, locode: str, year: str, GPC_refno: str):

    records = db_query(source_name, locode, year, GPC_refno)

    if not records:
        raise HTTPException(status_code=404, detail="No data available")

    masses = {'CO2': 0.0, 'CH4': 0.0, 'N2O': 0.0}

    for record in records:
        gas = record['gas_name']
        mass = record['emissions_value']
        masses[gas] = mass

    totals = {
        "totals": {
            "emissions": {
                "co2_mass": str(masses["CO2"]),
                "ch4_mass": str(masses["CH4"]),
                "n2o_mass": str(masses["N2O"]),
                "gpc_quality": str(gpc_quality_data),
            }
        }
    }
    
    locode_info = {
        "city_emissions_details": {
            "temporal_granularity": str(record["temporal_granularity"]),
            "activity_name": str(record["activity_name"]),
            "activity_value": str(record["activity_value"]),
            "activity_units": str(record["activity_units"]),
            "gas_name": str(record["gas_name"]),
            "emission_factor_value": str(record["emission_factor_value"]),
            "emission_factor_units": str(record["emission_factor_units"])
        }
    }

    return {**totals, **locode_info}