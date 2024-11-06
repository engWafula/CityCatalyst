import {
  Box,
  IconButton,
  Spinner,
  Switch,
  TabPanel,
  Text,
} from "@chakra-ui/react";
import React, { FC, useMemo, useState } from "react";
import HeadingText from "../../heading-text";
import { TFunction } from "i18next";
import ScopeUnavailable from "./scope-unavailable";
import {
  DirectMeasure,
  MANUAL_INPUT_HIERARCHY,
  Methodology,
  SuggestedActivity,
} from "@/util/form-schema";
import { ActivityValue } from "@/models/ActivityValue";
import { InventoryValue } from "@/models/InventoryValue";
import EmissionDataSection from "@/components/Tabs/Activity/emission-data-section";
import SelectMethodology from "@/components/Tabs/Activity/select-methodology";
import ExternalDataSection from "@/components/Tabs/Activity/external-data-section";
import { api } from "@/services/api";
import { MdModeEditOutline } from "react-icons/md";

interface ActivityTabProps {
  t: TFunction;
  referenceNumber: string;
  isUnavailableChecked?: boolean;
  isMethodologySelected?: boolean;
  userActivities?: [];
  areActivitiesLoading?: boolean;
  totalConsumption?: boolean;
  totalConsumptionUnit?: boolean;
  filteredScope: number;
  inventoryId: string;
  step: string;
  activityData: ActivityValue[] | undefined;
  subsectorId: string;
  inventoryValues: InventoryValue[];
}

const ActivityTab: FC<ActivityTabProps> = ({
  t,
  referenceNumber,
  filteredScope,
  inventoryId,
  activityData,
  subsectorId,
  inventoryValues,
}) => {
  let totalEmissions = 0;

  activityData?.forEach((activity: any) => {
    totalEmissions += parseInt(activity?.co2eq);
  });

  const [isMethodologySelected, setIsMethodologySelected] =
    useState<boolean>(false);
  const [selectedMethodology, setSelectedMethodology] = useState("");
  const [showUnavailableForm, setShowUnavailableForm] =
    useState<boolean>(false);

  const refNumberWithScope = referenceNumber + "." + (filteredScope || 1);

  const { methodologies, directMeasure } = getMethodologies();

  // extract the methodology used from the filtered scope

  const [methodology, setMethodology] = useState<Methodology | DirectMeasure>();

  const getfilteredActivityValues = useMemo(() => {
    let methodologyId: string | null | undefined = undefined;
    const filteredValues = activityData?.filter((activity) => {
      let val =
        activity.inventoryValue.gpcReferenceNumber === refNumberWithScope;
      if (val && !methodologyId) {
        methodologyId = activity.inventoryValue.inputMethodology;
      }
      return val;
    });

    // TODO remove this. Only extract the methodology from the inventory value if it exists
    if (methodologyId) {
      let methodology =
        methodologies.find((methodology) => methodology.id === methodologyId) ??
        directMeasure;
      setSelectedMethodology(methodologyId);
      setIsMethodologySelected(true);
      if (methodology && methodologyId)
        setMethodology({
          ...methodology,
          fields: (methodology as Methodology).activities
            ? (methodology as Methodology).activities
            : (methodology as unknown as DirectMeasure)["extra-fields"],
        });
    }

    return filteredValues;
  }, [activityData, refNumberWithScope]);

  function getMethodologies() {
    const methodologies =
      MANUAL_INPUT_HIERARCHY[refNumberWithScope]?.methodologies || [];
    const directMeasure =
      MANUAL_INPUT_HIERARCHY[refNumberWithScope]?.directMeasure;
    return { methodologies, directMeasure };
  }

  const externalInventoryValue = useMemo(() => {
    return inventoryValues?.find(
      (value) =>
        value.gpcReferenceNumber === refNumberWithScope &&
        value.dataSource?.sourceType === "third_party",
    );
  }, [inventoryValues, refNumberWithScope]);

  const [updateInventoryValue, { isLoading }] =
    api.useUpdateOrCreateInventoryValueMutation();

  const makeScopeAvailableFunc = () => {
    updateInventoryValue({
      inventoryId: inventoryId,
      subSectorId: subsectorId,
      data: {
        unavailableReason: "",
        unavailableExplanation: "",
        gpcReferenceNumber: refNumberWithScope,
      },
    });
  };

  const inventoryValue = useMemo<InventoryValue | null>(() => {
    return (
      inventoryValues?.find(
        (value) =>
          value.inputMethodology ===
            (methodology?.id.includes("direct-measure")
              ? "direct-measure"
              : methodology?.id) || value.unavailableExplanation,
      ) ?? null
    );
  }, [inventoryValues, methodology]);

  const getActivityValuesByMethodology = (
    activityValues: ActivityValue[] | undefined,
  ) => {
    const isDirectMeasure = methodology?.id.includes("direct-measure");

    return activityValues?.filter((activity) =>
      isDirectMeasure
        ? activity.inventoryValue.inputMethodology === "direct-measure"
        : activity.inventoryValue.inputMethodology !== "direct-measure",
    );
  };

  const activityValues =
    getActivityValuesByMethodology(getfilteredActivityValues) || [];

  const getSuggestedActivities = (): SuggestedActivity[] => {
    if (!selectedMethodology) return [];
    let methodology;
    const scope = MANUAL_INPUT_HIERARCHY[refNumberWithScope];
    if (selectedMethodology.includes("direct-measure")) {
      methodology = scope.directMeasure;
    } else {
      methodology = (scope.methodologies || []).find(
        (m) => m.id === selectedMethodology,
      );
    }
    return (methodology?.suggestedActivities ?? []) as SuggestedActivity[];
  };

  const handleMethodologySelected = (
    methodology: Methodology | DirectMeasure,
  ) => {
    setSelectedMethodology(methodology.id);
    setIsMethodologySelected(!isMethodologySelected);
    setMethodology(methodology);
  };

  const changeMethodology = () => {
    setSelectedMethodology("");
    setIsMethodologySelected(false);
  };

  const suggestedActivities: SuggestedActivity[] = getSuggestedActivities();

  const handleSwitch = (e: any) => {
    if (!inventoryValue?.unavailableExplanation && !showUnavailableForm) {
      showUnavailableFormFunc();
    }
    if (!inventoryValue?.unavailableExplanation && showUnavailableForm) {
      setShowUnavailableForm(false);
    }

    if (inventoryValue?.unavailableExplanation) {
      makeScopeAvailableFunc();
    }
  };

  const showUnavailableFormFunc = () => {
    setShowUnavailableForm(true);
  };

  const scopeNotApplicable = useMemo(() => {
    return inventoryValue?.unavailableExplanation || showUnavailableForm;
  }, [showUnavailableForm, inventoryValue]);

  const notationKey = useMemo(() => {
    switch (inventoryValue?.unavailableReason) {
      case "select-reason-2":
        return "notation-key-NE";
      case "select-reason-3":
        return "notation-key-C";
      case "select-reason-4":
        return "notation-key-IE";
      default:
        return "notation-key-NO";
    }
  }, [inventoryValue]);

  return (
    <>
      <TabPanel p="0" pt="48px">
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          mb="48px"
        >
          <HeadingText
            data-testid="manual-input-header"
            title={t("add-data-manually")}
          />
          <Box
            display="flex"
            alignItems="center"
            gap="16px"
            fontSize="label.lg"
          >
            {isLoading && <Spinner size="sm" color="border.neutral" />}
            <Switch
              disabled={!!externalInventoryValue}
              isChecked={
                showUnavailableForm || !!inventoryValue?.unavailableExplanation
              }
              onChange={handleSwitch}
            />
            <Text
              opacity={!!externalInventoryValue ? 0.4 : 1}
              fontFamily="heading"
              fontWeight="medium"
            >
              {t("scope-not-applicable")}
            </Text>
          </Box>
        </Box>
        {inventoryValue?.unavailableExplanation && !showUnavailableForm && (
          <Box h="auto" px="24px" py="32px" bg="base.light" borderRadius="8px">
            <Box mb="8px">
              <HeadingText title={t("scope-unavailable-title")} />
              <Text
                letterSpacing="wide"
                fontSize="body.lg"
                fontWeight="normal"
                color="interactive.control"
                mb="48px"
              >
                {t("scope-unavailable-description")}
              </Text>

              <Box
                display="flex"
                gap="48px"
                alignItems="center"
                borderWidth="1px"
                borderRadius="12px"
                borderColor="border.neutral"
                py={4}
                pl={6}
                pr={3}
              >
                <Box>
                  <Text
                    fontWeight="bold"
                    fontSize="title.md"
                    fontFamily="heading"
                  >
                    {t(notationKey)}
                  </Text>
                  <Text fontSize="body.md" color="interactive.control">
                    {t("notation-key")}
                  </Text>
                </Box>
                <Text
                  fontSize="body.md"
                  fontFamily="body"
                  flex="1 0 0"
                  className="overflow-ellipsis line-clamp-2"
                >
                  <Text fontSize="body.md" fontFamily="body">
                    <strong> {t("reason")}: </strong>
                    {t(inventoryValue?.unavailableReason as string)}
                  </Text>
                </Text>
                <Text
                  fontSize="body.md"
                  flex="1 0 0"
                  fontFamily="body"
                  className="line-clamp-2"
                >
                  {inventoryValue.unavailableExplanation}
                </Text>
                <IconButton
                  onClick={showUnavailableFormFunc}
                  icon={<MdModeEditOutline size="24px" />}
                  aria-label="edit"
                  variant="ghost"
                  color="content.tertiary"
                />
              </Box>
            </Box>
          </Box>
        )}
        {showUnavailableForm && (
          <ScopeUnavailable
            inventoryId={inventoryId}
            gpcReferenceNumber={refNumberWithScope}
            subSectorId={subsectorId}
            t={t}
            onSubmit={() => setShowUnavailableForm(false)}
            reason={inventoryValue?.unavailableReason}
            justification={inventoryValue?.unavailableExplanation}
          />
        )}
        {!scopeNotApplicable && externalInventoryValue && (
          <Box h="auto" px="24px" py="32px" bg="base.light" borderRadius="8px">
            <ExternalDataSection
              t={t}
              inventoryValue={externalInventoryValue}
            />
          </Box>
        )}
        {!scopeNotApplicable && !externalInventoryValue && (
          <>
            {isMethodologySelected ? (
              <Box
                h="auto"
                px="24px"
                py="32px"
                bg="base.light"
                borderRadius="8px"
              >
                {" "}
                <EmissionDataSection
                  t={t}
                  methodology={methodology}
                  inventoryId={inventoryId}
                  subsectorId={subsectorId}
                  refNumberWithScope={refNumberWithScope}
                  activityValues={activityValues}
                  suggestedActivities={suggestedActivities}
                  totalEmissions={totalEmissions}
                  changeMethodology={changeMethodology}
                  inventoryValue={inventoryValue}
                />
              </Box>
            ) : (
              <SelectMethodology
                t={t}
                methodologies={methodologies}
                handleMethodologySelected={handleMethodologySelected}
                directMeasure={directMeasure}
              />
            )}
          </>
        )}
      </TabPanel>
    </>
  );
};

export default ActivityTab;
