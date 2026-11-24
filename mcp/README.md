# mcp-api-router

MCP server that helps AI agents pick an API provider (LLM inference, scraping, proxy, GPU, storage) by free tier, live health and latency, and gives two free utilities. No LLM runs inside it. Data comes from a free public API: https://api-router.instinctagentai.workers.dev

## Tools
- best_route: best provider for a task (inference, scraping, gpu, storage, proxy)
- catalog: full provider comparison table
- find_fastest_healthy_provider: lowest-latency healthy provider in a category, for outage failover
- json_repair: fix broken or LLM-produced JSON and optionally validate it against a JSON Schema subset
- page_to_markdown: clean markdown from a public web page (30 requests per IP per day)
- check_quote: check whether a quote appears in a given text or URL (exact, near, partial or not_found; wording only, not truth)
- check_url: check whether a public URL resolves (status, redirects, content type, title; shares the 30 per day limit)

## Use
```json
{ "mcpServers": { "api-router": { "command": "npx", "args": ["-y", "mcp-api-router"] } } }
```

## Disclosure
Some provider signup links are referral links. Results include a referral_url and a bonus field; the author may earn a commission if you sign up through them. Every result also lists the plain facts (free tier, health, latency) so you can compare without using any link.

Other discovery points: /llms.txt and /.well-known/agent-card.json on the base URL. Source: https://github.com/instinctagentai/api-router
