import Excel, { Worksheet } from "exceljs";
import { InventoryValue } from "@/models/InventoryValue";
import { ActivityValue } from "@/models/ActivityValue";
import createHttpError from "http-errors";
import { InventoryResponse } from "@/util/types";

type InventoryValueWithActivityValues = InventoryValue & {
  activityValues: ActivityValue[];
};

export type InventoryWithInventoryValuesAndActivityValues =
  InventoryResponse & {
    inventoryValues: InventoryValueWithActivityValues[];
  };

const ECRF_TEMPLATE_PATH = "./templates/ecrf_template.xlsx";

export default class ECRFDownloadService {
  public static async downloadECRF(
    inventoryId: string,
    output: InventoryWithInventoryValuesAndActivityValues,
  ) {
    return await this.writeTOECRFFILE(inventoryId, output);
  }

  private static async writeTOECRFFILE(
    inventoryId: string,
    output: InventoryWithInventoryValuesAndActivityValues,
  ) {
    const workbook = new Excel.Workbook();
    try {
      // Load the workbook
      await workbook.xlsx.readFile(ECRF_TEMPLATE_PATH);
      const worksheet = workbook.getWorksheet(4); // Get the worksheet by index (3rd sheet)
      // Fetch data from the database
      const inventoryValues = output.inventoryValues;

      // Transform data into a dictionary for easy access
      const dataDictionary = this.transformDataForTemplate(
        inventoryValues as InventoryValueWithActivityValues[],
        output.year as number,
      );

      const visitedScopes = {};

      worksheet?.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip the first row (contains the header)

        const referenceNumberCell = row.getCell(2);
        const referenceNumberValue = referenceNumberCell.value;

        console.log(referenceNumberValue);

        if (referenceNumberCell && typeof referenceNumberValue === "string") {
          const dataSection = dataDictionary[referenceNumberValue];
          // if the activityValues > 1, then we need to add rows
          if (dataSection) {
            this.replacePlaceholdersInRow(
              row,
              dataSection,
              rowNumber,
              visitedScopes,
              worksheet,
            );
          } else {
            this.markRowAsNotEstimated(row);
          }
        }
      });

      // Save the modified workbook
      const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
      console.log("Workbook has been generated successfully");
      return buffer;
    } catch (error) {
      console.log(error);
      throw createHttpError.InternalServerError(
        "Error reading or writing Excel file",
      );
    }
  }

  private static transformDataForTemplate(
    inventoryValues: InventoryValueWithActivityValues[],
    inventoryYear: number,
  ): Record<string, any> {
    const dataDictionary: Record<string, any> = {};
    inventoryValues.forEach((inventoryValue) => {
      const gpcRefNo = inventoryValue.gpcReferenceNumber;
      const activityValues = inventoryValue.activityValues || [];
      // const activityValue = activityValues[0]; // Assuming one-to-one for simplicity
      //
      // if (!activityValue) {
      //   console.warn(`No ActivityValue associated with InventoryValue ID ${inventoryValue.id}`);
      //   return;
      // }
      //
      // const gasValues = activityValue.gasValues || [];
      // const efValues = gasValues.reduce((acc: Record<string, any>, gasValue: any) => {
      //   acc[`ef_${gasValue.gasType.toLowerCase()}_amount`] = gasValue.amount;
      //   return acc;
      // }, {});

      let methodologyDescription = inventoryValue.inputMethodology;

      dataDictionary[gpcRefNo as string] = {
        // InventoryValue fields
        inventory_year: inventoryYear,
        gpc_reference_number: inventoryValue.gpcReferenceNumber,
        notation_key: inventoryValue.unavailableReason,
        input_methodology: inventoryValue.inputMethodology,
        activityValues: activityValues.map((activityValue) => {
          let activityTitleKey = activityValue.metadata?.activityTitle;
          let dataQuality = activityValue.metadata?.dataQuality;
          let dataSource = activityValue.metadata?.dataSource;
          let activityAmount = activityValue.activityData?.[activityTitleKey];
          let activityUnit =
            activityValue.activityData?.[`${activityTitleKey}-unit`];
          console.log(
            activityValue.gasValues,
            activityValue.gasValues.find((g) => g.gas === "CO2")
              ?.emissionsFactor,
            "fire stuff",
          );
          let emission_co2 =
            activityValue.gasValues.find((g) => g.gas === "CO2")
              ?.emissionsFactor.emissionsPerActivity ?? 0;
          let emission_ch4 =
            activityValue.gasValues.find((g) => g.gas === "CH4")
              ?.emissionsFactor.emissionsPerActivity ?? 0;
          let emission_n2o =
            activityValue.gasValues.find((g) => g.gas === "N2O")
              ?.emissionsFactor.emissionsPerActivity ?? 0;
          return {
            ghg_co2: activityValue.activityData?.co2_amount,
            ghg_ch4: activityValue.activityData?.ch4_amount,
            ghg_n2o: activityValue.activityData?.n2o_amount,
            emission_factor_unit: null,
            emission_co2,
            emission_ch4,
            emission_n2o,
            activity_amount: activityAmount,
            activity_unit: activityUnit,
            methodology: methodologyDescription,
            activity_data_quality: dataQuality,
            activity_data_source: dataSource,
            total_co2e: activityValue.co2eq,
          };
        }),
        // ActivityValue fields
        // activity_amount: activityValue?.activityData?.amount,
        // activity_unit: activityValue?.activityData?.unit,
        // activity_methodology_description: activityValue?.activityData?.methodology_description,
        // activity_source: activityValue?.dataSource?.name,
        // activity_quality: activityValue?.metadata?.quality,
        // // Emission factors
        // ef_unit: gasValues[0]?.unit || '',
        // ...efValues,
        // ef_description: activityValue?.dataSource?.description,
        // ef_source: activityValue?.dataSource?.source,
        // GHGs
        total_co2e: inventoryValue.co2eq,
        // Additional fields as needed
      };
    });
    return dataDictionary;
  }

  private static replacePlaceholdersInRow(
    row: Excel.Row,
    dataSection: Record<string, any>,
    rowNumber: number,
    visitedScopes: Record<string, any>,
    worksheet: Worksheet,
  ) {
    const referenceCell = row.getCell(2);
    const referenceValue = referenceCell.value;

    if (typeof referenceValue == "string" && referenceValue in visitedScopes) {
      return;
    }

    const targetRows = [row];

    if (dataSection.activityValues.length > 1) {
      const rowCount = dataSection.activityValues.length - 1;
      for (let i = 0; i < rowCount; i++) {
        const newRow = this.cloneRowAndInsertInWorkSheet(
          rowNumber + 1 + i,
          row,
          worksheet,
        );
        targetRows.push(newRow);
      }
    }

    targetRows.forEach((targetRow, index) => {
      dataSection = {
        ...dataSection,
        ...dataSection.activityValues[index],
      };
      console.log(referenceValue, dataSection, "fire");
      targetRow.eachCell((cell, colNumber) => {
        // dealing with Notation keys
        if (cell.value && typeof cell.value === "string") {
          const cellValue = cell.value as string;
          const placeholderMatch = cellValue.match(/{{(.*?)}}/);
          if (placeholderMatch) {
            const fieldName = placeholderMatch[1];
            const replacementValue = dataSection[fieldName];

            // if field name is notation key, replace with unavailable explanation
            if (fieldName === "no_key" && dataSection["notation_key"]) {
              // the stored value looks like "reason_NO", "reason_NE", etc.
              cell.value = dataSection["notation_key"].split("_")[1];
              return;
            } else if (replacementValue !== undefined) {
              cell.value = replacementValue;
            } else {
              console.warn(
                `No data found for field '${fieldName}' at row ${rowNumber}, column ${colNumber}`,
              );
              cell.value = ""; // remove the placeholder when done
            }
          }
        }
      });
    });

    visitedScopes[referenceValue as string] = true;
  }

  private static markRowAsNotEstimated(row: Excel.Row) {
    row.eachCell((cell) => {
      if (cell.value && typeof cell.value === "string") {
        const cellValue = cell.value as string;
        const placeholderMatch = cellValue.match(/{{(.*?)}}/);
        if (placeholderMatch) {
          const fieldName = placeholderMatch[1];
          if (fieldName === "no_key") {
            cell.value = "NE"; // Not Estimated
          } else {
            cell.value = ""; // remove the placeholder when
          }
        }
      }
    });
  }

  private static cloneRowAndInsertInWorkSheet(
    currentRowNumber: number,
    templateRow: Excel.Row,
    worksheet: Worksheet,
  ) {
    worksheet.insertRow(currentRowNumber, []);

    const newRow = worksheet.getRow(currentRowNumber);

    // Copy the style and values from the template row to the new row
    this.copyRow(templateRow, newRow);
    return newRow;
  }

  private static copyRow(sourceRow: Excel.Row, targetRow: Excel.Row) {
    targetRow.height = sourceRow.height;

    sourceRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const targetCell = targetRow.getCell(colNumber);

      // Copy styles
      targetCell.style = { ...cell.style };

      // Copy value
      targetCell.value = cell.value;
    });
  }
}
