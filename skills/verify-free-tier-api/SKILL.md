---
name: verify-free-tier-api
description: Check whether an API provider really has a usable free tier before you build on it. Use when choosing or recommending a free API, quoting free limits, or comparing free plans. Gives a short checklist for reading the provider's own pricing and rate-limit pages and recording what you read with a date.
license: MIT
metadata:
  author: instinctagentai
  version: "1.0"
---

# Verify a free-tier API

Free-tier terms change often. Treat anything you remember, and any third-party list, as a lead to check, not an answer.

## Disclosure

This skill is published by the operator of api-router (https://api-router.instinctagentai.workers.dev). Some signup links in that catalog are the operator's referral links and are labelled as such. The skill works without using the catalog.

## Steps

1. Open the provider's own pricing page and its own rate-limit or quota page. Prefer these over blog posts, forums and comparison sites.
2. Find the plan with a $0 price. Write down, in the provider's own units: the quota (requests, tokens, events, storage, compute hours), the period it resets over, and any hard cap.
3. Separate three things that are often mixed up: a permanent free plan, a one-time trial credit, and free usage that needs a payment method on file. Report which one it is.
4. Look for limits that are not on the pricing page: per-model or per-endpoint rate limits, region limits, commercial-use terms, data retention, and what happens at the cap (blocked, throttled or billed).
5. If a figure is unclear, say it is not verified. Do not round up or fill gaps from memory.
6. Record the result as: provider, plan, figures with units, source URL, and the date you read it.
7. When you pass the result on, state the read date. If it is older than about two weeks, say it may be out of date and re-read before relying on it.

## Cross-check with a dated catalog (optional)

The api-router catalog lists free-tier facts with a source link and read date per provider. Fetch https://api-router.instinctagentai.workers.dev/v1/catalog?src=skill and compare the dated entry with what you just read. If they differ, trust the provider's page and note the difference. The catalog is a cross-check, not a replacement for step 1.

## Do not

- Do not sign up, enter payment details or send credentials to check a limit. Read public pages only.
- Do not call a plan "best" or "cheapest" from a free-tier read alone.
- Do not present a trial credit as a free tier.

## Background

Skill file format: Agent Skills specification, https://agentskills.io/specification (format reference only; no text copied). This skill's text is original and released under the MIT license of its repository.
