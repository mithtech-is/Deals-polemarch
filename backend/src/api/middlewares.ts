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

const upload = multer({ storage: multer.memoryStorage() })

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
            ],
        },
        {
            matcher: "/store/upload",
            method: "DELETE",
            middlewares: [
                authenticate("customer", ["session", "bearer"]),
                uploadLimiter,
                (req, res, next) => {
                    logger.info(`Received DELETE request to ${req.url}`, { ip: req.ip });
                    next();
                },
            ],
        },
        {
            matcher: "/static/*",
            method: "GET",
            middlewares: [
                (req, res, next) => {
                    const staticDir = path.resolve(process.cwd(), "static");
                    const fileName = path.basename(req.params[0] || req.path);
                    const filePath = path.resolve(staticDir, fileName);

                    if (!filePath.startsWith(staticDir + path.sep)) {
                        return res.status(403).json({ message: "Access denied" });
                    }

                    if (fs.existsSync(filePath)) {
                        res.sendFile(filePath);
                    } else {
                        res.status(404).json({ message: "File not found" });
                    }
                }
            ]
        },
        {
            matcher: "/admin/products",
            method: ["POST"],
            additionalDataValidator: {
                // ISIN is optional at create time because Medusa v2 admin has
                // no product.create injection zone — the stock Create Product
                // form cannot send additional_data.isin. It is set post-create
                // via the calcula-fields widget on product.details.after
                // (which PATCHes metadata.isin on /admin/products/:id).
                isin: z.string().optional(),
                company_name: z.string().optional(),
            },
        },
        {
            matcher: "/admin/products/import-shares",
            method: "POST",
            bodyParser: false,
            middlewares: [
                authenticate("user", ["session", "bearer"]),
                multer({
                    storage: multer.memoryStorage(),
                    limits: { fileSize: 10 * 1024 * 1024 },
                    fileFilter: (req, file, cb) => {
                        const allowed = ["text/csv", "application/vnd.ms-excel", "application/octet-stream"];
                        if (allowed.includes(file.mimetype) || (file.originalname || "").toLowerCase().endsWith(".csv")) {
                            cb(null, true);
                        } else {
                            cb(new Error("Invalid file type. CSV only."));
                        }
                    },
                }).single("file"),
            ],
        },
        {
            matcher: "/admin/calcula/prices/bulk",
            method: "POST",
            bodyParser: false,
            middlewares: [
                authenticate("user", ["session", "bearer"]),
                multer({
                    storage: multer.memoryStorage(),
                    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
                    fileFilter: (req, file, cb) => {
                        const allowed = ["text/csv", "application/vnd.ms-excel", "application/octet-stream"];
                        if (allowed.includes(file.mimetype) || (file.originalname || "").toLowerCase().endsWith(".csv")) {
                            cb(null, true);
                        } else {
                            cb(new Error("Invalid file type. CSV only."));
                        }
                    },
                }).single("file"),
            ],
        },
        {
            matcher: "/admin/calcula*",
            middlewares: [
                authenticate("user", ["session", "bearer"]),
            ],
        },
        {
            matcher: "/admin/customer-kyc*",
            middlewares: [
                authenticate("user", ["session", "bearer"]),
            ],
        },
        {
            matcher: "/admin/posthog-status*",
            middlewares: [
                authenticate("user", ["session", "bearer"]),
            ],
        },
        {
            matcher: "/store/notifications*",
            middlewares: [
                authenticate("customer", ["session", "bearer"]),
            ],
        },
        {
            matcher: "/store/kyc*",
            middlewares: [
                authenticate("customer", ["session", "bearer"]),
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
            matcher: "/store/carts/:id/complete",
            method: "POST",
            middlewares: [
                async (req, res, next) => {
                    const { id } = req.params;
                    const cartModule = req.scope.resolve("cart") as any;
                    const customerModule = req.scope.resolve("customer") as any;

                    try {
                        const cart = await cartModule.retrieveCart(id);
                        if (cart.customer_id) {
                            const customer = await customerModule.retrieveCustomer(cart.customer_id);
                            const kycStatus = customer.metadata?.kyc_status;

                            if (kycStatus !== "approved" && kycStatus !== "verified") {
                                return res.status(403).json({
                                    message: "KYC verification required. Your KYC status must be 'approved' to complete a purchase.",
                                    kyc_status: kycStatus
                                });
                            }
                        }
                        next();
                    } catch (error) {
                        logger.error("KYC verification check failed", { cartId: id, error });
                        return res.status(500).json({
                            message: "Unable to verify KYC status. Please try again later."
                        });
                    }
                }
            ]
        }
    ],
})
