import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const base = join(process.cwd(), "src/modules/core");
const entries = existsSync(base)
  ? readdirSync(base, { withFileTypes: true })
      .filter((dir) => dir.isDirectory())
      .map((dir) => dir.name)
  : [];

const imports = entries.map(
  (name, index) => `import mod${index} from "./core/${name}/module";`
);
const list = entries.map((_, index) => `mod${index}`);

const output = `${imports.join("\n")}\n\nexport const modules = [${list.join(", ")}];\n`;
writeFileSync(join(process.cwd(), "src/modules/registry.ts"), output);
