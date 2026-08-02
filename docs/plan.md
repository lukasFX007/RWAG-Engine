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
- [ ] **A3** · Souřadnice — seznam je připravený v `docs/mista-k-doplneni.md`
- [ ] **A4** · Schválení přepsaných pravidel P01–P05 (návrh je hotový a v aplikaci)

---

## Fáze 1 — Inventář a předměty ✅

Nejdřív, protože bez map se v terénu nehraje.

- [x] Datový model předmětu (`games/nebakov/items.json`)
- [x] Získávání: dopis + mapa 1 na startu, mapa 2 na C16, mapa 3 na G20
- [x] Herbář: náhodná bylina z B12 na B07, až 4 další za −1 reputace každá
- [x] Píšťalka z F05/F06/F10, zakrvácený kámen u ohrady (G08/G09)
- [x] Podmínka `has_item` na volbě G18 („Odevzdat píšťalku“)
- [x] Obrazovka inventáře v UI + vstup z horní lišty (bližší než menu)
- [x] Export logu průchodu — bez něj je zpětná vazba z terénu jen dojmy

*Hotovo:* batoh je v horní liště vedle reputace, ukazuje počet a otevře se
jedním klepnutím. Skupina vyráží s dopisem a první mapou.

## Fáze 2 — Podmínky postupu ✅

Osm karet má „Podmínka postupu“ jen jako větu v textu: **C25, C26, D06, G17,
G23, H03, H05, H11**. Hráč z nich dnes odejde, aniž by ji splnil.

- [x] Datový model podmínky postupu
- [x] Karta nepustí dál, dokud se nevyhodnotí
- [x] G23 konkrétně: 📜N12, a pro odměnu ji musí splnit dva členové výpravy
- [x] Test, že se z těch osmi karet nedá odejít bez splnění

*Hotovo:* šest karet žádá náhodné setkání, G23 jmenovitě 📜N12 se dvěma úspěchy,
C25 je zákaz („nechoďte hlouběji do skal“), takže se jen potvrzuje. Panel má
jinou barvu než úkol — obojí zamyká volby a znamená to opak.

## Fáze 3 — Osobní karty a role na jednom telefonu ✅

UI dnes vůbec neví o `heldCards`, takže klatba z C11 se nikde nezobrazí.

- [x] C11: trvalý pruh „klatba: nemůžeš mluvit“ + tlačítko „dal jsem si panáka“
- [x] D12: obrazovka „podej telefon hráči X“, s volbou pro dva telefony
- [x] Analfabet vidí přeházený text (data už jsou v `roles.json` → `playerView`)

*Hotovo:* předání telefonu je na dvě klepnutí — jedno pro toho, kdo si bere
telefon, druhé, když ho vrací. Mezi nimi je text na obrazovce, mimo ně není.

## Fáze 4 — Pravidla P01–P05 do menu ✅

- [x] Přepsat P01–P04 pro digitál (bez pouzder a balíčků) — **znění je můj návrh, čeká na autora (A4)**
- [x] Zpřístupnit z menu jako nápovědu
- [x] P05 přepsat na čistou závěrečnou obrazovku

*Hotovo:* původní tištěný text zůstal v kartách v poli `printedText`, takže se
dá porovnat a nic se neztratilo. Znění nových pravidel jsem napsal sám — je
v druhém dotazníku ke kontrole.

## Fáze 5 — GPS s možností přepsat — mechanismus ✅, souřadnice ⏳

Podle Q08c a Q30b. Mechanismus je hotový, chybí čísla.

- [x] „Jsme na místě“ ověří polohu do 25 m; když nesedí, zeptá se
      („Podle GPS jste 340 m od místa. Přesto pokračovat?“) a nechá si odporovat
- [x] Splnění podle polohy se v deníku i v logu odliší od splnění na slovo
- [x] Seznam míst k doplnění: `docs/mista-k-doplneni.md` (`npm run docs:places`)
- [ ] Zóny hospod: Apolena, Křenovský šenk, Nebákov, Trosky, Vidlák, Semín → **A3**
- [ ] Souřadnice 27 cestovních úkolů → **A3**
- [ ] Zóna „mimo obec“ pro Lenocha — autor ji zatím nechal otevřenou → **A3**

*Stav:* dokud souřadnice nejsou, hra se hraje na čestné slovo přesně jako dřív —
tlačítko odhalí kartu a nikdo se na nic neptá. Jakmile se doplní, kontrola se
zapne sama, kartu po kartě.

## Fáze 6 — Vyhodnocení setkání a kostky ✅

Vyšlo z toho víc, než bylo v plánu: **žádná z 20 karet balíčku N nevyhodnocovala
svoji odměnu ani postih.** „Odměna: 😊“, „Postih: 😡“, „⚁⚂⚃⚄: 😡😡“ — všechno byl
jen text.

- [x] Volba „hodí aplikace“ / „hodíme sami“ s okénkem na výsledek
- [x] Léčky v balíčku N (N08, N10) a Potulný kostkař (N04)
- [x] Všech 19 setkání (kromě N01, což je pokyn) má tlačítka, jak dopadlo
- [x] Sedm hádanek má tlačítko „Ukázat řešení“ — to je náhrada balíčku O

*Hotovo:* po hodu se popis možnosti přepíše podle toho, na čem kostka stojí —
karta říká „⚁⚂⚃⚄: 😡😡“, takže hra tu otázku odpoví za hráče místo toho, aby ji
museli louskat ze seznamu.

## Fáze 7 — Úklid dluhu ✅

Předsunuto před zbytek: přidávat inventář na tu dvojznačnost by ji rozšířilo
z jednoho místa na dvacet.

- [x] Sjednotit sémantiku podmínek: v `disableIf` znamená splněná podmínka
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
