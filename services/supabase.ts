import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oenmdpjoxkrlmecofbfg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9lbm1kcGpveGtybG1lY29mYmZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5MDc3NjksImV4cCI6MjA4MTQ4Mzc2OX0.NgrM2Aldww_IlGsBIS9WD8kSrF4Ww_2ZUjOxVvJrjtY';

export const supabase = createClient(supabaseUrl, supabaseKey);
