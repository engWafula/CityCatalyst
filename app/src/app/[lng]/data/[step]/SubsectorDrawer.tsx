import { RadioButton } from "@/components/radio-button";
import { api } from "@/services/api";
import { logger } from "@/services/logger";
import {
  nameToI18NKey,
  resolve,
  resolvePromisesSequentially,
} from "@/util/helpers";
import type {
  SubCategoryValueWithSource,
  SubSectorValueResponse,
} from "@/util/types";
import { ArrowBackIcon, WarningIcon } from "@chakra-ui/icons";
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Box,
  Button,
  Center,
  Drawer,
  DrawerContent,
  DrawerOverlay,
  FormControl,
  FormErrorMessage,
  FormLabel,
  HStack,
  Heading,
  Select,
  Spinner,
  Tag,
  Text,
  Textarea,
  useDisclosure,
  useRadioGroup,
} from "@chakra-ui/react";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type { TFunction } from "i18next";
import type { RefObject } from "react";
import React, { useEffect } from "react";
import { SubmitHandler, useController, useForm } from "react-hook-form";
import { EmissionsForm } from "./EmissionsForm";
import type {
  ActivityData,
  DirectMeasureData,
  SubCategory,
  SubCategoryValueData,
  SubSector,
  SubcategoryData,
} from "./types";

type Inputs = {
  valueType: "scope-values" | "unavailable" | "";
  methodology: "activity-data" | "direct-measure" | "";
  energyType: "fuel-combustion" | "grid-supplied-energy";
  unavailableReason:
    | "no-occurrance"
    | "not-estimated"
    | "confidential-information"
    | "presented-elsewhere"
    | "";
  unavailableExplanation: string;
  activity: ActivityData;
  direct: DirectMeasureData;
  subcategoryData: Record<string, SubcategoryData>;
};

const defaultActivityData: ActivityData = {
  activityDataAmount: undefined,
  activityDataUnit: undefined,
  emissionFactorType: "Local",
  dataQuality: "",
  co2EmissionFactor: 10,
  n2oEmissionFactor: 10,
  ch4EmissionFactor: 10,
  sourceReference: "",
};

const defaultDirectMeasureData: DirectMeasureData = {
  co2Emissions: 0,
  ch4Emissions: 0,
  n2oEmissions: 0,
  dataQuality: "",
  sourceReference: "",
};

const defaultValues: Inputs = {
  valueType: "scope-values",
  methodology: "",
  energyType: "fuel-combustion",
  unavailableReason: "",
  unavailableExplanation: "",
  activity: defaultActivityData,
  direct: defaultDirectMeasureData,
  subcategoryData: {},
};

// TODO create custom type that includes relations instead of using SubSectorValueAttributes?
function extractFormValues(subSectorValue: SubSectorValueResponse): Inputs {
  logger.debug("Form input", subSectorValue);
  const inputs: Inputs = Object.assign({}, defaultValues);
  if (subSectorValue.unavailableReason) {
    inputs.valueType = "unavailable";
    inputs.unavailableReason = (subSectorValue.unavailableReason as any) || "";
    inputs.unavailableExplanation = subSectorValue.unavailableExplanation || "";
  } else {
    inputs.valueType = "scope-values";
    inputs.subcategoryData = subSectorValue.subCategoryValues.reduce(
      (
        record: Record<string, SubcategoryData>,
        value: SubCategoryValueWithSource,
      ) => {
        const methodology =
          value.activityValue != null ? "activity-data" : "direct-measure";
        const data: SubcategoryData = {
          methodology,
          activity: { ...defaultActivityData },
          direct: { ...defaultDirectMeasureData },
        };

        if (methodology === "activity-data") {
          data.activity.activityDataAmount = value.activityValue;
          data.activity.activityDataUnit = value.activityUnits;
          // TODO emission factor ID, manual emissions factor values for each gas
          data.activity.dataQuality = value.dataSource.dataQuality || "";
          data.activity.sourceReference = value.dataSource.notes || "";
        } else if (methodology === "direct-measure") {
          data.direct.co2Emissions = (value.co2EmissionsValue || 0) / 1000;
          data.direct.ch4Emissions = (value.ch4EmissionsValue || 0) / 1000;
          data.direct.n2oEmissions = (value.n2oEmissionsValue || 0) / 1000;
          data.direct.dataQuality = value.dataSource.dataQuality || "";
          data.direct.sourceReference = value.dataSource.notes || "";
        }

        record[value.subcategoryId!] = data;
        return record;
      },
      {},
    );
  }
  logger.debug("Form values", inputs);
  return inputs;
}

export function SubsectorDrawer({
  subsector,
  sectorName,
  sectorNumber,
  inventoryId,
  isOpen,
  onClose,
  finalFocusRef,
  onSave,
  t,
}: {
  subsector?: SubSector;
  sectorName?: string;
  sectorNumber?: string; // I, II, III
  inventoryId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (subsector: SubSector, data: Inputs) => void;
  finalFocusRef?: RefObject<any>;
  t: TFunction;
}) {
  const {
    data: subsectorValue,
    isLoading: isSubsectorValueLoading,
    error: subsectorValueError,
  } = api.useGetSubsectorValueQuery(
    { subSectorId: subsector?.subsectorId!, inventoryId: inventoryId! },
    { skip: !subsector || !inventoryId },
  );
  const [setSubsectorValue] = api.useSetSubsectorValueMutation();
  const [setSubCategoryValue] = api.useSetSubCategoryValueMutation();

  let noPreviousValue =
    (subsectorValueError as FetchBaseQueryError)?.status === 404;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    watch,
    reset,
    control,
  } = useForm<Inputs>();

  const scopeData = watch("subcategoryData");
  const isScopeCompleted = (scopeId: string) => {
    const data = scopeData[scopeId];
    if (data?.methodology === "activity-data") {
      const activity = data.activity;
      if (!activity) return false;
      return (
        activity.activityDataAmount != null &&
        activity.activityDataUnit != null &&
        activity.emissionFactorType !== "" &&
        !(
          activity.emissionFactorType === "Add custom" &&
          +activity.co2EmissionFactor === 0 &&
          +activity.n2oEmissionFactor === 0 &&
          +activity.ch4EmissionFactor === 0
        ) &&
        activity.dataQuality !== "" &&
        activity.sourceReference !== ""
      );
    } else if (data?.methodology === "direct-measure") {
      if (!data.direct) return false;
      return (
        (data.direct.co2Emissions > 0 ||
          data.direct.ch4Emissions > 0 ||
          data.direct.n2oEmissions > 0) &&
        data.direct.dataQuality !== "" &&
        data.direct.sourceReference !== ""
      );
    }
    return false;
  };

  const onTryClose = () => {
    if (isDirty) {
      onDialogOpen();
    } else {
      onClose();
    }
  };

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    if (!subsector) return;
    logger.debug("Subsector data", data);

    // decide which data from the form to save
    if (data.valueType === "unavailable") {
      await setSubsectorValue({
        subSectorId: subsector.subsectorId,
        inventoryId: inventoryId!,
        data: {
          unavailableReason: data.unavailableReason,
          unavailableExplanation: data.unavailableExplanation,
        },
      });
    } else if (data.valueType === "scope-values") {
      await setSubsectorValue({
        subSectorId: subsector.subsectorId,
        inventoryId: inventoryId!,
        data: {
          unavailableReason: "",
          unavailableExplanation: "",
        },
      });
      const results = await resolvePromisesSequentially(
        Object.keys(data.subcategoryData).map((subcategoryId) => {
          const value = data.subcategoryData[subcategoryId];
          if (!isScopeCompleted(subcategoryId)) {
            logger.error(`Data not completed for scope ${subcategoryId}!`);
            return Promise.resolve();
          }

          let subCategoryValue: SubCategoryValueData = {
            subcategoryId,
            inventoryId: inventoryId!,
          };

          if (value.methodology === "activity-data") {
            subCategoryValue.activityValue =
              +value.activity.activityDataAmount!;
            subCategoryValue.activityUnits = value.activity.activityDataUnit;
            // TODO emission factor ID, manual emissions factor values for each gas

            subCategoryValue.dataSource = {
              sourceType: "user",
              dataQuality: value.activity.dataQuality,
              notes: value.activity.sourceReference,
            };
          } else if (value.methodology === "direct-measure") {
            subCategoryValue.co2EmissionsValue =
              +value.direct.co2Emissions * 1000;
            subCategoryValue.ch4EmissionsValue =
              +value.direct.ch4Emissions * 1000;
            subCategoryValue.n2oEmissionsValue =
              +value.direct.n2oEmissions * 1000;
            subCategoryValue.dataSource = {
              sourceType: "user",
              dataQuality: value.direct.dataQuality,
              notes: value.direct.sourceReference,
            };
          } else {
            logger.error(
              `Methodology for subcategory ${subcategoryId} not selected!`,
            );
            return Promise.resolve();
          }

          return setSubCategoryValue({
            subCategoryId: subcategoryId,
            inventoryId: inventoryId!,
            data: subCategoryValue,
          });
        }),
      );
      logger.debug("Save results", results);
    }
    onSave(subsector, data);
    onClose();
  };

  const { field } = useController({
    name: "valueType",
    control,
    defaultValue: "",
  });
  const { getRootProps, getRadioProps } = useRadioGroup(field);

  // reset form values when choosing another subsector
  useEffect(() => {
    if (subsectorValue) {
      // TODO store previous form values if it's unsaved?
      reset(extractFormValues(subsectorValue));
    } else {
      reset(defaultValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subsectorValue, subsector]);

  const subcategoryData: SubCategory[] | undefined = subsector?.subCategories;
  const scopes = subcategoryData?.map((subcategory: SubCategory) => {
    const name =
      subcategory.subcategoryName?.replace("Emissions from ", "") ||
      "Unknown Subcategory";
    const label = name.charAt(0).toUpperCase() + name.slice(1);
    return {
      label,
      value: subcategory.subcategoryId,
    };
  });

  const valueType = watch("valueType");
  const isSubmitEnabled = !!valueType;

  const {
    isOpen: isDialogOpen,
    onOpen: onDialogOpen,
    onClose: onDialogClose,
  } = useDisclosure();
  const cancelDialogRef = React.useRef<HTMLButtonElement>(null);

  return (
    <Drawer
      isOpen={isOpen}
      placement="right"
      onClose={onClose}
      onEsc={onTryClose}
      onOverlayClick={onTryClose}
      closeOnEsc={false}
      closeOnOverlayClick={false}
      size="xl"
      finalFocusRef={finalFocusRef}
    >
      <DrawerOverlay />
      <DrawerContent px={0} py={0} minH="full" className="overflow-auto">
        <Box px={16} pt={12} minH="full" className="space-y-6 flex flex-col">
          <Button
            variant="ghost"
            leftIcon={<ArrowBackIcon boxSize={6} />}
            className="self-start"
            onClick={onTryClose}
            px={6}
            py={4}
            mb={6}
          >
            {t("go-back")}
          </Button>
          {subsector && (
            <>
              {sectorName && (
                <Heading size="sm">
                  {t("sector")} - {t(nameToI18NKey(sectorName))}
                </Heading>
              )}
              <Heading size="lg">
                {t(nameToI18NKey(subsector.subsectorName))}
              </Heading>
              <Text color="content.tertiary">
                {t(nameToI18NKey(subsector.subsectorName) + "-description")}
              </Text>
              {isSubsectorValueLoading ? (
                <Center>
                  <Spinner size="lg" />
                </Center>
              ) : subsectorValueError && !noPreviousValue ? (
                <Center>
                  <HStack mt={4}>
                    <WarningIcon boxSize={7} color="semantic.danger" />
                    <Text color="semantic.danger">
                      {t("load-failed-subsector-value")}
                    </Text>
                  </HStack>
                </Center>
              ) : (
                <>
                  <Heading size="md">{t("enter-subsector-data")}</Heading>
                  <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="space-y-6 grow flex flex-col"
                  >
                    <FormControl>
                      <FormLabel>
                        {t("value-types")}{" "}
                        {/* TODO content for this Tooltip?
                        <Tooltip
                          hasArrow
                          label={t("value-types-tooltip")}
                          placement="bottom-start"
                        >
                          <InfoOutlineIcon mt={-1} color="content.tertiary" />
                        </Tooltip>
                        */}
                      </FormLabel>
                      <HStack spacing={4} {...getRootProps()}>
                        <RadioButton
                          {...getRadioProps({ value: "scope-values" })}
                        >
                          {t("scope-values")}
                        </RadioButton>
                        <RadioButton
                          {...getRadioProps({ value: "unavailable" })}
                        >
                          {t("unavailable-not-applicable")}
                        </RadioButton>
                      </HStack>
                    </FormControl>
                    {/*** One value for the sub-sector ***/}
                    {valueType === "unavailable" && (
                      <>
                        <FormControl
                          isInvalid={!!resolve("unavailableReason", errors)}
                          mb={12}
                        >
                          <FormLabel>{t("unavailable-reason")}</FormLabel>
                          <Select
                            bgColor="base.light"
                            placeholder={t("unavailable-reason-placeholder")}
                            {...register("unavailableReason", {
                              required: t("option-required"),
                            })}
                          >
                            <option value="no-occurrance">
                              {t("no-occurrance")}
                            </option>
                            <option value="not-estimated">
                              {t("not-estimated")}
                            </option>
                            <option value="confidential-information">
                              {t("confidential-information")}
                            </option>
                            <option value="presented-elsewhere">
                              {t("presented-elsewhere")}
                            </option>
                          </Select>
                          <FormErrorMessage>
                            {resolve("unavailableReason", errors)?.message}
                          </FormErrorMessage>
                        </FormControl>

                        <FormControl
                          isInvalid={
                            !!resolve("unavailableExplanation", errors)
                          }
                        >
                          <FormLabel>{t("unavailable-explanation")}</FormLabel>
                          <Textarea
                            placeholder={t(
                              "unavailable-explanation-placeholder",
                            )}
                            bgColor="base.light"
                            {...register("unavailableExplanation", {
                              required: t("unavailable-explanation-required"),
                            })}
                          />
                          <FormErrorMessage>
                            {resolve("unavailableExplanation", errors)?.message}
                          </FormErrorMessage>
                        </FormControl>
                      </>
                    )}
                    {/*** Values for each scope ***/}
                    {valueType === "scope-values" && (
                      <Accordion allowToggle className="space-y-6">
                        {scopes?.map((scope) => (
                          <AccordionItem key={scope.value} mb={0}>
                            <h2>
                              <AccordionButton>
                                <HStack w="full">
                                  <Box
                                    as="span"
                                    flex="1"
                                    textAlign="left"
                                    w="full"
                                  >
                                    <Heading
                                      size="sm"
                                      color="content.alternative"
                                    >
                                      {scope.label}
                                    </Heading>
                                    <Text color="content.tertiary">
                                      {/* TODO: Get scope text body */}
                                    </Text>
                                  </Box>
                                  {isScopeCompleted(scope.value) ? (
                                    <Tag variant="success" mx={6}>
                                      {t("completed")}
                                    </Tag>
                                  ) : (
                                    <Tag variant="warning" mx={6}>
                                      {t("incomplete")}
                                    </Tag>
                                  )}
                                  <AccordionIcon
                                    borderWidth={1}
                                    boxSize={6}
                                    borderRadius="full"
                                    borderColor="border.overlay"
                                  />
                                </HStack>
                              </AccordionButton>
                            </h2>
                            <AccordionPanel pt={4}>
                              <EmissionsForm
                                t={t}
                                register={register}
                                errors={errors}
                                control={control}
                                prefix={`subcategoryData.${scope.value}.`}
                                watch={watch}
                                sectorNumber={sectorNumber!}
                              />
                            </AccordionPanel>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    )}
                    <Box w="full" className="grow flex flex-col">
                      <Box className="grow" />
                      <Button
                        onClick={handleSubmit(onSubmit)}
                        isDisabled={!isSubmitEnabled}
                        isLoading={isSubmitting}
                        type="submit"
                        formNoValidate
                        w="full"
                        h={16}
                        mb={12}
                        mt={6}
                      >
                        {t("add-data")}
                      </Button>
                    </Box>
                  </form>
                </>
              )}
            </>
          )}
        </Box>
      </DrawerContent>
      <AlertDialog
        isOpen={isDialogOpen}
        onClose={onDialogClose}
        leastDestructiveRef={cancelDialogRef}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Discard unsaved data?
            </AlertDialogHeader>
            <AlertDialogBody>
              You have unsaved data for this subsector. Do you want to discard
              it?
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button
                variant="outline"
                ref={cancelDialogRef}
                onClick={onDialogClose}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  onClose();
                  onDialogClose();
                }}
                ml={3}
              >
                Discard
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Drawer>
  );
}
