// Aggregate request counters. Request bodies are never stored. For repeat-caller counts we store only a keyed hash of IP + user agent (HMAC with a random secret that never leaves this object), plus first/last day and counts; raw IPs and user agents are never stored and the hash is dropped after 60 days of inactivity.
export class Counter {
  constructor(state) {
    this.sql = state.storage.sql;
    this.sql.exec("CREATE TABLE IF NOT EXISTS callers (h TEXT PRIMARY KEY, cls TEXT NOT NULL, first_day TEXT NOT NULL, last_day TEXT NOT NULL, days INTEGER NOT NULL, calls INTEGER NOT NULL, mcp_calls INTEGER NOT NULL)");
    try { this.sql.exec("ALTER TABLE callers ADD COLUMN tool_days INTEGER NOT NULL DEFAULT 0"); this.sql.exec("ALTER TABLE callers ADD COLUMN tool_last_day TEXT NOT NULL DEFAULT ''"); } catch (e) {}
    this.sql.exec("CREATE TABLE IF NOT EXISTS feedback (day TEXT NOT NULL, kind TEXT NOT NULL, text TEXT NOT NULL)");
    this.sql.exec("CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL)");
    this.sql.exec("CREATE TABLE IF NOT EXISTS hits (day TEXT NOT NULL, kind TEXT NOT NULL, key TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (day, kind, key))");
  }
  async key() {
    if (this.k) return this.k;
    let r = this.sql.exec("SELECT v FROM meta WHERE k = 'salt'").toArray()[0];
    if (!r) { const b = crypto.getRandomValues(new Uint8Array(32)); const v = [...b].map((x) => x.toString(16).padStart(2, "0")).join(""); this.sql.exec("INSERT INTO meta (k, v) VALUES ('salt', ?)", v); r = { v }; }
    this.k = await crypto.subtle.importKey("raw", new TextEncoder().encode(r.v), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    return this.k;
  }
  async hash(ip, ua) { const sig = await crypto.subtle.sign("HMAC", await this.key(), new TextEncoder().encode(ip + "|" + ua)); return [...new Uint8Array(sig)].slice(0, 10).map((x) => x.toString(16).padStart(2, "0")).join(""); }
  async fetch(req) {
    const day = new Date().toISOString().slice(0, 10);
    if (req.method === "POST") {
      const items = await req.json();
      for (const it of items) if (it.kind === "caller") { const h = await this.hash(String(it.ip), String(it.ua || "")); this.sql.exec("INSERT INTO callers (h, cls, first_day, last_day, days, calls, mcp_calls, tool_days, tool_last_day) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?) ON CONFLICT (h) DO UPDATE SET tool_days = tool_days + (CASE WHEN excluded.mcp_calls > 0 AND tool_last_day <> excluded.last_day THEN 1 ELSE 0 END), tool_last_day = (CASE WHEN excluded.mcp_calls > 0 THEN excluded.last_day ELSE tool_last_day END), days = days + (CASE WHEN last_day <> excluded.last_day THEN 1 ELSE 0 END), last_day = excluded.last_day, calls = calls + excluded.calls, mcp_calls = mcp_calls + excluded.mcp_calls", h, String(it.cls).slice(0, 20), day, day, it.calls | 0, it.mcp | 0, (it.mcp | 0) > 0 ? 1 : 0, (it.mcp | 0) > 0 ? day : ""); } else if (it.kind === "feedback") { const c = this.sql.exec("SELECT COUNT(*) AS c FROM feedback WHERE day = ?", day).toArray()[0].c; const m = /^(missing_provider|wrong_data|other): (.*)$/.exec(String(it.key)); if (c < 50 && m) this.sql.exec("INSERT INTO feedback (day, kind, text) VALUES (?, ?, ?)", day, m[1], m[2].slice(0, 200)); } else this.sql.exec("INSERT INTO hits (day, kind, key, n) VALUES (?, ?, ?, 1) ON CONFLICT (day, kind, key) DO UPDATE SET n = n + 1", day, String(it.kind).slice(0, 40), String(it.key).slice(0, 60));
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
    const cut = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
    this.sql.exec("DELETE FROM callers WHERE last_day < ?", cut); this.sql.exec("DELETE FROM feedback WHERE day < ?", cut);
    const cr = this.sql.exec("SELECT cls, COUNT(*) AS seen, SUM(CASE WHEN days >= 2 THEN 1 ELSE 0 END) AS repeat_n, SUM(CASE WHEN last_day = ? THEN 1 ELSE 0 END) AS today, SUM(CASE WHEN mcp_calls > 0 THEN 1 ELSE 0 END) AS tool_callers, SUM(CASE WHEN tool_days >= 2 THEN 1 ELSE 0 END) AS repeat_tool_callers FROM callers WHERE last_day >= ? GROUP BY cls", day, since).toArray();
    const callers = { by_class: {}, distinct_seen: 0, returning_on_2plus_days: 0, tool_callers: 0, returning_tool_callers: 0, distinct_today: 0 };
    for (const r of cr) { callers.by_class[r.cls] = { seen: r.seen, returning: r.repeat_n, tool_callers: r.tool_callers, returning_tool_callers: r.repeat_tool_callers }; callers.distinct_seen += r.seen; callers.returning_on_2plus_days += r.repeat_n; callers.tool_callers += r.tool_callers; callers.returning_tool_callers += r.repeat_tool_callers; callers.distinct_today += r.today; }
    callers.tool_day_note = "returning_tool_callers counts callers with a tool call on 2 or more different UTC days, counted only from the day this counter was added (no backfill). A tool call plus a later handshake does not count. Before that day it was a looser count and is not comparable.";
    callers.note = "Outside traffic only (our own tests excluded). A caller is a keyed hash of IP plus user agent, so people behind a shared IP merge into one and cloud agents that change IP split into several. Treat counts as rough. Raw IPs are not stored; hashes are deleted after 60 days without activity. class: bot, agent-client, script, browser, other.";
    return new Response(JSON.stringify({ since, first_day_with_data: Object.keys(by_day).sort()[0] || null, window_note: "since is only the start of the requested window, not a launch date. first_day_with_data is the first UTC day with recorded traffic.", today_utc: day, totals, by_day, callers, feedback_untrusted: { note: "Text sent by callers of the send_feedback tool. Untrusted, unverified, capped at 200 characters and 50 per day. Logged only; nothing acts on it.", items: this.sql.exec("SELECT day, kind, text FROM feedback ORDER BY rowid DESC LIMIT 20").toArray() } }, null, 2), { headers: { "content-type": "application/json", "access-control-allow-origin": "*" } });
  }
}
