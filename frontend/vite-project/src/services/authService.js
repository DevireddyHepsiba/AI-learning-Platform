import axiosInstance from "../utils/axiosinstance.js";
import { API_PATHS } from "../utils/apiPath.js";

// ================================
// LOGIN
// ================================
const login = async (email, password) => {
  try {
    const response = await axiosInstance.post(API_PATHS.AUTH.LOGIN, {
      email,
      password,
    });

    return response.data?.data || response.data;
  } catch (error) {
    throw {
      ...(error.response?.data || {}),
      status: error.response?.status,
      message:
        error.response?.data?.message ||
        error.response?.data?.error ||
        "An unknown error occurred",
    };
  }
};

// ================================
// REGISTER
// ================================
const register = async (username, email, password) => {
  try {
    const response = await axiosInstance.post(API_PATHS.AUTH.REGISTER, {
      username,
      email,
      password,
    });

    return response.data?.data || response.data;
  } catch (error) {
    throw {
      ...(error.response?.data || {}),
      status: error.response?.status,
      message:
        error.response?.data?.message ||
        error.response?.data?.error ||
        "An unknown error occurred",
    };
  }
};

// ================================
// GET PROFILE
// ================================
const getProfile = async () => {
  try {
    const response = await axiosInstance.get(
      API_PATHS.AUTH.GET_PROFILE
    );

    return response.data;
  } catch (error) {
    throw {
      ...(error.response?.data || {}),
      status: error.response?.status,
      message: "An unknown error occurred",
    };
  }
};

// ================================
// UPDATE PROFILE
// ================================
const updateProfile = async (userData) => {
  try {
    const response = await axiosInstance.put(
      API_PATHS.AUTH.UPDATE_PROFILE,
      userData
    );

    return response.data;
  } catch (error) {
    throw error.response?.data || {
      message: "An unknown error occurred",
    };
  }
};

// ================================
// CHANGE PASSWORD
// ================================
const changePassword = async (passwords) => {
  try {
    const response = await axiosInstance.post(
      API_PATHS.AUTH.CHANGE_PASSWORD,
      passwords
    );

    return response.data;
  } catch (error) {
    throw error.response?.data || {
      message: "An unknown error occurred",
    };
  }
};

export {
  login,
  register,
  getProfile,
  updateProfile,
  changePassword,
};

export default {
  login,
  register,
  getProfile,
  updateProfile,
  changePassword,
};
