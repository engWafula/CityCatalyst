import { DataSourceAttributes } from "@/models/DataSource";
import { EmissionsFactorAttributes } from "@/models/EmissionsFactor";
import { GasValueAttributes } from "@/models/GasValue";
import { InventoryValueAttributes } from "@/models/InventoryValue";

interface DataStep {
  title: string;
  details: string;
  icon: any;
  connectedProgress: number;
  addedProgress: number;
  totalSubSectors: number;
  referenceNumber: string;
  sector: Sector | null;
  subSectors: Array<SubSectorAttributes & { completed: boolean }> | null;
}

type SubSector = {
  subsectorId: string;
  name: string;
  scope: { scopeName: string };
  completed: boolean;
  subsectorName: string;
  subCategories: SubCategory[];
};

type SubCategory = {
  subcategoryId: string;
  subcategoryName?: string;
  activityName?: string;
  subsectorId?: string;
  scopeId?: string;
  reportinglevelId?: string;
  created?: Date;
  lastUpdated?: Date;
};

type SubcategoryOption = {
  label: string;
  value: string;
};

type ActivityData = {
  activityDataAmount?: number;
  activityDataUnit?: string;
  emissionFactorType: string;
  co2EmissionFactor: number;
  n2oEmissionFactor: number;
  ch4EmissionFactor: number;
  dataQuality: string;
  sourceReference: string;
};

type DirectMeasureData = {
  co2Emissions: number;
  ch4Emissions: number;
  n2oEmissions: number;
  dataQuality: string;
  sourceReference: string;
};

type SubcategoryData = {
  methodology: "activity-data" | "direct-measure" | "";
  activity: ActivityData;
  direct: DirectMeasureData;
};
