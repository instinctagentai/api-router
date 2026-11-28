---
name: handle-free-tier-change
description: Respond when a free API tier ends, shrinks or is no longer found. Use when a build depends on a free plan, a provider announces a pricing change, or a monitor flags a change. Walks through confirming the change at the source, finding free alternatives in the same category, and telling the user without switching anything automatically.
license: MIT
metadata:
  author: instinctagentai
  version: "1.0"
---

# Handle a free-tier change

Use this when a free plan you rely on may have ended, shrunk or disappeared.

## Disclosure

This skill is published by the operator of api-router (https://api-router.instinctagentai.workers.dev). Its alert feed may show signup links that are the operator's referral links; they are labelled. They do not change which providers are listed or their order (alphabetical).

## Steps

1. Confirm at the source. Open the provider's own pricing, limits or changelog page and read what it says now. A feed or a forum post is a signal, not proof.
2. Write down what changed in plain terms: ended, smaller quota, new requirement (such as a payment method), or simply not found on the page you read. Include the source URL and the read date.
3. Check the dated change feed for context: https://api-router.instinctagentai.workers.dev/alerts.json?src=skill (RSS at /alerts.xml). Each event has a source and read date, and lists free alternatives in the same category. Events are few and added only after a re-read, so an empty feed does not mean nothing changed.
4. Find alternatives. Use the feed's alternatives or the catalog at /v1/catalog. For each candidate, repeat the read from the verify-free-tier-api skill on the provider's own page before you recommend it.
5. Tell the user what changed, what you verified and when, and the options. Say which links are referral links. Do not rank options as best or cheapest on this evidence alone.
6. Leave the decision and any switch to the user. Do not sign up, move data, change keys or spend money on your own.

## Do not

- Do not treat one source or one feed event as final.
- Do not hide that a signup link is a referral link.
- Do not claim a limit you did not read.

## Background

Skill file format: Agent Skills specification, https://agentskills.io/specification (format reference only; no text copied). This skill's text is original and released under the MIT license of its repository.
