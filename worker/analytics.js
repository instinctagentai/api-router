// Anonymous aggregate summary of agent use. Built only from the counter's stored aggregates: no IPs, no request text.
const pick = (o, pre) => Object.entries(o || {}).filter(([k]) => k.startsWith(pre)).map(([k, n]) => [k.slice(pre.length), n]).sort((a, b) => b[1] - a[1]);
const obj = (l) => Object.fromEntries(l);
const sum = (l) => l.reduce((s, [, n]) => s + n, 0);
export function summarize(st) {
  const days = Object.keys(st.by_day || {}).sort().reverse();
  const per = days.map((d) => {
    const x = st.by_day[d], mcp = x["mcp:outside"] || {};
    const tools = pick(mcp, "tool:"), errs = pick(mcp, "toolerr:"), topics = pick(mcp, "arg:").concat(pick(mcp, "topic:")), unk = pick(mcp, "unknown_tool:"), zero = pick(mcp, "zero:");
    return { day: d, tool_calls: sum(tools), tools: obj(tools), tool_errors: obj(errs), rate_limited_429: sum(errs.filter(([k]) => k.endsWith(":429"))), zero_match_searches: sum(zero), unknown_tool_names: obj(unk), topics: obj(topics), clients: x["client:outside"] || {}, tool_call_clients: undefined, affiliate_clicks: sum(Object.entries(x["click:outside"] || {})), source_tags: x["src"] || {} };
  });
  const t = st.totals || {}, mcpT = t["mcp:outside"] || {};
  const totTools = pick(mcpT, "tool:");
  const c = st.callers || {};
  const today = per[0];
  const line = today ? `Agent use ${today.day} UTC (outside traffic, anonymous): ${today.tool_calls} tool calls` + (today.tool_calls ? ` (top: ${Object.entries(today.tools).slice(0, 3).map(([k, n]) => k + " " + n).join(", ")})` : "") + `, ${sum(Object.entries(today.tool_errors))} tool errors (${today.rate_limited_429} rate limited), ${today.zero_match_searches} searches with no match, ${sum(Object.entries(today.unknown_tool_names))} unknown tool names. Repeat tool callers (2+ days): ${c.returning_tool_callers || 0}.` : "No agent traffic recorded in the window.";
  return {
    note: "Aggregates only. No IPs, no user agents and no request text are stored or shown. Counts cover outside traffic (our own tests excluded). Callers are keyed hashes, so shared IPs merge and changing IPs split; treat as rough. Topics are catalog categories or fixed task names, never free text. Tool-error and zero-match counters start the day they were added (no backfill).",
    window_days: days.length, since: st.since, daily_line: line,
    per_day: per.map(({ tool_call_clients, ...r }) => r),
    totals: { tool_calls: sum(totTools), by_tool: obj(totTools), tool_errors: obj(pick(mcpT, "toolerr:")), zero_match_searches: sum(pick(mcpT, "zero:")), unknown_tool_names: obj(pick(mcpT, "unknown_tool:")), topics: obj(pick(mcpT, "arg:").concat(pick(mcpT, "topic:"))), source_tags: t["src"] || {}, clients: t["client:outside"] || {} },
    callers: { distinct_seen: c.distinct_seen || 0, tool_callers: c.tool_callers || 0, returning_on_2plus_days: c.returning_on_2plus_days || 0, returning_tool_callers: c.returning_tool_callers || 0, by_class: c.by_class || {} },
    metric_rule: "Say no confirmed repeat tool use unless returning_tool_callers is 1 or more.",
  };
}
