const { createClient } = require('@supabase/supabase-js');
const url = 'https://ouibliztkabuhatlpmnj.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91aWJsaXp0a2FidWhhdGxwbW5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MjE1NDQsImV4cCI6MjA4NzQ5NzU0NH0.eexkvwA9jWGFrsSqm0j_Vc6fmmZ-EpVJIwgcsHnl5EU';
const supabase = createClient(url, key);

async function main() {
    console.log("Connecting...");
    const { data: yieldVars, error: err1 } = await supabase.from('scada_points')
        .select('var_name, display_name')
        .ilike('var_name', '%Yield%');
    if (err1) console.error("Err:", err1);
    else console.log("Yield Vars:", yieldVars.map(v => v.var_name));

    const { data: revVars, error: err2 } = await supabase.from('scada_points')
        .select('var_name, display_name')
        .ilike('var_name', '%Revenue%');
    if (err2) console.error("Err:", err2);
    else console.log("Revenue Vars:", revVars.map(v => v.var_name));

    // Also try checking for Monthly
    const { data: monthVars, error: err3 } = await supabase.from('scada_points')
        .select('var_name, display_name')
        .ilike('var_name', '%Month%');
    if (!err3 && monthVars) console.log("Month Vars:", monthVars.map(v => v.var_name));

    // Also try Hourly
    const { data: hourVars, error: err4 } = await supabase.from('scada_points')
        .select('var_name, display_name')
        .ilike('var_name', '%Hour%');
    if (!err4 && hourVars) console.log("Hour Vars:", hourVars.map(v => v.var_name));
}
main();
