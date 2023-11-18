import { db } from "@/models";
import { DataSourceCreationAttributes } from "@/models/DataSource";
import env from "@next/env";
import { randomUUID } from "node:crypto";

const GLOBAL_API_URL =
  process.env.CC_ENV === "production"
    ? "https://ccglobal.citycatalyst.io"
    : "https://ccglobal.openearth.dev";

interface Source {
  datasource_id: string;
  name: string;
  source_type: string;
  url: string;
  description: string;
  access_type: string;
  geographical_location: string;
  start_year: number;
  end_year: number;
  latest_accounting_year: number;
  frequency_of_update: string;
  spatial_resolution: string;
  language: string;
  accessibility: string;
  data_quality: string;
  notes: string;
  units: string;
  methodology_url: string;
  publisher_id: string;
  retrieval_method: string;
  api_endpoint: string;
  gpc_reference_number?: string;
  created_date?: string;
  modified_date?: string;
  subcategory_id?: string;
  subsector_id?: string;
  created?: Date;
  last_updated?: Date;
}

function snakeToCamel(str: string): string {
  return str
    .toLowerCase()
    .replace(/([-_][a-z])/g, (group) =>
      group.toUpperCase().replace("-", "").replace("_", ""),
    );
}

async function syncDataCatalogue() {
  const projectDir = process.cwd();
  env.loadEnvConfig(projectDir);
  if (!db.initialized) {
    await db.initialize();
  }

  let catalogue = await db.models.Catalogue.findOne({
    where: { type: "global_api" },
  });
  if (!catalogue) {
    catalogue = await db.models.Catalogue.create({
      type: "global_api",
      lastUpdate: new Date(0), // UNIX epoch as default value
    });
  }
  const previousUpdate = catalogue.lastUpdate?.getTime() || 0;

  const lastUpdateResponse = await fetch(
    `${GLOBAL_API_URL}/api/v0/catalogue/last-update`,
  );
  const lastUpdateData = await lastUpdateResponse.json();
  if (!lastUpdateData?.last_update) {
    throw new Error(
      "Failed to query last catalogue update with error " +
        lastUpdateResponse.status +
        " " +
        lastUpdateResponse.statusText,
    );
  }
  // convert to unix timestamp in ms
  const lastUpdate = lastUpdateData.last_update * 1000;

  console.log(
    `Last update: DB - ${previousUpdate}, API - ${lastUpdate}`,
  );
  if (lastUpdate <= previousUpdate) {
    console.warn("Already on the newest data catalogue version, exiting.");
    await db.sequelize?.close();
    return;
  }

  const dataSourcesResponse = await fetch(`${GLOBAL_API_URL}/api/v0/catalogue`);
  const dataSourcesData = await dataSourcesResponse.json();
  if (!dataSourcesData?.datasources) {
    throw new Error(
      "Failed to query data source catalogue with error " +
        lastUpdateResponse.status +
        " " +
        lastUpdateResponse.statusText,
    );
  }

  const dataSources: Source[] = dataSourcesData.datasources;

  const subSectors = await db.models.SubSector.findAll();
  const subCategories = await db.models.SubCategory.findAll();
  const publishers = await db.models.Publisher.findAll();

  for (const source of dataSources) {
    const referenceNumber = source.gpc_reference_number;
    delete source.gpc_reference_number;

    source.created = new Date(source.created_date!);
    source.last_updated = new Date(source.modified_date!);
    delete source.created_date;
    delete source.modified_date;

    if (source.geographical_location === "global") {
      source.geographical_location = "EARTH";
    }

    // find and assign sub-categories and sub-sectors based on GPC reference number
    if (referenceNumber != null) {
      const subcategory = subCategories.find(
        (cat) => cat.referenceNumber === referenceNumber,
      );
      if (subcategory) {
        console.log(
          `Found sub-category for source ${source.datasource_id} with GPC reference number ${referenceNumber}`,
        );
        source.subcategory_id = subcategory.subcategoryId;
      } else {
        const subsector = subSectors.find(
          (sec) => sec.referenceNumber === referenceNumber,
        );
        if (subsector) {
          console.log(
            `Found sub-sector for source ${source.datasource_id} with GPC reference number ${referenceNumber}`,
          );
          source.subsector_id = subsector.subsectorId;
        }
      }
    }

    // find and assign (or create) publishers based on name
    let publisher = publishers.find((p) => p.name === source.publisher_id);
    // TODO update publisher with new URL if found?
    if (!publisher) {
      publisher = await db.models.Publisher.create({
        publisherId: randomUUID(),
        name: source.publisher_id,
        url: source.url,
      });
    }
    source.publisher_id = publisher.publisherId;
  }

  // convert keys from snake_case to camelCase
  const sources: DataSourceCreationAttributes[] = dataSources.map((source) => {
    const result: Record<string, any> = {};
    for (const key in source) {
      result[snakeToCamel(key as string)] = (source as any)[key];
    }
    return result as DataSourceCreationAttributes;
  });

  console.dir(sources);
  console.log("Saving sources...");

  for (const source of sources) {
    await db.models.DataSource.upsert(source);
  }
  
  /* TODO switch to single query when this issue is fixed:
  // https://github.com/sequelize/sequelize/issues/15221
  // https://github.com/sequelize/sequelize/issues/13545
  await db.models.DataSource.bulkCreate(
    sources,
    {
      updateOnDuplicate: [
        "name",
        "sourceType",
        "url",
        "description",
        "accessType",
        "geographicalLocation",
        "startYear",
        "endYear",
        "latestAccountingYear",
        "frequencyOfUpdate",
        "spatialResolution",
        "language",
        "accessibility",
        "dataQuality",
        "notes",
        "units",
        "methodologyUrl",
        "publisherId",
        "retrievalMethod",
        "apiEndpoint",
        "sectorId",
        "subsectorId",
        "subcategoryId",
        "created",
        "lastUpdated",
      ],
      // ignoreDuplicates: true,
    },
  );
  */

  await catalogue.update({ lastUpdate: new Date(lastUpdate) });
  console.log("Updated Catalogue, done!");

  await db.sequelize?.close();
}

syncDataCatalogue();

