import { RadioButton } from "@/components/radio-button";
import { InfoOutlineIcon } from "@chakra-ui/icons";
import {
  Box,
  FormControl,
  FormErrorMessage,
  FormLabel,
  HStack,
  Heading,
  Select,
  Switch,
  Textarea,
  Tooltip,
  useRadioGroup,
} from "@chakra-ui/react";
import { ActivityDataTab } from "./ActivityDataTab";
import { DirectMeasureForm } from "./DirectMeasureForm";
import { TFunction } from "i18next";
import { Control, useController } from "react-hook-form";
import { resolve } from "@/util/helpers";

export function EmissionsForm({
  t,
  register,
  errors,
  control,
  prefix = "",
  watch,
  sectorNumber,
}: {
  t: TFunction;
  register: Function;
  errors: Record<string, any>;
  control: Control<any, any>;
  prefix?: string;
  watch: Function;
  sectorNumber: string;
}) {
  const { field } = useController({
    name: prefix + "methodology",
    control,
    defaultValue: "",
  });
  const {
    getRootProps,
    getRadioProps,
    value: methodology,
  } = useRadioGroup(field);

  const isUnavailable = watch(prefix + "isUnavailable");

  return (
    <Box className="space-y-6">
      <FormControl>
        <Switch size="lg" {...register(prefix + "isUnavailable")} />
        <FormLabel>{t("unavailable-not-applicable")}</FormLabel>
      </FormControl>
      {isUnavailable ? (
        <>
          <FormControl
            isInvalid={!!resolve(prefix + "unavailableReason", errors)}
            mb={12}
          >
            <FormLabel>{t("unavailable-reason")}</FormLabel>
            <Select
              bgColor="base.light"
              placeholder={t("unavailable-reason-placeholder")}
              {...register(prefix + "unavailableReason", {
                required: t("option-required"),
              })}
            >
              <option value="no-occurrance">{t("no-occurrance")}</option>
              <option value="not-estimated">{t("not-estimated")}</option>
              <option value="confidential-information">
                {t("confidential-information")}
              </option>
              <option value="presented-elsewhere">
                {t("presented-elsewhere")}
              </option>
            </Select>
            <FormErrorMessage>
              {resolve(prefix + "unavailableReason", errors)?.message}
            </FormErrorMessage>
          </FormControl>

          <FormControl isInvalid={!!resolve(prefix + "unavailableExplanation", errors)}>
            <FormLabel>{t("unavailable-explanation")}</FormLabel>
            <Textarea
              placeholder={t("unavailable-explanation-placeholder")}
              bgColor="base.light"
              {...register(prefix + "unavailableExplanation", {
                required: t("unavailable-explanation-required"),
              })}
            />
            <FormErrorMessage>
              {resolve(prefix + "unavailableExplanation", errors)?.message}
            </FormErrorMessage>
          </FormControl>
        </>
      ) : (
        <>
          <Heading size="sm" className="font-normal">
            {t("select-methodology")}{" "}
            <Tooltip
              hasArrow
              label={t("methodology-tooltip")}
              bg="content.secondary"
              color="base.light"
              placement="bottom-start"
            >
              <InfoOutlineIcon mt={-0.5} color="content.tertiary" />
            </Tooltip>
          </Heading>
          <HStack spacing={4} {...getRootProps()}>
            <RadioButton {...getRadioProps({ value: "activity-data" })}>
              {t("activity-data")}
            </RadioButton>
            <RadioButton {...getRadioProps({ value: "direct-measure" })}>
              {t("direct-measure")}
            </RadioButton>
          </HStack>
          {/*** Activity data ***/}
          {methodology === "activity-data" && (
            <ActivityDataTab
              t={t}
              register={register}
              errors={errors}
              prefix={prefix + "activity."}
              watch={watch}
              sectorNumber={sectorNumber}
            />
          )}
          {/*** Direct measure ***/}
          {methodology === "direct-measure" && (
            <DirectMeasureForm
              t={t}
              register={register}
              errors={errors}
              prefix={prefix + "direct."}
            />
          )}
        </>
      )}
    </Box>
  );
}
