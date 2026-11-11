# SonicTribe – spletna stran

Statična stran (Eleventy) gostovana na Netlify. Vsebino urejaš na **/admin** (prijava z GitHub računom).

## Urejanje
- **Skupaj smo ustvarili** – dosežki (koncerti, izidi, kampanje) s podstranmi Izhodišče / Ideja / Izvedba
- **Videospoti** – na prvi strani 6 najnovejših
- **Trgovina** – izdelki z gumbom do SumUp
- **Izvajalci** – fotografija, bio, povezave
- **Nastavitve strani** – besedila, kontakt, ekipa, radio, socialna omrežja

Vsako shranjevanje v /admin naredi commit na GitHub, Netlify pa v ~1 minuti objavi novo verzijo.

## Lokalno
```
npm install
npm start      # http://localhost:8080
```

## Radio
V /admin → **Radio** naložiš MP3 in vpišeš naslov + izvajalca. GitHub Action (»Obdelaj vsebino«) v nekaj minutah
dopolni trajanje, album, leto, naslovnico (iz MP3 ali Apple Music) ter povezavi na Apple Music in Deezer.
Spotify/YouTube/Tidal: prilepi povezavo, sicer gumb odpre iskanje skladbe. Radio predvaja skladbe po uri – vsi poslušalci slišijo isto skladbo ob istem času.
Če kdaj dobite pravi pretok (stream), ga vpišete v Nastavitve strani → Radio in ima prednost.

### Paketni uvoz skladb
Na GitHubu odpri mapo `src/audio` → **Add file → Upload files**, povleci vse MP3- ali M4A-datoteke (do 100 naenkrat, vsak do 25 MB)
in klikni **Commit changes**. V nekaj minutah vsak MP3 dobi svoj vnos v /admin → Radio (naslov in izvajalec iz
oznak v MP3 ali iz imena datoteke »Izvajalec - Naslov.mp3«), nato pa še trajanje, album, leto, naslovnico in povezave.
