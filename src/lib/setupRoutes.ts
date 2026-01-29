import type { SetupStatus } from "./setupStatus";

export function getSetupRedirect(status: SetupStatus) {
  if (status === "needsSetup" || status === "needsAdmin" || status === "dbUnavailable") {
    return "/setup/step-1";
  }
  return null;
}
