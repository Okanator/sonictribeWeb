// Dopolni skladbe v src/content/radio/*.md:
//  - trajanje (iz MP3), manjkajoči podatki iz ID3 oznak (naslov, izvajalec, album, leto, naslovnica)
//  - manjkajoči podatki iz Apple Music kataloga (album, leto, naslovnica)
//  - povezave do Apple Music in Deezer (ostale platforme: iskanje skladbe)
// Teče v GitHub Actions ob vsaki spremembi radia; ročno: node scripts/radio-meta.mjs
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { parseBuffer } from "music-metadata";

const DIR = "src/content/radio";
const IMG = "src/img/uploads";
const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

async function getJson(url) {
  const r = await fetch(url, { headers: { "user-agent": "sonictribe-radio/1.0" } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

async function readAudio(src) {
  if (/^https?:\/\//.test(src)) {
    const r = await fetch(src);
    if (!r.ok) throw new Error(`${r.status} ${src}`);
    return Buffer.from(await r.arrayBuffer());
  }
  const p = path.join("src", src.replace(/^\//, ""));
  return fs.readFileSync(p);
}

async function itunes(artist, title) {
  const d = await getJson(`https://itunes.apple.com/search?country=SI&entity=song&limit=10&term=${encodeURIComponent(artist + " " + title)}`);
  const a = norm(artist), t = norm(title);
  return (d.results || []).find((x) => norm(x.trackName).startsWith(t) && (norm(x.artistName).includes(a) || a.includes(norm(x.artistName))));
}

if (!fs.existsSync(DIR)) process.exit(0);
fs.mkdirSync(IMG, { recursive: true });
let changed = 0;

for (const f of fs.readdirSync(DIR).filter((f) => f.endsWith(".md"))) {
  const file = path.join(DIR, f);
  const slug = path.basename(f, ".md");
  const doc = matter(fs.readFileSync(file, "utf8"));
  const d = doc.data;
  const before = JSON.stringify(d);
  if (!d.datoteka) continue;

  // 1) MP3: trajanje + ID3
  try {
    const buf = await readAudio(d.datoteka);
    const mm = await parseBuffer(buf, { mimeType: "audio/mpeg" });
    if (mm.format.duration) d.trajanje = Math.round(mm.format.duration * 10) / 10;
    const c = mm.common;
    if (!d.title && c.title) d.title = c.title;
    if (!d.izvajalec && c.artist) d.izvajalec = c.artist;
    if (!d.album && c.album) d.album = c.album;
    if (!d.leto && c.year) d.leto = String(c.year);
    if (!d.naslovnica && c.picture && c.picture[0]) {
      const pic = c.picture[0];
      const ext = pic.format.includes("png") ? ".png" : ".jpg";
      fs.writeFileSync(path.join(IMG, `radio-${slug}${ext}`), pic.data);
      d.naslovnica = `/img/uploads/radio-${slug}${ext}`;
    }
  } catch (e) {
    console.log("✖ MP3", slug, e.message);
  }

  // 2) Katalog + povezave (samo enkrat na skladbo)
  if (!d.povezave_iskane && d.izvajalec && d.title) {
    try {
      const it = await itunes(d.izvajalec, d.title);
      if (it) {
        if (!d.album) d.album = it.collectionName;
        if (!d.leto && it.releaseDate) d.leto = it.releaseDate.slice(0, 4);
        if (!d.naslovnica && it.artworkUrl100) {
          const r = await fetch(it.artworkUrl100.replace("100x100bb", "1000x1000bb"));
          if (r.ok) {
            fs.writeFileSync(path.join(IMG, `radio-${slug}.jpg`), Buffer.from(await r.arrayBuffer()));
            d.naslovnica = `/img/uploads/radio-${slug}.jpg`;
          }
        }
      }
      if (it && it.trackViewUrl && !d.apple_music) d.apple_music = it.trackViewUrl.replace(/[?&]uo=\d+/, "");
      // Deezer: javni API brez ključa
      if (!d.deezer) {
        const dz = await getJson(`https://api.deezer.com/search?q=${encodeURIComponent(`artist:"${d.izvajalec}" track:"${d.title}"`)}`);
        const hit = (dz.data || []).find((x) => norm(x.title).startsWith(norm(d.title)) && norm(x.artist?.name).includes(norm(d.izvajalec)));
        if (hit) d.deezer = hit.link;
      }
      // Spotify, YouTube, Tidal brez povezave: radio pokaže iskanje skladbe na tisti platformi
      d.povezave_iskane = true;
    } catch (e) {
      console.log("✖ povezave", slug, e.message);
    }
  }

  if (JSON.stringify(d) !== before) {
    fs.writeFileSync(file, matter.stringify(doc.content, d));
    changed++;
    console.log("✔", slug, `${d.izvajalec} – ${d.title} (${d.trajanje}s)`);
  }
}
console.log(`Dopolnjenih skladb: ${changed}`);
