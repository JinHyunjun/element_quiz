import { readdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { extname, join } from "node:path";

const roots = ["public/assets/js", "functions", "scripts", "tests"];
const files = [];

function collect(path) {
  for (const entry of readdirSync(path)) {
    const fullPath = join(path, entry);
    if (statSync(fullPath).isDirectory()) collect(fullPath);
    else if ([".js", ".mjs"].includes(extname(fullPath))) files.push(fullPath);
  }
}

roots.forEach(collect);
for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`Syntax OK: ${files.length} files`);
