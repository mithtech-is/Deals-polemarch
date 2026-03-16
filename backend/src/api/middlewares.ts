import { defineMiddlewares } from "@medusajs/framework/http"
import multer from "multer"
import path from "path"
import fs from "fs"
import { authenticate } from "@medusajs/framework/http"
import { z } from "zod"
import helmet from "helmet"
import { rateLimit } from "express-rate-limit"
import { validateBody } from "../utils/validate-body"
import { CustomerUpdateSchema } from "../validators/kyc-validator"
import { maskCustomerResponse } from "../utils/mask-middleware"
import { logger } from "../utils/logger"
import InventoryValidationService from "../services/inventory-validation-service"

const upload = multer({ storage: multer.memoryStorage() })

const UploadSchema = z.object({
    userName: z.string().min(1),
    docType: z.enum(["pan_card", "cmr_copy"]),
})

const authLimiter = rateLimit({
    windowMs: 60 * 1000, // 60 seconds
    max: 10, // Limit each IP to 10 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            message: "Too many authentication attempts. Please try again in 60 seconds."
        });
    }
})

const uploadLimiter = rateLimit({
    windowMs: 60 * 1000, // 60 seconds
    max: 5, // Limit each IP to 5 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            message: "Too many upload attempts. Please wait."
        });
    }
})

export default defineMiddlewares({
    routes: [
        {
            matcher: "*",
            middlewares: [
                helmet(),
            ],
        },
        {
            matcher: "/store/upload",
            method: "POST",
            bodyParser: false,
            middlewares: [
                (req, res, next) => {
                    logger.info(`Received ${req.method} request to ${req.url}`, { ip: req.ip });
                    next();
                },
                uploadLimiter,
                multer({
                    storage: multer.memoryStorage(),
                    limits: {
                        fileSize: 2 * 1024 * 1024, // 2MB
                    },
                    fileFilter: (req, file, cb) => {
                        const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
                        if (allowedTypes.includes(file.mimetype)) {
                            cb(null, true);
                        } else {
                            cb(new Error("Invalid file type. Only PDF, JPEG, and PNG are allowed."));
                        }
                    },
                }).single("file"),
                (req, res, next) => {
                    logger.info(`Multer processed. File present: ${!!(req as any).file}`);
                    next();
                },
                validateBody(UploadSchema),
            ],
        },
        {
            matcher: "/static/*",
            method: "GET",
            middlewares: [
                (req, res, next) => {
                    const fileName = req.params[0] || path.basename(req.path);
                    const filePath = path.join(process.cwd(), "static", fileName);

                    if (fs.existsSync(filePath)) {
                        res.sendFile(filePath);
                    } else {
                        res.status(404).json({ message: "File not found" });
                    }
                }
            ]
        },
        {
            matcher: "/admin/kyc*",
            middlewares: [
                authenticate("admin", ["session", "bearer"]),
            ],
        },
        {
            matcher: "/store/customers/me",
            middlewares: [
                maskCustomerResponse,
            ],
        },
        {
            matcher: "/store/customers/me",
            method: "POST",
            middlewares: [
                validateBody(CustomerUpdateSchema),
            ],
        },
        {
            matcher: "/auth/customer/emailpass",
            middlewares: [
                authLimiter,
            ],
        },
        {
            matcher: "/auth/customer/emailpass/register",
            middlewares: [
                authLimiter,
            ],
        },
        {
            matcher: "/store/customers",
            method: "POST",
            middlewares: [
                authLimiter,
            ],
        },
        {
            matcher: "/store/debug",
            method: "GET",
            middlewares: [
                (req, res) => {
                    try {
                        const results = {
                            kyc: false,
                            file_service: false,
                            notifications: false,
                            index: false
                        };
                        try { results.kyc = !!req.scope.resolve("kyc"); } catch (e) {}
                        try { results.file_service = !!req.scope.resolve("file_service"); } catch (e) {}
                        try { results.notifications = !!req.scope.resolve("notifications"); } catch (e) {}
                        try { results.index = !!req.scope.resolve("index"); } catch (e) {}
                        
                        const keys = Object.keys(req.scope.registrations);
                        res.json({ results, keys });
                    } catch (error: any) {
                        res.json({ error: error.message });
                    }
                }
            ]
        },
        {
            matcher: "/store/carts/:id/complete",
            method: "POST",
            middlewares: [
                (req, res, next) => next()
            ]
        }
    ],
})
