import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oenmdpjoxkrlmecofbfg.supabase.co';
const supabaseKey = 'sb_publishable_vRK6vj1BzswjzVINjlcu0g_BJ2s1Sro';

export const supabase = createClient(supabaseUrl, supabaseKey);
