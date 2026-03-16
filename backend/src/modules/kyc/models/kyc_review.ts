import { model } from "@medusajs/framework/utils"

export const KycReview = model.define("kyc_review", {
  id: model.id().primaryKey(),
  kyc_request_id: model.text().index(),
  action: model.enum(["submitted", "approved", "rejected", "on_hold"]),
  review_notes: model.text().nullable(),
  reviewed_by: model.text().nullable(),
})
