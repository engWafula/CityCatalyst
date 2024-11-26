"use client";

import Footer from "@/components/Sections/Footer";
import { useTranslation } from "@/i18n/client";
import {
  api,
  useGetCitiesAndYearsQuery,
  useGetCityPopulationQuery,
} from "@/services/api";
import { CheckUserSession } from "@/util/check-user-session";
import { formatEmissions } from "@/util/helpers";
import {
  Box,
  Button,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useParams, useRouter } from "next/navigation";
import MissingInventory from "@/components/missing-inventory";
import InventoryCalculationTab from "@/components/HomePage/InventoryCalculationTab";
import InventoryReportTab from "../../app/[lng]/[inventory]/InventoryResultTab";
import NotAvailable from "@/components/NotAvailable";
import { Hero } from "@/components/HomePage/Hero";
import { ActionCards } from "@/components/HomePage/ActionCards";
import { InventoryPreferencesCard } from "@/components/HomePage/InventoryPreferencesCard";
import React, { useMemo } from "react";
import { YearSelectorCard } from "@/components/Cards/years-selection-card";
import { AddIcon } from "@chakra-ui/icons";

export default function HomePage({
  lng,
  isPublic,
}: {
  lng: string;
  isPublic: boolean;
}) {
  const { t } = useTranslation(lng, "dashboard");
  const router = useRouter();
  // Check if user is authenticated otherwise route to login page
  isPublic || CheckUserSession();
  const { inventory: inventoryParam } = useParams();
  let inventoryId = inventoryParam as string | null;
  if (inventoryId === "null" || inventoryId === "undefined") {
    inventoryId = null;
  }

  // query API data
  // TODO maybe rework this logic into one RTK query:
  // https://redux-toolkit.js.org/rtk-query/usage/customizing-queries#performing-multiple-requests-with-a-single-query

  const { data: userInfo, isLoading: isUserInfoLoading } =
    api.useGetUserInfoQuery();

  let defaultInventoryId: string | null = null;
  if (!isUserInfoLoading && userInfo) {
    defaultInventoryId = userInfo.defaultInventoryId;

    // TODO also add this to login logic or after email verification to prevent extra redirect?
    // if the user doesn't have a default inventory or if path has a null inventory id, redirect to onboarding page
    if (!inventoryId) {
      if (defaultInventoryId) {
        inventoryId = defaultInventoryId;
        // fix inventoryId in URL without reloading page
        const newPath = "/" + lng + "/" + inventoryId;
        history.replaceState(null, "", newPath);
      } else {
        // fixes warning "Cannot update a component (`Router`) while rendering a different component (`Home`)"
        setTimeout(() => router.push(`/onboarding`), 0);
      }
    }
  }

  const { data: inventory, isLoading: isInventoryLoading } =
    api.useGetInventoryQuery(inventoryId!, {
      skip: !inventoryId,
    });
  const { data: inventoryProgress, isLoading: isInventoryProgressLoading } =
    api.useGetInventoryProgressQuery(inventoryId!, {
      skip: !inventoryId,
    });

  const { data: city } = api.useGetCityQuery(inventory?.cityId!, {
    skip: !inventory?.cityId,
  });

  const { data: population } = useGetCityPopulationQuery(
    { cityId: inventory?.cityId!, year: inventory?.year! },
    { skip: !inventory?.cityId || !inventory?.year },
  );

  const { data: citiesAndYears, isLoading } = useGetCitiesAndYearsQuery();

  const formattedEmissions = inventory?.totalEmissions
    ? formatEmissions(inventory.totalEmissions)
    : { value: t("N/A"), unit: "" };

  const inventoriesForCurrentCity = useMemo<
    { year: number; inventoryId: string; lastUpdate: Date }[]
  >(() => {
    if (!citiesAndYears) {
      return [];
    }
    return citiesAndYears
      .filter(({ city }) => inventory?.cityId === city.cityId)
      .map(({ years }) => years)
      .flat();
  }, [citiesAndYears, inventory?.cityId]);

  return (
    <>
      {!inventory && !isInventoryLoading && (
        <>
          {isPublic ? (
            <NotAvailable lng={lng} />
          ) : (
            <MissingInventory lng={lng} />
          )}
          <Footer lng={lng} />
        </>
      )}
      {inventory && (
        <>
          <Hero
            inventory={inventory}
            isPublic={isPublic}
            currentInventoryId={inventoryId}
            isUserInfoLoading={isUserInfoLoading}
            isInventoryLoading={isInventoryLoading}
            formattedEmissions={formattedEmissions}
            t={t}
            population={population}
          />

          <Box className="flex mx-auto mt-[80px] max-w-full w-[1090px]">
            <VStack align="start">
              <InventoryPreferencesCard t={t} isPublic={isPublic} />
              {!isPublic && (
                <ActionCards
                  inventoryId={inventoryId}
                  t={t}
                  lng={lng}
                  city={city}
                  inventory={inventory}
                />
              )}
            </VStack>
          </Box>
          <Box
            className="h-full pt-[48px] pb-[100px]"
            bg="background.backgroundLight"
            px={8}
          >
            <Box className="mx-auto max-w-full w-[1090px] css-0">
              {/* Years section */}
              {!isPublic ? (
                <>
                  <Box className="w-full mb-6 flex items-center justify-between">
                    <Text
                      color="content.primary"
                      fontWeight="bold"
                      lineHeight="24px"
                      fontSize="headline.sm"
                      fontFamily="heading"
                      fontStyle="normal"
                    >
                      {t("inventory-year")}
                    </Text>
                    <Button
                      data-testid="add-new-inventory-button"
                      title={t("add-new-inventory")}
                      leftIcon={<AddIcon h="16px" w="16px" />}
                      h="48px"
                      aria-label="activity-button"
                      fontSize="button.md"
                      gap="8px"
                      onClick={() =>
                        router.push(
                          `/onboarding/setup?city=${inventory?.cityId}`,
                        )
                      }
                    >
                      {t("add-new-inventory")}
                    </Button>
                  </Box>
                  <YearSelectorCard
                    cityId={inventory.cityId as string}
                    inventories={inventoriesForCurrentCity}
                    currentInventoryId={inventoryId}
                    lng={lng}
                    t={t}
                  />
                  <Tabs align="start" className="mt-12" variant="line" isLazy>
                    <TabList>
                      {[
                        t("tab-emission-inventory-calculation-title"),
                        t("tab-emission-inventory-results-title"),
                      ]?.map((tab, index) => (
                        <Tab key={index}>
                          <Text
                            fontFamily="heading"
                            fontSize="title.md"
                            fontWeight="medium"
                          >
                            {t(tab)}
                          </Text>
                        </Tab>
                      ))}
                    </TabList>
                    <TabPanels>
                      <TabPanel>
                        <InventoryCalculationTab
                          lng={lng}
                          inventory={inventory}
                          inventoryProgress={inventoryProgress}
                          isUserInfoLoading={isUserInfoLoading}
                          isInventoryProgressLoading={
                            isInventoryProgressLoading
                          }
                        />
                      </TabPanel>
                      <TabPanel>
                        <InventoryReportTab
                          isPublic={isPublic}
                          lng={lng}
                          population={population}
                          inventory={inventory}
                          inventoryProgress={inventoryProgress}
                          isUserInfoLoading={isUserInfoLoading}
                          isInventoryProgressLoading={
                            isInventoryProgressLoading
                          }
                        />
                      </TabPanel>
                    </TabPanels>
                  </Tabs>
                </>
              ) : (
                <InventoryReportTab
                  lng={lng}
                  population={population}
                  inventory={inventory}
                  inventoryProgress={inventoryProgress}
                  isUserInfoLoading={isUserInfoLoading}
                  isInventoryProgressLoading={isInventoryProgressLoading}
                  isPublic={isPublic}
                />
              )}
            </Box>
          </Box>
          <Footer lng={lng} />
        </>
      )}
    </>
  );
}
