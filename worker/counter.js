// Aggregate request counters only. No IPs, no user agents, no request bodies are stored: just day + kind + key + count.
export class Counter {
  constructor(state) {
    this.sql = state.storage.sql;
    this.sql.exec("CREATE TABLE IF NOT EXISTS hits (day TEXT NOT NULL, kind TEXT NOT NULL, key TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (day, kind, key))");
  }
  async fetch(req) {
    const day = new Date().toISOString().slice(0, 10);
    if (req.method === "POST") {
      const items = await req.json();
      for (const it of items) this.sql.exec("INSERT INTO hits (day, kind, key, n) VALUES (?, ?, ?, 1) ON CONFLICT (day, kind, key) DO UPDATE SET n = n + 1", day, String(it.kind).slice(0, 40), String(it.key).slice(0, 60));
      return new Response("ok");
    }
    const days = Math.min(Math.max(parseInt(new URL(req.url).searchParams.get("days") || "14", 10) || 14, 1), 60);
    const since = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10);
    const rows = this.sql.exec("SELECT day, kind, key, n FROM hits WHERE day >= ? ORDER BY day DESC", since).toArray();
    const by_day = {}, totals = {};
    for (const r of rows) {
      ((by_day[r.day] ||= {})[r.kind] ||= {})[r.key] = r.n;
      (totals[r.kind] ||= {})[r.key] = (totals[r.kind][r.key] || 0) + r.n;
    }
    return new Response(JSON.stringify({ since, today_utc: day, totals, by_day }, null, 2), { headers: { "content-type": "application/json", "access-control-allow-origin": "*" } });
  }
}
