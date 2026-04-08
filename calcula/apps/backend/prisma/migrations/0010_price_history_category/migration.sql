-- Price category column for chart markers.
--
-- One of:
--   'C' = Corporate event (earnings, dividend, split, M&A, fundraising)
--   'N' = News (media coverage, industry updates, rumors)
--   'R' = Regulatory (SEBI notices, compliance, penalties)
--   NULL = plain price point, no marker.
--
-- Storefront PriceChart renders a coloured markPoint for any event row
-- that has a category. Existing events (with a note/link but no category)
-- continue to render as the default "plain event" colour until an editor
-- re-tags them.

ALTER TABLE "company_price_history"
    ADD COLUMN IF NOT EXISTS "category" VARCHAR(1);
