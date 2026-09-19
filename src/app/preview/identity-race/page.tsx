import { notFound } from "next/navigation";
import { IdentityRace } from "./panel";
export default function Page() {
  if (process.env.NODE_ENV !== "development" || process.env.BETY_IDENTITY_RACE_TEST !== "1") notFound();
  return <IdentityRace />;
}
