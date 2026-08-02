# Plán — cesta k produkčnímu stavu

Stav k `794efe2`: hra se dá projít od A01 do P05, offline, na telefonu.
**Blokujících míst 0**, poznámek `todo` 25, testů 173.

Zbývající práce už není o textech. Papírová hra dělala věci, které aplikace
zatím jen cituje — mapy, předměty, podmínky postupu, osobní karty. Tenhle
seznam je o nich.

Odškrtávejte přímo tady (`- [x]`). Fáze jdou v pořadí podle toho, co brání
vzít telefon a jít ven.

---

## Proud A — čeká na autora

Běží souběžně, nic z toho neblokuje proud B kromě označených míst.

- [ ] **A1** · Vyplněná `kontrola-karet.html` — 166 karet ke kontrole proti tištěné hře
- [ ] **A2** · Digitální mapy 1–3 a chybějící obrázky karet (`lipa02.jpg` a další)
- [ ] **A3** · Souřadnice: body cestovních úkolů (hospody si dohledám sám) → blokuje Fázi 5
- [ ] **A4** · Schválení přepsaných pravidel P01–P05 → blokuje Fázi 4

---

## Fáze 1 — Inventář a předměty

Nejdřív, protože bez map se v terénu nehraje.

- [ ] Datový model předmětu (`games/nebakov/items.json`)
- [ ] Získávání: dopis + mapa 1 na startu, mapa 2 na C16, mapa 3 na G20
- [ ] Herbář: náhodná bylina z B12 na B07, až 4 další za −1 reputace každá
- [ ] Píšťalka z F05/F06/F10, zakrvácený kámen u ohrady (G08/G09)
- [ ] Podmínka `has_item` na volbě G18 („Odevzdat píšťalku“)
- [ ] Obrazovka inventáře v UI + vstup z menu
- [ ] Export logu průchodu — bez něj je zpětná vazba z terénu jen dojmy

*Hotovo, když:* projdu hru a v každém okamžiku vidím, co skupina nese, a mapa
je dostupná na dvě klepnutí.

## Fáze 2 — Podmínky postupu

Osm karet má „Podmínka postupu“ jen jako větu v textu: **C25, C26, D06, G17,
G23, H03, H05, H11**. Hráč z nich dnes odejde, aniž by ji splnil.

- [ ] Datový model podmínky postupu
- [ ] Karta nepustí dál, dokud se nevyhodnotí
- [ ] G23 konkrétně: 📜N12, a pro odměnu ji musí splnit dva členové výpravy
- [ ] Test, že se z těch osmi karet nedá odejít bez splnění

## Fáze 3 — Osobní karty a role na jednom telefonu

UI dnes vůbec neví o `heldCards`, takže klatba z C11 se nikde nezobrazí.

- [ ] C11: trvalý pruh „klatba: nemůžeš mluvit“ + tlačítko „dal jsem si panáka“
- [ ] D12: obrazovka „podej telefon hráči X“, s volbou pro dva telefony
- [ ] Analfabet vidí přeházený text (data už jsou v `roles.json` → `playerView`)

## Fáze 4 — Pravidla P01–P05 do menu

- [ ] Přepsat P01–P04 pro digitál (bez pouzder a balíčků) → **návrh autorovi (A4)**
- [ ] Zpřístupnit z menu jako nápovědu
- [ ] P05 přepsat na čistou závěrečnou obrazovku

## Fáze 5 — GPS s možností přepsat

Podle Q08c a Q30b. `geo.js` je hotová a prázdná, chybí souřadnice.

- [ ] Zóny hospod: Apolena, Křenovský šenk, Nebákov, Trosky, Vidlák, Semín
- [ ] Body cestovních úkolů → **čeká na A3**
- [ ] „Splněno“ ověří polohu do ~25 m; když nesedí, zeptá se a nechá pokračovat
- [ ] Zóna „mimo obec“ pro Lenocha — autor ji zatím nechal otevřenou

## Fáze 6 — Kostky a fyzické výzvy

- [ ] Volba „hodí aplikace“ / „hodíme sami“ s okénkem na výsledek
- [ ] Léčky v balíčku N a Potulný kostkař

## Fáze 7 — Úklid dluhu

- [ ] Sjednotit sémantiku podmínek: v `disableIf` znamená splněná podmínka
      „zamčeno“, u efektů (`when`) „provést“. Ve starším rejstříku se to míchá —
      `reputation` se obrací, `visited`/`has_item` ne. Dnes to drží jen proto,
      že se `visited` v `disableIf` používá jednou.

## Fáze 8 — Terénní test

Brána před dalším vývojem. Hra má být 8 hodin a 9–13 km; všechno, co dosud
víme, víme z testů a z prohlížeče na stole.

- [ ] Zkouška na jednom balíčku (B nebo C, ~1,5 h)
- [ ] Celý den
- [ ] Vyhodnotit log průchodu a co se ukázalo

---

## Multi-device — až po Fázi 8

Vize z odpovědi Q27 (lobby, ID hry, každý hráč se svým telefonem, obsah podle
role) je klient-server aplikace. Všechno dosavadní je offline PWA na jednom
zařízení. Není to nemožné, ale je to zlom, ne přírůstek — a validuje se to až
s lidmi v terénu.

Pojmy, které pro něj Fáze 1–3 stejně vytvářejí (inventář, osobní obsah,
zobrazení podle role), nejsou práce nazmar.
