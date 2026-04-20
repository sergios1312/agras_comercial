
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load .env.local
const envConfig = dotenv.parse(fs.readFileSync(path.join(__dirname, '..', '.env.local')));

const supabase = createClient(
  envConfig.NEXT_PUBLIC_SUPABASE_URL,
  envConfig.SUPABASE_SERVICE_ROLE_KEY
);

async function listEquipos() {
  const { data, error } = await supabase
    .from('casos')
    .select('equipo');

  if (error) {
    console.error("Error fetching equipos:", error);
    return;
  }

  const equipos = [...new Set(data.map(d => d.equipo).filter(Boolean))].sort();
  console.log("EQUIPOS_LIST:");
  console.log(equipos.join(", "));
}

listEquipos();
