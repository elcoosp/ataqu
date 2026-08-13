import { z } from "zod";
export const emailSchema = z.string().email();
export const passwordSchema = z
	.string()
	.min(8)
	.regex(/[A-Z]/, "Must contain uppercase")
	.regex(/[0-9]/, "Must contain number");
export const uuidSchema = z.string().uuid();
export const dateSchema = z.string().datetime();
export const loginSchema = z.object({
	email: emailSchema,
	password: z.string().min(1),
});
export const signupSchema = loginSchema
	.extend({ confirmPassword: z.string() })
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords don't match",
		path: ["confirmPassword"],
	});
export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
