// Katalog izidov: poišče vse albume, EP-je in single izvajalcev na Apple Music, ki jih je izdal SonicTribe,
// in za vsakega, ki ga še ni, ustvari vnos v src/content/izidi/ (z naslovnico). Obstoječih vnosov ne spreminja.
// Teče v GitHub Actions (ročno ali enkrat na teden); ročno: node scripts/katalog.mjs
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const DIR = "src/content/izidi", IMG = "src/img/uploads";
const LABEL = /sonic\s*tribe/i;
const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const slugify = (s) => norm(s).replace(/ /g, "-").slice(0, 80);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJson(u) { await sleep(3500); const r = await fetch(u); if (!r.ok) throw new Error(r.status + " " + u); return r.json() }

fs.mkdirSync(DIR, { recursive: true }); fs.mkdirSync(IMG, { recursive: true });

// izvajalci: iz map izvajalci in radio
const artists = new Set();
for (const d of ["src/content/izvajalci", "src/content/radio"]) {
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d).filter((f) => f.endsWith(".md"))) {
    const x = matter(fs.readFileSync(path.join(d, f), "utf8")).data;
    const a = d.endsWith("izvajalci") ? x.title : x.izvajalec;
    if (a) artists.add(String(a).split(/\s*(?:feat\.|ft\.|&|,| x )\s*/i)[0].trim());
  }
}
const known = new Set(fs.readdirSync(DIR).filter((f) => f.endsWith(".md")).map((f) => {
  const x = matter(fs.readFileSync(path.join(DIR, f), "utf8")).data; return String(x.apple_id || "");
}));
const ignored = new Set(fs.existsSync(path.join(DIR, "_izpusceni.txt")) ? fs.readFileSync(path.join(DIR, "_izpusceni.txt"), "utf8").split(/\s+/).filter(Boolean) : []);

let added = 0;
for (const name of artists) {
  try {
    const s = await getJson(`https://itunes.apple.com/search?country=SI&entity=musicArtist&limit=5&term=${encodeURIComponent(name)}`);
    const art = (s.results || []).find((r) => norm(r.artistName) === norm(name));
    if (!art) { console.log("? izvajalca ni na Apple Music:", name); continue }
    const l = await getJson(`https://itunes.apple.com/lookup?country=SI&entity=album&limit=200&id=${art.artistId}`);
    const albums = (l.results || []).filter((r) => r.wrapperType === "collection" && LABEL.test(r.copyright || ""));
    for (const a of albums) {
      const id = String(a.collectionId);
      if (known.has(id) || ignored.has(id)) continue;
      const tip = / - single$/i.test(a.collectionName) ? "Single" : / - ep$/i.test(a.collectionName) ? "EP" : (a.trackCount <= 3 ? "Single" : a.trackCount <= 6 ? "EP" : "Album");
      const title = a.collectionName.replace(/ - (single|ep)$/i, "");
      const datum = (a.releaseDate || "").slice(0, 10);
      const slug = slugify(`${a.artistName} ${title} ${datum.slice(0, 4)}`);
      let naslovnica = "";
      if (a.artworkUrl100) {
        const r = await fetch(a.artworkUrl100.replace("100x100bb", "800x800bb"));
        if (r.ok) { fs.writeFileSync(path.join(IMG, `izid-${slug}.jpg`), Buffer.from(await r.arrayBuffer())); naslovnica = `/img/uploads/izid-${slug}.jpg` }
      }
      const data = { title, izvajalec: a.artistName, tip, datum, naslovnica, apple_music: a.collectionViewUrl.replace(/[?&]uo=\d+/, ""), apple_id: id, skladb: a.trackCount, prikazano: true };
      fs.writeFileSync(path.join(DIR, slug + ".md"), matter.stringify("", data));
      known.add(id); added++;
      console.log("➕", datum, a.artistName, "–", title, `(${tip})`);
    }
  } catch (e) { console.log("✖", name, e.message) }
}
console.log("Novih izidov:", added);
