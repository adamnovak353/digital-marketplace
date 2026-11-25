import { VerifyPage } from "../auth-pages";

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <VerifyPage token={token ?? ""} />;
}
