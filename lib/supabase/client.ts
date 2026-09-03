"use client";
import { createBrowserClient } from "@supabase/ssr";
import { requireSupabaseConfig } from "./config";
import type { Database } from "@/types/database.generated";
export function createClient(){const {url,anonKey}=requireSupabaseConfig();return createBrowserClient<Database>(url,anonKey);}
