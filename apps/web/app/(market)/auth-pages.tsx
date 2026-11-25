import { Suspense } from "react";
import { ForgotView, LoginView, RegisterView, ResetView, VerifyView } from "@marketplace/ui";
import { getMarketplace } from "@/lib/marketplace";

async function demoAccess() {
  const svc = await getMarketplace();
  return { demo: svc.demoMode, emailEnabled: Boolean(svc.mailer) };
}

export async function LoginPage() {
  const { demo } = await demoAccess();
  return <Suspense fallback={<p className="p-6 text-sm text-slate-400">Loading sign in...</p>}><LoginView demo={demo} /></Suspense>;
}
export async function RegisterPage() {
  return <RegisterView {...await demoAccess()} />;
}
export async function ForgotPage() {
  return <ForgotView {...await demoAccess()} />;
}
export function ResetPage({ token }: { token: string }) {
  return <ResetView token={token} />;
}
export function VerifyPage({ token }: { token: string }) {
  return <VerifyView token={token} />;
}
