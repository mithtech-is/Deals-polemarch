# Phase 1 Scope (Very Basic Features)

## Goal
Ship a stable minimal product with working auth, company master, and financial statement read/write basics.

## Must-have backend

1. Health endpoint
2. Auth (login + JWT)
3. Companies CRUD (minimal fields)
4. Financial periods create/list
5. Financial line items list by statement type (tree + flat)
6. Financial metrics upsert/list by company + period

## Must-have frontend

1. Login page
2. Company list + create company
3. Company detail page
4. Basic statement editor (table inputs) for one period
5. Save + reload flow

## DB baseline

Use legacy SQL as reference in `reference/sql/` but create a trimmed migration set for Phase 1 only.

## Non-goals for Phase 1

- Quant analytics
- Market microstructure visualizations
- Webhooks/API key platform
- Deep ingestion automation
- Advanced taxonomy standard mapping UI

## Success criteria

- New user logs in
- Creates a company
- Creates fiscal period
- Adds/edits 5-10 financial values
- Reload shows persisted values correctly
