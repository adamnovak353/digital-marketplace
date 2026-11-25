import { ResetPage } from "../auth-pages";

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <ResetPage token={token ?? ""} />;
}
