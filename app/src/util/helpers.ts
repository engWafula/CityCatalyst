export const getTranslationFromDictionary = (
  translations: Record<string, string> | string | undefined,
  lng?: string,
): string | undefined => {
  if (!!translations) {
    if (translations instanceof String) {
      return translations as string;
    }
    if (
      typeof translations === "object" &&
      !!Object.keys(translations).length
    ) {
      return (
        (lng && translations[lng]) ||
        translations["user"] ||
        translations["en"] ||
        Object.values(translations).find((t) => !!t)
      );
    }
  }
};

/** Extract data from a nested object using a string path or array
 * Source: https://stackoverflow.com/a/22129960
 * @param path: string separated by . or an array of keys for each nested object
 * @param obj: object to be searched
 * @param separator: key separator for path (. by default)
 */
export function resolve(
  path: string | string[],
  obj: Record<string, any>,
  separator: string = ".",
) {
  var properties = Array.isArray(path) ? path : path.split(separator);
  return properties.reduce((prev, curr) => prev?.[curr], obj);
}

export function formatPercent(percent: number) {
  return Math.floor(percent * 100);
}

export function getCurrentVersion(): string {
  const version = process.env.APP_VERSION!;
  return version;
}

export function shortenNumber(number: number): string {
  if (number >= 1e9) {
    return (number / 1e9).toFixed(1); // Billion
  } else if (number >= 1e6) {
    return (number / 1e6).toFixed(1); // Million
  } else if (number >= 1e3) {
    return (number / 1e3).toFixed(1); // Thousand
  } else {
    return number.toString();
  }
}

export function getShortenNumberUnit(number: number): string {
  if (number >= 1e9) {
    return "B"; // Billion
  } else if (number >= 1e6) {
    return "M"; // Million
  } else if (number >= 1e3) {
    return "K"; // Thousand
  } else {
    return "";
  }
}
export async function resolvePromisesSequentially(promises: Promise<any>[]) {
  const results = [];
  for (const promise of promises) {
    results.push(await promise);
  }

  return results;
}

export function nameToI18NKey(name?: string): string {
  if (!name) {
    return "";
  }
  // remove all special characters and replace spaces with dashes
  return name
    .replaceAll(/[^\w\s-]/gi, "")
    .replaceAll(" ", "-")
    .toLowerCase();
}

export const fileEndingToMIMEType: Record<string, string> = {
  csv: "text/csv",
  json: "application/json",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.ms-excel",
  default: "application/x-binary",
};

export function base64ToFile(base64String: any, filename: string) {
  const arr = base64String.split(",");
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  const fileBlob = new Blob([u8arr], { type: mime });
  const file = new File([fileBlob], filename, { type: mime });
  return file;
}

export function appendFileToFormData(base64String: string, filename: string) {
  return base64ToFile(base64String, filename);
}

export function bytesToMB(bytes: number): string {
  return (bytes / 1048576).toFixed(2) + " MB";
}

export function groupBy<T>(
  list: T[],
  lambda: (elem: T) => string,
): Record<string, T[]> {
  return list.reduce(
    (acc, elem) => {
      const key = lambda(elem);
      acc[key] = acc[key] || [];
      acc[key].push(elem);
      return acc;
    },
    {} as Record<string, T[]>,
  );
}

export function keyBy<T>(
  list: T[],
  lambda: (elem: T) => string,
): Record<string, T> {
  return list.reduce(
    (acc, elem) => {
      const key = lambda(elem);
      acc[key] = elem;
      return acc;
    },
    {} as Record<string, T>,
  );
}

export interface PopulationEntry {
  year: number;
  population: number;
}

/// Finds entry which has the year closest to the selected inventory year
export function findClosestYear(
  populationData: PopulationEntry[] | undefined,
  year: number,
  maxYearDifference: number = 10,
): PopulationEntry | null {
  if (!populationData || populationData?.length === 0) {
    return null;
  }
  return populationData.reduce(
    (prev, curr) => {
      // don't allow years outside of range
      if (Math.abs(curr.year - year) > maxYearDifference) {
        return prev;
      }
      if (!prev) {
        return curr;
      }
      let prevDelta = Math.abs(year - prev.year);
      let currDelta = Math.abs(year - curr.year);
      return prevDelta < currDelta ? prev : curr;
    },
    null as PopulationEntry | null,
  );
}

export function findClosestYearToInventory(
  populationData: PopulationEntry[] | undefined,
  year: number,
  maxYearDifference: number = 10,
): PopulationEntry | null {
  if (!populationData || populationData.length === 0) {
    return null;
  }

  let closestEntry = null;
  let closestDistance = Infinity; // Initialize with a large number

  populationData.forEach((entry) => {
    // Ensure the entry has a valid population value
    if (entry.population !== null && entry.population !== undefined) {
      const currentDistance = Math.abs(entry.year - year);
      // Update closestEntry if the current entry is closer than the previously stored one
      if (currentDistance < closestDistance) {
        closestEntry = entry;
        closestDistance = currentDistance;
      }
    }
  });

  // After identifying the closest entry, check if it's within the allowable range
  if (closestEntry && closestDistance <= maxYearDifference) {
    return closestEntry;
  } else if (closestEntry) {
    // If no entry is within the maxYearDifference, return the closest available entry
    return closestEntry;
  }

  return null; // In case all entries are outside the maxYearDifference and no closest entry was found
}

export const getInputMethodology = (methodologyId: string) => {
  if (methodologyId?.includes("direct-measure")) return "direct-measure";
  else {
    return methodologyId;
  }
};

export function convertKgToTonnes(valueInTonnes: number | bigint) {
  let result = "";
  const tonnes = Number(valueInTonnes);
  if (tonnes >= 1e6) {
    // Convert to megatonnes if the value is 1,000,000 tonnes or more
    const megatonnes = (tonnes / 1e6).toFixed(0);
    result = `${megatonnes} MtCO2`;
  } else if (tonnes >= 1e3) {
    // Convert to kilotonnes if the value is 1,000 tonnes or more but less than 1,000,000 tonnes
    const kilotonnes = (tonnes / 1e3).toFixed(0);
    result = `${kilotonnes} KtCO2`;
  } else if (tonnes < 1) {
    // Convert to kg if the value is less than 1 tonne
    const kilograms = (tonnes * 1e3).toFixed(0);
    result = `${kilograms} kgCO2`;
  } else {
    // Return as tonnes if the value is less than 1,000 tonnes but more than or equal to 1 tonne
    result = `${tonnes} tCO2`;
  }

  return result;
}

export const toKebabCase = (input: string | undefined): string => {
  return (input ?? "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
};
