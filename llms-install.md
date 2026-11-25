# Install mcp-api-router (for AI agents)

mcp-api-router is a free MCP server. It needs no API key and no environment variables.

## Option 1: local (stdio)

Add this to the MCP settings:

```json
{
  "mcpServers": {
    "api-router": {
      "command": "npx",
      "args": ["-y", "mcp-api-router"]
    }
  }
}
```

Node 18 or newer is needed. The server talks to https://api-router.instinctagentai.workers.dev. Nothing else to install.

## Option 2: remote (streamable HTTP, no auth)

URL: https://api-router.instinctagentai.workers.dev/mcp

## Check that it works

Call the tool `json_repair` with `{"text": "{a:1,}"}`. It returns repaired JSON. Other tools: best_route, catalog, find_fastest_healthy_provider, page_to_markdown, check_quote, check_url, check_email, convert_time, convert_units, convert_currency.

## Notes

- Some provider links in results are referral links of the operator. They are labelled in the referral_url field.
- page_to_markdown, check_url, check_email and convert_currency share a limit of 30 requests per IP per day.
- Source: https://github.com/instinctagentai/api-router
