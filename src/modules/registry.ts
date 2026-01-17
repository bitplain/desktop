import type { ModuleLoader, ModuleManifest } from "./types";
import manifest0 from "./core/about/manifest";
import manifest1 from "./core/account/manifest";
import manifest2 from "./core/calculator/manifest";
import manifest3 from "./core/clock/manifest";
import manifest4 from "./core/notepad/manifest";
import manifest5 from "./core/system/manifest";

export const modulesMeta: ModuleManifest[] = [manifest0, manifest1, manifest2, manifest3, manifest4, manifest5];

export const moduleLoaders: Record<string, ModuleLoader> = {
  [manifest0.id]: () => import("./core/about/window"),
  [manifest1.id]: () => import("./core/account/window"),
  [manifest2.id]: () => import("./core/calculator/window"),
  [manifest3.id]: () => import("./core/clock/window"),
  [manifest4.id]: () => import("./core/notepad/window"),
  [manifest5.id]: () => import("./core/system/window"),
};
