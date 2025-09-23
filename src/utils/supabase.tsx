import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './supabase/info';

// Initialize Supabase client for frontend operations
export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);

export default supabase;