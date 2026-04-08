import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework/subscribers"

export default async function notificationHandler({
  event,
  container,
}: SubscriberArgs<any>) {
  try {
  const polemarchModule = container.resolve("polemarch") as any
  const { name, data } = event
  const customerId = data?.customer_id

  let title = ""
  let message = ""
  let type = "info"

  switch (name) {
    case "order.placed":
      title = "New Order Placed"
      message = `Your order ${data.id} has been successfully placed.`
      type = "success"
      break
    case "order.completed":
      title = "Order Completed"
      message = `Your order ${data.id} has been completed successfully.`
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
    case "order.fulfillment_canceled":
      title = "Delivery Update"
      message = `Fulfillment for order ${data.id} has been canceled.`
      type = "warning"
      break
    case "order.canceled":
      title = "Order Canceled"
      message = `Your order ${data.id} has been canceled.`
      type = "warning"
      break
    case "order.return_requested":
      title = "Return Requested"
      message = `A return request was created for order ${data.id}.`
      type = "info"
      break
    case "order.return_received":
      title = "Return Received"
      message = `Returned shares for order ${data.id} have been received.`
      type = "info"
      break
  }

  if (customerId && title && message) {
    await polemarchModule.createNotifications({
      customer_id: customerId,
      title,
      message,
      type,
    })
  }
  } catch (err) {
    console.error("[notification-handler] failed:", err)
  }
}

export const config: SubscriberConfig = {
  event: [
    "order.placed",
    "order.completed",
    "order.payment_captured",
    "order.fulfillment_created",
    "order.fulfillment_canceled",
    "order.canceled",
    "order.return_requested",
    "order.return_received",
  ],
}
