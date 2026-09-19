import { cookies } from "next/headers";
import { Experience } from "@/components/experience/Experience";
import { isValidVisitorToken, VISITOR_COOKIE_NAME } from "@/lib/identity/visitor";
import { recallDisplayName } from "@/lib/memory/profile-service";

export default async function Home() {
  const cookieStore = await cookies();
  const visitorToken = cookieStore.get(VISITOR_COOKIE_NAME)?.value;
  let initialDisplayName: string | undefined;

  if (isValidVisitorToken(visitorToken)) {
    try {
      initialDisplayName = (await recallDisplayName(visitorToken)) ?? undefined;
    } catch {
      initialDisplayName = undefined;
    }
  }

  return <Experience initialDisplayName={initialDisplayName} />;
}
