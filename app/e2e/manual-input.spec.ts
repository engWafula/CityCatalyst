import { test, expect, Page, APIRequestContext } from "@playwright/test";
import { indexPageRegex, regexForPath } from "./utils";

// inventory creation data
// call the endpoint to create an inventory

const TEST_CITY_DETAILS = {
  name: "New York",
  locode: "US NYC",
  area: 1219,
  region: "New York",
  country: "United States of America",
  countryLocode: "US",
  regionLocode: "US-NY",
};

const TEST_POPULATION_DATA = {
  cityId: null,
  cityPopulation: 8804190,
  cityPopulationYear: 2020,
  countryPopulation: 338289857,
  countryPopulationYear: 2022,
  locode: "US NYC",
  regionPopulation: 20201249,
  regionPopulationYear: 2020,
};

const TEST_INVENTORY_DATA = {
  cityId: null,
  inventoryName: "TEST New York - 2024",
  year: 2024,
};

const createInventory = async (request: APIRequestContext): Promise<string> => {
  const cityResult = await request.post("/api/v0/city", {
    data: TEST_CITY_DETAILS,
  });
  expect(cityResult.ok()).toBeTruthy();
  const cityData = await cityResult.json();
  let cityId = cityData.data.cityId;

  // add population data
  const populationResult = await request.post(
    `/api/v0/city/${cityId}/population`,
    {
      data: {
        ...TEST_POPULATION_DATA,
        cityId: cityId,
      },
    },
  );
  expect(populationResult.ok()).toBeTruthy();

  // add inventory data
  const inventoryResult = await request.post(
    `/api/v0/city/${cityId}/inventory`,
    {
      data: {
        ...TEST_INVENTORY_DATA,
        cityId: cityId,
      },
    },
  );

  expect(inventoryResult.ok()).toBeTruthy();
  const inventoryData = await inventoryResult.json();
  const inventoryID = inventoryData.data.inventoryId;

  // make default inventory for user

  await request.patch("/api/v0/user", {
    data: {
      cityId: cityData.id,
      defaultInventoryId: inventoryID,
    },
  });

  return inventoryID;
};

const testIds = {
  addDataToInventoryNavButton: "add-data-to-inventory-card",
  addDataStepHeading: "add-data-step-title",
  stationaryEnergySectorCard: "stationary-energy-sector-card",
  transportationSectorCard: "transportation-sector-card",
  wasteSectorCard: "waste-sector-card",
  sectorCardButton: "sector-card-button",
  subsectorCard: "subsector-card",
  manualInputHeader: "manual-input-header",
  methodologyCard: "methodology-card",
  methodologyCardHeader: "methodology-card-header",
  addEmissionButton: "add-emission-data-button",
  addEmissionModal: "add-emission-modal",
  addEmissionModalSubmitButton: "add-emission-modal-submit",
  co2EmissionInput: "co2-emission-factor",
  n2oEmissionInput: "n2o-emission-factor",
  ch4EmissionInput: "ch4-emission-factor",
  sourceReferenceInput: "source-reference",
  activityMoreButton: "activity-more-icon",
  deleteActivityButton: "delete-activity-button",
  deleteActivityModalHeader: "delete-activity-modal-header",
  deleteActivityModalConfirmButton: "delete-activity-modal-confirm",
};

const sectorData = [
  {
    sectorName: "Stationary Energy",
    testId: testIds.stationaryEnergySectorCard,
    url1: "/data/1/",
  },
  {
    sectorName: "Transportation",
    testId: testIds.transportationSectorCard,
    url1: "/data/2/",
  },
  {
    sectorName: "Waste",
    testId: testIds.wasteSectorCard,
    url1: "/data/3/",
  },
];

const EmissionFactos = {
  CO2: 120,
  N2O: 202,
  CH4: 300,
};

test.describe.serial("Manual Input", () => {
  let page: Page;
  let id: string;

  test.beforeAll(async ({ browser, request }) => {
    page = await browser.newPage();
    id = await createInventory(request);
    await page.goto(`/en/${id}/`);
    await expect(page).toHaveURL(indexPageRegex);
    // wait for page to load
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("should render sector list page", async () => {
    const navButton = page.getByTestId(testIds.addDataToInventoryNavButton);
    await navButton.click();
    await page.waitForURL(regexForPath("/data/"));
    await expect(page).toHaveURL(regexForPath("/data/"));
    const pageHeader = page.getByTestId(testIds.addDataStepHeading);
    await expect(pageHeader).toHaveText(
      "Add Data to Complete Your GHG Inventory",
    );

    // check for sector cards
    const stationaryEnergySectorCard = await page.getByTestId(
      testIds.stationaryEnergySectorCard,
    );
    expect(stationaryEnergySectorCard).toBeTruthy();

    const transportationSectorCard = await page.getByTestId(
      testIds.transportationSectorCard,
    );
    expect(transportationSectorCard).toBeTruthy();

    const wasteSectorCard = await page.getByTestId(testIds.wasteSectorCard);
    expect(wasteSectorCard).toBeTruthy();
  });

  sectorData.forEach((sector) => {
    test.describe.serial(() => {
      test(`should navigate to ${sector.sectorName} sector page`, async () => {
        await page.goto(`/en/${id}/data/`);
        await page.waitForURL(regexForPath("/data/"));
        await expect(page).toHaveURL(regexForPath("/data/"));
        // wait for sector card to load
        const sectorCard = await page.getByTestId(sector.testId);
        expect(sectorCard).toBeTruthy();
        const sectorCardBtn = await sectorCard?.getByTestId(
          testIds.sectorCardButton,
        );
        await sectorCardBtn?.click();
        await page.waitForURL(regexForPath(sector.url1));
        await expect(page).toHaveURL(regexForPath(sector.url1));

        await page.waitForResponse((resp) => resp.status() == 200);
        // wait for 10 seconds
        await page.waitForTimeout(3000);

        const subsectorCards = await page.getByTestId(testIds.subsectorCard);
        expect(await subsectorCards.count()).toBeGreaterThan(0);

        // await page response
        const targetSubSector = subsectorCards.first();
        await targetSubSector.click();
        await expect(page).toHaveURL(
          /\/data\/\d+\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/$/,
        );
      });

      test(`should list methodologies in ${sector.sectorName}`, async () => {
        // check on a list of methodologies
        const methodologyCards = await page.getByTestId(
          testIds.methodologyCard,
        );
        expect(await methodologyCards.count()).toBeGreaterThan(0);
      });

      test(`test direct measure methodology in scope 1 with incomplete  & complete values in in ${sector.sectorName}`, async () => {
        test.skip(sector.sectorName === "Waste");
        // look for a direct measure
        // select all the methodology card headers and check if any of them is direct measure
        const directMeasureCardHeader = await page
          .getByTestId(testIds.methodologyCardHeader)
          .filter({
            hasText: "Direct Measure",
          })
          .first();

        expect(directMeasureCardHeader).toBeVisible();
        // click on the direct measure card
        await directMeasureCardHeader?.click();

        const addEmissionButton = await page.getByTestId(
          testIds.addEmissionButton,
        );
        expect(addEmissionButton).toBeTruthy();
        await addEmissionButton?.click();

        // wait for the modal to open;
        const addEmissionModal = await page.getByTestId(
          testIds.addEmissionModal,
        );

        // fill in the select fields
        const selectElements = await page.locator("select");
        for (let i = 0; i < (await selectElements.count()); i++) {
          const dropdown = selectElements.nth(i);
          await dropdown.selectOption({ index: 1 });
        }

        const inputElements = await page.locator("input[type='text']");
        for (let i = 0; i < (await inputElements.count()); i++) {
          const input = inputElements.nth(i);
          await input.fill("1");
        }

        const textInput = await addEmissionModal.getByTestId(
          testIds.sourceReferenceInput,
        );

        await textInput.fill("");

        // fill in the emission values
        const co2Input = await addEmissionModal.getByTestId(
          testIds.co2EmissionInput,
        );

        await co2Input.fill(EmissionFactos.CO2.toString());

        const n2oInput = await addEmissionModal.getByTestId(
          testIds.n2oEmissionInput,
        );

        await n2oInput.fill(EmissionFactos.N2O.toString());

        const ch4Input = await addEmissionModal.getByTestId(
          testIds.ch4EmissionInput,
        );

        await ch4Input.fill(EmissionFactos.CH4.toString());

        // try to submit the form
        const submitButton = await addEmissionModal.getByTestId(
          testIds.addEmissionModalSubmitButton,
        );

        await submitButton?.click();

        // look for error-text within the modal "please select a source reference"
        const element = await page.getByText(
          "Please select a source reference",
        );

        expect(element).toBeTruthy();

        // fill in the text fields
        await textInput.fill("test");

        await submitButton?.click();

        // wait for a 200 response
        await page.waitForResponse((resp) => resp.status() == 200);
        await page.waitForTimeout(3000);
      });

      test(`should display newly created activity in activity table in in ${sector.sectorName}`, async () => {
        // TODO: Enable these tests when manul input for waste works.
        test.skip(sector.sectorName === "Waste");
        // wait for the page to load
        // wait for the table to load
        const table = await page.locator("table");

        // Ensure the table exists
        expect(table).not.toBeNull();

        const cellWithValue = await page
          ?.getByRole("cell", { name: "tCO2" })
          .first();

        expect(cellWithValue).toBeTruthy();

        // Ensure the cell has the correct value
        expect(await cellWithValue?.innerText()).toContain(
          EmissionFactos.CO2.toString(),
        );
      });

      test(`should delete the activity from the table in in ${sector.sectorName}`, async () => {
        test.skip(sector.sectorName === "Waste");
        // wait for the page to load
        // wait for the table to load
        const table = await page.locator("table");

        // Ensure the table exists
        expect(table).not.toBeNull();

        const moreButton = await page.getByTestId(testIds.activityMoreButton);

        expect(moreButton).toBeTruthy();

        await moreButton.click();

        const deleteButton = await page.getByTestId(
          testIds.deleteActivityButton,
        );

        expect(deleteButton).toBeTruthy();

        await deleteButton.click();

        // wait for the modal to open
        await page.waitForTimeout(500);
        const deleteModal = await page.getByTestId(
          testIds.deleteActivityModalHeader,
        );

        expect(deleteModal).toBeVisible();

        const confirmButton = await page.getByTestId(
          testIds.deleteActivityModalConfirmButton,
        );

        expect(confirmButton).toBeVisible();

        await confirmButton.click();

        // wait for a 200 response
        await page.waitForResponse((resp) => resp.status() == 200);
        await page.waitForTimeout(500);
      });
    });
  });
});