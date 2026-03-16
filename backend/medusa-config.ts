import { loadEnv, defineConfig } from '@medusajs/framework/utils'
import path from 'path'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

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
    modules: {
        polemarch: {
            resolve: "./src/modules/polemarch/index.js",
        },
    },
})
