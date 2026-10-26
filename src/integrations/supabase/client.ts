// This file configures the Supabase client with verified project credentials.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { brokeredPreviewStorage } from './previewAuthStorage';

const DEFAULT_SUPABASE_Project_ID = "vfbxyldwtjwwecpbgezu";
const DEFAULT_SUPABASE_URL = "https://vfbxyldwtjwwecpbgezu.supabase.co";
const DEFAULT_SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmYnh5bGR3dGp3d2VjcGJnZXp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5MTQ2ODksImV4cCI6MjA5NTQ5MDY4OX0.8e2Xl0Iucs46JmfFe6zDldFivrqeR8aswOT6GEx1XzE";

function resolveSupabaseUrl(raw?: string): string {
  const cleaned = (raw || "").trim().replace(/^["']|["']$/g, "");
  if (
    cleaned.startsWith("https://") &&
    cleaned.includes(".supabase.co") &&
    cleaned.includes(DEFAULT_SUPABASE_Project_ID)
  ) {
    return cleaned;
  }
  return DEFAULT_SUPABASE_URL;
}

function resolveSupabaseKey(raw?: string): string {
  const cleaned = (raw || "").trim().replace(/^["']|["']$/g, "");
  const parts = cleaned.split(".");
  if (parts.length === 3 && cleaned.startsWith("eyJ")) {
    try {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
      if (payload?.ref === DEFAULT_SUPABASE_Project_ID && payload?.role === "anon") {
        return cleaned;
      }
    } catch {
      // Fallback to verified key below
    }
  }
  return DEFAULT_SUPABASE_KEY;
}

export const SUPABASE_URL = resolveSupabaseUrl(import.meta.env.VITE_SUPABASE_URL);
export const SUPABASE_PUBLISHABLE_KEY = resolveSupabaseKey(
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: brokeredPreviewStorage(),
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
    },
  },
});