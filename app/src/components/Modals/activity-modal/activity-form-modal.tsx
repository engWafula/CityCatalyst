"use client";

import { api, useUpdateActivityValueMutation } from "@/services/api";
import {
  Box,
  Button,
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  useToast,
} from "@chakra-ui/react";
import { FC, useEffect, useMemo } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { TFunction, use } from "i18next";
import { CheckCircleIcon } from "@chakra-ui/icons";
import { getInputMethodology } from "@/util/helpers";
import type { SuggestedActivity } from "@/util/form-schema";
import { getTranslationFromDict } from "@/i18n";
import ActivityModalBody from "./activity-modal-body";
import { Inputs } from "./activity-modal-body";
import { ActivityValue } from "@/models/ActivityValue";

interface AddActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  t: TFunction;
  defaultCityId?: string;
  setHasActivityData: Function;
  hasActivityData: boolean;
  inventoryId: string;
  methodology: any;
  selectedActivity?: SuggestedActivity;
  referenceNumber: string;
  edit?: boolean;
  targetActivityValue?: ActivityValue;
  resetSelectedActivityValue: () => void;
}

const AddActivityModal: FC<AddActivityModalProps> = ({
  isOpen,
  onClose,
  edit,
  t,
  setHasActivityData,
  hasActivityData,
  inventoryId,
  methodology,
  selectedActivity,
  referenceNumber,
  targetActivityValue,
  resetSelectedActivityValue,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<Inputs>();

  useEffect(() => {
    // set default values for the form
    if (targetActivityValue) {
      reset({
        activity: {
          buildingType: targetActivityValue?.activityData?.activity_type,
          fuelType: targetActivityValue?.activityData?.fuel_type,
          dataQuality: targetActivityValue?.dataSource?.dataQuality,
          sourceReference: targetActivityValue?.dataSource?.notes,
          CH4EmissionFactor: targetActivityValue?.activityData?.ch4_amount,
          CO2EmissionFactor: targetActivityValue?.activityData?.co2_amount,
          N2OEmissionFactor: targetActivityValue?.activityData?.n2o_amount,
          activityDataAmount: 0,
          activityDataUnit: null,
          emissionFactorType: "",
          totalFuelConsumption: "",
          totalFuelConsumptionUnits: "",
          co2EmissionFactorUnit: "",
          n2oEmissionFactorUnit: "",
          ch4EmissionFactorUnit: "",
        },
      });
    } else {
      // reset({});
      reset({
        activity: {
          buildingType: selectedActivity?.id,
          fuelType: "",
          dataQuality: "",
          sourceReference: "",
          CH4EmissionFactor: 0,
          CO2EmissionFactor: 0,
          N2OEmissionFactor: 0,
          activityDataAmount: 0,
          activityDataUnit: null,
          emissionFactorType: "",
          totalFuelConsumption: "",
          totalFuelConsumptionUnits: "",
          co2EmissionFactorUnit: "",
          n2oEmissionFactorUnit: "",
          ch4EmissionFactorUnit: "",
        },
      });
    }
  }, [targetActivityValue]);

  const val = watch("activity");

  const submit = () => {
    handleSubmit(onSubmit)();
  };

  let { data: emissionsFactors, isLoading: emissionsFactorsLoading } =
    api.useGetEmissionsFactorsQuery();

  // extract and deduplicate data sources from emissions factors
  const emissionsFactorTypes = useMemo(() => {
    if (!emissionsFactors) {
      return [];
    }
    const seen: Record<string, boolean> = {};
    return emissionsFactors
      .flatMap((factor) => {
        return factor.dataSources.map((source) => ({
          id: source.datasourceId,
          name: getTranslationFromDict(source.datasetName) ?? "unknown",
        }));
      })
      .filter((source) => {
        return seen.hasOwnProperty(source.id)
          ? false
          : (seen[source.id] = true);
      });
  }, [emissionsFactors]);

  const toast = useToast();

  const [createActivityValue, { isLoading }] =
    api.useCreateActivityValueMutation();

  const [updateActivityValue, { isLoading: updateLoading }] =
    useUpdateActivityValueMutation();

  function extractGasesAndUnits(data: any): {
    gas: string;
    factor: number;
    unit: string;
    emissionFactorId?: string;
  }[] {
    // two sets of logic for edit and create
    if (edit) {
      // make use of the gases in the targetActivityValue
      const gasArray: { gas: string; factor: number; unit: string }[] = [];
      targetActivityValue?.gasValues.forEach((gasValue) => {
        const gasObject = {
          ...gasValue,
          gas: gasValue.gas as string,
          factor: data[`${gasValue.gas}EmissionFactor`],
          unit: gasValue.emissionsFactor.units as string,
        };
        gasArray.push(gasObject);
      });
      return gasArray;
    }
    const gases = ["CH4", "CO2", "N2O"];
    const gasArray: { gas: string; factor: number; unit: string }[] = [];
    gases.forEach((gas) => {
      const gasFactorKey = `${gas}EmissionFactor`;
      const gasUnitKey = `${gas}EmissionFactorUnit`;
      const gasObject = {
        gas: gas,
        factor: data[gasFactorKey],
        unit: data[gasUnitKey],
      };

      gasArray.push(gasObject);
    });
    return gasArray;
  }

  const onSubmit: SubmitHandler<Inputs> = async ({ activity }) => {
    const gasValues = extractGasesAndUnits(activity);
    const requestData = {
      activityData: {
        co2_amount: gasValues[1].factor,
        ch4_amount: gasValues[0].factor,
        n2o_amount: gasValues[2].factor,
        activity_type: activity.buildingType,
        fuel_type: activity.fuelType,
      },
      metadata: {},
      inventoryValue: {
        inputMethodology: getInputMethodology(methodology?.id), // extract methodology name
        gpcReferenceNumber: referenceNumber,
        unavailableReason: "",
        unavailableExplanation: "",
      },
      dataSource: {
        sourceType: "",
        dataQuality: activity.dataQuality,
        notes: activity.sourceReference,
      },
      gasValues: gasValues.map(({ gas, factor, unit, ...rest }) => ({
        ...rest,
        gas,
        gasAmount: factor,
        emissionsFactor: {
          gas,
          unit,
          gpcReferenceNumber: referenceNumber,
        },
      })),
    };

    let response = null;

    if (edit) {
      response = await updateActivityValue({
        inventoryId,
        valueId: targetActivityValue?.id,
        data: requestData,
      });
    } else {
      response = await createActivityValue({ inventoryId, requestData });
    }

    if (response.data) {
      setHasActivityData(!hasActivityData);
      toast({
        status: "success",
        duration: 1200,
        title: "New activity data successfully added!",
        render: ({ title }) => (
          <Box
            h="48px"
            w="600px"
            borderRadius="8px"
            display="flex"
            alignItems="center"
            color="white"
            backgroundColor="interactive.primary"
            gap="8px"
            px="16px"
          >
            <CheckCircleIcon />
            <Text>{title}</Text>
          </Box>
        ),
      });
      reset();
      onClose();
      resetSelectedActivityValue();
    } else {
      toast({
        status: "error",
        title: "Something went wrong!",
      });
    }
  };

  let fields = null;
  let units = null;
  if (methodology?.id.includes("direct-measure")) {
    fields = methodology.fields;
  } else {
    fields = methodology?.fields[0]["extra-fields"];
    units = methodology?.fields[0].units;
  }

  return (
    <>
      <Modal
        blockScrollOnMount={false}
        isOpen={isOpen}
        onClose={() => {
          onClose();
          resetSelectedActivityValue();
        }}
      >
        <ModalOverlay />
        <ModalContent
          data-testid="add-emission-modal"
          minH="300px"
          minW="768px"
          marginTop="2%"
        >
          <ModalHeader
            display="flex"
            justifyContent="center"
            fontWeight="semibold"
            fontSize="headline.sm"
            fontFamily="heading"
            lineHeight="32"
            padding="24px"
            borderBottomWidth="1px"
            borderStyle="solid"
            borderColor="border.neutral"
          >
            {edit ? t("update-emission-data") : t("add-emission-data")}
          </ModalHeader>
          <ModalCloseButton marginTop="10px" />
          <ActivityModalBody
            emissionsFactorTypes={emissionsFactorTypes}
            submit={submit}
            register={register}
            fields={fields}
            units={units}
            methodology={methodology}
            selectedActivity={selectedActivity}
            t={t}
            errors={errors}
          />
          <ModalFooter
            borderTopWidth="1px"
            borderStyle="solid"
            borderColor="border.neutral"
            w="full"
            display="flex"
            alignItems="center"
            p="24px"
            justifyContent="center"
          >
            <Button
              data-testid="add-emission-modal-submit"
              h="56px"
              w="full"
              paddingTop="16px"
              paddingBottom="16px"
              px="24px"
              letterSpacing="widest"
              textTransform="uppercase"
              fontWeight="semibold"
              fontSize="button.md"
              type="submit"
              isLoading={isLoading || updateLoading}
              onClick={submit}
              p={0}
              m={0}
            >
              {edit ? t("update-emission-data") : t("add-emission-data")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default AddActivityModal;
