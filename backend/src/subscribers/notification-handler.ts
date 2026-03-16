import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework/subscribers"

export default async function notificationHandler({
  event,
  container,
}: SubscriberArgs<any>) {
  const polemarchModule = container.resolve("polemarch") as any
  const { name, data } = event

  let title = ""
  let message = ""
  let type = "info"

  switch (name) {
    case "order.placed":
      title = "New Order Placed"
      message = `Your order ${data.id} has been successfully placed.`
      type = "success"
      break
    case "order.payment_captured":
      title = "Payment Confirmed"
      message = `Payment for order ${data.id} has been confirmed.`
      type = "success"
      break
    case "order.fulfillment_created":
      title = "Shares Delivered"
      message = `Your shares have been delivered to your demat account.`
      type = "success"
      break
  }

  if (title && message) {
    await polemarchModule.createNotifications({
      customer_id: data.customer_id,
      title,
      message,
      type,
    })
  }
}

export const config: SubscriberConfig = {
  event: [
    "order.placed",
    "order.payment_captured",
    "order.fulfillment_created",
  ],
}
