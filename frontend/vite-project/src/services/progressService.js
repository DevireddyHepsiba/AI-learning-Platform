import axiosInstance from "../utils/axiosinstance";
import { API_PATHS } from "../utils/apiPath";
import { normalizeError } from "./errorHandler";

// ================================
// GET DASHBOARD DATA
// ================================
const getDashboardData = async () => {
  try {
    const response = await axiosInstance.get(
      API_PATHS.PROGRESS.GET_DASHBOARD
    );

    return response.data;
  } catch (error) {
    throw normalizeError(error, "Failed to fetch dashboard data");
  }
};

// ================================
// EXPORT SERVICE
// ================================
const progressService = {
  getDashboardData,
};

export default progressService;
