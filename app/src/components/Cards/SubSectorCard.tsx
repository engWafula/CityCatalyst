import { Box, Card, Heading, Icon, Text } from "@chakra-ui/react";
import React, { FC } from "react";
import { MdOutlineCheckCircle } from "react-icons/md";
import { DataAlertIcon } from "../icons";
import type { TFunction } from "i18next";

interface SubSectorCardProps {
  title: string;
  scopes: string;
  isCompleted: boolean;
  t: TFunction;
}

const SubSectorCard: FC<SubSectorCardProps> = ({
  title,
  scopes,
  isCompleted,
  t,
}) => {
  return (
    <Card className="flex flex-row h-[120px] items-center px-4 gap-4 border border-[#E6E7FF] shadow-none">
      <Icon
        as={isCompleted ? MdOutlineCheckCircle : DataAlertIcon}
        boxSize={8}
        color={
          isCompleted ? "interactive.tertiary" : "sentiment.warningDefault"
        }
      />
      <Box className="flex flex-col gap-[8px]">
        <Heading
          fontSize="title.sm"
          fontWeight="medium"
          lineHeight="20"
          letterSpacing="wide"
          color="content.primary"
        >
          {title}
        </Heading>
        <Text
          fontWeight="regular"
          color="interactive.control"
          lineHeight="20"
          letterSpacing="wide"
        >
          {t("scope")}: {scopes}
        </Text>
      </Box>
    </Card>
  );
};

export default SubSectorCard;
