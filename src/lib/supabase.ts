import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zetnludhohdsxqlfnjsd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpldG5sdWRob2hkc3hxbGZuanNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNTkxMDUsImV4cCI6MjA4NTczNTEwNX0.TA5idwAw_q00UxFJv56h7LMSsBi1DKDQVsC5TRP57ro';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
