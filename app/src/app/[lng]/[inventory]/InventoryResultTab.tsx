"use client";

import { useTranslation } from "@/i18n/client";
import { InventoryProgressResponse, InventoryResponse } from "@/util/types";
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  CircularProgress,
  Heading,
  HStack,
  Icon,
  Stack,
  StackDivider,
  Text,
} from "@chakra-ui/react";
import { TabHeader } from "@/app/[lng]/[inventory]/TabHeader";
import { MdArrowOutward } from "react-icons/md";
import { convertKgToTonnes } from "@/util/helpers";
import { Trans } from "react-i18next/TransWithoutContext";
import { TFunction } from "i18next";

const EmissionsWidgetCard = ({
  icon,
  value,
  field,
  showProgress,
}: {
  icon: any;
  value?: number | undefined;
  field: any;
  showProgress: boolean;
}) => {
  const finalValue = value
    ? showProgress
      ? `${value}%`
      : convertKgToTonnes(value)
    : "N/A";
  return (
    <HStack align="center" height="120px" justify="space-between" key={field}>
      <Stack w="full">
        <HStack align="start">
          {value && showProgress ? (
            <CircularProgress
              size="36px"
              thickness="12px"
              mr="4"
              color="interactive.secondary"
              trackColor="background.neutral"
              value={value}
            />
          ) : (
            <Icon color={"red"} as={icon} boxSize={8} />
          )}
          <Heading size="lg" noOfLines={3} maxWidth="200px">
            {finalValue}
          </Heading>
        </HStack>
        <Text size={"xs"} color="content.tertiary">
          {field}
        </Text>
      </Stack>
    </HStack>
  );
};
const EmissionsWidget = ({
  t,
  inventory,
}: {
  t: Function & TFunction<"translation", undefined>;
  inventory?: InventoryResponse;
}) => {
  const EmissionsData = [
    {
      id: "total-ghg-emissions-in-year",
      field: (
        <Trans
          i18nKey="total-ghg-emissions-in-year"
          values={{ year: inventory?.year }}
          t={t}
        >
          Total GHG Emissions in 2023
        </Trans>
      ),
      value: inventory?.totalEmissions,
      icon: MdArrowOutward,
      showProgress: false,
    },
    {
      id: "emissions-per-capita-in-year",
      field: (
        <Trans
          i18nKey="emissions-per-capita-in-year"
          values={{ year: inventory?.year }}
          t={t}
        ></Trans>
      ),
      value:
        inventory?.totalEmissions && inventory?.city.population
          ? inventory?.totalEmissions / inventory?.city.population
          : undefined,
      icon: MdArrowOutward,
      showProgress: false,
    },
    {
      id: "% of country's emissions",
      field: t("%-of-country's-emissions"),
      showProgress: true,
      // TODO ON-2212 ON-1383 add value when available
    },
  ];
  return (
    <Box width={"25vw"}>
      <Card>
        <CardHeader>
          <Heading size="sm">{t("total-emissions")}</Heading>
        </CardHeader>

        <CardBody>
          <Stack divider={<StackDivider />} spacing="4">
            {EmissionsData.map(({ id, field, value, icon, showProgress }) => (
              <EmissionsWidgetCard
                key={id}
                icon={icon}
                value={value}
                field={field}
                showProgress={showProgress}
              />
            ))}
          </Stack>
        </CardBody>
      </Card>
    </Box>
  );
};
export default function InventoryResultTab({
  lng,
  inventory,
  isUserInfoLoading,
  isInventoryProgressLoading,
  inventoryProgress,
}: {
  lng: string;
  inventory?: InventoryResponse;
  isUserInfoLoading?: boolean;
  isInventoryProgressLoading?: boolean;
  inventoryProgress?: InventoryProgressResponse;
}) {
  const { t } = useTranslation(lng, "dashboard");
  return (
    <>
      {inventory && (
        <Box className="flex flex-col gap-[8px] w-full">
          <TabHeader
            t={t}
            year={inventory?.year}
            title={"tab-emission-inventory-results-title"}
          />
          <EmissionsWidget t={t} inventory={inventory} />
        </Box>
      )}
    </>
  );
}
