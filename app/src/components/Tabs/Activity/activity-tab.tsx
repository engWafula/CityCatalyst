import {
  Box,
  Button,
  Icon,
  IconButton,
  Link,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Switch,
  TabPanel,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import React, { FC, useState } from "react";
import HeadingText from "../../heading-text";
import { AddIcon } from "@chakra-ui/icons";
import { MdMoreVert } from "react-icons/md";
import SuggestedActivityCard from "../../Cards/suggested-activities-card";
import { TFunction } from "i18next";
import { FiTrash2 } from "react-icons/fi";
import { FaNetworkWired } from "react-icons/fa";
import { Trans } from "react-i18next";
import AddActivityModal from "../../Modals/add-activity-modal";
import ChangeMethodology from "../../Modals/change-methodology";
import DeleteAllActivitiesModal from "../../Modals/delete-all-activities-modal";
import { api } from "@/services/api";
import ActivityAccordion from "./activity-accordion";
import ScopeUnavailable from "./scope-unavailable";
import { ActivityDataScope } from "@/features/city/subsectorSlice";
import { MANUAL_INPUT_HIERARCHY, Methodology } from "@/util/form-schema";
import MethodologyCard from "@/components/Cards/methodology-card";

interface ActivityTabProps {
  t: TFunction;
  referenceNumber: string;
  isUnavailableChecked?: boolean;
  isMethodologySelected?: boolean;
  userActivities?: [];
  areActivitiesLoading?: boolean;
  totalConsumption?: boolean;
  totalConsumptionUnit?: boolean;
  filteredScope: ActivityDataScope;
  inventoryId: string;
  step: string;
}

const ActivityTab: FC<ActivityTabProps> = ({
  t,
  userActivities,
  referenceNumber,
  areActivitiesLoading,
  totalConsumption,
  totalConsumptionUnit,
  filteredScope,
  inventoryId,
  step,
}) => {
  const totalEmissions = 0;
  const [selectedActivity, setSelectedActivity] = useState();
  const [isMethodologySelected, setIsMethodologySelected] = useState(false);
  const [selectedMethodology, setSelectedMethodology] = useState("");
  const [isUnavailableChecked, setIsChecked] = useState<boolean>(false);
  const [hasActivityData, setHasActivityData] = useState<boolean>(false);
  const [methodology, setMethodology] = useState<Methodology>();

  const refNumberWithScope = referenceNumber + "." + (filteredScope.scope || 1);

  function getMethodologies() {
    const methodologies =
      MANUAL_INPUT_HIERARCHY[refNumberWithScope]?.methodologies || [];
    const directMeasure = {
      ...MANUAL_INPUT_HIERARCHY[refNumberWithScope]?.directMeasure,
      id:
        MANUAL_INPUT_HIERARCHY[refNumberWithScope]?.directMeasure?.id ||
        "direct-measure", // adds a fallback generic id for direct measure
    };
    return { methodologies, directMeasure };
  }

  const { methodologies, directMeasure } = getMethodologies();

  const getSuggestedActivities = () => {
    if (!selectedMethodology) return [];
    const methodology = (
      MANUAL_INPUT_HIERARCHY[refNumberWithScope]?.methodologies || []
    ).find((m) => m.id === selectedMethodology);
    return methodology?.suggestedActivities || [];
  };

  const handleMethodologySelected = (methodology: Methodology) => {
    setSelectedMethodology(methodology.id);
    setIsMethodologySelected(!isMethodologySelected);
    setMethodology(methodology);
  };
  const changeMethodology = () => {
    setSelectedMethodology("");
    setIsMethodologySelected(false);
    onChangeMethodologyClose();
  };

  const {
    isOpen: isAddActivityModalOpen,
    onOpen: onAddActivityModalOpen,
    onClose: onAddActivityModalClose,
  } = useDisclosure();

  const {
    isOpen: isChangeMethodologyModalOpen,
    onOpen: onChangeMethodologyOpen,
    onClose: onChangeMethodologyClose,
  } = useDisclosure();

  const {
    isOpen: isDeleteActivitiesModalOpen,
    onOpen: onDeleteActivitiesModalOpen,
    onClose: onDeleteActivitiesModalClose,
  } = useDisclosure();

  const {
    isOpen: isDeleteActivityModalOpen,
    onOpen: onDeleteActivityModalOpen,
    onClose: onDeleteActivityModalClose,
  } = useDisclosure();

  const suggestedActivities = getSuggestedActivities();

  const handleSwitch = (e: any) => {
    setIsChecked(!isUnavailableChecked);
  };

  const [deleteActivity, isDeleteActivityLoading] =
    api.useDeleteActivityValueMutation();

  // const deleteAllActivities = () => {
  //   if (areActivitiesLoading || userActivities?.length === 0) {
  //     onDeleteActivitiesModalClose();
  //     return;
  //   }

  //   for (const activity of userActivities) {
  //     deleteActivity({ inventoryId, activityValueId: activity.id });
  //   }

  //   onDeleteActivitiesModalClose();
  function handleCardSelect(methodology: Methodology) {
    return () => handleMethodologySelected(methodology);
  }

  // };

  return (
    <>
      <TabPanel p="0" pt="48px">
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          mb="48px"
        >
          <HeadingText title={t("add-data-manually")} />
          <Box display="flex" gap="16px" fontSize="label.lg">
            <Switch isChecked={isUnavailableChecked} onChange={handleSwitch} />
            <Text fontFamily="heading" fontWeight="medium">
              {t("scope-not-applicable")}
            </Text>
          </Box>
        </Box>
        {isMethodologySelected ? (
          <>
            <Box
              h="auto"
              px="24px"
              py="32px"
              bg="base.light"
              borderRadius="8px"
            >
              {" "}
              {isMethodologySelected ? (
                <Box>
                  <Text
                    fontFamily="heading"
                    fontSize="10px"
                    fontWeight="semibold"
                    letterSpacing="widest"
                    textTransform="uppercase"
                    color="content.tertiary"
                  >
                    {t("methodology")}
                  </Text>
                  <Box display="flex" justifyContent="space-between">
                    <Box>
                      <HeadingText title={t(methodology?.id || "")} />
                      <Text
                        letterSpacing="wide"
                        fontSize="body.lg"
                        fontWeight="normal"
                        color="interactive.control"
                      >
                        {t(methodology?.id + "-description")}
                      </Text>
                    </Box>
                    <Box display="flex" alignItems="center">
                      <Button
                        onClick={onAddActivityModalOpen}
                        title="Add Activity"
                        leftIcon={<AddIcon h="16px" w="16px" />}
                        h="48px"
                        aria-label="activity-button"
                        fontSize="button.md"
                        gap="8px"
                      >
                        {t("add-activity")}
                      </Button>
                      <Popover>
                        <PopoverTrigger>
                          <IconButton
                            icon={<MdMoreVert size="24px" />}
                            aria-label="more-icon"
                            variant="ghost"
                            color="content.tertiary"
                          />
                        </PopoverTrigger>
                        <PopoverContent
                          w="auto"
                          borderRadius="8px"
                          shadow="2dp"
                          px="0"
                        >
                          <PopoverArrow />
                          <PopoverBody p="0px">
                            <Box
                              p="16px"
                              display="flex"
                              alignItems="center"
                              gap="16px"
                              _hover={{
                                bg: "content.link",
                                cursor: "pointer",
                              }}
                              className="group"
                              onClick={onChangeMethodologyOpen}
                            >
                              <Icon
                                className="group-hover:text-white"
                                color="interactive.control"
                                as={FaNetworkWired}
                                h="24px"
                                w="24px"
                              />
                              <Text
                                className="group-hover:text-white"
                                color="content.primary"
                              >
                                {t("change-methodology")}
                              </Text>
                            </Box>
                            <Box
                              p="16px"
                              display="flex"
                              alignItems="center"
                              gap="16px"
                              _hover={{
                                bg: "content.link",
                                cursor: "pointer",
                              }}
                              className="group"
                              onClick={onDeleteActivitiesModalOpen}
                            >
                              <Icon
                                className="group-hover:text-white"
                                color="sentiment.negativeDefault"
                                as={FiTrash2}
                                h="24px"
                                w="24px"
                              />
                              <Text
                                className="group-hover:text-white"
                                color="content.primary"
                              >
                                Delete all activities
                              </Text>
                            </Box>
                          </PopoverBody>
                        </PopoverContent>
                      </Popover>
                    </Box>
                  </Box>
                  <Box
                    mt="48px"
                    display="flex"
                    flexDirection="column"
                    gap="16px"
                  >
                    {hasActivityData ? (
                      <Box>
                        <ActivityAccordion
                          t={t}
                          userActivities={userActivities}
                          showActivityModal={onAddActivityModalOpen}
                        />
                        <Box
                          w="full"
                          borderTopWidth="3px"
                          borderColor="interactive.secondary"
                          py="32px"
                          px="48px"
                        >
                          <Box display="flex" justifyContent="space-between">
                            <Text
                              fontFamily="heading"
                              fontWeight="semibold"
                              fontSize="headline.md"
                            >
                              {t("total-emissions")}
                            </Text>
                            <Text
                              fontFamily="heading"
                              fontWeight="semibold"
                              fontSize="headline.md"
                            >
                              {totalEmissions} MtCO2
                            </Text>
                          </Box>
                        </Box>
                      </Box>
                    ) : (
                      <>
                        <Text
                          fontFamily="heading"
                          fontSize="title.md"
                          fontWeight="semibold"
                          color="content.secondary"
                        >
                          {t("activity-suggestion")}
                        </Text>
                        <Box className="flex flex-col gap-4">
                          {suggestedActivities.map(({ id }) => (
                            <SuggestedActivityCard
                              key={id}
                              id={id}
                              t={t}
                              description={methodology?.suggestedActivitiesId || ""}
                              isSelected={selectedActivity === id}
                              onActivityAdded={onAddActivityModalOpen}
                            />
                          ))}
                        </Box>
                      </>
                    )}
                  </Box>
                </Box>
              ) : (
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  mb="8px"
                >
                  <HeadingText title={t("select-methodology-title")} />
                </Box>
              )}
            </Box>
          </>
        ) : (
          <Box>
            {isUnavailableChecked ? (
              <ScopeUnavailable t={t} />
            ) : (
              <Box>
                {isUnavailableChecked && (
                  <Box>
                    <HeadingText title={t("scope-unavailable")} />
                    <Text
                      letterSpacing="wide"
                      fontSize="body.lg"
                      fontWeight="normal"
                      color="interactive.control"
                      mt="8px"
                    >
                      {t("scope-unavailable-description")}
                    </Text>
                    <Box mt="48px">
                      {!hasActivityData && (
                        <HeadingText title={t("select-methodology-title")} />
                      )}
                    </Box>
                  </Box>
                )}
                {isMethodologySelected ? (
                  ""
                ) : (
                  <Box>
                    <Text
                      letterSpacing="wide"
                      fontSize="body.lg"
                      fontWeight="normal"
                      color="interactive.control"
                    >
                      <Trans t={t} i18nKey="add-data-manually-desciption">
                        To add your inventory data manually, select the
                        methodology used to collect the data and calculate your
                        emissions.{" "}
                        <Link
                          href="https://ghgprotocol.org/ghg-protocol-cities"
                          color="content.link"
                          fontWeight="bold"
                          textDecoration="underline"
                        >
                          Learn more
                        </Link>{" "}
                        about methodologies
                      </Trans>
                    </Text>
                    <Text
                      fontWeight="bold"
                      fontSize="title.md"
                      fontFamily="heading"
                      pt="48px"
                      pb="24px"
                    >
                      {t("select-methodology")}
                    </Text>
                    <Box
                      gap="16px"
                      display="flex"
                      justifyContent="space-between"
                    >
                      {(methodologies || []).map((methodology) => (
                        <MethodologyCard
                          methodology={methodology}
                          key={directMeasure.id}
                          isSelected={selectedMethodology === methodology.id}
                          t={t}
                          handleCardSelect={handleCardSelect(methodology)}
                        />
                      ))}
                      {methodologies.length > 0 ? ( // hide this card until other methodologies can also load
                        <MethodologyCard
                          methodology={directMeasure}
                          key={directMeasure.id}
                          isSelected={selectedMethodology === directMeasure.id}
                          t={t}
                          handleCardSelect={handleCardSelect(directMeasure)}
                        />
                      ) : null}
                    </Box>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        )}
      </TabPanel>
      <AddActivityModal
        t={t}
        userInfo={null}
        isOpen={isAddActivityModalOpen}
        onClose={onAddActivityModalClose}
        hasActivityData={hasActivityData}
        setHasActivityData={setHasActivityData}
        formStruct={filteredScope}
        inventoryId={inventoryId}
        step={step}
        scope={filteredScope.scope}
      />

      <ChangeMethodology
        t={t}
        onClose={onChangeMethodologyClose}
        isOpen={isChangeMethodologyModalOpen}
        onChangeClicked={changeMethodology}
      />
      <DeleteAllActivitiesModal
        t={t}
        isOpen={isDeleteActivitiesModalOpen}
        onClose={onDeleteActivitiesModalClose}
      />
    </>
  );
};

export default ActivityTab;
