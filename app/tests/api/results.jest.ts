import {db} from "@/models";
import {randomUUID} from "node:crypto";
import {GET as getResults} from "@/app/api/v0/inventory/[inventory]/results/route";
import {afterAll, beforeAll, describe, expect, it} from "@jest/globals";
import {expectStatusCode, mockRequest, setupTests, testUserID} from "../helpers";

import {Inventory} from "@/models/Inventory";
import {
    activityValues as activityValuesData,
    baseInventory,
    inventoryId,
    inventoryValueId,
    inventoryValueId1,
    inventoryValueId2,
    inventoryValues as inventoryValuesData
} from "./results.data";
import {Op} from "sequelize";
import {City} from "@/models/City";

const locode = "XX_SUBCATEGORY_CITY";

describe("Results API", () => {
    let inventory: Inventory;
    let city: City;

    beforeAll(async () => {
        setupTests();
        await db.initialize();
        city = await db.models.City.create({
            cityId: randomUUID(),
            locode
        });
        await db.models.User.upsert({userId: testUserID, name: "TEST_USER"});
        await city.addUser(testUserID);
        inventory = await db.models.Inventory.create({
            inventoryId: inventoryId,
            ...baseInventory,
            inventoryName: "ReportResultInventory",
            cityId: city.cityId
        });

        await db.models.InventoryValue.bulkCreate(inventoryValuesData);
        await db.models.ActivityValue.bulkCreate(activityValuesData);
    });

    afterAll(async () => {
        await db.models.ActivityValue.destroy({
            where: {
                inventoryValueId: {
                    [Op.in]: [inventoryValueId, inventoryValueId1, inventoryValueId2],
                }
            }
        });
        await db.models.InventoryValue.destroy({where: {inventoryId}});
        await db.models.Inventory.destroy({where: {inventoryId}});
        await db.models.City.destroy({where: {cityId: city.cityId}})
        if (db.sequelize) await db.sequelize.close();
    });

    it("should return emissions data for a valid inventory", async () => {
        const req = mockRequest();
        const res = await getResults(req, {
            params: {inventory: inventory.inventoryId}
        });

        await expectStatusCode(res, 200);
        expect(await res.json()).toEqual({
            data: {
                topEmissions: {
                    bySubSector: [
                        {
                            co2eq: "21453",
                            percentage: 27,
                            scopeName: "1",
                            sectorName: "Transportation",
                            subsectorName: "On-road transportation"
                        },
                        {
                            co2eq: "15662",
                            percentage: 20,
                            scopeName: "1",
                            sectorName: "Stationary Energy",
                            subsectorName: "Residential buildings"
                        },
                        {
                            co2eq: "12903",
                            percentage: 16,
                            scopeName: "1",
                            sectorName: "Transportation",
                            subsectorName: "On-road transportation"
                        }
                    ]
                },
                totalEmissions: {
                    bySector: [
                        {
                            co2eq: "40399",
                            percentage: 51,
                            sectorName: "Transportation"
                        },
                        {
                            co2eq: "22388",
                            percentage: 28,
                            sectorName: "Stationary Energy"
                        },
                        {
                            co2eq: "16948",
                            percentage: 21,
                            sectorName: "Waste"
                        }
                    ],
                    total: 79735
                }
            }
        });
    });

});
