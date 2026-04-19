import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function debug() {
  console.log('--- Debugging Supabase Data ---');
  
  const { data: categories, error: catError } = await supabase
    .from('service_categories')
    .select('*');
    
  console.log('Categories:', categories);
  if (catError) console.error('Category Error:', catError);

  const { data: services, error: servError } = await supabase
    .from('services')
    .select('*')
    .limit(5);

  console.log('Services (limit 5):', services);
  if (servError) console.error('Service Error:', servError);
}

debug();
