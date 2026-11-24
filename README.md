# api-router

Free JSON API and MCP server that compares AI and developer APIs (LLM inference, scraping, proxies, GPU) by free tier, health and latency. Links are signup links; some may become referral links. No LLM runs in the request path.

- GET /v1/catalog
- GET /v1/best-route?task=inference|scraping|gpu|storage|proxy&budget=low|fast
- GET /v1/health-route?category=llm|scraping|proxy|gpu
- MCP: `npx mcp-api-router` (tools: best_route, catalog, find_fastest_healthy_provider)

Daily benchmark: benchmarks/latest.md
