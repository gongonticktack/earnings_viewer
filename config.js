// Load Supabase connection info from supabase-config.json when available.
// This file is now loaded as an ES module so we can await the fetch
// and ensure `window.APP_CONFIG` is populated before `app.js` runs.
window.APP_CONFIG = {
  // Defaults in case loading the JSON fails.
  supabaseUrl: "",
  supabaseAnonKey: "",
};

try {
  const resp = await fetch("/supabase-config.json");
  if (resp.ok) {
    const data = await resp.json();
    const supabase = data.supabase ?? {};
    window.APP_CONFIG.supabaseUrl = supabase.url ?? window.APP_CONFIG.supabaseUrl;
    window.APP_CONFIG.supabaseAnonKey = supabase.key ?? window.APP_CONFIG.supabaseAnonKey;
  }
} catch (e) {
  // ignore — keep defaults
}
