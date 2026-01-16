import type { SetupStatus } from "./setupStatus";

export function getSetupRedirect(status: SetupStatus) {
  if (status === "needsSetup" || status === "needsAdmin") {
    return "/setup";
  }
  return null;
}
