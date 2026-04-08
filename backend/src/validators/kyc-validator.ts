import { z } from "zod";

const fileUrlSchema = z.string().refine((value) => {
    if (!value) {
        return false;
    }

    return value.startsWith("/static/") || /^https?:\/\//i.test(value);
}, "Invalid file URL");

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
    kyc_status: z.enum(["pending", "submitted", "approved", "verified", "rejected"]).optional().nullable(),
    kyc_pan_number: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format").optional().nullable().or(z.literal("")),
    kyc_aadhaar_number: z.string().regex(/^[0-9]{12}$/, "Aadhaar must be 12 digits").optional().nullable().or(z.literal("")),
    kyc_full_name: z.string().optional().nullable(),
    kyc_dp_name: z.string().optional().nullable(),
    kyc_demat_number: z.string().regex(/^(IN\d{14}|\d{16})$/, "Demat: NSDL IN + 14 digits or CDSL 16 digits").optional().nullable().or(z.literal("")),
    kyc_pan_file_url: fileUrlSchema.optional().nullable().or(z.literal("")),
    kyc_cmr_file_url: fileUrlSchema.optional().nullable().or(z.literal("")),
    kyc_submitted_at: z.string().datetime().optional().nullable(),
    kyc_reviewed_at: z.string().datetime().optional().nullable(),
    kyc_approved_at: z.string().datetime().optional().nullable(),
    kyc_rejected_at: z.string().datetime().optional().nullable(),
    kyc_review_notes: z.string().optional().nullable(),
    kyc_rejection_reason: z.string().optional().nullable(),
    manual_investments: z.array(ManualInvestmentSchema).optional()
}).passthrough();

export const CustomerUpdateSchema = z.object({
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    metadata: KycMetadataSchema.optional(),
}).passthrough();
