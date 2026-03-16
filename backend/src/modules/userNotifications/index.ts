import { model, Module, MedusaService } from "@medusajs/framework/utils"

export const Notification = model.define("notifications", {
  id: model.id().primaryKey(),
  customer_id: model.text().index(),
  title: model.text(),
  message: model.text(),
  type: model.text(),
  is_read: model.boolean().default(false),
})

class NotificationModuleService {
  constructor(container: any) {}
}

export default Module("notifications", {
  service: NotificationModuleService,
})
