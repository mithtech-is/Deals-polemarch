import { loadEnv, defineConfig } from '@medusajs/framework/utils'
import { Modules } from '@medusajs/utils'
import path from 'path'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

const analyticsModule = process.env.POSTHOG_EVENTS_API_KEY
    ? {
        analytics: {
            resolve: "@medusajs/medusa/analytics",
            options: {
                providers: [
                    {
                        resolve: "@medusajs/analytics-posthog",
                        id: "posthog",
                        options: {
                            posthogEventsKey: process.env.POSTHOG_EVENTS_API_KEY,
                            posthogHost: process.env.POSTHOG_HOST || "https://eu.i.posthog.com",
                        },
                    },
                ],
            },
        },
    }
    : {}

export default defineConfig({
    projectConfig: {
        databaseUrl: process.env.DATABASE_URL,
        http: {
            storeCors: process.env.STORE_CORS || "http://localhost:3001,http://localhost:8000,http://127.0.0.1:3001,http://127.0.0.1:8000",
            adminCors: process.env.ADMIN_CORS || "http://localhost:3001,http://localhost:7001,http://127.0.0.1:3001,http://127.0.0.1:7001",
            authCors: process.env.AUTH_CORS || "http://localhost:3001,http://localhost:7001,http://127.0.0.1:3001,http://127.0.0.1:7001",
            jwtSecret: process.env.JWT_SECRET || "supersecret",
            cookieSecret: process.env.COOKIE_SECRET || "supersecret",
        }
    },
    admin: {
        disable: false,
    },
    plugins: [],
    modules: {
        [Modules.FILE]: {
            resolve: "@medusajs/file",
            options: {
                providers: [
                    {
                        resolve: "@medusajs/file-local",
                        id: "local",
                        options: {
                            upload_dir: path.join(process.cwd(), "static"),
                            private_upload_dir: path.join(process.cwd(), "static"),
                            backend_url: process.env.MEDUSA_BACKEND_URL || "https://backbone4rc.polemarch.in",
                        },
                    },
                ],
            },
        },
        polemarch: {
            resolve: "./src/modules/polemarch/index.js",
        },
        calcula: {
            resolve: "./src/modules/calcula/index",
        },
        ...analyticsModule,
    },
})
