import axiosInstance from "../utils/axiosinstance";
import { API_PATHS } from "../utils/apiPath";

// ================================
// GET ALL DOCUMENTS
// ================================
const getDocuments = async () => {
  try {
    const response = await axiosInstance.get(
      API_PATHS.DOCUMENTS.GET_DOCUMENTS
    );

    return response.data?.data;
  } catch (error) {
    throw {
      ...(error.response?.data || {}),
      status: error.response?.status,
      message:
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Failed to fetch documents",
    };
  }
};

// ================================
// UPLOAD DOCUMENT
// ================================
const uploadDocument = async (formData) => {
  try {
    const response = await axiosInstance.post(
      API_PATHS.DOCUMENTS.UPLOAD,
      formData,
      {
        headers: {
          "Content-Type": undefined,
        },
      }
    );

    return response.data;
  } catch (error) {
    throw normalizeError(error, "Failed to upload document");
  }
};

// ================================
// DELETE DOCUMENT
// ================================
const deleteDocument = async (id) => {
  try {
    const response = await axiosInstance.delete(
      API_PATHS.DOCUMENTS.DELETE_DOCUMENT(id)
    );

    return response.data;
  } catch (error) {
    throw {
      ...(error.response?.data || {}),
      status: error.response?.status,
      message:
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Failed to delete document",
    };
  }
};

// ================================
// GET DOCUMENT BY ID
// ================================
const getDocumentById = async (id) => {
  try {
    const response = await axiosInstance.get(
      API_PATHS.DOCUMENTS.GET_DOCUMENT_BY_ID(id)
    );

    return response.data;
  } catch (error) {
    throw {
      ...(error.response?.data || {}),
      status: error.response?.status,
      message:
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Failed to fetch document details",
    };
  }
};

// ================================
// EXPORT SERVICE
// ================================
const documentService = {
  getDocuments,
  uploadDocument,
  deleteDocument,
  getDocumentById,
};

export default documentService;
