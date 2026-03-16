import { model, Module, MedusaService } from "@medusajs/framework/utils"

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

export const KycReview = model.define("kyc_review", {
  id: model.id().primaryKey(),
  kyc_request_id: model.text().index(),
  action: model.enum(["submitted", "approved", "rejected", "on_hold"]),
  review_notes: model.text().nullable(),
  reviewed_by: model.text().nullable(),
})

class KycModuleService {
  constructor(container: any) {}
}

export default Module("kyc", {
  service: KycModuleService,
})
