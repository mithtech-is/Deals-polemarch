import { model } from "@medusajs/framework/utils"

export const Notification = model.define("notification", {
  id: model.id().primaryKey(),
  customer_id: model.text().index(),
  type: model.enum([
    "KYC_SUBMITTED",
    "KYC_APPROVED",
    "KYC_REJECTED",
    "ORDER_CREATED",
    "PAYMENT_CONFIRMED",
    "SHARES_DELIVERED"
  ]),
  title: model.text(),
  message: model.text(),
  read: model.boolean().default(false),
  metadata: model.json().nullable(),
})
