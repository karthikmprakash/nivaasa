"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authenticate } from "@/lib/login";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";

export type LoginState = { error?: string };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password to continue." };
  const result = await authenticate(email, password);
  if ("error" in result && result.error) return { error: result.error };
  const store = await cookies();
  store.set(SESSION_COOKIE, result.token, sessionCookieOptions(result.expiresAt));
  redirect(result.home);
}

export async function demoLoginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "false") redirect("/login");
  const result = await authenticate(email, "demo1234");
  if ("error" in result && result.error) redirect(`/login?error=${encodeURIComponent(result.error)}`);
  const store = await cookies();
  store.set(SESSION_COOKIE, result.token, sessionCookieOptions(result.expiresAt));
  redirect(result.home);
}
