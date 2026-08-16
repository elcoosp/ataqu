import { describe, expect, it } from "vitest";
import {
	dateSchema,
	emailSchema,
	loginSchema,
	passwordSchema,
	signupSchema,
	uuidSchema,
} from "../src/index";

describe("emailSchema", () => {
	it("accepts a valid email", () => {
		expect(emailSchema.parse("a@b.com")).toBe("a@b.com");
	});
	it("rejects an invalid email", () => {
		expect(() => emailSchema.parse("not-an-email")).toThrow();
	});
});

describe("passwordSchema", () => {
	it("accepts a strong password", () => {
		expect(passwordSchema.parse("Abcdef12")).toBe("Abcdef12");
	});
	it("rejects a short password", () => {
		expect(() => passwordSchema.parse("Ab1")).toThrow();
	});
	it("rejects a password without uppercase", () => {
		expect(() => passwordSchema.parse("abcdef12")).toThrow();
	});
	it("rejects a password without a number", () => {
		expect(() => passwordSchema.parse("Abcdefgh")).toThrow();
	});
});

describe("uuidSchema", () => {
	it("accepts a uuid", () => {
		expect(uuidSchema.parse("123e4567-e89b-12d3-a456-426614174000")).toBe(
			"123e4567-e89b-12d3-a456-426614174000",
		);
	});
	it("rejects a non-uuid", () => {
		expect(() => uuidSchema.parse("nope")).toThrow();
	});
});

describe("dateSchema", () => {
	it("accepts an ISO datetime", () => {
		expect(dateSchema.parse("2026-08-16T12:00:00Z")).toBe(
			"2026-08-16T12:00:00Z",
		);
	});
	it("rejects a plain date", () => {
		expect(() => dateSchema.parse("2026-08-16")).toThrow();
	});
});

describe("loginSchema", () => {
	it("accepts a valid login", () => {
		expect(loginSchema.parse({ email: "a@b.com", password: "x" })).toEqual({
			email: "a@b.com",
			password: "x",
		});
	});
	it("rejects an invalid login email", () => {
		expect(() => loginSchema.parse({ email: "bad", password: "x" })).toThrow();
	});
});

describe("signupSchema", () => {
	it("accepts matching passwords", () => {
		expect(
			signupSchema.parse({
				email: "a@b.com",
				password: "Abcdef12",
				confirmPassword: "Abcdef12",
			}),
		).toMatchObject({ password: "Abcdef12" });
	});
	it("rejects mismatched passwords", () => {
		expect(() =>
			signupSchema.parse({
				email: "a@b.com",
				password: "Abcdef12",
				confirmPassword: "Different1",
			}),
		).toThrow();
	});
});
