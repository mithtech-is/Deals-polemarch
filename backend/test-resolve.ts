import { createMedusaApp } from "@medusajs/framework"

async function test() {
  const container = (global as any).container
  if (!container) {
    console.log("No container found")
    return
  }
  
  try {
    const query = container.resolve("query")
    console.log("Query Type:", typeof query)
    console.log("Query Graph Type:", typeof (query as any).graph)
    
    const notifications = container.resolve("notifications")
    console.log("Notifications Type:", typeof notifications)
  } catch (e) {
    console.error("Resolution failed:", e.message)
  }
}

test()
