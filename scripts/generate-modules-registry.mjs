import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const base = join(process.cwd(), "src/modules/core");
const entries = existsSync(base)
  ? readdirSync(base, { withFileTypes: true })
      .filter((dir) => dir.isDirectory())
      .map((dir) => dir.name)
  : [];

const imports = entries.map((name, index) => {
  const hasManifest = existsSync(join(base, name, "manifest.ts"));
  const source = hasManifest ? "manifest" : "module";
  return `import manifest${index} from "./core/${name}/${source}";`;
});

const moduleLoaders = entries.map((name, index) => {
  const hasManifest = existsSync(join(base, name, "manifest.ts"));
  if (hasManifest) {
    return `  [manifest${index}.id]: () => import("./core/${name}/window"),`;
  }
  return `  [manifest${index}.id]: () => import("./core/${name}/module").then((mod) => ({ default: mod.default.Window })),`;
});

const list = entries.map((_, index) => `manifest${index}`);

const output = `import type { ModuleLoader, ModuleManifest } from "./types";\n${imports.join(
  "\n"
)}\n\nexport const modulesMeta: ModuleManifest[] = [${list.join(
  ", "
)}];\n\nexport const moduleLoaders: Record<string, ModuleLoader> = {\n${moduleLoaders.join(
  "\n"
)}\n};\n`;
writeFileSync(join(process.cwd(), "src/modules/registry.ts"), output);
