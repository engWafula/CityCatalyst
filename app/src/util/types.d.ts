import type { SectorAttributes } from "@/models/Sector";

type InventoryResponse = InventoryAttributes & { city: CityAttributes };

interface SectorProgress {
  sector: SectorAttributes;
  total: number;
  thirdParty: number;
  uploaded: number;
  subSectors: Array<SubSectorAttributes & { completed: boolean }>;
}

interface InventoryProgressResponse {
  totalProgress: {
    total: number;
    thirdParty: number;
    uploaded: number;
  };
  sectorProgress: SectorProgress[];
}