import axios from "axios";

// Configure base URL for API calls with fallback logic
const getAPIBaseURL = () => {
  // Check if we're in production
  const isProduction =
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1";

  if (isProduction) {
    // In production, use the production backend URL
    return (
      process.env.REACT_APP_API_URL ||
      "https://my-fund-request-app.vercel.app/api"
    );
  } else {
    // In development, use localhost
    return process.env.REACT_APP_API_URL || "http://localhost:5000/api";
  }
};

const API_BASE_URL = getAPIBaseURL();

// Debug logging for environment detection
console.log(
  `🌍 Frontend Environment: ${process.env.REACT_APP_ENV || "development"}`
);
console.log(`🏠 Hostname: ${window.location.hostname}`);
console.log(`🔗 API Base URL: ${API_BASE_URL}`);
console.log(
  `🔑 API URL from env: ${process.env.REACT_APP_API_URL || "not set"}`
);

// Create axios instance with default configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 45000, // 45 seconds timeout (increased to accommodate email processing)
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error("API Request Error:", error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error("API Response Error:", error.response?.data || error.message);
    console.error("Full error details:", {
      status: error.response?.status,
      url: error.config?.url,
      method: error.config?.method,
      baseURL: error.config?.baseURL,
    });

    // Handle network errors
    if (error.code === "ECONNABORTED") {
      throw new Error("Request timeout - please try again");
    }

    if (!error.response) {
      console.error(
        "Network error occurred - checking connection to:",
        API_BASE_URL
      );
      throw new Error("Network error - please check your connection");
    }

    // Handle HTTP errors
    const { status, data } = error.response;
    const message = data?.error || data?.message || `HTTP ${status} Error`;

    throw new Error(message);
  }
);

// API functions
export const fundRequestAPI = {
  // Create a new fund request
  async create(requestData) {
    try {
      const response = await api.post("/fund-requests", requestData);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create fund request: ${error.message}`);
    }
  },

  // Get fund request by ID
  async getById(id) {
    try {
      const response = await api.get(`/fund-requests/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch fund request: ${error.message}`);
    }
  },

  // Get all fund requests (admin)
  async getAll(params = {}) {
    try {
      const response = await api.get("/fund-requests", { params });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch fund requests: ${error.message}`);
    }
  },

  // Resend approval email
  async resendApproval(id) {
    try {
      const response = await api.post(`/fund-requests/${id}/resend-approval`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to resend approval email: ${error.message}`);
    }
  },
};

export const approvalAPI = {
  // Get request details by approval token
  async getByToken(token) {
    try {
      const response = await api.get(`/approvals/${token}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch approval details: ${error.message}`);
    }
  },

  // Approve or deny a request
  async processApproval(token, action, approverData) {
    try {
      const response = await api.post(
        `/approvals/${token}/${action}`,
        approverData
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to ${action} request: ${error.message}`);
    }
  },

  // Get approval status
  async getStatus(token) {
    try {
      const response = await api.get(`/approvals/${token}/status`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get approval status: ${error.message}`);
    }
  },
};

// Health check
export const healthAPI = {
  async check() {
    try {
      const response = await api.get("/health");
      return response.data;
    } catch (error) {
      throw new Error(`Health check failed: ${error.message}`);
    }
  },
};

export default api;
