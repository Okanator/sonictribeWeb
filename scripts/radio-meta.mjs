// Dopolni skladbe v src/content/radio/*.md:
//  - trajanje (iz MP3), manjkajoči podatki iz ID3 oznak (naslov, izvajalec, album, leto, naslovnica)
//  - manjkajoči podatki iz Apple Music kataloga (album, leto, naslovnica)
//  - povezave do Apple Music in Deezer (ostale platforme: iskanje skladbe)
//  - paketni uvoz: MP3-ji, naloženi naravnost v src/audio, dobijo vnos samodejno
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

const AUDIO = "src/audio";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mime = (f) => (/\.(m4a|mp4|aac)$/i.test(f) ? "audio/mp4" : "audio/mpeg");
const slugify = (s) => norm(s).replace(/ /g, "-").slice(0, 80) || "skladba";

fs.mkdirSync(DIR, { recursive: true });
fs.mkdirSync(IMG, { recursive: true });
let changed = 0;

// 0) Paketni uvoz: vsak MP3/M4A v src/audio, ki še nima vnosa, dobi svoj vnos (podatki iz ID3 oznak)
if (fs.existsSync(AUDIO)) {
  const used = new Set(
    fs.readdirSync(DIR).filter((f) => f.endsWith(".md"))
      .map((f) => matter(fs.readFileSync(path.join(DIR, f), "utf8")).data.datoteka)
      .filter(Boolean).map((u) => decodeURIComponent(path.basename(u)))
  );
  const known = new Set(
    fs.readdirSync(DIR).filter((f) => f.endsWith(".md"))
      .map((f) => matter(fs.readFileSync(path.join(DIR, f), "utf8")).data)
      .map((d) => norm(d.izvajalec) + "|" + norm(d.title))
  );
  for (const name of fs.readdirSync(AUDIO).filter((f) => /\.(mp3|m4a)$/i.test(f))) {
    if (used.has(name)) continue;
    let tags = {};
    try { tags = (await parseBuffer(fs.readFileSync(path.join(AUDIO, name)), { mimeType: mime(name) })).common } catch {}
    const ext = path.extname(name).toLowerCase();
    // ime datoteke: odstrani številko skladbe, »(MP3)«, »320kbps«, oznake masteringa …
    const base = name.replace(/\.(mp3|m4a)$/i, "")
      .replace(/_.*$/, "")
      .replace(/\s*[\(\[]?(mp3|m4a|\d{3}\s*kbps|main|master(ed)?)[\)\]]?\s*/gi, " ")
      .replace(/^\d+[\s._-]*/, "").trim();
    const parts = base.split(/\s+[-–]\s+/).map((x) => x.trim()).filter(Boolean);
    const num = parts.findIndex((x, i) => i > 0 && /^\d+$/.test(x));
    const guessArtist = parts.length > 1 ? parts[0] : "";
    const guessTitle = num > 0 ? parts.slice(num + 1).join(" - ") : parts.length > 1 ? parts.slice(1).join(" - ") : base.replace(/([a-zčšž])([A-ZČŠŽ])/g, "$1 $2");
    const izvajalec = (tags.artist || guessArtist).trim();
    const title = (tags.title || guessTitle).trim();
    // preskoči, če skladba istega izvajalca in naslova že obstaja
    if (known.has(norm(izvajalec) + "|" + norm(title))) { console.log("↷ že obstaja", name); fs.unlinkSync(path.join(AUDIO, name)); continue }
    known.add(norm(izvajalec) + "|" + norm(title));
    let slug = slugify(`${izvajalec} ${title}`), n = 2;
    while (fs.existsSync(path.join(DIR, slug + ".md"))) slug = slugify(`${izvajalec} ${title}`) + "-" + n++;
    // datoteko preimenuj v varno ime brez presledkov in šumnikov
    const safe = slug + ext;
    if (safe !== name && !fs.existsSync(path.join(AUDIO, safe))) fs.renameSync(path.join(AUDIO, name), path.join(AUDIO, safe));
    const file = fs.existsSync(path.join(AUDIO, safe)) ? safe : name;
    fs.writeFileSync(path.join(DIR, slug + ".md"), matter.stringify("", { datoteka: "/audio/" + file, title, izvajalec, aktivno: true }));
    console.log("➕ nova skladba", slug);
    changed++;
  }
}

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
    const mm = await parseBuffer(buf, { mimeType: mime(d.datoteka) });
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
      await sleep(3500); // Apple: največ ~20 poizvedb na minuto
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
