// Prenese slike, ki so v vsebini še navedene kot zunanje povezave (npr. stari Webflow CDN),
// v mapo src/img/uploads in v vsebini zamenja povezavo z lokalno potjo.
import fs from "node:fs";
import path from "node:path";

const CONTENT = "src/content";
const OUT = "src/img/uploads";
const FIELDS = ["fotografija", "slika"];
fs.mkdirSync(OUT, { recursive: true });

const files = fs.readdirSync(CONTENT, { recursive: true }).filter((f) => f.endsWith(".md"));
let changed = 0;
for (const rel of files) {
  const file = path.join(CONTENT, rel);
  let text = fs.readFileSync(file, "utf8");
  for (const field of FIELDS) {
    const re = new RegExp(`^${field}: "?(https?://[^"\\n]+)"?$`, "m");
    const m = text.match(re);
    if (!m) continue;
    const url = m[1];
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(res.status);
      const type = res.headers.get("content-type") || "";
      const ext = type.includes("png") ? ".png" : type.includes("webp") ? ".webp" : type.includes("gif") ? ".gif" : ".jpg";
      const name = path.basename(rel, ".md") + "-" + field + ext;
      fs.writeFileSync(path.join(OUT, name), Buffer.from(await res.arrayBuffer()));
      text = text.replace(re, `${field}: "/img/uploads/${name}"`);
      changed++;
      console.log("✔", url, "→", name);
    } catch (e) {
      console.log("✖", url, e.message);
    }
  }
  fs.writeFileSync(file, text);
}
console.log(`Prenesenih slik: ${changed}`);
