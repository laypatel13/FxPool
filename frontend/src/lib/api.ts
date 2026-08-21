import axios from "axios";
import { supabase } from "./supabase";

// Matches app.include_router(api_router, prefix="/api/v1") in fxpool-backend/app/main.py
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Every FastAPI route (see app/api/deps.py) expects the Supabase access
// token as `Authorization: Bearer <token>` — attach it to every request.
api.interceptors.request.use(async (config) => {
  if (!supabase) return config;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
