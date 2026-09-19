import { cookies } from "next/headers";
import { Experience } from "@/components/experience/Experience";
import { isValidVisitorToken, VISITOR_COOKIE_NAME } from "@/lib/identity/visitor";
import { recallDisplayName } from "@/lib/memory/profile-service";

import { resolvePetRenderer, resolveRendererTimeout } from "@/lib/pet-engine/renderer-config";

export default async function Home() {
  const cookieStore = await cookies();
  const visitorToken = cookieStore.get(VISITOR_COOKIE_NAME)?.value;
  let initialDisplayName: string | undefined;
  let initialMemoryStatus: "resolved" | "unavailable" = "resolved";

  if (isValidVisitorToken(visitorToken)) {
    try {
      initialDisplayName = (await recallDisplayName(visitorToken)) ?? undefined;
    } catch (error) {
      initialMemoryStatus = "unavailable";
      initialDisplayName = undefined;
      if (process.env.NODE_ENV === "development") {
        console.error("Unable to recall visitor memory", error);
      }
    }
  }

  return (
    <Experience
      rendererMode={resolvePetRenderer(process.env.PET_RENDERER)}
      rendererTimeoutMs={resolveRendererTimeout(process.env.PET_RENDERER_TIMEOUT_MS)}
      testScenario={process.env.NODE_ENV === "development" ? process.env.BETY_INTEGRATION_SCENARIO : undefined}
      initialDisplayName={initialDisplayName}
      initialMemoryStatus={initialMemoryStatus}
    />
  );
}
