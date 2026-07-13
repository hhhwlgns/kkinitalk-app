import axios from 'axios';

const baseURL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://kkinitalk.local/api/v1';

export const apiClient = axios.create({
  baseURL,
  timeout: 10_000,
});
