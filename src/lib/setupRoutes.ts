import type { SetupStatus } from "./setupStatus";

export function getSetupRedirect(status: SetupStatus) {
  if (status === "needsSetup" || status === "dbUnavailable") {
    return "/setup/step-1";
  }
  if (status === "needsAdmin") {
    return "/setup/step-4";
  }
  return null;
}
