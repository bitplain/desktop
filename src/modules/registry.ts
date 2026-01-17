import type { ModuleLoader, ModuleManifest } from "./types";
import manifest0 from "./core/about/module";
import manifest1 from "./core/account/module";
import manifest2 from "./core/calculator/module";
import manifest3 from "./core/clock/module";
import manifest4 from "./core/notepad/module";
import manifest5 from "./core/system/module";

export const modulesMeta: ModuleManifest[] = [manifest0, manifest1, manifest2, manifest3, manifest4, manifest5];

export const moduleLoaders: Record<string, ModuleLoader> = {
  [manifest0.id]: () => import("./core/about/module").then((mod) => ({ default: mod.default.Window })),
  [manifest1.id]: () => import("./core/account/module").then((mod) => ({ default: mod.default.Window })),
  [manifest2.id]: () => import("./core/calculator/module").then((mod) => ({ default: mod.default.Window })),
  [manifest3.id]: () => import("./core/clock/module").then((mod) => ({ default: mod.default.Window })),
  [manifest4.id]: () => import("./core/notepad/module").then((mod) => ({ default: mod.default.Window })),
  [manifest5.id]: () => import("./core/system/module").then((mod) => ({ default: mod.default.Window })),
};
