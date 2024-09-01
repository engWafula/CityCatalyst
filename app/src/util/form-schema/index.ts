import SectorFormSchema from "./sector-form-schema.json";
export { SectorFormSchema };
import HIERARCHY from "./manual-input-hierarchy.json";

export function findMethodology(
  methodologyId: string,
  refNo: string | null = null, // if null, search all reference numbers (slower)
): Methodology | undefined {
  let methodologies: Methodology[] = [];
  if (refNo) {
    methodologies =
      MANUAL_INPUT_HIERARCHY[refNo]?.methodologies ?? methodologies;
  } else {
    methodologies = Object.values(MANUAL_INPUT_HIERARCHY).flatMap(
      (hierarchy) => {
        return hierarchy.methodologies ?? [];
      },
    );
  }

  const foundMethology = methodologies.find(
    (methodology) => methodology.id === methodologyId,
  );
  console.log("foundMethology", foundMethology);
  return foundMethology;
}

export interface ExtraField {
  id: string;
  type?: string;
  options?: string[];
  exclusive?: string;
  multiselect?: boolean;
  required?: boolean;
  totalRequired?: number;
  subtypes?: string[];
}

export interface Activity {
  id: string;
  "unique-by"?: string[];
  "activity-title"?: string;
  minimum?: number;
  "extra-fields"?: ExtraField[];
  units?: string[];
  formula?: string;
}

export interface Prefill {
  key: string;
  value: string;
}

export interface SuggestedActivity {
  id: string;
  prefills: Prefill[];
}

export interface Methodology {
  id: string;
  disabled?: boolean;
  activities?: Activity[];
  inputRequired?: string[];
  formula?: string;
  fields?: [];
  suggestedActivities?: SuggestedActivity[];
  suggestedActivitiesId?: string;
}

export interface DirectMeasure {
  id: string;
  suggestedActivitiesId?: string;
  suggestedActivities?: Activity[];
  inputRequired?: string[];
  "extra-fields"?: ExtraField[];
}

interface ManualInputHierarchy {
  [key: string]: {
    methodologies?: Methodology[];
    directMeasure?: DirectMeasure;
  };
}

export const MANUAL_INPUT_HIERARCHY = HIERARCHY as ManualInputHierarchy;
