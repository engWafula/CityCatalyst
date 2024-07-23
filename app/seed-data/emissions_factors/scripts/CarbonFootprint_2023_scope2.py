import csv
import os
import pandas as pd
from pathlib import Path
from utils import (
    make_dir,
    write_dic_to_csv,
    uuid_generate_v3,
    uuid_generate_v4,
    get_filename,
    set_seed,
    string_to_hash,
)

def split_name(tmp, name_col, country_id):
    """
    Function to separate the jurisdiction name from the ID
    """
    # Extract actor_id and actor_name
    tmp[['actor_name', 'actor_id']] = tmp[name_col].str.split(' \(', expand=True)

    # Remove the closing parenthesis from the 'actor_id' column
    tmp['actor_id'] = tmp['actor_id'].str.replace(')', '')

    # Add the country_id to the province abbreviation
    tmp['actor_id'] = f'{country_id}-'+tmp['actor_id']

    # Drop the 'name' column
    tmp.drop(columns=[name_col], inplace=True)

    return tmp

def save_to_csv(fl, data):
    """save list of dictionaries to CSV"""
    with open(fl, "w", newline="") as csvfile:
        fieldnames = data[0].keys()  # Assuming all dictionaries have the same keys
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)

        writer.writeheader()
        writer.writerows(data)

# Diccionary with identifiers for each state
actor_id_dic = {
    'Australian Capital Territory': 'AU-ACT',
    'New South Wales': 'AU-NSW',
    'Queensland': 'AU-QLD',
    'South Australia': 'AU-SA',
    'Tasmania': 'AU-TAS',
    'Victoria': 'AU-VIC',
    'Western Australia': 'AU-WA'
}

# diccionary of GWP AR6 - 2021 - 100-year time period
GWP_dic_100years = {
    'CO2': {
        'value': 1,
        'portion': 0.80
    },
    'CH4': {
        'value': 29.8,
        'portion': 0.15
    },
    'N2O': {
        'value': 273,
        'portion': 0.05
    }
}

GPC_refno_dic = {
    'grid_supply_energy_consumed': ['I.1.2', 'I.2.2', 'I.3.2', 'I.4.2', 'I.5.2', 'I.6.2', 'II.1.2', 'II.2.2', 'II.3.2', 'II.4.2'],
    'transmission_and_distribution': ['I.1.3', 'I.2.3', 'I.3.3', 'I.4.3', 'I.5.3', 'I.6.3', 'II.1.3', 'II.2.3', 'II.3.3', 'II.4.3'],
}

# methodologies for Stationary Energy
mapping_gpc_to_methodologies = [
    'electricity_consumption',
    'energy_consumption'
    'sampling_scaled_data',
    'modeled_data'
    ]

if __name__ == "__main__":
    # set random.seed so UUID is reproducible
    #! assumes records always generated in same order
    seed_string = get_filename()
    seed_value = string_to_hash(seed_string)
    set_seed(seed_value)

    # output directory
    output_dir = "../data_processed/CarbonFootPrint_2023/"
    output_dir = os.path.abspath(output_dir)
    make_dir(path=Path(output_dir).as_posix())

    # raw data file path
    input_fl = "../data_raw/CarbonFootPrint_2023/2023_07_international_factors_release_11.xlsx"
    input_fl = os.path.abspath(input_fl)

    # =================================================================
    # Publisher
    # =================================================================
    publisher_data = {
        "name": "CarbonFootPrint Ltd",
        "URL": "https://www.carbonfootprint.com/",
    }
    publisher_data["publisher_id"] = uuid_generate_v3(name=publisher_data.get("name"))

    write_dic_to_csv(output_dir, "Publisher", publisher_data)

    # =================================================================
    # DataSource
    # =================================================================
    datasource_data = {
        "datasource_name": "CarbonFootPrint",
        "dataset_name": "GHG Factors for International Grid Electricity",
        "URL": "https://www.carbonfootprint.com/international_electricity_factors.html",
        "publisher_id": publisher_data.get("publisher_id"),
    }
    datasource_data["datasource_id"] = uuid_generate_v3(name=datasource_data.get("dataset_name"))

    write_dic_to_csv(output_dir, "DataSource", datasource_data)

    # =================================================================
    # EmissionsFactors 
    # =================================================================

    ## Emission Factors for Countries

    # read "Country 2023 Electricity Factor" sheet
    df1 = pd.read_excel(input_fl, sheet_name='Country 2023 Electricity Factor')

    # delete extra columns
    df1 = df1.drop(columns=['Unnamed: 2', 'Unnamed: 5', 'Unnamed: 6', 'Unnamed: 7', 'Unnamed: 12', 'Unnamed: 13', 'Unnamed: 14'])

    # ignore rows in the beggining of the dataset
    df1 = df1[4:].reset_index(drop=True)

    # rename columns
    column_names = ['actor_id', 'actor_name', 'grid_supply_energy_consumed', 'transmission_and_distribution', 'residual_fuel_mix_factor', 'datasource_name', 'year', 'comments']
    df1.columns = column_names

    # Convert specified columns to rows
    df1 = pd.melt(df1, 
                id_vars=['actor_id', 'actor_name', 'datasource_name', 'year', 'comments'], 
                value_vars=['grid_supply_energy_consumed', 'transmission_and_distribution', 'residual_fuel_mix_factor'], 
                var_name='emission_factor_type', 
                value_name='CO2e')

    ## Emission Factors for Provinces in Canada

    # read "Canada by Province" sheet
    df2 = pd.read_excel(input_fl, sheet_name='Canada by Province')

    # ignore rows in the beggining of the dataset
    df2 = df2[6:].reset_index(drop=True)

    # rename columns
    column_names = ['name', 'grid_supply_energy_consumed', 'transmission_and_distribution', 'year']
    df2.columns = column_names

    # Assign a year
    df2['year'] = 2021

    # Separate province name from ID 
    df2 = split_name(df2, 'name', 'CA')

    # Convert specified columns to rows
    df2 = pd.melt(df2, 
                id_vars=['actor_id', 'actor_name', 'year'], 
                value_vars=['grid_supply_energy_consumed', 'transmission_and_distribution'], 
                var_name='emission_factor_type', 
                value_name='CO2e')

    # add technical source of the emission factors
    df2['comments'] = 'technical source: Canada Official Greenhouse Gas Inventory'

    ## Emission Factors for States in U.S

    # read "US by State" sheet
    df3 = pd.read_excel(input_fl, sheet_name='US by State')

    # delete extra columns
    df3 = df3.drop(columns=['Unnamed: 1', 'Unnamed: 5', 'GGL', 'T&D'])

    # ignore rows in the beggining of the dataset
    df3 = df3[5:].reset_index(drop=True)

    # rename columns
    column_names = ['name', 'grid_supply_energy_consumed', 'transmission_and_distribution', 'year']
    df3.columns = column_names

    # assign a year
    df3['year'] = 2021

    # Separate province name from ID
    df3 = split_name(df3, 'name', 'US')

    # Convert specified columns to rows
    df3 = pd.melt(df3, 
                id_vars=['actor_id', 'actor_name', 'year'], 
                value_vars=['grid_supply_energy_consumed', 'transmission_and_distribution'], 
                var_name='emission_factor_type', 
                value_name='CO2e')

    # add technical source of the emission factors
    df3['comments'] = 'technical source: EPA eGrid'

    ## Emission Factors for States in Australia
 
    # read "Australia by State" sheet
    df4 = pd.read_excel(input_fl, sheet_name='Australia by State')

    # ignore rows in the beggining of the dataset
    df4 = df4[5:].reset_index(drop=True)

    # rename columns
    column_names = ['actor_name', 'grid_supply_energy_consumed', 'transmission_and_distribution', 'year']
    df4.columns = column_names

    # Map the 'actor_id' column using the dictionary
    df4['actor_id'] = df4['actor_name'].map(actor_id_dic)

    # Convert specified columns to rows
    df4 = pd.melt(df4, 
                id_vars=['actor_id', 'actor_name', 'year'], 
                value_vars=['grid_supply_energy_consumed', 'transmission_and_distribution'], 
                var_name='emission_factor_type', 
                value_name='CO2e')

    # add technical source of the emission factors
    df4['comments'] = 'Technical Source: Australian National Greenhouse Accounts Factors'

    ## Emission Factors of CO2, CH4, N2O [conversions]

    # concat all the dfs
    df_final = pd.concat([df1,df2,df3,df4], ignore_index=True)

    # delete rows without "autor_id"
    df_final = df_final.dropna(subset=['actor_id'])

    # applying portions of contribution of each gas and calculating emission values
    new_rows = []
    for index, row in df_final.iterrows():
        total_co2e = row['CO2e']

        for gas in GWP_dic_100years.keys():
            new_row = row.copy()
            new_row['gas'] = gas
            new_row['emission_factor_value'] = (GWP_dic_100years[gas]['portion']*total_co2e) / GWP_dic_100years[gas]['value']
            new_rows.append(new_row)
        
    df_final = pd.DataFrame(new_rows)

    # assign GPC_refno
    df_final['GPC_refno'] = df_final['emission_factor_type'].map(GPC_refno_dic)
    df_final = df_final.explode('GPC_refno', ignore_index=True)

    # make a row for each methodology
    df_final['methodology_name'] = [mapping_gpc_to_methodologies] * len(df_final)
    df_final = df_final.explode('methodology_name', ignore_index=True)

    # add columns
    df_final['dataset_name'] = 'GHG Factors for International Grid Electricity'
    df_final['datasource_name'] = 'Carbon Footprint Ltd'
    df_final['units'] = 'kg/kWh'

    df_final['CO2e'] = df_final['CO2e'].round(3)
    # create a subcategory column based on fuel name
    df_final['metadata'] = df_final['CO2e'].apply(lambda x: f'CO2e_value:{x}')  
    df_final = df_final.drop(columns='CO2e')

    df_final["emissions_factor_id"] = df_final.apply(
        lambda row: uuid_generate_v4(), axis=1
    )

    df_final.to_csv(f"{output_dir}/EmissionsFactor.csv", index=False)

    # =================================================================
    # DataSourceEmissionsFactor
    # =================================================================
    datasource_emissions_factor_data = [
        {
            "datasource_id": datasource_data.get("datasource_id"),
            "emissions_factor_id": emissions_factor_id,
        }
        for emissions_factor_id in df_final["emissions_factor_id"]
    ]

    write_dic_to_csv(
        output_dir, "DataSourceEmissionsFactor", datasource_emissions_factor_data
    )