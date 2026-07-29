# Otázky pro autora hry — Tajemství Nebákova

Verze dotazníku: **1** · stav dat: commit `eac0da5` · 146 scén, 19 karet balíčku „N“

---

## Jak to vyplnit

Ke každé otázce je řádek `ODPOVĚĎ:`. Za dvojtečku napište buď **písmeno varianty**
(a/b/c…), nebo **vlastní text** — obojí je v pořádku. Můžete psát v čemkoli, kde jde
psát text (Poznámkový blok, Word, e‑mail). Formátování nehraje roli, důležité je jen
nechat na místě čísla otázek `Q01`, `Q02`, … abych odpovědi našel.

Řádek `POZNÁMKA:` je nepovinný — sem cokoli navíc.

Značky u otázek:

| Značka | Co znamená |
|---|---|
| 🔴 | **Bez odpovědi nejde hru dohrát.** Prosím vyplnit určitě. |
| 🟠 | Mění chování hry — bez odpovědi to funguje, ale možná špatně. |
| 🟡 | Ověření nebo kosmetika. Klidně přeskočte, když nemáte čas. |

**Nemáte-li čas na všechno:** stačí **Q01–Q09 a Q18** — to jsou věci, které brání hru
dohrát, a chybějící obsah. Zbytek jsou většinou kontroly, jestli text sedí na správné
kartě.

**Proč se ptám:** karty jsem přebral z prezentace „KCD Troskovice“. Na některých
slidech je vysázeno víc karet vedle sebe a strojová extrakce nezachovala jejich
hranice — takže vím, že text existuje, ale ne vždy jistě, ke které kartě patří.
Konec prezentace se navíc nestáhl celý.

---

# A. Blokuje hru

## Q01 🔴 · karta B02 — kam pokračovat po minutě ticha u pomníku?

**Kde to je:** na B03 (pomník padlým) je volitelný úkol „Držte minutu ticha za
padlé“ → vede na B02.

**Co mám v datech:** B02 dá skupině +1 reputace („místní si váží projevené úcty“)
a tím **končí**. Nemá žádné pokračování, takže se na ní hra zasekne. Je to jediné
místo v celé hře, kde se nedá pokračovat dál.

**Otázka:** Čím se pokračuje po B02?

Možnosti: **a)** zpět na B03 (a odtud „Jít rovnou za dobrodružstvím“ → B04) ·
**b)** rovnou na B04 (bylinkář pod stromem) · **c)** jiná karta

```
ODPOVĚĎ:
POZNÁMKA:
```

---

# B. Chybějící obsah

## Q02 🔴 · balíček „O“ — řešení hádanek

**Co mám v datech:** balíček „O“ v datech **vůbec není**. Karty O01, O02 a O03 jsou
podle prezentace na slidech 27 a 28, ale jejich obsah se nestáhl. Odkazuje se na ně
pět hádanek — vždy s pozicí na kartě („uprostřed“, „vpravo nahoře“), aby hráči
neviděli všechna řešení naráz.

**Otázka:** Jaké je řešení každé z těchto pěti hádanek? (Stačí odpověď, pozici na
kartě řešit nemusíme — v digitální verzi se řešení odkryje až po klepnutí.)

```
Q02a — „Mám města, ale žádné zlato. Mám domy, ale žádné lidi. Mám lesy, ale žádnou
        zvěř. Mám vodu, ale žádné ryby. Co jsem?“  (O01, uprostřed)
ODPOVĚĎ:

Q02b — „Každý mne jí, ale nikdo neloví, ani neseje. Nerostu na poli ani na stromech.
        Kvůli mému vzniku musí umřít moře, ale když já se dotknu vody, zhynu. Co jsem?“
        (O02, vpravo nahoře)
ODPOVĚĎ:

Q02c — „Můžu být všude, ale jsem málokde. Každý mne zná a čas od času si mne přeje.
        Pokud mne přivoláte, ztratím se. Je totiž velice těžké mne udržet. Co jsem?“
        (O03, uprostřed nahoře)
ODPOVĚĎ:

Q02d — „Mám jedno oko, ale i tak nevidím. Ač jsem malá, pro spoustu lidí jsem
        důležitá. Spojím i to, co zničil čas. Zakrývám živé, zatímco sama jsem neživá
        a nahá. Co jsem?“  (O02, uprostřed)
ODPOVĚĎ:

Q02e — „Jsou dva bratři, kteří se nikdy nepotkali. Nejí, nepijí, nechodí ven. Mnozí
        se za nimi vypravili, ale nikdy nedošli cíle. Ještě že Slunce je pravidelně
        navštěvuje. Znáte jejich jména?“  (O01, vpravo uprostřed a dole)
ODPOVĚĎ:
```

```
Q02f — je na kartách O01–O03 něco jiného než řešení hádanek (pokyny, obrázky, další
       informace)? A existuje karta O04? V přehledu kódů se objevuje, na slidech ne.
ODPOVĚĎ:
```

## Q03 🔴 · nedokončená hádanka (karta N19 nebo N20)

**Co mám v datech:** text je uříznutý přesně tady:

> „Potkali jste ženu, která má pro vás hádanku: ‚Kdybych byla živá, neunesla bych
> tolik jako teď. Uvnitř jsem sice dutá, ale často plná živo…‘“

Dál nic. Prezentace se v tomto místě přestala stahovat.

**Otázka:** Jak zní celý text hádanky, jaká je odměna a jaké je řešení?

```
Q03a — celý text hádanky
ODPOVĚĎ:

Q03b — řešení
ODPOVĚĎ:

Q03c — odměna (😊? něco jiného?)
ODPOVĚĎ:
```

## Q04 🔴 · jedna karta balíčku „N“ chybí úplně

**Co mám v datech:** balíček „N“ má podle přehledu kódy **N01–N20**, tedy 20 karet.
V datech mám 19 textů. Na slidu 28 (N17–N20) se stahování zastavilo uprostřed třetí
hádanky, takže čtvrtá karta ze slidu chybí bez jakékoli stopy.

**Otázka:** Co je na té chybějící kartě? (Pokud je jich ve skutečnosti jen 19 a jeden
kód se nepoužívá, napište to prosím taky — pak nic nechybí.)

```
ODPOVĚĎ:
```

## Q05 🟠 · balíček „N“ — které číslo patří které kartě

**Co mám v datech:** čísla znám jen u dvou karet — **N01** (Slečna s kosou, leží
navrchu balíčku) a **N12** (Střelecká výzva, vyvolává ji lovčí u konce cesty).
U ostatních 17 karet vím text, ale ne číslo, protože na slidech jsou čísla vysázená
zvlášť ve sloupci vedle textů.

**Otázka:** Doplňte prosím ke každému textu jeho kód. Volná čísla jsou
**N02–N11** a **N13–N20**.

| Karta (podle názvu / začátku textu) | Kód |
|---|---|
| Chudina v nouzi — „Přišlaaa bídaaa, mooor a hlaaad.“ | |
| Cikáni — potulní muzikanti, tancovačka | |
| Hádankář — „Mám města, ale žádné zlato…“ (kraj/mapa) | |
| Hádankář — „Každý mne jí, ale nikdo neloví…“ (sůl) | |
| Hádankář — „Můžu být všude, ale jsem málokde…“ (ticho) | |
| Hádankář — „Mám jedno oko, ale i tak nevidím…“ (jehla) | |
| Hádankář — „Jsou dva bratři, kteří se nikdy nepotkali…“ | |
| Hádankář — „Kdybych byla živá, neunesla bych tolik…“ (nedokončená, viz Q03) | |
| Léčka?! — kmen stromu na cestě | |
| Léčka?! — něco se zablesklo v křoví | |
| Nepořádek po nájezdu — uklidit po loupežnících z Řáholce | |
| Pomoc v nouzi — čeledíni odtáhli do Turnova | |
| Potulný kostkař! — hod na šesti kostkách | |
| Smutné ženy — muži odvedeni na frontu | |
| Zkažená voda — troskovická studna | |
| Zloděj! — „Okradli vás.“ | |
| Zranění — zakopnutí o kámen, bolavá noha | |

```
POZNÁMKA:
```

## Q06 🟠 · karty REP+ / REP−

**Co mám v datech:** na kartě P02 se mluví o „balíčcích s kartami kladné reputace
REP+ a záporné reputace REP−“. Samotné karty v datech nejsou — reputaci teď engine
počítá jen jako číslo.

**Otázka:** Co je na kartách REP+ a REP− napsané a nakreslené? Je na nich jen hodnota
(např. „+1“), nebo i text?

```
Q06a — co je na kartě REP+
ODPOVĚĎ:

Q06b — co je na kartě REP−
ODPOVĚĎ:

Q06c — má reputace ve hře nějaký strop nebo dno (nejvýš X, nejméně Y)? Kolik má
       skupina reputace na začátku hry?
ODPOVĚĎ:
```

## Q07 🟠 · obrázek `lipa02.jpg`

**Co mám v datech:** karty **C05** a **C06** odkazují na obrázek `lipa02.jpg`.
Ten soubor nemám — mám jen `lipa01.jpg`. Zatím se tam nezobrazí nic.

**Otázka:** Co je na obrázku `lipa02.jpg`? Máte ho někde k dispozici? (Klidně jen
popište, doplním ho potom.)

```
ODPOVĚĎ:
```

## Q08 🟠 · GPS zóny — hospody a „mimo obec“

**Co mám v datech:** dvě role mají výhodu/nevýhodu vázanou na místo, kde skupina
právě je:

- **Nenasyta** — „V hospodách a jejich okolí se vaší skupině počítá +1 k reputaci.“
- **Lenoch** — „Mimo obce se vaší skupině počítá −1 k reputaci.“

Aby to šlo vyhodnotit, potřebuje aplikace vědět, kde ty hospody a obce jsou. Souřadnice
nikde nejsou.

**Otázka:**

```
Q08a — které konkrétní hospody / místa s jídlem se tím myslí? (Stačí názvy nebo
       „hospoda v Troskovicích, hostinec u …“, souřadnice si dohledám.)
ODPOVĚĎ:

Q08b — co znamená „mimo obce“? Které obce jsou v okruhu hry?
ODPOVĚĎ:

Q08c — má aplikace polohu skutečně kontrolovat z GPS, nebo to má být na hráčích
       (tlačítko „jsme u hospody“)?
       a) kontrolovat z GPS  b) nechat na hráčích  c) obojí — GPS s možností přepsat
ODPOVĚĎ:
```

## Q09 🟠 · mapy, obálky a zvací dopis

**Co mám v datech:** hra počítá s fyzickými rekvizitami — třemi obálkami, mapami
(explicitně „Mapa 03“ na kartě G20) a zvacím dopisem, který se čte na kartě B09.
Dopis text má, mapy ne.

**Otázka:**

```
Q09a — co je v každé ze tří obálek?
ODPOVĚĎ:

Q09b — co je na mapách (kolik jich je, co zobrazují) a co přesně je zakreslené
       na „Mapě 03“, kterou Jarek na kartě G20 domaluje?
ODPOVĚĎ:

Q09c — v plně digitální verzi mapy nemůžou být papírové. Co s nimi?
       a) obrázek mapy v aplikaci  b) živá mapa s polohou  c) mapu vypustit a cestu
       popsat slovy  d) jinak
ODPOVĚĎ:
```

---

# C. Ověřit, na které kartě text sedí

Tohle jsou místa, kde jsem text musel ke kartě přiřadit odhadem. **Stačí odpovědět
„sedí“ / „nesedí, patří to na …“.**

## Q10 🟡 · karty A03, A12, A13, A14 (konec seznamovacího balíčku)

**Co mám v datech:**

- **A03** — „Jste zkušení dobrodruzi… Ihned si zvyšte reputaci! 😊😊“ + losování rolí
  + „Balíček A odložte, vezměte si B a přečtěte B01.“
- **A12** — výuka o úkolech („Na jedné kartě mohou být až dva úkoly…“) → A13
- **A13** — výuka o značce ⏳ (náhodné setkání) → A14, se dvěma variantami:
  `[😊] Pokračovat` a `[😐/😡] Pokračovat ➤ ⏳ a potom A14`
- **A14** — „A ještě jedna věc… připravíte se o část příběhu“ + rozdělení rolí →
  „Balíček A odložte, vezměte si B a přečtěte B01.“

Zdá se mi, že A03 a A14 dělají totéž (obě uzavírají balíček A a posílají na B01) —
což může být správně (dvě různé cesty, krátká a dlouhá), ale taky to může být tím,
že jsem text A03 přiřadil špatně.

```
Q10a — sedí texty na A03, A12, A13, A14?
ODPOVĚĎ:

Q10b — je správně, že balíček A končí buď na A03, nebo na A14, podle toho, jestli si
       hráči nechali vysvětlit pravidla?
ODPOVĚĎ:
```

## Q11 🟡 · karta A13 — směr podmínky

**Co mám v datech:** na A13 jsou dvě varianty téhož „Pokračovat“:

- `[😊]` → jde rovnou na A14, bez ničeho
- `[😐/😡]` → nejdřív náhodné setkání (⏳), potom A14

Vyhodnocuji to tak, že `[😊]` znamená **reputace vyšší než 0** a `[😐/😡]` znamená
**reputace 0 nebo méně**. Tedy: kdo má dobrou pověst, projde bez setkání; kdo ne,
narazí na setkání.

**Otázka:** Je to takhle správně, nebo je to naopak?

Možnosti: **a)** správně, jak to mám · **b)** naopak · **c)** jinak

```
ODPOVĚĎ:
```

## Q12 🟡 · karta H23 — co znamená samotné `[😐]`

**Co mám v datech:** na H23 (zatýkání v hospodě) jsou dvě volby:

- `[😐]` „To musí být omyl, jsme nevinní!“ → H24
- `[😡]` „Přiznáváme se, odveďte nás.“ → H26

Na H23 se hráči dostanou jen z H17 přes podmínku `[😐 < 1]`, čili s reputací 0 nebo
zápornou. Proto to vyhodnocuji tak, že `[😐]` = reputace **přesně 0** a `[😡]` =
reputace **záporná**.

**Otázka:** Je to tak?

Možnosti: **a)** ano · **b)** `[😐]` znamená „nezáporná“ a `[😡]` „záporná“ (v tomto
místě to vyjde nastejno) · **c)** jinak

```
ODPOVĚĎ:
```

## Q13 🟡 · karta B08 — text prokletí

**Co mám v datech:** B08 (jdete dál a ignorujete bylinkáře):

> „Náhle vás přemohla malátnost a v hrudi cítíte stísněný pocit. Je to snad předtucha
> něčeho zlého? … Je to snad trest za nějaké špatné rozhodnutí?“
>
> • 💀 Prokletí `[😐 > 3]`: ➤ 😡😡
> • 💀 Prokletí: Jakmile odložíte balíček „B“ ➤ ⏳
> • Ponechte si tuto kartu, dokud toto prokletí nepomine.

```
Q13a — sedí text i oba rámečky prokletí na B08?
ODPOVĚĎ:

Q13b — „Prokletí [😐 > 3]: ➤ 😡😡“ — kdy přesně se to spustí? Ihned při přečtení
       karty, pokud má skupina reputaci nad 3? Nebo někdy později?
ODPOVĚĎ:
```

## Q14 🟠 · karta B12 — bylinné karty

**Co mám v datech:** šest bylinných karet, všechny s kódem B12: **Kontryhel,
Čekanka, Zázvor, Kopretina řimbaba, Heřmánek, Mák vlčí**. Na kartě B07 (přijdete
blíž k bylinkáři) je pokyn „Zamíchejte karty B12 a náhodně si jednu vyberte ➤ B10“
a k tomu „🌿 Výhoda [😊]: Smíte si náhodně vybrat až 4 další, každou výměnou za
1 pozitivní reputaci.“

V enginu zatím bylinná karta **není** — pokyn je jen jako text a hráč si nic
neodnese.

```
Q14a — sedí popis „Pomůže ti od břichabolu. Máš-li běhání, nevolnost nebo větry…“
       ke Kontryheli? (Přiřazení popisů k bylinám jsem rekonstruoval.)
ODPOVĚĎ:

Q14b — „až 4 další, každou výměnou za 1 pozitivní reputaci“ — znamená to, že skupina
       za každou další bylinu ztratí 1 bod reputace? Nebo že si smí vzít další jen
       ten, kdo má reputaci kladnou, a nic neplatí?
ODPOVĚĎ:

Q14c — bere si bylinu jeden hráč (osobně), nebo celá skupina do společného inventáře?
ODPOVĚĎ:

Q14d — má bylina ve hře nějaký mechanický efekt (dá se někde použít), nebo je to jen
       příběhová ozdoba?
ODPOVĚĎ:
```

## Q15 🟡 · karty C12, C15, C19, C21

**Co mám v datech:**

- **C12** — „Ještě než ten chudák vydechl naposledy, vám něco stihl sdělit…“ →
  úkol „Dojděte k nebákovskému mlýnu“ → C15
- **C15** — „Teď už je vám víc než jasné, odkud stoupá ten dým… hromada rozvalin“ →
  úkoly „Dojděte zpět k lípě“ (C17) / „Občerstvěte se ve mlýně“ (C18)
- **C21** — skoro stejný text jako C15 („Na skále, kde dříve stál Nebákov, je jen
  hromada rozvalin…“), ale začíná „Běželi jste marně.“ → C13

C15 a C21 popisují totéž místo skoro stejnými slovy. To může být záměr (dvě cesty
k témuž výhledu), ale taky to může být tím, že jsem jeden text okopíroval na
špatnou kartu.

```
Q15a — sedí texty na C12, C15 a C21?
ODPOVĚĎ:

Q15b — mají C15 a C21 opravdu skoro totožný text?
ODPOVĚĎ:
```

## Q16 🟠 · karta C19 — dva rámečky „Následek“

**Co mám v datech:** na C19 („Muž je bledý a nedýchá. Přišli jste pozdě…“) mám dva
rámečky:

> • 💀 Následek: Ten, kdo dorazil poslední, si sám vyhodnotí setkání (⏳).
> • 💀 Následek: Celá skupina ztrácí reputaci (😡😡).

V prezentaci jsou tyhle dva rámečky vysázené **mezi** kartami C19 a C21, takže není
jasné, ke které patří. Přiřadil jsem je k C19 a **ubírám 1 bod** reputace.

```
Q16a — patří oba rámečky na C19? (Nebo některý na C21?)
ODPOVĚĎ:

Q16b — kolik bodů reputace se na C19 ubírá? V textu je nejdřív 😡 uprostřed vyprávění
       („Škoda. 😡“) a potom rámeček „ztrácí reputaci (😡😡)“. Je to celkem −2 (jen ten
       rámeček, 😡 v textu je jeho ohlášení), nebo −3 (obojí se počítá)?
       Teď mám v datech −1, což je špatně v každém případě.
ODPOVĚĎ:

Q16c — obecně: „😊😊“ a „😡😡“ znamenají vždy dva body? (Na A03 to tak beru: 😊😊 = +2.
       Na C27 taky: 😡😡 = −2.)
ODPOVĚĎ:
```

## Q17 🟠 · karty G08/G09 → G10/G11 (Jarek a zakrvácený kámen)

**Co mám v datech:** dvě varianty rozhovoru s Jarkem podle toho, jak se k němu
skupina chová:

- **G08** — vlídný Jarek („Tak to vážně netuším…“), nabízí, že poradí cestu →
  volba „Říct mu o kameni“ vede na **G10**
- **G09** — nevlídný Jarek („Tak si čeba tlhněte nohou! 😡“), skupina ztrácí
  reputaci → volba „Říct mu o kameni“ vede na **G11**
- **G10** — Jarek to bere v klidu („Ale minul sem. Opravdu!“), volby: „Nabídnout
  Jarkovi pomoc“ (bez podmínky) / „Vydat se k vodopádu“
- **G11** — Jarek to bere zle („Já nevím, ploč bych se zlovna vám měl zpovídat.
  Najděte ho a zepteje se ho sami.“), volby: `[😐 > 2]` „Nabídnout Jarkovi pomoc“ /
  „Vydat se k vodopádu“

Rozdělení G10/G11 mezi G08 a G09 je můj odhad — spároval jsem vlídnou variantu
s vlídnou a nevlídnou s nevlídnou.

```
Q17a — je to spárované správně (G08→G10, G09→G11)?
ODPOVĚĎ:

Q17b — na G10 nemá „Nabídnout Jarkovi pomoc“ žádnou podmínku, na G11 má [😐 > 2].
       V prezentaci se u téže volby objevují obě čísla — [😐 > 2] i [😐 > 3].
       Které je správné a na které kartě?
ODPOVĚĎ:
```

## Q18 🔴 · karta G17 — jak se na ni dá dostat

**Co mám v datech:** G17 (mrazivé místo mezi zdí stromů a hradbou skal, podmínka
postupu, potom úkol „Dojděte na palouk se seníkem“ → G24) je v datech
**nedosažitelná** — žádná karta na ni neodkazuje.

V prezentaci je na slidu 20 pokyn „👣 Úkol: Dojděte ke skále za odbočkou do lesa
➤ 📜G17“ a stojí přímo pod jedním z Jarkových popisů cesty k vodopádu. Jsou tam
ale **dva** takové popisy: jeden, kde Jarek půjčí mapu a zakreslí do ní cestu
(to mám jako **G20**, jeho úkol vede na G24), a druhý, kde mluví o skále „Pilíř“
jako o prvním záchytném bodu.

**Otázka:** Která karta posílá na G17?

Možnosti: **a)** G20 (a G17 je mezizastávka před G24) · **b)** jiná karta (které
číslo?) · **c)** G17 se ve hře nepoužívá

```
ODPOVĚĎ:
POZNÁMKA:
```

## Q19 🟠 · karta G23 — podmínka postupu na lovišti

**Co mám v datech:** G23 („Jste na lovišti vysoké zvěře.“) → úkol „Vraťte se na
palouk s rozpadlým stavením“ → G24. Podmínka postupu je zapsaná jako
„vyhodnoťte setkání (⏳)“.

Na slidu 20 jsou ale vedle sebe vysázené **dvě různé** podmínky postupu:

1. obecná — „👣 Podmínka postupu: vyhodnoťte setkání (⏳)“
2. konkrétní — „👣 Podmínka postupu: Vyhodnoťte 📜N12. Pro získání odměny za úspěch
   musí výzvu splnit dva členové výpravy.“ (tu mám teď na **G22**, lovčí u konce cesty)

**Otázka:** Která podmínka patří na G23?

Možnosti: **a)** obecná ⏳ (jak to mám) · **b)** konkrétně N12 (střelecká výzva) ·
**c)** jinak

```
ODPOVĚĎ:
POZNÁMKA:
```

## Q20 🟡 · karta G21

**Co mám v datech:** G21 — „Jarkův popis cesty nebyl zrovna podrobný… Loviště se
pozná podle toho, že je na něm krmelec a místo, kam dávají lovčí návnadu. A v
blízkosti také určitě musí stát posed.“ → volby „Vidíte posed i krmelec → G23“ /
„Nevidíte krmelec ani posed → G26“.

```
Q20 — sedí tento text na G21?
ODPOVĚĎ:
```

## Q21 🟠 · karta H14 — návaznost z H12

**Co mám v datech:** na **H12** (křížek svatého Jana z Nepomuk) je volba „Vydejte se
rovnou za písařem do Troskovic“ → **H14**. Ale H14 začíná slovy:

> „Rozhodli jste se nechat věci tak, jak jsou. Jarek žije v blahé nevědomosti, že
> záhadný cizinec se brzy vrátí tam, odkud přišel…“

To nezní jako pokračování „vydejte se rovnou za písařem“, ale jako důsledek úplně
jiného rozhodnutí — nechat mrtvolu být a nic Jarkovi neříkat.

**Otázka:** Sedí text na H14, nebo tam patří něco jiného? Případně: má na H14 vést
jiná volba než ta z H12?

```
ODPOVĚĎ:
POZNÁMKA:
```

## Q22 🟡 · karta H19 — konec hry

**Co mám v datech:** H19 je jeden ze čtyř konců („Úspěšně jste dokončili troskovické
dobrodružství a dokázali si zachovat kladnou reputaci.“) a začíná uprostřed věty:

> „Dokonce se mu prý podařilo dostat do přízně zlosynů, kteří za tou lstí stojí…“

Vypadá to, že první část textu (odkud ta citace pochází — nejspíš obsah dopisu) je na
předchozí kartě.

```
Q22a — sedí text na H19?
ODPOVĚĎ:

Q22b — čtyři konce (H19, H22, H25, H26) — jsou to opravdu jen tyhle čtyři, nebo
       jich je víc?
ODPOVĚĎ:
```

## Q23 🟡 · karta F14

**Co mám v datech:** F14 má jen jednu větu textu — „Je na čase zjistit, zda vás váš
úsudek dovedl na správné místo.“ — a dvě volby:

- „Pokud stojíte na rozcestí u ohrady s ovcemi v Tachově“ → G01
- „Pokud stojíte na jiném místě ➤ ztrácíte 2 body reputace (😡😡), vyhodnoťte
  setkání (⏳) a máte nový úkol: Dojděte na rozcestí u ohrady s ovcemi“ → G01

```
Q23a — je správně, že F14 nemá vlastní příběhový text, jen ty dva rámečky?
ODPOVĚĎ:

Q23b — druhá volba posílá taky na G01 (jen s pokutou). Je to tak?
ODPOVĚĎ:
```

## Q24 🟡 · karty P01–P05 (pravidla) — rozdělení textu

**Co mám v datech:** na slidu 5 je všech pět karet balíčku „P“ vysázených pohromadě
a extrakce nezachovala, kde jedna končí a druhá začíná. Rozdělil jsem to takto:

- **P01** — titul, „pro 3–8 hráčů“, balíčky A–H, „nečtěte si karty dopředu“
- **P02** — balíčky REP+/REP−, „N“ a „O“; tři obálky
- **P03** — balíček rolí, charakter (👤), výhody (⊕), nevýhody (⊖), výměna rolí
- **P04** — pět základních pravidel („Nepoužívejte jiné mapy ani mobilní telefony“ atd.)
- **P05** — co udělat po skončení hry (úklid karet do pouzder)

```
Q24 — je rozdělení textu mezi P01–P05 správné?
ODPOVĚĎ:
POZNÁMKA:
```

---

# D. Rozhodnutí o digitální verzi

Tohle nejsou chyby v datech — jsou to věci, které v papírové hře řešili hráči rukama
a v aplikaci je musí někdo rozhodnout. **Rozhodnutí je na vás**, já to jen potřebuju
vědět, abych to naprogramoval.

## Q25 🟠 · karty P01–P05 v digitální hře

**Stav:** hra teď začíná rovnou na A01 (v příběhu), takže P01–P04 nejsou vidět
vůbec. P05 je pořád závěrečná obrazovka a je na ní úklid fyzických karet („Balíček N
zamíchejte lícem dolů…“, „Všechny balíčky vraťte do příslušných pouzder“), což
v aplikaci nedává smysl.

**Otázka:** Co s pravidly?

Možnosti:
- **a)** přepsat pravidla pro digitál (bez pouzder a balíčků) a dát je do menu jako
  nápovědu; P05 přepsat na čistý závěr bez úklidu
- **b)** nechat pravidla jako karty na začátku hry, ale s přepsaným textem
- **c)** nechat pravidla úplně vypadnout, jen P05 přepsat
- **d)** jinak

```
ODPOVĚĎ:
POZNÁMKA:
```

## Q26 🟠 · kostky a fyzické výzvy

**Stav:** několik karet říká „hoďte si kostkou“ (např. léčky v balíčku N: „⚁⚂⚃⚄: 😡😡“)
nebo „hod na šesti kostkách“ (Potulný kostkař).

**Otázka:** Má kostkou hodit aplikace, nebo hráči?

Možnosti: **a)** aplikace (tlačítko „hodit“, výsledek vyhodnotí sama) · **b)** hráči
skutečnou kostkou a do aplikace zadají výsledek · **c)** aplikace hodí, ale výsledek
jde přepsat

```
ODPOVĚĎ:
```

## Q27 🟠 · karty pro jednoho hráče

**Stav:** některé karty se v papírové hře podávaly jednomu člověku nebo dvěma, ne
celé skupině:

- **C11** — osobní klatba („Od této chvíle nemůžeš mluvit.“) — nechává si ji ten,
  kdo mrtvému zavřel oči
- **D12** — nápověda pro dva hráče, kteří hrají stráže („Strážný vlevo mluví vždy
  pravdu, strážný vpravo je patologický lhář“) — ostatní ji nesmí vidět
- **B12** — bylinná karta, kterou si někdo odnese
- **zvací dopis** — čte se na kartě B09

**Otázka:** Jak to má fungovat v aplikaci, kde všichni koukají do jednoho telefonu?

Možnosti:
- **a)** obrazovka „podej telefon hráči X“, ten si to přečte sám a potvrdí
- **b)** aplikace to zobrazí všem a spolehne se na fair play
- **c)** hráči si k tomu nechají fyzické kartičky (aplikace jen řekne, kterou si vzít)
- **d)** jinak

```
ODPOVĚĎ:
POZNÁMKA:
```

## Q28 🟡 · schopnosti rolí, které se nedají naprogramovat

**Stav:** část výhod a nevýhod rolí je čistě o hraní role — např. Analfabet
„nemusíš číst ani počítat“, Pacifista „nemůžeš používat zbraně a nože“, Pedant
hlídá, že ostatní mluví spisovně, Lenoch si musí vždy sednout. Aplikace je teď
jen **připomíná** (vypíše je hráči, ale nic nekontroluje).

**Otázka:** Je to v pořádku, nebo má aplikace u některých z nich něco dělat aktivně
(např. hlásit „Lenochu, sedni si“)?

```
ODPOVĚĎ:
```

## Q29 🟡 · role

**Stav:** hra je podle vašeho potvrzení **od 3 hráčů**, rolí je v datech **8**
(Tupec, Pacifista, Analfabet, Nenasyta, Vzdělaný pedant, Šlechtic, Milovník přírody,
Lenoch). Aplikace neumí rozdat víc rolí, než jich je — takže strop je 8 hráčů, což
odpovídá tomu, co stojí na kartě P01 („pro skupinu 3 – 8 hráčů“).

```
Q29a — mají se role rozdávat náhodně, nebo si je hráči mají moct vybrat?
ODPOVĚĎ:

Q29b — jsou všechny role kompletní? Každá má teď jednu výhodu a jednu nevýhodu.
       Chybí u některé něco?
ODPOVĚĎ:
```

---

# E. Rámečky, které zatím nejsou naprogramované

Tyhle rámečky na kartách jsou, ale hra podle nich **nic nedělá** — protože nevím, kdy
přesně se mají spustit. V papírové verzi to hráči poznali sami, aplikace to potřebovat
mít napsané.

## Q30 🟠 · karta G24 — volitelná cesta k vodopádu za +2

**Co je na kartě:**

> 👑 Aktivita (volitelná): Cesta k vodopádu je opravdu dobrodružná, a proto tam chodit
> nemusíte… Ale můžete, pokud chcete umocnit svůj zážitek a získat reputaci ➤ 😊😊

**Stav:** je to jen text, reputaci to teď nepřidá.

```
Q30a — kolik to má dát? (😊😊 = +2?)
ODPOVĚĎ:

Q30b — jak má hráč potvrdit, že tam skutečně došel?
       a) tlačítko „byli jsme u vodopádu“ (na čestné slovo)
       b) podle GPS
       c) jinak
ODPOVĚĎ:
```

## Q31 🟠 · podmíněná prokletí (karty B08 a C22)

**Co je na kartách:**

- **B08** — „💀 Prokletí `[😐 > 3]`: ➤ 😡😡“ a „💀 Prokletí: Jakmile odložíte balíček
  „B“ ➤ ⏳“ + „Ponechte si tuto kartu, dokud toto prokletí nepomine.“
- **C22** — „💀 Prokletí `[😊]`: ➤ 😡😡“

**Stav:** ani jedno se teď nespustí, protože nevím, **kdy**. Podmínka je jasná
(reputace nad 3, resp. kladná reputace), ale ne okamžik.

```
Q31a — B08: „Prokletí [😐 > 3] ➤ 😡😡“ se spustí kdy?
       a) ihned při přečtení karty, pokud je reputace nad 3
       b) až ve chvíli, kdy skupina odloží balíček „B“
       c) jinak
ODPOVĚĎ:

Q31b — B08: „Jakmile odložíte balíček B ➤ ⏳“ — v digitální hře žádné balíčky nejsou.
       Kterou kartou začíná to, co bylo „odložení balíčku B“? (Přechod na C01?)
ODPOVĚĎ:

Q31c — C22: „Prokletí [😊] ➤ 😡😡“ se spustí kdy?
ODPOVĚĎ:

Q31d — obecně: „prokletí“ je jednorázový následek, nebo něco, co skupinu drží, dokud
       se nesplní nějaká podmínka? (Na B08 stojí „Ponechte si tuto kartu, dokud toto
       prokletí nepomine.“ — což zní na to druhé.)
ODPOVĚĎ:
```

---

# F. Cokoli dalšího

## Q32 🟡 · cokoli dalšího

```
Q32 — co vám na hře v aplikaci nesedí, co chybí, nebo co bylo v papírové verzi jinak,
      než jsem to popsal?
ODPOVĚĎ:
```

---

*Konec dotazníku. Děkuji — s odpověďmi doplním data a opravím to, co je špatně.*
