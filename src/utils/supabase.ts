import { createClient } from '@supabase/supabase-js';

const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env || {};
const supabaseUrl = metaEnv.VITE_SUPABASE_URL || 'https://jikokwwioejqerqsgzfs.supabase.co';
const supabaseKey = metaEnv.VITE_SUPABASE_PUBLISHABLE_KEY || metaEnv.VITE_SUPABASE_ANON_KEY || 'sb_publishable_hH6Pr7ZtzRE5_qMPlQJDYA_Dice0hWM';

export const supabase = createClient(supabaseUrl, supabaseKey);
