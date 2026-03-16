import { model } from "@medusajs/framework/utils"

export const KycRequest = model.define("kyc_request", {
  id: model.id().primaryKey(),
  customer_id: model.text().index(),
  pan_number: model.text(),
  aadhaar_number: model.text(),
  dp_name: model.text(),
  demat_number: model.text(),
  pan_file_url: model.text(),
  cmr_file_url: model.text(),
  status: model.enum(["pending", "approved", "rejected", "on_hold"]).default("pending"),
})
