import { handleSetupComplete } from "./handler";

export async function POST(request: Request) {
  return handleSetupComplete(request);
}
