import * as z from "zod";

export const loginSchema = z.object({
  email: z.email({ message: "Invalid email address" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters long" }),
});
export type ILoginSchema = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z
    .string()
    .min(3, { message: "Name must be at least 3 characters long" }),
  email: z.email({ message: "Invalid email address" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters long" }),
});
export type IRegisterSchema = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.email({ message: "Invalid email address" }),
});
export type IForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1, { message: "Token is required" }),
  newPassword: z
    .string()
    .min(6, { message: "Password must be at least 6 characters long" }),
});
export type IResetPasswordSchema = z.infer<
  typeof resetPasswordSchema
>;

export const totpSchema = z.object({
  code: z.string().length(6),
});
export type ITotpSchema = z.infer<typeof totpSchema>;

export const backupCodeSchema = z.object({
  code: z.string().min(1),
});
export type IBackupCodeSchema = z.infer<typeof backupCodeSchema>;
