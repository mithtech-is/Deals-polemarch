import { z } from "zod";

export const InvestmentSchema = z.object({
    companyName: z.string().min(1, "Company name is required"),
    amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format"),
    platform: z.string().optional(),
    isin: z.string().optional(),
});

export type InvestmentInput = z.infer<typeof InvestmentSchema>;
