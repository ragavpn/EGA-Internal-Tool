/* Simple KV helper - table name and behavior are configurable via env. */

import { createClient } from "@supabase/supabase-js";

const getEnv = (key: string): string | undefined => {
  // Support Deno.globalThis.Deno.env and Node process.env
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyGlobal: any = typeof globalThis !== 'undefined' ? globalThis : undefined;
  if (anyGlobal && typeof anyGlobal.Deno !== 'undefined' && anyGlobal.Deno?.env?.get) {
    return anyGlobal.Deno.env.get(key);
  }
  return process?.env?.[key];
};

// Table name controlled via KV_TABLE_NAME env var so the table can be migrated
// or recreated in other projects without editing source code.
export const KV_TABLE = (getEnv('KV_TABLE_NAME') || 'kv_store_354d5d14').trim();

const client = () => createClient(
  getEnv("SUPABASE_URL") ?? "",
  getEnv("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

// Defensive guard to optionally prevent auto-seeding during builds/dev.
const PREVENT_AUTO_SEED = (getEnv('PREVENT_AUTO_SEED') || '').toLowerCase() === 'true';
const sampleEmployeePattern = /^EMP0\d+$/i;
const sampleDeviceIds = new Set(['HP-001', 'CBS-002', 'CNC-003', 'COMP-004', 'WS-005']);

// Set stores a key-value pair in the database.
export const set = async (key: string, value: any): Promise<void> => {
  const supabase = client();
  try {
    if (PREVENT_AUTO_SEED) {
      if (key.startsWith('user:')) {
        const emp = value?.employeeId || key.replace(/^user:/, '');
        if (emp && sampleEmployeePattern.test(emp)) {
          console.log('[kv_store] PREVENT_AUTO_SEED active; skipping sample user insert:', key);
          return;
        }
      }

      if (key.startsWith('device:')) {
        const ident = value?.identificationNumber;
        if (ident && sampleDeviceIds.has(ident)) {
          console.log('[kv_store] PREVENT_AUTO_SEED active; skipping sample device insert:', key, ident);
          return;
        }
      }
    }
  } catch (guardErr) {
    console.log('Error in PREVENT_AUTO_SEED guard:', guardErr);
  }

  const { error } = await supabase.from(KV_TABLE as any).upsert({ key, value });
  if (error) {
    throw new Error(error.message);
  }
};

// Get retrieves a key-value pair from the database.
export const get = async (key: string): Promise<any> => {
  const supabase = client();
  const { data, error } = await supabase.from(KV_TABLE as any).select("value").eq("key", key).maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data?.value;
};

// Delete deletes a key-value pair from the database.
export const del = async (key: string): Promise<void> => {
  const supabase = client();
  const { error } = await supabase.from(KV_TABLE as any).delete().eq("key", key);
  if (error) {
    throw new Error(error.message);
  }
};

// Sets multiple key-value pairs in the database.
export const mset = async (keys: string[], values: any[]): Promise<void> => {
  const supabase = client();
  const { error } = await supabase.from(KV_TABLE as any).upsert(keys.map((k, i) => ({ key: k, value: values[i] })));
  if (error) {
    throw new Error(error.message);
  }
};

// Gets multiple key-value pairs from the database.
export const mget = async (keys: string[]): Promise<any[]> => {
  const supabase = client();
  const { data, error } = await supabase.from(KV_TABLE as any).select("value").in("key", keys);
  if (error) {
    throw new Error(error.message);
  }
  return (data as Array<{ value: any }> | undefined)?.map((d) => d.value) ?? [];
};

// Deletes multiple key-value pairs from the database.
export const mdel = async (keys: string[]): Promise<void> => {
  const supabase = client();
  const { error } = await supabase.from(KV_TABLE as any).delete().in("key", keys);
  if (error) {
    throw new Error(error.message);
  }
};

// Search for key-value pairs by prefix.
export const getByPrefix = async (prefix: string): Promise<any[]> => {
  const supabase = client();
  const { data, error } = await supabase.from(KV_TABLE as any).select("key, value").like("key", prefix + "%");
  if (error) {
    throw new Error(error.message);
  }
  // Return only values for compatibility with existing callers
  return (data as Array<{ key: string; value: any }> | undefined)?.map((d) => d.value) ?? [];
};

// Returns both key and value for callers that need to delete by exact key name
export const getByPrefixWithKeys = async (prefix: string): Promise<Array<{ key: string; value: any }>> => {
  const supabase = client();
  const { data, error } = await supabase.from(KV_TABLE as any).select("key, value").like("key", prefix + "%");
  if (error) {
    throw new Error(error.message);
  }
  return (data as Array<{ key: string; value: any }> | undefined) ?? [];
};