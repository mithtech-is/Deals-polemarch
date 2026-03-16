import { z } from "zod";

export const ManualInvestmentSchema = z.object({
    id: z.string(),
    companyName: z.string(),
    amount: z.string(),
    platform: z.string().optional().or(z.literal("")),
    isin: z
        .string()
        .length(12, "ISIN must be exactly 12 characters")
        .regex(/^[A-Z0-9]{12}$/, "ISIN must contain only uppercase letters and numbers")
        .optional()
        .or(z.literal("")),
    date: z.string()
});

export const KycMetadataSchema = z.object({
    kyc_status: z.enum(["pending", "submitted", "verified", "rejected"]).optional(),
    pan_number: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format").optional(),
    aadhaar_number: z.string().regex(/^[0-9]{12}$/, "Aadhaar must be 12 digits").optional(),
    dp_name: z.string().optional(),
    demat_number: z.string().regex(/^[0-9]{16}$/, "Demat number must be 16 digits").optional(),
    pan_file_url: z.string().url().optional(),
    cmr_file_url: z.string().url().optional(),
    kyc_submitted_at: z.number().optional(),
    manual_investments: z.array(ManualInvestmentSchema).optional()
}).passthrough();

export const CustomerUpdateSchema = z.object({
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    metadata: KycMetadataSchema.optional(),
}).passthrough();
