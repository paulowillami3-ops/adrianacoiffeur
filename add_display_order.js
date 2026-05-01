import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
    console.log("Attempting to run execute_sql...");
    const { error: rpcError } = await supabase.rpc('execute_sql', { sql: "ALTER TABLE subscription_plans ADD COLUMN display_order INTEGER DEFAULT 0;" });
    console.log("RPC Error:", rpcError);
}
run();
