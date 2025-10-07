/**
 * Utility functions for handling authentication
 */

/**
 * Get authentication headers for API requests
 * @returns {Object} Headers object with Authorization if token exists
 */
export const getAuthHeaders = () => {
  const headers = { "Content-Type": "application/json" };
  
  try {
    const authData = localStorage.getItem("revibe_auth");
    if (authData) {
      const parsed = JSON.parse(authData);
      if (parsed.access_token) {
        headers.Authorization = `Bearer ${parsed.access_token}`;
      }
    }
  } catch (error) {
    console.error("Error getting auth token:", error);
  }
  
  return headers;
};

/**
 * Get the access token from localStorage
 * @returns {string|null} Access token or null if not found
 */
export const getAccessToken = () => {
  try {
    const authData = localStorage.getItem("revibe_auth");
    if (authData) {
      const parsed = JSON.parse(authData);
      return parsed.access_token || null;
    }
  } catch (error) {
    console.error("Error getting access token:", error);
  }
  return null;
};

/**
 * Check if user is authenticated
 * @returns {boolean} True if user has valid token
 */
export const isAuthenticated = () => {
  return !!getAccessToken();
};

