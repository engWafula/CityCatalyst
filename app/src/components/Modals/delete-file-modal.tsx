"use client";

import { UserFileAttributes } from "@/models/UserFile";
import { api } from "@/services/api";
import {
  Modal,
  Button,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  Box,
  Badge,
} from "@chakra-ui/react";
import React, { FC } from "react";

import { FiTrash2 } from "react-icons/fi";

interface DeleteFileModalProps {
  isOpen: boolean;
  onClose: any;
  fileData: UserFileAttributes | undefined;
}

const DeleteFileModal: FC<DeleteFileModalProps> = ({
  isOpen,
  onClose,
  fileData,
}) => {
  const [deleteUserFile] = api.useDeleteUserFileMutation();
  const onDeleteFile = async () => {
    try {
      await deleteUserFile({ fileId: fileData?.id });
    } catch (error) {
      console.error(error);
    } finally {
      onClose();
    }
  };
  return (
    <>
      <Modal blockScrollOnMount={false} isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent minH="388px" minW="568px" marginTop="10%">
          <ModalHeader
            display="flex"
            justifyContent="center"
            fontWeight="semibold"
            fontSize="headline.sm"
            lineHeight="32"
            padding="24px"
            borderBottomWidth="1px"
            borderStyle="solid"
            borderColor="border.neutral"
          >
            Delete File
          </ModalHeader>
          <ModalCloseButton marginTop="10px" />
          <ModalBody paddingTop="24px">
            <Box
              display="flex"
              flexDirection="column"
              gap="24px"
              alignItems="center"
            >
              <Box
                display="flex"
                alignItems="center"
                flexDirection="column"
                justifyContent="center"
                gap="24px"
              >
                <Badge
                  color="sentiment.negativeDefault"
                  h="68px"
                  w="68px"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  borderRadius="full"
                  background="sentiment.negativeOverlay"
                >
                  <FiTrash2 size={36} />
                </Badge>
                <Text
                  textAlign="center"
                  fontFamily="heading"
                  w="408px"
                  fontSize="body.large"
                  letterSpacing="wide"
                  fontStyle="normal"
                >
                  Are you sure you want to{" "}
                  <span style={{ fontWeight: "bold" }}>
                    permanently remove this file
                  </span>{" "}
                </Text>
              </Box>
              <Button
                h="56px"
                w="472px"
                background="sentiment.negativeDefault"
                paddingTop="16px"
                paddingBottom="16px"
                px="24px"
                letterSpacing="widest"
                textTransform="uppercase"
                fontWeight="semibold"
                fontSize="button.md"
                type="button"
                onClick={() => onDeleteFile()}
              >
                save changes
              </Button>
            </Box>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default DeleteFileModal;
