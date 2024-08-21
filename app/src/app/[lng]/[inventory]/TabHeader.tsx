import { TFunction } from "i18next";
import { Badge, Box, Heading, Link, Text } from "@chakra-ui/react";
import { Trans } from "react-i18next/TransWithoutContext";
import { CalendarIcon } from "@chakra-ui/icons";

export function TabHeader({
  t,
  title,
  year,
}: {
  t: TFunction<string, undefined>;
  year: number | undefined;
  title: string;
}) {
  return (
    <>
      <Box className="flex items-center gap-3">
        <Heading fontSize="headline.sm" fontWeight="semibold" lineHeight="32">
          <Trans t={t}>{title}</Trans>
        </Heading>
      </Box>
      <Box className="flex items-center gap-3">
        <Badge
          borderWidth="1px"
          borderColor="border.neutral"
          py="4px"
          px="8px"
          borderRadius="full"
          bg="base.light"
        >
          <CalendarIcon mx="4px" />
          Year: {year}
        </Badge>
        <Badge
          borderWidth="1px"
          borderColor="border.neutral"
          py="4px"
          px="8px"
          borderRadius="full"
          bg="base.light"
        >
          {t("inventory-format-basic")}
        </Badge>
      </Box>
      <Text
        fontWeight="regular"
        fontSize="body.lg"
        color="interactive.control"
        letterSpacing="wide"
      >
        <Trans
          i18nKey="gpc-inventory-description"
          values={{ year: year }}
          t={t}
        >
          Track and review your {{ year: year }} GHG Emission inventory data,
          prepared according to the Greenhouse Gas Protocol for Cities (GPC)
          Framework. The data you have submitted is now officially incorporated{" "}
          <Link
            href="https://ghgprotocol.org/ghg-protocol-cities"
            target="_blank"
            fontWeight="bold"
            color="brand.secondary"
          >
            Learn more
          </Link>{" "}
          about the GPC framework for the inventory calculation.
        </Trans>
      </Text>
    </>
  );
}
