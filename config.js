// Load public browser connection info from config.json when available.
// This file is now loaded as an ES module so we can await the fetch
// and ensure `window.APP_CONFIG` is populated before `app.js` runs.
window.APP_CONFIG = {
  // Defaults in case loading the JSON fails.
  supabaseUrl: "",
  supabaseAnonKey: "",
  api: {
    stocks: "/api/stocks",
    officialIr: "/api/ir",
    edinetSync: "/api/edinet/sync",
  },
  edinet: {
    historyDays: 400,
    batchDays: 31,
  },
};

try {
  const resp = await fetch("/config.json");
  if (resp.ok) {
    const data = await resp.json();
    const supabase = data.supabase ?? {};
    const api = data.api ?? {};
    const edinet = data.edinet ?? {};
    window.APP_CONFIG.supabaseUrl = supabase.url ?? window.APP_CONFIG.supabaseUrl;
    window.APP_CONFIG.supabaseAnonKey = supabase.key ?? window.APP_CONFIG.supabaseAnonKey;
    window.APP_CONFIG.api.stocks = api.stocks ?? window.APP_CONFIG.api.stocks;
    window.APP_CONFIG.api.officialIr = api.officialIr ?? window.APP_CONFIG.api.officialIr;
    window.APP_CONFIG.api.edinetSync = api.edinetSync ?? window.APP_CONFIG.api.edinetSync;
    window.APP_CONFIG.edinet.historyDays = edinet.historyDays ?? window.APP_CONFIG.edinet.historyDays;
    window.APP_CONFIG.edinet.batchDays = edinet.batchDays ?? window.APP_CONFIG.edinet.batchDays;
  }
} catch (e) {
  // ignore — keep defaults
}
