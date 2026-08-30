import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_API_URL,
  withCredentials: true,
});

// Share links authorize document operations through their `access` query value.
// Keep this in one place so every document endpoint receives the same credential,
// including content, collaboration, assets, and access-management requests.
api.interceptors.request.use((config) => {
  const isDocumentRequest = /^(?:\/)?documents(?:\/|$)/.test(config.url || "");
  const accessToken = typeof window === "undefined"
    ? null
    : new URLSearchParams(window.location.search).get("access");

  if (isDocumentRequest && accessToken) {
    config.params = { ...config.params, access: accessToken };
  }

  return config;
});

export default api;
