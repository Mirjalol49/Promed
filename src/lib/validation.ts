import { z } from 'zod';

// --- SHARED PATTERNS ---
const phonePattern = /^(\+998|998)?[0-9]{9}$/;
const noScriptTags = (val: string) => !/<script\b[^>]*>([\s\S]*?)<\/script>/gm.test(val);

// --- LOGIN SCHEMA ---
export const loginSchema = z.object({
    email: z.string().email('error_invalid_email'),
    password: z.string().min(6, 'error_password_short')
        .refine(noScriptTags, 'error_invalid_chars'),
});

// --- PATIENT SCHEMA ---
export const patientSchema = z.object({
    fullName: z.string()
        .min(2, 'error_name_short')
        .max(100, 'error_name_long')
        .refine(noScriptTags, 'error_invalid_name_chars'),

    phone: z.string()
        .min(7, 'error_phone_short')
        .max(20, 'error_phone_long')
        .refine(val => /^[+\d\s-]*$/.test(val), 'error_phone_invalid'),

    age: z.number().int().min(0, 'error_age_negative').max(120, 'error_age_invalid'),

    gender: z.enum(['Male', 'Female', 'Other']),

    technique: z.string().optional(),

    grafts: z.number().int().min(0, 'error_grafts_negative').optional(),

    operationDate: z.string().refine(val => !isNaN(Date.parse(val)), 'error_date_invalid'),

    status: z.enum(['Active', 'Recovered', 'Observation']),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type PatientFormValues = z.infer<typeof patientSchema>;

// Helper to safely parse
export const safeValidate = <T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } => {
    const result = schema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error.issues[0].message };
};
