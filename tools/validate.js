const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = process.cwd();
const required = [
  "index.html",
  "css/styles.css",
  "js/config.js",
  "js/demo.js",
  "js/app.js",
  "manifest.webmanifest",
  "service-worker.js",
  "vercel.json",
  "public/icon.svg",
  "gas/Code.gs",
  "gas/README.md"
];

for (const file of required) {
  const absolute = path.join(root, file);
  if (!fs.existsSync(absolute)) {
    throw new Error(`File wajib tidak ditemukan: ${file}`);
  }
}

JSON.parse(fs.readFileSync(path.join(root, "manifest.webmanifest"), "utf8"));
JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));

for (const file of ["js/config.js", "js/demo.js", "js/app.js", "service-worker.js", "tools/dev-server.js", "gas/Code.gs", "gas/data-center/Code.gs"]) {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  new vm.Script(source, { filename: file });
}

console.log("Validasi selesai. File aplikasi, manifest, dan JavaScript siap.");
