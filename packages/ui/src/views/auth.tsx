"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as React from "react";
import { forgotSchema, loginSchema, registerSchema, resetSchema } from "@marketplace/validation";
import { Button, Field, Panel, inputClass, mutate } from "../components/kit";

const demos = [
  ["Customer", "john@example.com"],
  ["Seller", "seller@premiumstore.demo"],
  ["Admin", "admin@demo.marketplace"],
];

export function LoginView({ demo = false }: { demo?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/account";
  const form = useForm({ resolver: zodResolver(loginSchema), defaultValues: demo ? { email: "john@example.com", password: "DemoPass123!" } : { email: "", password: "" } });
  const [challenge, setChallenge] = React.useState<{ challengeId: string; demoCode?: string; message: string } | null>(null);
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  return (
    <AuthCard title="Sign in" subtitle="Seller and admin accounts require the second verification step.">
      {!challenge ? <form className="space-y-3" onSubmit={form.handleSubmit(async (values) => {
        setError(null);
        try {
          const result = await mutate<{ mfaRequired: boolean; challengeId?: string; demoCode?: string; message?: string }>("/auth/login", "POST", values);
          if (result.mfaRequired && result.challengeId) setChallenge({ challengeId: result.challengeId, demoCode: result.demoCode, message: result.message ?? "Enter the verification code." });
          else { router.push(next); router.refresh(); }
        } catch (err) { setError(err instanceof Error ? err.message : "Sign-in failed"); }
      })}>
        <Field label="Email" error={form.formState.errors.email?.message}><input className={inputClass} autoComplete="username" suppressHydrationWarning {...form.register("email")} /></Field>
        <Field label="Password"><input type="password" className={inputClass} autoComplete="current-password" suppressHydrationWarning {...form.register("password")} /></Field>
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Checking..." : "Continue"}</Button>
      </form> : <form className="space-y-3" onSubmit={async (event) => {
        event.preventDefault(); setError(null);
        try { await mutate("/auth/mfa", "POST", { challengeId: challenge.challengeId, code }); router.push(next); router.refresh(); }
        catch (err) { setError(err instanceof Error ? err.message : "Verification failed"); }
      }}>
        <p className="text-sm text-amber-100">{challenge.message}</p>
        {challenge.demoCode ? <p className="rounded-xl bg-black/30 p-3 text-sm">Demo code: <strong>{challenge.demoCode}</strong>. Email delivery is not configured.</p> : null}
        <input className={inputClass} value={code} onChange={(event) => setCode(event.target.value)} placeholder="6-digit code" inputMode="numeric" autoComplete="one-time-code" aria-label="Verification code" />
        <Button type="submit" className="w-full">Verify code</Button>
      </form>}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {demo ? <>
        <div className="flex flex-wrap gap-2">{demos.map(([label, email]) => <button key={email} className="rounded-full border border-white/10 px-3 py-1 text-xs" type="button" onClick={() => form.setValue("email", email)}>{label}</button>)}</div>
        <p className="text-xs text-slate-500">Demo password for the seeded accounts: DemoPass123!</p>
      </> : null}
      <div className="flex justify-between text-sm"><Link href="/register" className="text-cyan-300">Create account</Link><Link href="/forgot-password" className="text-slate-400">Forgot password</Link></div>
    </AuthCard>
  );
}

export function RegisterView({ demo = false, emailEnabled = false }: { demo?: boolean; emailEnabled?: boolean }) {
  const router = useRouter();
  const form = useForm({ resolver: zodResolver(registerSchema) });
  const [link, setLink] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  if (!demo && !emailEnabled) {
    return <AuthCard title="Create account" subtitle="Registration is unavailable until email delivery is configured."><Link href="/login" className="text-sm text-cyan-300">Back to sign in</Link></AuthCard>;
  }
  return <AuthCard title="Create account" subtitle="Registration creates a customer. It cannot grant seller or admin access.">
    <form className="space-y-3" onSubmit={form.handleSubmit(async (values) => {
      setError(null);
      try {
        const result = await mutate<{ message: string; verifyPath?: string }>("/auth/register", "POST", values);
        setLink(result.verifyPath ?? null);
        setNotice(result.verifyPath ? null : result.message);
      }
      catch (err) { setError(err instanceof Error ? err.message : "Registration failed"); }
    })}>
      <Field label="Name"><input className={inputClass} {...form.register("name")} /></Field>
      <Field label="Email"><input className={inputClass} {...form.register("email")} /></Field>
      <Field label="Password"><input type="password" className={inputClass} {...form.register("password")} /></Field>
      <Button className="w-full" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Creating..." : "Create account"}</Button>
    </form>
    {link ? <p className="text-sm text-cyan-100">Email is not configured. <Link className="underline" href={link}>Verify this demo account</Link>, then <button className="underline" onClick={() => router.push("/login")}>sign in</button>.</p> : null}
    {notice ? <p role="status" className="text-sm text-cyan-100">{notice} Then <Link className="underline" href="/login">sign in</Link>.</p> : null}
    {error ? <p className="text-sm text-red-400">{error}</p> : null}
  </AuthCard>;
}

export function ForgotView({ demo = false, emailEnabled = false }: { demo?: boolean; emailEnabled?: boolean }) {
  const form = useForm({ resolver: zodResolver(forgotSchema) });
  const [path, setPath] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  if (!demo && !emailEnabled) {
    return <AuthCard title="Reset password" subtitle="Password reset is unavailable until email delivery is configured. Contact support."><Link href="/login" className="text-sm text-cyan-300">Back to sign in</Link></AuthCard>;
  }
  return <AuthCard title="Reset password" subtitle={emailEnabled ? "We will email you a one-time link." : "No email provider is configured. A demo link is shown instead."}>
    <form className="space-y-3" onSubmit={form.handleSubmit(async (values) => {
      try {
        const result = await mutate<{ message: string; resetPath?: string }>("/auth/forgot-password", "POST", values);
        setMessage(result.message); setPath(result.resetPath ?? null);
      } catch (err) { setMessage(err instanceof Error ? err.message : "Reset request failed"); setPath(null); }
    })}>
      <Field label="Email"><input className={inputClass} {...form.register("email")} /></Field>
      <Button className="w-full" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Sending..." : "Request reset"}</Button>
    </form>
    {message ? <p className="text-sm text-slate-300">{message}</p> : null}
    {path ? <Link className="text-sm text-cyan-300" href={path}>Open one-time reset link</Link> : null}
  </AuthCard>;
}

export function ResetView({ token }: { token: string }) {
  const form = useForm({ resolver: zodResolver(resetSchema), defaultValues: { token, password: "" } });
  const [message, setMessage] = React.useState<string | null>(null);
  return <AuthCard title="Choose a new password" subtitle="This link works once.">
    <form className="space-y-3" onSubmit={form.handleSubmit(async (values) => {
      try { const result = await mutate<{ message: string }>("/auth/reset-password", "POST", values); setMessage(result.message); }
      catch (error) { setMessage(error instanceof Error ? error.message : "Reset failed"); }
    })}>
      <Field label="New password"><input type="password" className={inputClass} {...form.register("password")} /></Field>
      <Button className="w-full">Update password</Button>
    </form>
    {message ? <p className="text-sm">{message} <Link className="text-cyan-300" href="/login">Sign in</Link></p> : null}
  </AuthCard>;
}

export function VerifyView({ token }: { token: string }) {
  const [message, setMessage] = React.useState("Verifying...");
  React.useEffect(() => {
    mutate<{ message: string }>("/auth/verify-email", "POST", { token }).then((result) => setMessage(result.message)).catch((error) => setMessage(error instanceof Error ? error.message : "Verification failed"));
  }, [token]);
  return <AuthCard title="Email verification" subtitle={message}><Link className="text-cyan-300" href="/login">Continue to sign in</Link></AuthCard>;
}

export function LegalView({ title, body }: { title: string; body: string[] }) {
  return <Panel className="mx-auto max-w-3xl space-y-3 p-6"><h1 className="text-3xl font-bold">{title}</h1>{body.map((paragraph) => <p key={paragraph} className="text-sm leading-6 text-slate-300">{paragraph}</p>)}</Panel>;
}

function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <div className="mx-auto max-w-md"><Panel className="space-y-4 p-6"><h1 className="text-2xl font-bold">{title}</h1><p className="text-sm text-slate-400">{subtitle}</p>{children}</Panel></div>;
}
