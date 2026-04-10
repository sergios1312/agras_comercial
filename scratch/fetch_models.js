
const url = 'https://ffaqsyprvehybfprfmyf.supabase.co/rest/v1/repuestos?select=modelos_compatibles';
const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmYXFzeXBydmVoeWJmcHJmbXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzAwMTYsImV4cCI6MjA4ODA0NjAxNn0.SDEO6LQWaIAYUT_AXJHh02fsUI_FBJhmDGMzF4P-35E';

async function fetchModels() {
  try {
    const r = await fetch(url, { headers: { 'apikey': apiKey, 'Authorization': 'Bearer ' + apiKey } });
    const data = await r.json();
    const models = new Set();
    data.forEach(item => {
      if (item.modelos_compatibles) {
        // Separar por comas e intentar limpiar espacios
        item.modelos_compatibles.split(',').forEach(m => {
          const trimmed = m.trim();
          if (trimmed) models.add(trimmed);
        });
      }
    });
    console.log([...models].sort().map(m => `"${m}"`).join(', '));
  } catch (err) {
    console.error(err);
  }
}

fetchModels();
