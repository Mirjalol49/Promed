import { z } from 'zod';

// --- SHARED PATTERNS ---
const phonePattern = /^(\+998|998)?[0-9]{9}$/;
const noScriptTags = (val: string) => !/<script\b[^>]*>([\s\S]*?)<\/script>/gm.test(val);

// --- LOGIN SCHEMA ---
export const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters')
        .refine(noScriptTags, 'Invalid characters detected'),
});

// --- PATIENT SCHEMA ---
export const patientSchema = z.object({
    fullName: z.string()
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name is too long')
        .refine(noScriptTags, 'Invalid characters in name'),

    phone: z.string()
        .min(7, 'Phone number is too short')
        .max(20, 'Phone number is too long')
        .refine(val => /^[+\d\s-]*$/.test(val), 'Phone must only contain numbers and basic symbols'),

    age: z.number().int().min(0, 'Age cannot be negative').max(120, 'Invalid age'),

    gender: z.enum(['Male', 'Female', 'Other']),

    technique: z.string().optional(),

    grafts: z.number().int().min(0, 'Grafts cannot be negative').optional(),

    operationDate: z.string().refine(val => !isNaN(Date.parse(val)), 'Invalid date format'),

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
