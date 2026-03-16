const { model, Module, MedusaService } = require("@medusajs/framework/utils");

const Notification = model.define("user_notifications", {
  id: model.id().primaryKey(),
  customer_id: model.text().index(),
  title: model.text(),
  message: model.text(),
  type: model.text(),
  is_read: model.boolean().default(false),
});

class UserNotificationModuleService extends MedusaService({
  Notification,
}) {}

module.exports = Module("userNotifications", {
  service: UserNotificationModuleService,
});
