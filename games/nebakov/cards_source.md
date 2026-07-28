# KCD Troskovice – Tajemství Nebákova: zdrojový text herních karet

Referenční, needitovaná kopie textu fyzických karet z prezentace Google Slides
**„KCD Troskovice“**. Slouží pouze jako záloha a podklad pro digitalizaci –
**neobsahuje žádnou herní logiku**. Herní graf se buduje v `scenario.json`.

## Jak číst tento soubor

* Text byl získán automatickou extrakcí z prezentace. Google Slides vrací obsah
  **po slidech, nikoli po kartách** – na jednom slidu je zpravidla vysázeno několik
  karet (každá karta = jedno nebo více textových polí) a **pořadí polí ve výstupu
  neodpovídá jejich rozložení na slidu**. Proto jsou níže sekce členěné po slidech
  a u každé je uveden seznam kódů karet, které se na slidu vyskytují. Přiřazení
  konkrétního odstavce ke konkrétnímu kódu karty je interpretace – ta je (s
  vyznačenými nejistotami) provedena v `scenario.json`, ne zde.
* Kódy karet stojí ve výstupu často **na samostatném řádku** (např. `C14`) a bývají
  až *za* textem, ke kterému patří.
* Emoji ikony byly v původní extrakci poškozené (mojibake) a byly zpětně opraveny.
  Význam: 🔍 průzkum · 👣 cestování/postup · 👑 šlechetnost/odvaha · 🧠 znalosti ·
  🗡️ nátlak/násilí · 🌿 příroda · 💬 řeč · 💀 prokletí/nezdar · ⏳ náhodné setkání ·
  📜 odkaz na kartu · 😊 kladná reputace · 😐 žádná reputace · 😡 pokles reputace.
* `NEBO` odděluje varianty jednoho rozhodnutí. `➤` uvádí následek/odměnu.
* Slide s legendou značek byl v extrakci 7× zopakovaný – ponechána je jedna kopie
  (plus záměrně zkomolená varianta, která je na slidu také).
* **Zdrojová extrakce je na konci odříznutá** – poslední hádanka karty N20 není
  úplná. Zbytek je potřeba doplnit z prezentace.

## Stav digitalizace (viz `scenario.json`)

* Karty jsou v `scenario.json` uložené jako scény s `id` ve tvaru `card_<KÓD>`
  (karty balíčku „N“ bez jednoznačně dohledatelného kódu mají popisný slug,
  např. `card_smutne_zeny`). Pole `cardCode` u scény odkazuje na kód fyzické karty.
* Karty **B06, B11 a C01–C06** byly digitalizované už dříve jako scény
  `scene_206`, `scene_211`, `scene_301`–`scene_306`; **nejsou duplikované** –
  byla u nich pouze doplněna `cardCode` pro dohledatelnost.
* Scény, u kterých zdroj neuvádí návaznost (reputační/prokletí/předmětové karty,
  náhodná setkání balíčku „N“, referenční stránky), mají prázdné `choices`
  a pole `todo`. Pole `todo` je použité i tam, kde je přiřazení textu ke kódu
  karty rekonstruované a je potřeba ho ověřit proti originálu.
* **Dříve digitalizované scény tvoří jen zkrácenou ukázku** – `scene_303`
  a `scene_306` končí ve `scene_999` („Konec ukázky“), místo aby pokračovaly
  na `card_C20`, resp. `card_C07` / `card_C08`. Dokud se nepřepojí, není zbytek
  balíčků C–H z `startScene` dosažitelný. Skutečný začátek hry je `card_P01`
  (→ `card_P02` → … → `card_A01`); `startScene` zůstal záměrně nezměněný.
* Reputační efekty (`effects: [{type: reputation, …}]`) byly doplněné pouze tam,
  kde karta změnu reputace výslovně uvádí (😊 / 😡 / „zvyšte reputaci“ apod.).
* Rámečky, které neodkazují na jinou kartu (odměny, podmínky postupu, události ⏳,
  prokletí), jsou ve scéně zachované v textu v bloku „Na kartě je dále uvedeno“.

## Index kódů karet

| Karta | Slide(y) |
|---|---|
| A01 | 5, 6 |
| A02 | 6 |
| A03 | 6 |
| A04 | 6 |
| A05 | 6 |
| A06 | 6 |
| A07 | 6 |
| A08 | 6 |
| A09 | 6, 7 |
| A10 | 6, 7 |
| A11 | 7 |
| A12 | 7 |
| A13 | 7 |
| A14 | 7 |
| A29 | 3 |
| B01 | 6, 7 |
| B02 | 7, 8 |
| B03 | 8 |
| B04 | 8 |
| B05 | 8 |
| B06 | 8, 9 |
| B07 | 8 |
| B08 | 8 |
| B09 | 7, 8 |
| B10 | 8 |
| B11 | 8, 9 |
| B12 | 8, 9 |
| C01 | 8, 10 |
| C02 | 10 |
| C03 | 10 |
| C04 | 10 |
| C05 | 10 |
| C06 | 10 |
| C07 | 10 |
| C08 | 10, 11 |
| C09 | 10, 11 |
| C10 | 10, 11 |
| C11 | 11 |
| C12 | 11 |
| C13 | 11, 13 |
| C14 | 11, 13 |
| C15 | 11 |
| C16 | 11 |
| C17 | 11, 13 |
| C18 | 11, 13 |
| C19 | 11, 12, 13 |
| C20 | 10, 13 |
| C21 | 12, 13 |
| C22 | 12, 13 |
| C23 | 12, 13 |
| C24 | 11, 12 |
| C25 | 12 |
| C26 | 12 |
| C27 | 12 |
| D01 | 12, 13 |
| D02 | 13, 14 |
| D03 | 13, 14 |
| D04 | 14 |
| D05 | 14 |
| D06 | 14 |
| D07 | 13, 14 |
| D08 | 13, 14 |
| D09 | 14 |
| D10 | 14 |
| D11 | 13, 14 |
| D12 | 13, 15 |
| E01 | 12, 14, 15 |
| E02 | 15 |
| E03 | 15 |
| E04 | 15 |
| E05 | 15 |
| E06 | 15, 16 |
| E07 | 15, 16 |
| E08 | 16 |
| F01 | 16 |
| F02 | 16 |
| F03 | 16 |
| F04 | 16, 17 |
| F05 | 16, 17 |
| F06 | 17 |
| F07 | 17 |
| F08 | 16, 17 |
| F09 | 16, 17 |
| F10 | 17 |
| F11 | 16, 17 |
| F12 | 17 |
| F13 | 17 |
| F14 | 17, 18 |
| G01 | 18 |
| G02 | 18 |
| G03 | 18 |
| G04 | 18 |
| G05 | 18 |
| G06 | 18 |
| G07 | 18 |
| G08 | 18, 19 |
| G09 | 18, 19 |
| G10 | 19 |
| G11 | 19 |
| G12 | 19 |
| G13 | 19, 21 |
| G14 | 19, 21 |
| G15 | 19 |
| G16 | 19, 21 |
| G17 | 20, 21 |
| G18 | 19, 21 |
| G19 | 19, 20 |
| G20 | 1, 19, 20, 21 |
| G21 | 19, 20, 21 |
| G22 | 20 |
| G23 | 20 |
| G24 | 1, 20, 21 |
| G25 | 20 |
| G26 | 20 |
| H01 | 20, 21 |
| H02 | 21, 22 |
| H03 | 21, 22 |
| H04 | 21 |
| H05 | 21, 22 |
| H06 | 21, 22 |
| H07 | 21, 22 |
| H08 | 21, 22 |
| H09 | 22 |
| H10 | 22 |
| H11 | 22 |
| H12 | 22 |
| H13 | 22, 23 |
| H14 | 22, 23 |
| H15 | 22, 23 |
| H16 | 23, 24 |
| H17 | 4, 24 |
| H18 | 24 |
| H19 | 24 |
| H20 | 24 |
| H21 | 24 |
| H22 | 24 |
| H23 | 24, 25 |
| H24 | 25 |
| H25 | 25 |
| H26 | 25 |
| N01 | 5, 26 |
| N02 | 26 |
| N03 | 26 |
| N04 | 26 |
| N05 | 26 |
| N06 | 26 |
| N07 | 26 |
| N08 | 26 |
| N09 | 27 |
| N10 | 27 |
| N11 | 27 |
| N12 | 20, 27 |
| N13 | 27 |
| N14 | 27 |
| N15 | 27 |
| N16 | 27 |
| N17 | 28 |
| N18 | 28 |
| N19 | 28 |
| N20 | 28 |
| O01 | 27, 28 |
| O02 | 27, 28 |
| O03 | 27 |
| P01 | 5 |
| P02 | 5 |
| P03 | 5, 7 |
| P04 | 5 |
| P05 | 5, 24, 25 |

---

## Slide 01 – karta G20

*Kódy karet na slidu: G20, G24*

```text
G20

Jarek: “Dobže, že si necháte poladit. Co já se tam nachodil, kdyš sem byl mlačí. Vodíval sem si tam holky, hehe. Ale teď už tam zajdu jen občas, natlhat vlaní oka na mazání na klouby… Takže, běžte z kopce k Vidláku. potom doleva smělem na Želejov. No a skolo na konci lybníka je taková skála, Pilíž jí žíkáme. Za ní vede cesta do lesa. Pak je to tlochu složitý. Víte co? Půjčte mi tu mapu, já vám to zakleslím na dluhou stlanu.” Po chvíli čmárání vám mapu vrátil zpátky.  “Plvní záchytný bod je plo vás palouk s lozboženým seníkem.”
🔎 Vezměte si mapu v obálce označené “Mapa 03”
👣 Úkol: Dojděte na palouk se seníkem ➤ 📜G24
```

## Slide 02 – Úvodní dopis (Machna, paní z Nebákova)

```text
Ctihodní a stateční dobrodruzi,

k vám nechť doputují tato slova jako hlas z hradu Nebákova, jenž stojí na skále již po mnoho let a dosud se vždy opíral o věrnost svých lidí i přízeň osudu. Píši vám já, Machna, paní tohoto hradu, v čase, kdy nad našimi zdmi ulpívá stín neklidu a neblahého tušení.

Před nedávnem přišel na Nebákov muž neznámého jména i původu. Nežádal chléb ani nocleh jako jiní poutníci, nýbrž mluvil o věcech, jež zchladily krev i těm nejotrlejším. Pravil, že na Nebákov má v blízké době dopadnout zkáza, jejíž povahu nechtěl – či nemohl – plně vyjevit. Tvrdil však, že zná cestu, jak toto neštěstí odvrátit, a že bez jeho pomoci hrad i jeho lid čeká bídný osud.

Cizinec nyní na hradě setrvává. Je mu poskytnuto přístřeší a strava, avšak je držen pod dohledem a stranou očí hradní posádky i prostého lidu. Jeho řeč je podivná, avšak ne řeč blázna. V očích má cosi, co nedá spát, a slova jeho se vpíjejí do mysli jako rez do železa.

Při jedné příležitosti se do rukou hradních dostal jeho deník. Nevíme, zda jej vydal úmyslně, či jej ztratil z nedbalosti. Listy jsou popsány písmem a znaky, jež nikdo z nás nepoznává – snad jde o cizí řeč, snad o záměrně skrytou šifru. Ať je tomu jakkoli, deník dosud nevydal svá tajemství a spíše přidal další otázky než odpovědi.

Proto se na vás obracím. Je třeba zjistit, kým onen muž ve skutečnosti je, odkud přišel a jaká hrozba má Nebákovu viset nad hlavou. Zda mluví pravdu, či nás chce svést z cesty strachem a klamem. Takový úkol žádá bystrou mysl, pevnou ruku i odvahu čelit věcem skrytým – i těm, jež jsou psány mezi řádky.

Po jistý čas nebudu moci na hradě setrvat a zůstanu v Ratajích, kde mne vážou jiné povinnosti. Správu Nebákova po tu dobu převezme pan Bartoloměj, muž rozvážný a věrný, jemuž můžete v mezích jeho pravomocí důvěřovat. Cizinec bude po tuto dobu na hradě trpěn, avšak bez rozhodujícího slova – dokud nebude známa pravda.

Přijmete-li tuto výzvu, dostane se vám pohostinství, ochrany hradních zdí a odměny, jež bude úměrná tomu, co odhalíte. Především však můžete být těmi, kdo odvrátí zlo dříve, než se dá do pohybu.

Nechť vás při cestě i při slovech provází bdělost a rozvaha.

Dáno v dobré víře a s nadějí,

Machna, paní z Nebákova
psáno v čase nejistém, léta Páně 1423
```

## Slide 03 – Legenda značek (rub karty; v extrakci 7x zopakováno, ponechána 1 kopie)

*Kódy karet na slidu: A29*

```text
Stručný přehled značení na kartách:
📜A29 ⇨ najděte a přečtěte kartu A29)

              ⇨ rozhodnutí (= vyberte si jednu z možností)

[Sedíte] ⇨ podmínka uvedené akce
😊 ⇨ kladná reputace (= více než 0)  / zvýšení reputace
😐 ⇨ žádná reputace (= 0 bodů)
😡 ⇨ špatná reputace (= méně než 0) / pokles reputace
⌛ ⇨ náhodné setkání (= vrchní karta z balíčku “N”)

Obecné označení charakteru akce:
🔍 průzkum, zvídavost	            👣 cestování, Postup
👑 šlechetnost, odvaha            🗡️ nátlak, násilí
🌿 příroda	           	            🧠 znalosti
ROLE
NEBO

<!-- v prezentaci následuje ještě záměrně zkomolená („nečitelná“) varianta téže legendy -->

Z ručníku příklad zač není na kraťák:
📜A29 ⇨ Naděje a proč tetě kapru A29

              ⇨ rozsednutí (= vyrob trsy je den mužnosti)

[Slídíte] ⇨ pomníka u vadné askety
😊 ⇨ kalná pera tance (= visí lež ó) / hýření rukavice
😐 ⇨ žínka Pepo rance (= 0 dubů)
😡 ⇨ šlapaná tupé ruce (= mele seš ó) / kole se petlice
⌛ ⇨ záhadné spékání (= kachní zvratka kalíšku “N”)

Ovesné koz močení barák berou raci:
🔍  k růstům, zhýralost            👣 Sesouvání, odstup
👑 plešatost, podlaha               🗡️ patlák, ne sílí
🌿 přeškoda 	            🧠 známosti
ROLE
NEBE
```

## Slide 04 – Karty rolí (Tupec, Pacifista, Analfabet, Nenasyta, Vzdělaný pedant, Šlechtic, Milovník přírody, Lenoch)

*Kódy karet na slidu: H17*

```text
Tupec

👤 Hned po porodu jsi spadl na hlavu. Snad kvůli tomu věci chápeš pomaleji. Ale ostatní tolerují tvůj snížený intelekt a jsou k tobě ohleduplní.

⊕︀ [1/hru]: Tvoje skupina může ignorovat podmínku rozhodnutí na libovolné kartě (vyjma karty H17).

⊝ [vždy]: Pokud se na něco zeptáš, musí ti to dotazovaný říci dvakrát, abys to pochopil. Tvých přátel se to však netýká.

PACIFISTA

👤 Vyhýbáš se konfliktům a příčí se ti násilí. Vše raději řešíš mírovou cestou. Při pohledu na krev se ti dělá zle a okamžitě odvracíš zrak.

⊕︀ [začátek]: Vaše skupina získává +1 k reputaci (😊).

⊝ [vždy]: Nemůžeš používat zbraně a nože.

Analfabet

👤 Jsi člověk z prostých poměrů a vzdělání se ti nikdy nedostalo. Neovládáš žádný cizí jazyk. Když tě zaujme nějaký nápis, ptáš se ostatních, co to je.

⊕︀ [vždy]: Nemušíš nechávat spropitné.

⊝ [vždy]: Neumíš číst ani počítat.

Nenasyta

👤 Jako nejmladší dítě jsi se musel hodně snažit, aby na tebe něco zbylo. Pokud někdo z tvých přátel něco jí a ty ne, snažíš se ze všech sil získat od něj alespoň jedno sousto.

⊕︀ [vždy]: V hospodách a jejich okolí se vaší skupině počítá +1 k reputaci (😊).

⊝ [vždy]: Pokud jsi u místa, kde se prodává jídlo si musíš něco koupit a hned to sníst.

Vzdělaný pedant

👤 Byl jsi na učení jazyka českého v Kutné Hoře. Hlídáš to, že ostatní mluví spisovně a jak se patří. A pokud se tak nestane, řádně je na to upozorníš. Často však k jejich nelibosti.

⊕︀ [1/hru]: Když se musíte rozhodnout, můžeš se podívat, co vás čeká a teprve poté si vybrat.

⊝ [následek]: Po následném náhodném setkání vyhodnoťte ještě jedno.

Šlechtic

👤 Máš urozený původ. … nebo si to alespoň myslíš. Nebavíš se s nikým, kdo viditelně nenosí nějaký šperk. A pokud tě takový člověk osloví, prostě ho ignoruješ. O sobě mluvíš výhradně v první osobě množného čísla.

⊕︀ [1/hru]: Vaše skupina může ignorovat ztrátu reputace (😡).

⊝ [vždy]: Platíš jako poslední a musíš dávat vyšší spropitné než ostatní.

Milovník přírody

👤 Miluješ přírodu a zvlášť zvířata. To samozřejmě znamená, že nejíš maso. Jakmile vidíš někoho jíst maso, cítíš osobní odpovědnost ho napomenout.

⊕︀ [1/hru]: Vaše skupina může považovat úkol charakteru příroda (🌿) za splněný.

⊝ [vždy]: Jíš pouze bezmasá jídla.

Lenoch

👤 Už od mala jsi pohodlný. Jakmile se vaše skupina jen na chvíli zastaví, musíš si hned sednout. A když není poblíž lavice ani pařez, sedneš si prostě na zem. A zvedáš se zásadně jako poslední člen ve skupině.

⊕︀ [1/hru]: Vaše skupina může předejít náhodnému setkání (⌛).
⊝ [vždy]: Mimo obce se vaší skupině počítá
-1 reputace (😡).
```

## Slide 05 – karty P01–P05 (pravidla, balíčky, role, úklid po hře)

*Kódy karet na slidu: A01, N01, P01, P02, P03, P04, P05*

```text
P02

Ve hře platí pouze pár základních pravidel:
Nepoužívejte jiné mapy ani mobilní telefony. vše co potřebujete pro řešení situací, máte v rukou a hlavě.
Nedívejte se na karty dříve než k tomu budete vyzváni hrou.
Buďte poctiví vůči hře i vůči sobě navzájem.
Pokud chcete udělat ústupek, musí s tím souhlasit všichni.
Ale hlavně se bavte a užijte si výlet!
Co udělat po skončení hry:
Balíček “N” zamíchejte lícem dolů a navrchu nechte N01.
Karty reputací vraťte do příslušného balíčku (REP+ / REP-)
Ostatní balíčky srovnejte lícem dolů podle čísel (O1 navrchu).
Na spodu každého balíčku nechce kartu k tomu určenou.
Všechny balíčky vraťte do příslušných pouzder.
mapy a dopis vraťte do příslušných obálek a příslušného pouzdra.
Karty P01 - P05 nechce otočené lícem nahoru (01 navrhu).
A nezapomeňte se vrátit a zažít dobrodružství znovu!

Troskovické dobrodružství: Tajemství Nebákova

Dobrodružství je určeno pro skupinu 4 - 8 hráčů.
Celá hra, až na pár vyjímek, sestává z několika balíčků karet.
Příběhové balíčky jsou označeny “A” až “H”. Ty vás postupně provedou celým dobrodružstvím. Balíčky ani karty v nich si nečtěte dopředu ani zpětně. Není totiž pravidlo, že by za sebou karty šli popořadě podle čísel a tak by se mohlo stát, že se připravíte o moment překvapení, a to nejen při dalším průchodu hrou.
P01
Dále jsou tu balíčky s kartami kladné reputace “REP +” a záporné reputace “REP -” a balíčky označené písmeny “N” a “O”.
Karty z těchto balíčků si budete brát a vracet zpět podle konkrétní situace ve hře nebo ve chvíli, kdy vás k tomu hra vyzve (například pomocí události). Nepotřebný balíček je lepší vždy vrátit do pouzdra, aby se vám karty nepomíchaly.

V neposlední řadě jsou tu tři obálky. K jejich otevření a odhalení jejich obsahu vás hra také včas vyzve.
➤ Kartu P01 vraťte do pouzdra a pokračujte kartou P02.
➤ Kartu P02 vraťte do pouzdra a pokračujte kartou P03.
➤ Vezměte si balíček “A” a přečtěte kartu A01.
➤ Kartu P04 vraťte do pouzdra.

P04
Aby byla hra záživnější, je pro vás připravený balíček rolí. Každá z rolí má daný charakter (👤), výhody (⊕︀) a nevýhody (⊝).

Role si rozdělíte na konci seznamovacího  balíčku, jakmile vás k tomu hra vyzve. Každý si poté náhodně vylosujte z balíčku rolí jednu kartu, představí se přečtením příslušné karty ostatním a začne se podle ní chovat. Na rubu karty je také stručný přehled značek.

Pokud si budete chtít roli s někým vyměnit, musí s tím souhlasit všichni ostatní hráči! Nepřidělené role poté vrátíte zpět do pouzdra.
➤ Kartu P03 vraťte do pouzdra a pokračujte kartou P04.
P03
P05

Alanafbet

👤 Jsi čvoljek sporsýtch pomjerů a vdzěnálí se ti nidky nedosalto. Noevádláš žándý cyzí jazik. Kydž tě zajume někajý npáis, ptáš se osatntích, co to je.

⊕︀ [vdžy]: Nmeusíš nechváat srpopitné.

⊝ [vdžy]: Nemuíš čsít ani počtíat.
```

## Slide 06 – karty A01–A08 (+ A14) – seznamovací balíček

*Kódy karet na slidu: A01, A02, A03, A04, A05, A06, A07, A08, A09, A10, B01*

```text
Ale no tak. Žádný učený přeci z nebe nespadl. Pamatujte, že chování ovlivňuje vaši reputaci. Tu můžete získat, ale i ztratit. A na základě vaší reputace s vámi někteří lidé jednají.
Podle toho, jestli reputaci získáte nebo ztratíte si buď vezmete, nebo odevzdáte příslušnou reputační kartu. Všímejte si na kartách symbolů 😊 nebo 😡. Jejich význam je následující:

Nyní si reputaci snižte (😡). Příště se už řiďte symboly na kartách.
Při dobrodružství narazíte i na symboly týkající se reputace. Tu můžete získat, ale i ztratit. A na základě vaší reputace s vámi někteří lidé jednají.
Podle toho, jestli reputaci získáte nebo ztratíte si buď vezmete nebo odevzdáte příslušnou reputační kartu. Všímejte si na kartách symbolů 😊 nebo 😡. Jejich význam je následující:

Nyní si reputaci zvyšte (😊). Příště se už řiďte symboly na kartách.
A06
A07
🔍 Pokračovat ve výuce ➤ 📜A08
🔍 Pokračovat ve výuce ➤ 📜A08
😊: +📜😊 nebo -📜😡
😡: +📜😡 nebo -📜😊
😊: +📜😊 nebo -📜😡
😡: +📜😡 nebo -📜😊

Některá rozhodnutí budou podmíněna. Pokud tomu tak bude, podmínka bude uvedena v hranatých závorkách.

Může se například týkat stavu vaší reputace. Význam je následující:
	😊: Kladná reputace (více než 0 bodů reputace)
	😐: Žádná reputace (0 bodů reputace)
	😡: Špatná reputace (méně než 0 bodů reputace)
 Zda podmínku reputace splňujete, zjistíte sečtením reputační karet.
A08
🔍 Pokračovat ve výuce
➤ 📜A09
👣 Vyrazit rovnou do akce
     ➤ 📜A10
NEBO
A01

Vítejte vážení a ctění hrdinové!

Jistě už se nemůžete dočkat, až společně prožijete následující dobrodružství!
Avšak dříve než se na něj vydáte, budete chtít zjistit, nebo si možná připomenout, jak to všechno bude probíhat.

🔍 Pokud jste toto dobrodružství ještě nikdy neprožili, určitě pokračujte čtením karty A02, abyste se dozvěděli základy hraní.

🧠 V případě že už jste toto dobrodružství prožili můžete otočit rovnou kartu A03. V takovém případě se rozhodněte sami..

Ne vždy to bude tak snadné. Na kartách budou i rozhodnutí. A jednou provedené rozhodnutí nelze jednoduše vzít zpět!

Rozhodnutí poznáte podle značky              mezi jednotlivými akcemi.
Většina rozhodnutí má následek, který je uvedený za šipkou (➤) u toho konkrétního rozhodnutí.

Co znamená symbol 📜 už víte díky předchozí kartě. Tak si to hned zkuste.
A04
🔍 Pokračovat ve výuce
➤ 📜A05
👣 Vyrazit rovnou do akce
     ➤ 📜A06

              Nyní si každý z vás vylosujte svojí roli.
              Nezapomeňte, že Jakmile se s rolemi všichni
              seznámíte, ihned se podle nich musíte chovat.

A teď už vzhůru na cestu!
👑 Audentes fortuna Iuvat! 👑
NEBO
A03
Balíček “A” odložte. Vezměte si balíček “B” a přečtěte B01.
NEBO

Karty popisují, co se děje kolem vás - Použijte svou představivost.

Ve spodní části karty mohou být v rámečcích napsané pokyny týkající se toho, co máte udělat. Pokud je na kartě uvedeno například “📜A04” znamená to, že si máte vzít kartu 04 z balíčku “A”.
A zpravidla byste měli tu stávající ihned vrátit zpět do příslušného balíčku. Kdy si kartu naopak ponechat se dozvíte dále.
A případné výjimky budou uvedené na konkrétní kartě.
A02
👣 Odložte do balíčku “A” karty A01 a A02.
👣 Pokračovat ve výuce
➤ 📜A04

Možná vás na kartách zaujal symbol 🧠, 🔍 nebo 👣.
A v průběhu dobrodružství narazíte i na další symboly. Symbol před rozhodnutím nebo úkolem, je obecné označení charakteru dané akce. Zde je přehled a obecný význam některých z nich:

🔍 průzkum, zvídavost	👣 cestování, Postup
👑 šlechetnost, odvaha	🗡️ nátlak, násilí
🌿 příroda		🧠 znalosti
A05
🔍 Pokračovat ve výuce
     ➤ 📜A07
👣 Vyrazit rovnou do akce
➤ 📜A06
NEBO
Jste zkušení dobrodruzi. A takové mají v místním kraji lidé rádi. Ihned si zvyšte reputaci! 😊😊
```

## Slide 07 – karty A09–A14, B01, B02

*Kódy karet na slidu: A09, A10, A11, A12, A13, A14, B01, B02, B09, P03*

```text
Úkoly budou tvořit velkou část vašeho dobrodružství. Je dobře, že se o ně zajímáte a chcete se něco naučit.

Úkoly nejsou běžné akce a vždy vyžadují vaší interakci s okolím.

Na jedné kartě mohou být až dva úkoly. Některé povinné, jiné pouze volitelné. Pokud se musíte rozhodnout, smíte si vybrat pouze jeden.

A až splníte vybraný povinný úkol z karty, vraťte ji do balíčku, pokud vám ovšem karta neříká něco jiného.

Když bude na kartě značka ⏳, znamená to, že vás potkalo náhodné setkání. V takové případě otočte vrchní kartu z balíčku “N” a nahlas ji přečtěte.Vyhodnoťte ji dříve, než budete pokračovat v dobrodružství,  pokud není uvedeno jinak.
Můžete také narazit na výrazy “událost, “poslání”, “prokletí” a jiné, ale s tím už si určitě poradíte.

Víc už toho teď vědět nepotřebujete.

A ještě jedna věc … díky, nebo snad kvůli vašíme rozhodnutím se možná připravíte o část příběhu. Budiž vám to motivací k tomu, abyste se do dobrodružství pustili znovu a příště se rozhodli jinak.

Nyní si rozdělte role a potom už vzhůru za dobrodružstvím!
(Chcete-li připomenou, jak fungují role, podívejte se na kartu P03.)

👑 Audentes fortuna Iuvat! 👑
A12
A13
A14
Balíček “A” odložte. Vezměte si balíček “B” a přečtěte B01.

To myslíte vážně? 😡 Je chválihodné, že jste stateční, ale i statečný hrdina musí umět naslouchat a učit se.
Budou před vámi i rozhodnutí, která vám nabídnou úkol. Úkoly nejsou napsané v rámečku, ale na svitku. Pokud si takové rozhodnutí vyberete a úkol přijmete, kartu si ponechte, dokud úkol nesplníte.
Případná odměna za úkol je vždy uvedena za šipkou (➤).
Pokud je odměnou za úkol další karta, můžete si ji přečíst až po jeho splnění.
A10

Výborně! Jste stateční a zároveň rozvážní. A toho si lidé cení. 😊
Budou před vámi i rozhodnutí, která vám nabídnou úkol. Úkoly nejsou napsané v rámečku, ale na svitku. Pokud si takové rozhodnutí vyberete a úkol přijmete, kartu si ponechte, dokud úkol nesplníte.
Případná odměna za úkol je vždy uvedena za šipkou (➤).
Pokud je odměna za úkol další karta, můžete si ji přečíst až po jeho splnění.
A09

Co jste to za hrdiny, když vás nezajímá, jak plnit úkoly? 😡
budou tvořit velkou část dobrodružství, tak hezky poslouchejte!

Úkoly nejsou běžné akce a vždy vyžadují vaší interakci s okolím.

Na jedné kartě mohou být až dva úkoly. Některé povinné, jiné pouze volitelné. Pokud se musíte rozhodnout, smíte si vybrat pouze jeden.

Jakmile splníte vybraný povinný úkol z karty, vraťte ji do balíčku, pokud vám ovšem karta neříká něco jiného.
A11
👣 Vyrazit rovnou do akce
➤ 📜A11
👣 Vyrazit rovnou do akce
➤ 📜A11
🔍 Pokračovat ve výuce ➤ 📜A13
🔍 Pokračovat ve výuce ➤ 📜A13
👣 [😐/😡] Pokračovat
➤ ⏳ a potom 📜A14
👣 [😊] Pokračovat
     ➤ 📜A14
🔍 Zjistit více o úkolech
     ➤ 📜A12
NEBO
🔍 Zjistit více o úkolech
     ➤ 📜A12
NEBO
NEBO

B01
🔍 Úkol:
Přečtěte si zvací dopis
➤ 📜B09
🔍 Úkol (volitelný):
Osvěžte se v místním hospůdce ➤ 😊
Povoz vás vysadil u tábořiště
v Troskovicích. Vzal si peníze
za cestu a teď už odjíždí pryč.

Dříve, než vyjdete za dobrodružstvím
si přečtete zvací dopis, na základě kterého jste se sem vydali. A můžete to klidně udělat u dobrého pití.

Ačkoliv jste je neznali, vážíte si toho, jakou oběť přinesli.

Zatímco jste zde stáli a mlčky rozjímali, všimli si vašeho chrabrého činu kolemjdoucí. Co nevidět tato událost roznese po okolí.

A místní si váží projevené úcty vůči jejich hrdinům. 😊
B02
```

## Slide 08 – karty B01–B12 (Troskovice, pomník, bylinkář, cesta na Nebákov)

*Kódy karet na slidu: B02, B03, B04, B05, B06, B07, B08, B09, B10, B11, B12, C01*

```text
Náhle vás přemohla malátnost a v hrudi cítíte stísněný pocit.
Je to snad předtucha něčeho zlého? Nebo jste si právě uvědomili, že je pro vás tento kraj cizí a může vás ledacos překvapit?
Je to snad trest za nějaké špatné rozhodnutí?

Pomník je věnován českým hrdinům z Troskovic a blízkého okolí, kteří padli ve Velké válce.

Čtete si jména, která tu jsou uvedená a říkáte si, kolik mladých životů bylo ve válce zbytečně promarněno.
👑 Úkol (volitelný):
Držte minutu ticha za padlé ➤ 📜B02
Rozložili jste mapu a snažíte se v ní zorientovat. Jsou v ní viditelně zakreslené důležité záchytné body. Takže i když to tu neznáte, s touhle mapou by se vám zde mohlo dobře cestovat. Hlavní pro vás je, že je tam vyznačená cesta na Nebákov. A je teď cíl vaší cesty.

Také vás zaujala značka pomníku kousek odsud. Můžete se jít podívat co připomíná, nebo se vydat rovnou za dobrodružstvím.
👣 Jít rovnou za dobrodružstvím ➤ 📜B04
B05
B03
🔍 Úkol:
Dojděte k pomníku
➤ 📜B03
NEBO
👣 Vydat se rovnou za dobrodružstvím ➤ 📜B04

Ve stínu vysokého stromu postává starší pohublý muž v ošuntělých hadrech.
V ruce drží hůl a přes rameno má tlumok se svitky.

Gestem naznačuje, ať přijdete blíž.

“Zdravím vás dobří lidé. Žel, po delší době jsem byl                    donucen opustit svou jeskyni v Apoleně. Strávil jsem tam mnoho let. studoval jsem byliny a trávil čas přípravou mastí a léčivých odvarů. Rozhodl jsem se, že se o své nabyté vědomosti budu dělit s
B04
B07
B08
🌿 Zamíchejte karty B12 a náhodně si jednu vyberte ➤ 📜B10
🌿 Výhoda [😊]: Smíte si náhodně vybrat až 4 další, každou výměnou za 1 pozitivní reputaci.
🔍 Pokračovat v dobrodružství ➤ 📜B10
🔍 Přijít blíž k němu
➤ 📜B07
👣 Ignorovat ho
    ➤ 📜B08
NEBO

ostatními. Už mám svá léta a můj čas se blíží. Prosím, vezměte si něco málo z mých znalostí. A máte-li dobrou pověst, klidně i víc.”

Teď, když mezi vámi není žádný pacifista, na jehož znechucený výraz byste se museli koukat a poslouchat jeho poznámky, můžete se pustit do ohledání místa.
Nezapomeňte ho ale vzít s sebou, až odsud půjdete pryč a informovat ho o postupu. Ale v jeho zájmu možná vynechejte zbytečné detaily.
B06
Balíček “B” odložte. Vezměte si balíček “C” a přečtěte C01.
👑 Poslání: Dokud bude aktivní balíček “C”, postarejte se o to, aby se na tomto místě nenacházel žádný pacifista.

Vaše kroky by nyní ale už vážně měli vést na Nebákov. Správce hradiště vás zajisté očekává.

Na mapě je cesta vyznačená červenými směrovkami. Vede skrze slatějov a do Ždáru, kde, jak známo, roste tisíciletá lípa. Ta je asi v půli cesty a mohla by vám snad poskytnout stín pro krátký odpočinek. Od lípy vás mapa vede dále k mlýnu a pak konečně na hrad.
B10
⏳ Událost:
Dojdete na rozcestí “Svitačka” ➤ ⏳
👣 Úkol:
Dojděte k tisícileté lípě
➤ 📜B11

K dopisu je přiložena mapa, která by vás měla dovést na Nebákov.

Avšak pokud si kdykoliv nebudete vědět rady, můžete požádat o pomoc někoho z místních. Ale pozor, nemají tu rádi cizince a proto za každou takovou pomoc ztratíte jednu kladnou reputaci.
(Pokud je vaše reputace záporná, pomoc využít nemůžete.)
👣 Vyrazit rovnou za dobrodružstvím ➤ 📜B04
B09
🔍 Úkol:
Prohlédněte si přiloženou
    mapu ➤ 📜B05
NEBO
💀 Prokletí [😐 > 3]: ➤ 😡😡
💀 Prokletí: Jakmile odložíte balíček “B” ➤ ⏳
Ponechte si tuto kartu, dokud toto prokletí nepomine.
```

## Slide 09 – karty B11, B12 (lípa, bylinné karty)

*Kódy karet na slidu: B06, B11, B12*

```text
První čeho jste si z dálky všimli byla košatá koruna nádherné lípy.
Jak jste přicházeli blíž, zmocňoval se vás pocit, že ve stínu toho stromu vidíte na zemi sedět člověka, opřeného o kmen.
Teď už víte, že to nebyl pocit. Jakmile jste se dostali z přímého světla do stínu koruny, zrak se vám tomu šeru přizpůsobil.
Je to skutečně člověk a oblečení má nasáklé krví. Takový pohled není nic příjemného pro pacifisty. Jestliže je nějaký s vámi ve skupině, znechuceně odchází směrem k Nebákovu. Zbytek skupiny zde zůstává.

🌿 Kontryhel - Alchemilla
B11
B12

👣 Podmínka postupu: Ten jehož rolí je pacifista je od zbytku skupiny vzdálený alespoň 20 kroků ➤ 📜B06
B12
B12

B12
B12
🌿 Čekanka - Cichorium
Máš-li bolest v játrech a na ledvinách, příprav sobě odvar a ten přebytečnou žluč z těla vyplaví.
Pomůže též se vředy v žaludku a uleví od otravy z požití jedu.
🌿 Zázvor - Zingiber
Z kořene zázvoru udělej sobě odvar, chceš-li se horkosti v sobě zbavit.
Nebo ho požij samotný.
Snad díky ohni, který v něm dříme pomáhá také vyhnat z těla bolest.
🌿 Kopretina řimbaba - Leucanthemum
Horečku sníží i bolest utiší. Rozžvýkej a spolkni jeden list, nebo pět, když je bolest velká.
Pomazání olejovým odvarem odpuzuje hmyz a hojí jeho kousnutí.
🌿 Heřmánek - Matricaria
Heřmánek je zázračný všelék. Na bolest, zranění, vředy, horečku i na uklidnění ducha při špatných snech
Sušený i čerstvý můžete povařit v oleji či vodě, nebo jen tak jísti.
Pomůže ti od břichabolu. Máš-li běhání, nevolnost nebo větry, připrav sobě ve vodě odvar a popíjej jej čistý bez medu a to ráno, v poledne i na večer.

🌿 Mák vlčí - Papaver rhoeas
Vyvař květ, stvol i listy a získáš nálev pro zklidnění
těla i duše a vyhnání
kašle z těla.
Dej však pozor na
čerstvou šťávu! Neb
budeš vidět věci nevídané.
B12
```

## Slide 10 – karty C01–C08 (muž pod lípou)

*Kódy karet na slidu: C01, C02, C03, C04, C05, C06, C07, C08, C09, C10, C20*

```text
Větší rudé skvrny naznačují, že má zranění na levé paži a na hrudi. Krev má také na obou rukou a stejně tak na obličeji. A mezi plavými vlasy má červenohnědé chuchvalce.
Pravou nohu má složenou pod sebou. Nejspíš se chtěl jen na chvilku schovat do stínu a zmožen únavou se sesunul pod strom. Jen Bůh ví, co se tomu chudákovi stalo.
Vaším očím neušla ani kožená tašvice, kterou křečovitě svírá v ruce.
C02

Nic nenasvědčuje tomu, že by se zde nacházel někdo další a tak jste se rozhodli přijít blíž. Kolem nejsou žádné stopy zápasu a vypadá to, že sem ten člověk přišel sám.
Zběžným pohledem vidíte, že se jedná o mladého muže. Je oblečený jen na lehko - boty, nohavice, košile a varkoč v barvě rodu Nebáků. Navíc je vyzbrojen pouze úzkou dýkou. Z toho usuzujete, že to není voják, ale spíše posel, nebo možná zvěd.
C01
🔍 Prohlédnout si muže
➤ 📜C02
🔍 Prohlédnout si jeho tašvici ➤ 📜C04
👣 Pokračovat na Nebákov
     ➤ 📜C03
NEBO
🔍 Prohlédnout si muže
    více zblízka ➤ 📜C05
NEBO

Mužova tvář se kroutí bolestí. Od té zpravidla pomáhá apatykář, nebo kat. Když navíc vezmete v úvahu četná zranění, je vám jasné, že mu už opravdu moc času nezbývá.
Apatykáře mezi sebou sice nemáte, ale možná by se dalo něco vymyslet. A koneckonců, roli kata by mohl zastat kdokoliv z vás.
Zkusíte mu sehnat něco na utišení bolesti? Nebo se rozhodnete, že lepší bude udělat to postaru a zbavit ho trápení jednou pro vždy?
C04
C05
C06
C03

Je od vás šlechetné, že mu chcete pomoci. Ten čin se jistě brzy roznese po kraji! 😊

Existují například byliny, které tiší bolest.Pokud je znáte, můžete je nasbírat. Také můžete zkusit štěstí v okolních staveních. Je to pro dobrou věc a proto vás to nebude stát ztrátu reputace. Třeba nic neseženete, ale i snaha se cení. A stále je tu také ta druhá možnost.
C07
C08
👣 Pokračovat na Nebákov ➤ 📜C03
💬 [😊] “Vydrž,
   pomůžeme ti.” ➤ 📜C06
NEBO
Jeden z vás natáhl ruku k jeho tašvici. Ve chvíli, kdy se dotkl jeho paže muž náhle otevřel oči a chytil ho za zápěstí.

🧠 Pokusit se pomoci mu od bolesti  ➤ 📜C07
🗡️ Zbavit ho trápení
     natrvalo ➤ 📜C08
NEBO

“Jestli chceš obírat mrtvolu … přesvědč se, že je skutečně mrtvá,” zasípal. 😡 Poté zakašlal a z koutku úst mu vyšel pramínek krve. “Tak do toho, ... stejně už mi moc života … nezbývá,” dodal, sevření povolilo a opět se opřel o kmen lípy.

👣 Pokračovat na Nebákov ➤ 📜C03
💬 [😐/😊] “Vydrž,
   pomůžeme ti.” ➤ 📜C06
NEBO
Jeden z vás k němu poklekl a prohlíží si ho zblízka. Při bližším zkoumání si všiml, že ten člověk dýchá, ač nepravidelně. Vzal ho za
          rameno a zatřásl s ním.

Muž náhle otevřel oči, zakašlal a z koutku úst mu vyšel pramínek krve. “Prosím, pomozte mi, jste-li dobří,” řekl. Poté oči zavřel a polohlasem dodal: “To je bolest. To je bolest!”

Muž se s velkou námahou odtlačil loktem od kmene. Sjel rukou k opasku a vytáhl z pouzdra dýku. Položil si ji do klína.
“Kněz už mi požehnal.” Řekl a opřel se o strom. “a tak vás prosím … pomozte mi důstojně … dojít k Pánu.”
Teď už se tomu nelze vyhnout. Musíte jen určit toho, kdo to udělá.
👑 Úkol: Určete jednoho z vás, kdo to udělá ➤ 📜C10*
*📜C10 je určena pouze pro tohoto člena družiny.
🌿 Úkol: Sežeňte něco na
 bolest a vraťte se ke stromu
   ➤ 📜C09
🗡️ Zkusili jste co se dalo, ale bez výsledku. Nemáte jinou volbu. ➤ 📜C08
NEBO
Po krátké rozvaze jste se rozhodli, že půjdete dál. Tomu člověku byste stejně už nejspíš nedokázali pomoct. A potom, co jste viděli v jakém je stavu, ještě více vnímáte naléhavost dopisu od paní MAchny.
Kousek dál odsud na cestě vidíte kapky krve. Stopy vás tedy zajisté vedou dál, směrem k Nebákovské pevnosti.

Začínáte se obávat, že před vámi je, mírně řečeno, zajímavé dobrodružství.
👣 Událost: Dojdete na místo, kde je les po obou stranách cesty a zpevněná cesta se mění v kamenitou ➤ 📜C20
```

## Slide 11 – karty C09–C16 (+ pracovní verze C20)

*Kódy karet na slidu: C08, C09, C10, C11, C12, C13, C14, C15, C16, C17, C18, C19, C24*

```text
Muž leží před tebou odevzdaný svému osudu. Poklekl jsi k němu a jen pro sebe v duchu pronesl krátkou modlitbu.
Potom jsi oběma rukama uchopil dýku a špičkou ostří našel místo, kde je srdce. Zatlačením na jílec jsi mu ji zaryl do hrudníku. Muž nekladl žádný odpor.
S posledním vydechnutím otevřel oči, stiskl ti ruku a zašeptal:
“Šel ka po le...” Chvilku nato jeho sevření povolilo.
C10
C09
💀 Vezmi si kartu C11
(platí jen pro tebe)
👣 Přečtěte kartu C12
(platí pro všechny)

“Děkuji, šlechetní pánové, … ale těch pár bylin … mě stejně nezachrání. … Neztrácejte tu
čas … s mrtvolou.”
Po chvíli hledání se vám podařilo sehnat
něco na tišení bolesti. Když jste se vrátili
k lípě, zraněný mělce oddychoval a spal.
Jeho tvář viditelně pobledla. Probrali jste
ho lehkým zatřesením a podali mu lék.
Muž polknul, zakašlal a poté promluvil.
Jeho slova byla prokládaná hlubokými nádechy.
👣 Pokračovat kartou C08

C12

C11

Teď už je vám víc než jasné, odkud stoupá ten dým.
Na skále, kde stál dříve Nebákov je jen hromada rozvalin. Mezi kamením ční doutnající kusy dřeva. Ten zvuk, který jste zaslechli musel být padající kus věže hradu, jehož zbytky sotva stojí na skalním masivu. Nad spáleništěm hrozivě krouží hejno krkavců.

Všude kolem je cítit smrt. To není místo, které byste teď chtěli navštívit.

C15
Severovýchodní vítr k vám donesl zápach
spáleného dřeva. Podívali jste se tím
směrem. Z místa, kde nejspíš leží Nebákov
vidíte přes stromy stoupat dým. Možná,
že se rozhodnete tam vůbec nechodit.
Náhle jste směrem od tamtud uslyšeli
burácení kamenů, jako když se rozpadá puklá skála.
Muž zůstal opřený o strom a s očima vytřeštěnýma na tebe. Zavřel jsi tomu nebožákovi víčka, ale ten jeho pohled tě bude pronásledovat ještě dlouho.
Hrůzou jsi oněměl a musíš si dát něco na kuráž, aby se ti vrátila řeč.
Za každé porušení klatby ztratí celá skupina reputaci (😡).
👣 Úkol:
Dojděte k nebákovskému
    mlýnu ➤ 📜C15
🔍 Prohlédnou si mužovu tašvici ➤ 📜C14
👑 Úkol (volitelný): Dej si panáka ➤ zrušení klatby
NEBO
👣 Úkol: Dojděte zpět k
lípě ➤ 📜C17
👑 Úkol: Občerstvěte se ve
     mlýně ➤ 📜C18
NEBO
💀 Klatba: Od této chvíle nemůžeš mluvit

C14

C13
Konečně jste se trochu rozkoukali a Rozdýchali se. Náhle se další část silně poškozeného zdiva začala hroutit ze skály a s hlučným šplouchnutím dopadla do rybníka.
Jste si jistí, že místo, kde stála věž není to, co byste teď chtěli navštívit.
Zvuk padající věže doprovázelo zděšení volání lidí, kteří se hemží kolem Nebákovského mlýna.
👑 Úkol: Dejte si něco ve
mlýně ➤ 📜C18
👣 Úkol: Dojděte zpět k
    lípě ➤ 📜C19
NEBO

Ještě než ten chudák vydechl naposledy, vám něco stihl sdělit. Společně teď zvažujete, co tím asi myslel. Má vás to snad nasměrovat správným směrem? Jak rádi byste mu teď položili spoustu otázek.
Bohužel vám toho už víc nepoví. A tak musíte pracovat s tím, co víte, rozhodnout se a vyrazit na cestu, pryč z tohohle smutného místa

Netušíte, zda je to ten záhradný cizinec o kterém se píše v dopise, ale je to vaše jediná stopa a tudíž i jediná naděje. Takže teď už jen
        zbývá ho najít. Kde ale začít?
Prohlédli jste tašvici toho nebožáka. Obsahovala pár grošů, mapu a list s nahrubo načrtnutým portrétem nějakého muže. Kresba je provedena černým uhlem. Jen kámen který mu visí na krku je výrazně modrý.
Pokračujte kartou C16
C16
⏳ Událost: Povedou-li vaše kroky na vámi vybrané “správné místo” přes rozcestí označené “Troskovice - Křenovy”, zastavte se tam a vyhodnoťte náhodné setkání. (⏳)
🧠 Až budete rozhodnutí, že jste na správném místě ➤ 📜C24
🔎 Vezměte si mapu v obálce označené “Mapa 02”
```

## Slide 12 – karty C22–C27 (Apolena – volba místa)

*Kódy karet na slidu: C19, C21, C22, C23, C24, C25, C26, C27, D01, E01*

```text
C23
Rozhodnutí už padlo a nelze ho vzít zpět.
To, co cítíte, vidíte a slyšíte váš ještě víc vyburcovalo k jednání.
Máte pocit, že nebákovští vás teď potřebují víc než kdy dřív.
A navíc jste právě uslyšeli další rachocení a padání kamenů doprovázené hlasitým šplouchnutím.
Následoval křik. Zděšený křik mnoha lidí - můžu, žen i dětí.
Situace se zdá být velice vážná.

Teď není času nazbyt, utíkejte!
👣 Úkol: Doběhněte k nebákovskému mlýnu! ➤ 📜C21

C22
Rozhodnutí už padlo a nelze ho vzít zpět.
To, co cítíte, vidíte a slyšíte váš dost vystrašilo.
Zatímco jste se rozmýšleli co udělat, uslyšeli jste další rachocení a padání kamenů doprovázené hlasitým šplouchnutím. Následoval křik mnoha lidí. To jistě zbytky pevnosti spadly do rybníka.
Máte pocit, že nebákovským už stejně není pomoci.
Lidi s dobrou pověstí budou ale za takové rozhodnutí stíhat výčitky.
👣 Úkol: Vraťte se zpět k tisícileté lípě ➤ 📜C19
💀 Prokletí [😊]: ➤ 😡😡

Po chvíli společného přemýšlení, radění a koukání do mapy jste vyhodnotili, že se vás ten, teď už mrtvý, muž z Nebákova, budiž mu země lehká, snažil poslal směrem k Apoleně, skalnímu městu ležícímu na východ od Troskovic. Nejste si však úplně jistí, zda je rozumné chodit do skal. Jednak na vás může spadnout zvětralý kámen a jednak kdoví, co se v místních jeskyních pohybuje za živly.
Zůstanete proto raději u vstupu a zkusíte se nejdříve zeptat v okolí.
C25

C24
C26

Cítíte se bezradní. Snažili jste se přijít na to, kam se vás ten, teď už mrtvý, muž z Nebákova, budiž mu země lehká, asi snažil poslal. Ale vaše snažení bylo nejspíš marné. Po únavném plahočení a hledání toho správného místa jste se zastavili a odpočívali ve stínu u cesty.

Náhle se u vás zjevila ta dívka v černém, kterou jste již viděli dříve a řekla: “Hlupáci, musíte do skal! šel k Apoleně!” 😡😡
👣 Úkol: Dojděte ke vstupu do skalního města Apolena ➤ Balíček “C” odložte. Vezměte si balíček “D” a přečtěte si kartu D01.
C27
Dorazili jste na místo, o kterém se domníváte, že zde zjistíte víc o tom záhadném muži, o němž psala paní Machna a jehož portrét jste našli. Je na čase zjistit, zda byl váš úsudek správný.
🧠 Pokud vás vaše rozhodnutí dovedlo do skalního města zvaného Apolena nebo do jeho blízkosti ➤ 📜C25
🧠 Pokud stojíte na nějakém jiném místě ➤ 📜C27
🧠 Pokud jste došli do Troskovic do hospůdky, která nese název Apolena nebo do její blízkosti ➤ 📜C26
Balíček “C” odložte. Vezměte si balíček “D” a přečtěte D01.
👣 Podmínka postupu: Nechoďte hlouběji do skalního města

Po chvíli společného přemýšlení a radění jste vyhodnotili, že se vás ten, teď už mrtvý, muž z Nebákova, budiž mu země lehká, snažil poslat směrem k Apoleně, hospůdce ležící v Troskovicích. Jeden z vás si totiž vzpomněl na název toho lokálu, u kterého vás ráno vysadil povoz a kde vaše výprava začala. A hospoda - to je přece hlavní místo veškerého dění! Ale i přesto, že vám vaše rozhodnutí dává smysl, máte takový zvláštní mraziví pocit v zátylku.
Balíček “C” odložte. Vezměte si balíček “E” a přečtěte E01.
👣 Podmínka postupu: Vyhodnoťte náhodné setkání (⏳)
👣 Podmínka postupu: Vyhodnoťte náhodné setkání (⏳)
```

## Slide 13 – karty C17–C21, C18, C20, D01–D03

*Kódy karet na slidu: C13, C14, C17, C18, C19, C20, C21, C22, C23, D01, D02, D03, D07, D08, D11, D12*

```text
C17
🔍 Prohlédnou si jeho tašvici ➤ 📜C14
Vrátili jste se ke stromu. Nelze ignorovat všudypřítomné bzučení much. Bezvládné tělo muže leží opřené o kmen lípy.
Pacifista proto pokračuje dalších 20 kroků a tam počká na ostatní.

Předpokládáte, že teď už nikomu nebude vadit, když se podíváte, co důležitého ten muž nesl v tašvici.
C19

Vrátili jste se ke stromu. Pacifista pokračuje dalších 20 kroků a tam počká na zbytek skupiny.

Muž je bledý a nedýchá. Přišli jste pozdě, teď už mu nikdo nepomůže. Škoda. 😡 Tašvice leží vedle jeho bezvládné ruky. Ten chudák ještě stihl prsty od krve napsat na kořen stromu:                       .
🔍 Prohlédnou si jeho tašvici ➤ 📜C14
A  p  o  L

💀 Následek: Ten kdo dorazil poslední si sám vyhodnotí setkání (⏳).
💀 Následek: Celá skupina ztrácí reputaci (😡😡)
NEBO
Běželi jste marně. Na skále, kde dříve stál Nebákov je jen hromada rozvalin. Zbytky rozbořeného hradu sotva stojí na skalním masivu. Mezi kamením ční doutnající kusy dřeva a nad spáleništěm hrozivě krouží hejno krkavců.
Kartu C21 odlože a pokračujte čtením karty C13.
C21

D03

Dal se s vámi do řeči místní ochmelka. Ukázali jste mu podobiznu muže. On si ji dlouze prohlížel, potom se zamyslel a řekl:

“Příde mi, že sem ho tu viděl. Scháněl peníze. Že prej má důležitej úkol. Řekli sme mu, že tady na stromech zlato neroste, ať zkusí štěstí jinde. Pak šli kolem stráže a vzali ho bokem. Pak už sem se o něj nezajímal. Schválně se zeptejte velitele.”
👣 Odejít a zkusit štěstí v přilehlém tábořišti
    ➤ 📜D08
Na okraji cesty, v místě kde vede pěšina do lesa stojí tři strážní.
Jejich velitel se vám postaví do cesty se slovy: “Stůjte! Dál nikdo nesmí. V Apoleně se ukrývají loupežníci od jičínského Řáholce. Kdokoliv by se tam ukázal, tomu hrozí nebezpečí. A naším úkolem je tomu zabránit.”
🧠 [😊] Říct mu o portrétu tajemného muže ➤ 📜D07
NEBO
👣 Úkol: Vraťte se ke vstupu do Apoleny ➤ 📜D07
D01

D02
Oba strážní jsou na vlas stejní. Dívají se na vás stejným výrazem. Kdybyste nevěděli, že jsou skutečně dva, asi byste měli nutkání přestat s pitím. Tím spíš potom, co najednou stejným hlasem řeknou: “Tak se ptejte.”
🧠 Aktivita (volitelná): Vymyslete otázku díky které zjistíte, kam se vydat. Poté vyberte dva z vás, kteří budou hrát stráže.Ti si tajně přečtou kartu D12. jednomu z nich poté tu otázku položte.
Kartu D02 odlože a pokračujte čtením karty D11.

Severovýchodní vítr k vám donesl zápach spáleného dřeva Z místa, kde nejspíš leží Nebákov vidíte skrz stromy k obloze stoupat dým.

A kromě toho jste směrem od Nebákova právě uslyšeli burácení kamenů, jako když se rozpadá puklá skála.
C20
👣 Otočit se a vrátit se zpátky ➤ 📜C22
🔍 Pokračovat na Nebákov
     ➤ 📜C23
NEBO

U mlýna pod Nebákovem panuje ponurá atmosféra, až z toho mrazí. Před mlýnem ženy ošetřují ty, kteří měli štěstí a přežili. Ze stodoly je slyšet nářek těch, kteří měli štěstí méně. A do sklepa pacholci odnášejí ty, kteří ho neměli vůbec. Pantáta vás obslouží, ale nadšený není. 😡 Pár peněz navíc by jeho mínění o vás určitě zlepšilo.
C18
👑 Úkol (volitelný):
Nechce spropitné ➤ 😊
👣 Úkol: Vraťte se zpět k tisícileté lípě ➤ 📜C17
```

## Slide 14 – karty D04–D11

*Kódy karet na slidu: D02, D03, D04, D05, D06, D07, D08, D09, D10, D11, E01*

```text
D04

🌿 Úkol: Poskládejte u každého ohniště hromádku dříví ➤ 📜D09
👣 Spíše než pracovat, zkusit radši štěstí znovu u
    stráží ➤ 📜D10
NEBO

“Co tu chcete? Tady není veřejná zahrada. A jestli chcete přenocovat, zaplaťte  předem.”
Zeptáte se ho na muže z portrétu a on odpoví:
“Možná sem ho tady viděl. Když mi pomůžete s prací, tak si i vzpomenu na podrobnosti.”
Procházíte tábořištěm a rozhlížíte se kolem sebe. Hledáte někoho, kdo by byl ochotný se vámi bavit. To neunikne pozornosti místního správce.

D05
Jakmile jste vkročili do Troskovic, zmocnil se vás silný pocit, že jste tu správně. Snad to není jen proto, že jste tu už dnes byli a to místo je vám díky tomu povědomé.
Teď už vám nezbývá než doufat, že se s vámi bude v hospodě někdo bavit.

Náhle vámi otřásl silný poryv ledového větru, ale než jste se nadáli, byl pryč. Než budete pokračovat dále, vyhodnoťte setkání ➤ ⏳
👣 Úkol: Dojděte k místní hospodě ➤ Balíček “D” odložte. Vezměte si balíček “E” a přečtěte si kartu E01.
D06

Hostinec pod troskami je liduprázdný. Během rozhovoru si hostinský posteskl, že nemá poslední dobou moc velkou tržbu. Také jste ale zjistili, že ten koho hledáte tu nebyl. 😡
Teď jen doufáte, že si z vás stráže jen nestříleli a najdete nějakou stopu v té druhé hospodě.
👣 Úkol: Dojděte k troskovické hospodě ➤ Balíček “D” odložte. Vezměte si balíček “E” a přečtěte si kartu E01.
👑 Úkol (volitelný): Udělejte zde útratu  ➤ 😊
👣 Podmínka postupu: vyhodnoťte setkání (⏳)

D07
Strážný si zamyšleně prohlíží podobiznu. “Jo, takovej chlap se tady na nás nedávno nalepil. Šel s náma vod šenku až sem. Tady dvojčata ho vodháněly.” Když řekl ‘tady dvojčata’, ukázal přitom za sebe na zbylé dva strážné, kteří na vás koukali s podezíravým pohledem.

“Prej se zpakoval a vodešel do jiný hospody. Nojo, jenže, ten vlevo mi tvrdil, že do Troskovic a ten vpravo, že pod Trosky. Jeden z nich mluví vždycky pravdu, ale ten druhej vždycky lže. Víte co? Můžete jim dohromady položit jednu otázku. Pak už je ale nezdržujte a běžte pryč. Nejsou tu placený za
povídání s kolemjdoucíma.”
👣 Pokračovat kartou D02

👑 Říct mu o co jde a ukázat portrét muže ➤ 📜D07
“No to je krása!” 😊 rozplývá se správce. “Jo, ten člověk tu byl. Je to pár dní. Viděl jsem ho přicházet támhle od Troskovic se strážnýma. Nebo abych to řekl přesně - cupital za nima jako pejsek a něco do nich hučel. Nocleh si nezaplatil, tak jsem se víc nestaral.”

Náhle k vám přistoupí velitel stráží a říká:
“Chlapi, je dobře, že pomáháte, ale je to k ničemu. Do Apoleny vás ani on nepustí, to by ho přišlo draho. Prostě tam nemůžete - nařízení shora. Tak už to sakra pochopte.”
D08

V tábořišti u Apoleny není zrovna živo. Jedno ohniště zrovna dohasíná a všeho všudy je tu jen pár lidí. Nejste si jistí, zda vám někdo z nich poradí.
Můžete ale také zkusit štěstí v blízkém Křenovském šenku. Lidé si zpravidla rádi povídají u dobrého pití.
👑 Úkol: Sedněte si s někým na pivo a kus řeči ➤ 📜D03
🔍 [😐/😊] Porozhlédnou se po tábořišti
     ➤ 📜D04
NEBO

D10
👑 Říct mu o co jde a ukázat portrét muže ➤ 📜D07
Už když jste se blížili ke strážím, jeden z nich si vás všiml a lehkým pokynutím hlavy na vás upozornil svého velitele. Ten se otočil, zavrtěl hlavou, dal si ruce v bok a rázným krokem vykročil k vám.

“Sakra chlapi! Já opravdu nevím, čemu nerozumíte. Do Apoleny vás nepustíme a hotovo!” 😡

Neměli jste v plánu ho naštvat. No co už, stalo se. Teď už nemáte co ztratit.

👣 Úkol: Dojděte pod
    Trosky ➤ 📜D06
👣 Úkol: Dojděte do Troskovic ➤ 📜D05
NEBO
Doufáte, že jste správně vyhodnotili, kam se vydat. Odměřený pohled stráží vám jasně říká, že už víc nepoví. Mimo to se na vás zle kouká jejich velitel a gestem naznačuje, abyste pokračovali v cestě. A vy ho nechcete zbytečně provokovat.
D11
D09
```

## Slide 15 – karty D12, E01–E05

*Kódy karet na slidu: D12, E01, E02, E03, E04, E05, E06, E07*

```text
D12

◀
Strážný stojící vlevo mluví vždy pravdu.

▶
Strážný stojící vpravo je patologický lhář.

E01
E02
💬 “Pití pro každého a něco do žaludku!” ➤ 📜E03
Přišli jste k hospůdce Apolena. Není tu zrovna nával. O zárubně dveří se opírá znuděný hospodský a hadrem odhání mouchy. Změří si vás pohledem a praví: "Pozdrav pánbůh. Čím posloužím panstvo?"
💬 “Chceme jen radu. Neobjevil se tu tenhle člověk?” ➤ 📜E02
NEBO

💬 “Nerozčiluj se. Chceme jen vědět, jestli tu ten člověk
      byl.” ➤ 📜E04
Hospodský roztáhne ruce a pomalu se prohlédne. potom dá ruce v bok a řekne: “Vypadám snad jako vývěska? Nepřijde mi. Tohle je hospoda. Tady čepujeme pivo a podáváme jídlo. Buď si něco dejte, nebo mě nezdržujte. Mám práci.”
💬 “Dobře. Přines pití pro každého a něco do žaludku!” ➤ 📜E03
NEBO

E03
👣 Podmínka postupu: Jeden z vás dopije nebo dojí ➤ 📜E07

Teď nastal čas, abyste vstřebali vše, co jste doteď prožili a užili si společně příjemné chvíle.
Výraz hospodského se náhle změnil. Přívětivě se na vás usmál a řekl: "Tak se mi to líbí! Běžte se posadit přátelé. Hned vám to přinesu." 😊

Během chvíle byl zpět se vším, co jste si objednali.
E04

“Tak vy jste mi nerozuměli? Řekl jsem snad dost jasně, že prodávám pití a jídlo! A to mě tady živí. Nedostávám peníze za to, že si tu povídám s každým kdo jde kolem. Takže jestli si nic nedáte, tak běžte pryč!” 😡
💬 “No dobře. Tak mi teda odcházíme!”
➤ 📜E05
💬 “Dobře, omlouváme se, nestojíme o problémy. Přines pro každého pití a něco do
     žaludku!” ➤ 📜E06
NEBO

E05
Před hostincem postává ochmelka, kterému neušel váš živý rozhovor s hospodským. Sykne na vás:
👑 Úkol [😐/😡]:
Každý z vás si něco objedná ➤ 📜E06
👑 Úkol [😊]:
Alespoň jeden z vás si něco
   objedná ➤ 📜E06
NEBO

"Hej, poďte sem. Včera večer tu někdo takovej byl. Hrál tady kostky. Jeden z kostkářů by vám určitě řek víc. ale jestli tady chcete zůstat, radši udělejte útratu! Hospodskej nemá rád čumily."
```

## Slide 16 – karty E06–E08, F01–F05

*Kódy karet na slidu: E06, E07, E08, F01, F02, F03, F04, F05, F08, F09, F11*

```text
E07
E08

F01
F02
Sotva jste na stůl položili první prázdný žejdlík, objevil se u vás hospodský se slovy: “Ještě něčím posloužím panstvo?”
Pokud už jste si získali jeho přízeň, mohli byste se ho zkusit zeptat na muže z portrétu. Nebo můžete ještě chvíli posedět a počkat.
Hospodský: “Tak ukažte.” Na chvilku se zamyslel a potom pokračoval: “Nojo, někdo takovej tu asi byl včera. Ale zrovna se hrál turnaj v kostkách a byl tu nával. A to víte, nestíhám všechno sledovat. Některý hráči ze včera tu ještě dneska jsou. Zkuste se zeptat někoho z nich.”

E06
👣 Podmínka postupu: Jeden z vás dopije nebo dojí ➤ 📜E07
💬 “A víš ty co? Dones nám ještě jednu rundu!” ➤ 📜E08
💬 [😐 > 3] “Někoho hledáme a ty bys nám mohl pomoc. Vypadá asi takhle.” (Ukážete mu portrét.) “Prý se potloukal kolem Troskovic a pochybujeme, že by nezašel do tvojí hospody.”
➤ Balíček “E” odložte. Vezměte si balíček “F” a přečtěte si kartu F01
NEBO
👣 Událost: Obsluha vám něco přinese
➤ Balíček “E” odložte. Vezměte si balíček “F” a přečtěte si kartu F01.
🔍 Úkol: Zjistěte, zda někdo z hostů hraje kostky ➤ 📜F02
👣 Jít rovnou za
    hospodským ➤ 📜F04
💬 “Proč ne? Alespoň bude zábava.” ➤ 📜F03
NEBO

Kostkař: “Jo, hrál jsem s ním včera kostky. Ten měl tolik upito, že by ho obehrál i bezrukej slepec! Bohužel vám víc říct nedokážu. Ale stavte se za hospodským, ten mu ... ehm ... pomohl ven. Jestli víte, co tím myslím. Ale než půjdete, nechcete si taky hodit?”
Po chvíli hledání jste skutečně našli muže, který hraje kostky. Dokonce se s vámi dal ochotně do řeči.

Teď nastal čas, abyste vstřebali vše, co jste doteď prožili a užili si společně příjemné chvíle.
Výraz hospodského se lehce změnil. Nasadil něco jako úsměv a řekl:“Tak přece víte, jak se chovat v hospodě. Běžte se posadit, hned vám to přinesu."
Během chvíle byl zpět se vším, co jste si objednali.

se ho zeptat, jestli tady neviděl muže z portrétu.
"To jsem rád, že vám u nás chutná. Hned vám to donesu přátelé!" 😊

Z jeho veselého výrazu usuzujete, že jste si konečně získali jeho přízeň. Na někoho platí úsměv a prosba, někdo holt slyší jenom cinkání peněz. Jakmile přijde, jste odhodlaní

Jak se tak rozhlížíte po lokále,  těžko říct, kdo z hostů hraje kostky. Budete je muset obejít  a zeptat.
F03

Kostkař: “No výborně. Tak uvidíme, jestli vám to půjde líp než jemu včera. A co říkáte? Okořeníme si tu hru sázkou, nebo si zahrajeme jen tak?”
Škoda, že jste s tím dopředu nepočítali a svoje “speciální” kostky nechali doma. Budete muset hrát s těmi, které vám půjčí hospodský. 	          Snad nebudou vychýlené na tu druhou stranu.
🧠 Hrát jen tak
➤ 📜F08
👑 Hrát o peníze
    ➤ 📜F09
NEBO

F04
F05

pro štěstí, ale jak vidno, nefunguje. Alespoň né při hře v kostky. Snad vám přinese štěstí při hledání toho chlapíka. A teď už běžte za tím hospodským, jistě vám má ještě co říct.”
Kostkař: “Děkuju moc přátelé! To až řeknu ženě, tak mi neuvěří. Cestou na jarmark o vás budu všem vyprávět! 😊 A za to, že jste takoví čestní vám dám tohle.” Podal vám dřevěnou píšťalku. “Vypadla mu z kapsy, když vstával od stolu. Chtěl jsem si ji nechat jako talisman

👣 Odejít pryč a poohledédnout se jinde
➤ 📜F11
Hospodský: “To vám řek?” Zamračil se. “No, možná sem mu pomoh ven. A vy se divíte? Byl vožralej jak zákon káže a neměl dost peněz na zaplacení útraty. Mával tady tim modrým šutrem a já nevěděl, jestli to není kradený. A s tím já nechci mít nic společnýho.”
(Kartu F05 si ponechte.)
👑 Úkol (volitelný):
Nechte spropitné alespoň ve výši desetiny útraty ➤ 😊
```

## Slide 17 – karty F06–F13

*Kódy karet na slidu: F04, F05, F06, F07, F08, F09, F10, F11, F12, F13, F14*

```text
F06
F07

F08
F09

Kostkař: “Do psí díry! Tohle se nemělo stát. Chtěl jsem ženu vzít nazítří do Sobotky na jarmark. Teď mě akorát tak přerazí. Ale co už, včera jsem měl kliku, dneska ne. Takovej je život. Na to pivo ještě pár drobásků po kapsách najdu.”
Na jednu stranu je vám ho trochu líto. Na druhou stranu - hra je hra.

F10
Kostkař: “Á, tady se někdo bojí, že by prohrál. No co, hra je hra, ať už o něco nebo o nic. Ať vyhraje ten lepší!”
👑 Událost: Výhra v kostkách ➤ 📜F06
💀 Událost: Prohra v
    kostkách ➤ 📜F10
NEBO

Kostkař: “To se mi líbí! Vždycky mám větší motivaci, když je co ztratit. Doufám, že dneska bude Fortuna při mě!”
👑 Událost: Výhra v kostkách ➤ 📜F07
💀 Událost: Prohra v
    kostkách ➤ 📜F10

štěstí, ale vy to štěstí potřebujete víc. A třeba vám pomůže při hledání toho chlapíka.
A teď už běžte za tím hospodským,
jistě vám má ještě co říct.”
👣 Jít za hospodským
➤ 📜F04

Alespoň né při hře v kostky. Snad vám přinese štěstí při hledání toho chlapíka.
A teď už běžte za tím hospodským,
jistě vám má ještě co říct.”
Kostkař: “Taková smůla! Ještě, že to nebylo o peníze! To jediné mě zachránilo. Tohle vám dám.” Podal vám dřevěnou píšťalku. “Vypadla mu z kapsy, když vstával od stolu. Chtěl jsem
si ji nechat jako talisman pro
štěstí, ale jak vidno, nefunguje.
👣 Jít za hospodským
➤ 📜F04
👑 Úkol (volitelný): Vraťte protihráči peníze
➤ 📜F05
👣 Se spokojeným výrazem z výhry teď odejít za hospodským ➤ 📜F04
Kostkař: “Haha! 😊 Tak nevím, jestli byste měli větší šanci než včera on. Ale protože jste hráli férově, dám vám tohle.” Podal vám dřevěnou píšťalku. “Vypadla mu z kapsy,
když vstával od stolu. Chtěl jsem
si ji nechat jako talisman pro
NEBO

Při odchodu z hospody vás ještě zastavil Hospodský. “Jo a ještě jsem si vzpomněl. Ráno tu byl Jarek vod vovcí co má vohradu v Tachově u rozcestí. A stěžoval si, že ho ráno našel v chlívku. No, toho frejíře z vobrázku. Prej si ustlal na hnoji. No, tak mu dal pár ran do zubů a von upaloval pryč.”
F11

F13
Hospodský: “Kde byste asi tak mohli najít Jarka z Tachova?” zeptal se jízlivě. Na chvíli se vzorově zamyslel a potom pokračoval: “Možná v Tachově, co myslíte?” Od srdce se rozesmál, ale váš nechápavý výraz nejspíš vypověděl za vše. Hned proto dodal: “Aha. No, půjdete vodsuď na západ a pak na sever. Hlavní povede rovně, ale vy se dáte doleva. Vohrada je u vodbočky, co vede ke křížku svatýho Jána. To nemůžete minout. Prostě půjdete za zvukem. A smradem vovcí. Hehe.”

Váš další cíl je tímto daný - rozcestí u ohrady s ovcemi v Tachově.
F12

Váš další cíl je tedy jasný - najít Tachov a rozcestí u ohrady s ovcemi. A tam potom vyhledat pasáčka Jarka. Snad vám řekne, kam ten záhadný cizinec po potyčce s ním odešel a možná i co je zač.
Škoda, že moc neznáte zdejší kraj. V mapě, kterou máte k dispozici je více míst s ovcemi, ale žádný Tachov. Třeba se vám nějak povede najít to správné místo. A při nejhorším se zeptáte místních. Je lepší trocha ostudy, než tu bloudit až do setmění.
🧠 Až budete rozhodnutí, že jste na správném místě ➤ 📜F14
⏳ Událost: Opustíte Troskovice ➤ ⏳
(Kartu F06 si ponechte.)
(Kartu F10 si ponechte.)
💬 [😐 > 4] “Poradíš nám prosím, kde bysme toho Jarka našli?” ➤ 📜F12
💬 “Děkujeme za radu. Tak my zkusíme štěstí tam.”
      ➤ 📜F13
NEBO
🧠 Až budete rozhodnutí, že jste na správném místě ➤ 📜F14
```

## Slide 18 – karty F14, G01–G07

*Kódy karet na slidu: F14, G01, G02, G03, G04, G05, G06, G07, G08, G09*

```text
G01
G02

G04
G03

Přišli jste až k plotu, chvíli muže pozorovali při práci a čekali, zda si vás sám všimne. Je vidět, že už má svůj věk, ale přesto je stále plný síly. Přemýšlíte, zda je to pasáček Jarek, o kterém se zmínil hospodský. Po chvíli si vás muž všiml, ale jen hlavou pokynul na pozdrav a pracuje dál.
Nejspíš ho budete muset oslovit sami.

F14

🧠 Pokud stojíte na rozcestí
u ohrady s ovcemi
v Tachově ➤ Balíček “F”
odložte. Vezměte si balíček
“G” a přečtěte si kartu G01.

💀 Pokud stojíte na jiném místě ➤ ztrácíte 2 body reputace (😡😡), vyhodnoťte setkání (⏳) a máte nový úkol:
👣 Úkol: Dojděte na rozcestí u ohrady s ovcemi ➤ Balíček “F” odložte. Vezměte si balíček “G” a přečtěte si kartu G01.
💬 “Zdař Bůh! Ty jsi Jarek?”
    ➤ 📜G04
💬 “Zdař Bůh! Prý tu bylo ráno živo.” ➤ 📜G03
NEBO
🔍 Úkol (volitelný):
Podívejte se v okolí celé ohrady po něčem podezřelém
🗡️ Vyhrožovat ➤ 📜G06
👑 [😐 > 4] Uklidnit situaci ➤ 📜G05
NEBO
🧠 [Našli jste krvavé skvrny]
     Říct mu to ➤ 📜G07
🗡️ Vyhrožovat ➤ 📜G06
NEBO
                                  Tachov je malá osada tvořená jen několika
                                  staveními rozmístěnými podél cesty. Až na
                                  bečení ovcí a cinkání jejich zvonců je tu ticho a
                                  klid. Jediný člověk široko daleko je muž, který vidlemi přehazuje hromadu sena. Je zabraný do práce a vypadá to, že si vás zatím nevšiml. Nebo jste mu prostě ukradění.
Možná by se toho dalo využít a trochu byste se tu mohli rozhlédnout a
        dříve než ho oslovíte zjistit,
        co se tu dnes ráno vlastně stalo.
Pasáček si vás jednoho po druhém prohlédl. dlouhým prozíravým pohledem. Zapíchnul vidle do země, zkřížil ruce a řekl:
“Žíkal kdo? Tady se toho napovídá. Já čeba slyšel, že se po klaji potuluje loupeživá tlupa. A vás sem tady v životě neviděl. Tak se sebelte a vypadněte. Nebo mám dojít plo lychtáže?” 😡
Pasáček si vás pomalu prohlédl a nakonec řekl: “Možná. Záleží na tom, kdo se ptá.”

Představili jste se a vysvětlili o co jde.
Pasáček pokračoval: “Jestli de jen o tohle, tak budiž. Vyhnal sem ho a utíkal na západ.” Něco se vám na tom vyprávění nezdá. Snad by se nějak dalo zjistit, jestli říká pravdu.

💬 “Jarku, podívej se. Všude kolem jsou krvavé skvrny. Docela čerstvé. Umíme si dát jedna a jedna dohromady. Nebo nám chceš tvrdit, že jsi tam kuchal ovci? možná ti vynadal a ty jsi ho praštil. nic ti nevyčítáme. Nejsme drábové, jen hledáme toho chlapíka.”

Jarek: “Jo, jo. Pšiznám se, dal sem mu jednu mezi oči. Byl splostej a klad mi jabka, měl sem si to nechat líbit? Chodit s tím na lychtu mi pšišlo jako ztláta času. A beztak by to zapšel.”
V klidu jste pasáčkovi vysvětlili, že rozhodně nestojíte o problémy  a zdůraznili, že tu nejste od toho, abyste řešili něčí neshody. Řekli jste mu, že si jen chlapi v hospodě pustili pusu na špacír, když jste se tam trochu vyptávali na toho muže z portrétu a ukázali ho i jemu.
Jarek nic nezapíral a potvrdil, že toho “chlapíka” vyhnal. A ten, že “utíkal směrem na západ”. Ale stejně vám na tom vyprávění něco nesedí. Snad by se vám nějak mohlo povést zjistit, jestli říká pravdu.
🧠 [Našli jste krvavé skvrny]
     Říct mu to ➤ 📜G07
🗡️ Vyhrožovat ➤ 📜G06
NEBO
💬 “Nevěříme ti ani slovo.”
    ➤ 📜G09
💬 “No a kde je teda teď?”
➤ 📜G08
NEBO
G05
G07

💬 “Tak hele ty ovčáku! My víme, že jsi mu dal přes hubu. A máme na to svědky. Chceš nám pořád něco zapírat? Nebo bys to radši vysvětlil na rychtě v Troskovicích?” 😡

Jarek: “Dobže, dobže. Vyžešíme to v klidu, jo? pšiznávám se, dal sem mu jednu mezi oči. Klad mi jabka, měl sem si to nechat líbit? A chodit s tím na lychtu mi pšišlo jako ztláta času. A beztak by to zapšel.”
💬 “Nevěříme ti ani slovo.”
    ➤ 📜G09
💬 “No a kde je teda teď?”
➤ 📜G08
NEBO
G06
👣 Oslovit muže ➤ 📜G02
```

## Slide 19 – karty G08–G16

*Kódy karet na slidu: G08, G09, G10, G11, G12, G13, G14, G15, G16, G18, G19, G20, G21*

```text
G09

G08

Při tom zatnul ruku v pěst a pohrozil směrem k pařezu.
“Pak uklouznul, nebo co, skutálel se smělem k vodopádu a zmizel.”
Jarek: “Tak to vážně netuším. Když sem ho viděl naposledy stál tam na tom pažezu.” Ukázal na pařez za druhou stranou ohrady. Koukal se tím směrem a vyprávěl to s takovým přesvědčením, jako by ho tam
pořád viděl. ”Hulákal na mě a takhle mi hlozil pěstí.”

Zatnul ruku v pěst a pohrozil k pařezu. “Pak uklouznul, nebo co a skutálel se dolu smělem k vodopádu a zmizel mi z očí. Díky Bohu.”
G13
G14

Jarek: “Tak to vypadá, že bude za chvíli všechno zase pši stalym. Mám píšťalku a díky ní mám zpátky i svýho pejska.
Zaběhnul se někde ve skalách nad Vidlákem.
Jmenuje se Flek. A nebojte, nekouše. Teď
už jen abych měl všechny ovečky a můžu v
klidu spát. Ty jabka, co mi sněd ten pobuda
už vem čelt. Tak co? Kolik ovcí jste napočítali?”
🧠 40 a více
     ➤ 📜G16
🧠 méně než 40
➤ 📜G15
NEBO
(Kartu s píšťalkou vraťte do balíčku.)

Jarek se usmál od ucha k uchu a odhalil dásně postrávající spoustu zubů. “Jé! To je moje píšťalka! Děkuju moc! 😊 Můžu si s ní pšivolat svýho pejska. A vy mi zatím plosím spočítejte ty ovce.”
Vrátili jste Jarkovi jeho ztracenou píšťalku. Radši jste mu řekli, že jste ji našli cestou, když jste šli od Troskovic sem. Nechtěli jste tomu neznámému muži z Nebákova ještě víc zhoršit reputaci tím, že byste o něm rozhlašovali, že krade. Už takhle to vypadá, že je v problémech. A vy nevíte, jestli jeho pomoc náhodou nebudete ještě potřebovat.
G15

Jarek: “A sakla! Toho sem se bál. Ještě požád mi nějaký ovečky chyběj. A to sem myslel, že už je mám všechny. Naštěstí už mám svýho pejska a ten mi je pomůže sehnat. Ale i tak vám děkuju za pomoc. 😊
Jojo, se zvížatama sou holt stalosti.

Ale abyste nežekli, že sem jen stalej neludnej dědek, tak vám můžu poladit, jak se dostat k vodopádu a nezlomit si pši tom nohu.”
🔍 [😐 > 5] Zeptat se na cestu k vodopádu ➤ 📜G20
👣Popřát hezký den a
     odejít  ➤ 📜G21
NEBO
Jarek: “Tak si čeba tlhněte nohou! 😡 Žíkám, že dostal do nosu a utíkal plyč. Když sem ho viděl naposledy stál tam na tom pažezu.” Ukázal na pařez za druhou stranou ohrady. Vyprávěl to, jako by ho tam pořád viděl. ”Hulákal a takhle mi hlozil pěstí.”
🧠 [Našli jste u pařezu zakrvácený žulový kámen]
Říct mu o něm ➤ 📜G10
🧠 [Našli jste u pařezu zakrvácený žulový kámen]
Říct mu o něm ➤ 📜G11
NEBO
💬 “A poradil bys nám, kudy se dostat k tomu vodpádu?”
      ➤ 📜G12
💬 “A poradil bys nám, kudy se dostat k tomu vodpádu?”
      ➤ 📜G12
NEBO

A pak dodal: “Když budete mít kliku, čeba ho tam ještě někde potkáte. Beztak si bude u vodopádu lízal lány a nebo dospávat kocovinu.”

Na chvíli se zamyslel a potom pokračoval: “No, a když mi teď pomůžete, poladím vám, kudy se dá bezpečně dostat k vodopádu.”
G10
G11
👑 Nabídnou Jarkovi pomoc
➤ 📜G18
Jarek: “Nojo, ten kámen sem po něm hodil. Ale minul sem. oplavdu! Aspoň teda myslím… TO víte, už sem stalej dědek a zlak mi neslouží tak jako džív. Hele, podívejte se, když budete mít kliku, bude si u vodopádu lízat lány a nebo dospávat kocovinu.”
Jarek: “Nojo, ten kámen sem po něm hodil. Ale minul sem. Bohužel. Aspoň teda myslím… Holt už sem stalej dědek a zlak mi neslouží tak jako džív. Hele, co se stalo, stalo se. Já nevím, ploč bych se zlovna vám měl zpovídat. Najděte ho a zeptejte se ho sami.”
👑 [😐 > 2] Nabídnout Jarkovi pomoc ➤ 📜G18

Pak nazbílat jabka, aby ty moje holky nebyly dneska o hladu. Pláce jak na kosteke. Stačí, že mě láno zdlžel ten pobude a teď ještě vy.”
G12
Jarek: “Vám tak budu ladit. 😡 Nakláčíte si sem jak páni a ptáte se na věci, do ktelých vám nic není. Vůbec vás neznám a nevim, ploč se tu s váma vlastně bavím, když mám svojí pláce dost. Musíme pšeházet seno, abych měl dost žládla plo ovce na zimu.
👑 [😐 > 3] Nabídnout Jarkovi pomoc ➤ 📜G18
👣 Vydat se k vodopádu
     ➤ 📜G19
NEBO
👣 Vydat se k vodopádu
     ➤ 📜G19
NEBO
👣 Vydat se k vodopádu
     ➤ 📜G19
NEBO
```

## Slide 20 – karty G19–G26 (+ druhá revize G20)

*Kódy karet na slidu: G17, G19, G20, G21, G22, G23, G24, G25, G26, H01, N12*

```text
G19

Rozloučili jste se a obrátili se k odchodu. Za zády jste slyšeli jak Jarek zavrčel: “Aaa! K saklu s tím. Počkejte ještě! Nechci vás mít na svědomí. Nechoďte k vodopádu shola, ale od lybníka. Cesta vede mezi skalama pšes palouk s lozpadlým seníkem. Lovně byste potom došli vyschlým kolytem aš k vodopádu. ale lepší bude obejít skály z plava pšes louku kde se loví vysoká. A teď už jděte. A bacha na vlky!”

S tím se otočil, vzal do ruky vidle a pokračoval v přehazování sena.
První záchytný bod v cestě k vodopádu by mohlo být loviště.

👣 Úkol: Dojděte na louku s lovištěm vysoké ➤ 📜G22
Cesta tu končí a vy se proto radíte, kudy dál. Váš rozhovor vyplašil srnku, která se tu pásla. Náhle k vám rázným krokem přišel lovčí a už z dálky na vás volal: “To snad nemyslíte vážně?! Nemůžete se bavit potišej? Vyplašili jste mi večeři! Ale když už jste tady, pomůžete mi alespoň zabít čas. A pak se hezky vraťte zpět, odkud jste přišli.”
👣 Podmínka postupu: Vyhodnoťte 📜N12. Pro získání odměny za úspěch musí výzvu splnit dva členové výpravy.
(V tuto chvíli  nelze využít schopnosti rolí.)
👣 Úkol: Vraťte se na palouk s rozpadlým stavením ➤ 📜G24

G20

Jarek: “Dobže, že si necháte poladit. Co já se tam nachodil, kdyš sem byl mlačí. Vodíval sem si tam holky, hehe. Ale teď už tam zajdu jen občas, natlhat vlaní oka na mazání na klouby… Takže, běžte z kopce k Vidláku. potom doleva smělem na Želejov. No a skolo na konci lybníka je taková skála, Pilíž jí žíkáme. Za ní vede cesta do lesa. Pak je to tlochu složitý. Víte co? Půjčte mi tu mapu, já vám to zakleslím na dluhou stlanu.” Po chvíli čmárání vám mapu vrátil zpátky.  “Plvní záchytný bod je plo vás palouk s lozboženým seníkem.”
G21

G22
Jarkův popis cesty nebyl zrovna podrobný, ale i přesto se vám nějakým způsobem podařilo jít podle toho, jak vám cestu popsal. Nebo alespoň doufáte, že jste šli správně. Teď je na čase zjistit, zda vás váš úsudek dovedl na správné místo

Loviště se pozná podle toho, že je na něm krmelec a místo, kam dávají lovčí návnadu pro zvěř. A v blízkosti také určitě musí stát posed. Podle toho poznáte, že jste na správném místě.
G23
💀 [Nevidíte krmelec ani posed] Zabloudili jste ➤ 📜G26
🧠 [Vidíte posed i krmelec] Jste na lovišti ➤ 📜G23

Jste přesvědčení o tom, že jste šli přesně podle toho, jak vám to Jarek popsal. Ale po posedu a krmelci tu nejsou ani stopy. Tohle nejspíš nebude ta louka s lovištěm vysoké zvěře o které se pasáček zmínil.
Kde se vzala, tu se vzala, šla kolem vás bába s nůší na zádech.

“Bloudíme? Bloudíme?” řekla skřípavým
hlasem. Pak píchla prstem do mapy se slovy:
“Musíte sem. A příště dávejte pozor!” 😡

Zvedli jste zrak od mapy, ale po bábě jako by se zem slehla…
👣 Úkol: Dojděte na louku s lovištěm vysoké ➤ 📜G23
G24
G25

Jak jste tak procházeli lesem obklopeným skalami, kde není slyšet zpět ptáků ani vidět sluneční světlo, padá na vás pochmurná nálada. Teprve teď jste si začali uvědomovat, co všechno se dnes stalo a že zatím nic nešlo podle plánu. Mysleli jste si, že jednoduše navštívíte Nebákov, popovídáte si s místními, společně si zahrajete kostky u žejdlíku piva a možná si tu dokonce najdete i pár přítel. Paní Machna se vám odmění a vy spokojeně odjedete domů.
Pravda, byli jste v hospodě a mohli si zahrát kostky, ale vzpomínky na to mají zvláštní pachuť. Mrtvolnou pachuť spáleného dřeva.
Balíček “G” odložte. Vezměte si balíček “H” a přečtěte H01.
Došli jste se na palouk s rozpadlým stavením. Chvíli vám trvalo najít v hluboké trávě pěšinu vedoucí k vodopádu. očividně tudy dlouho nikdo nešel. Ale to vám dalo naději, že ten cizinec z Nebákova tam stále ještě je. Po chvíli jste konečně objevili téměř vyschlé koryto řeky, které vás dovedlo hloubš do lesa a až k vodopádu.
G26
Pokračujte kartou G25
👑 Aktivita (volitelná): Cesta k vodopádu je opravdu dobrodružná a proto tam chodit nemusíte… Ale můžete, pokud chcete umocnit svůj zážitek a získat reputaci ➤ 😊😊
🔎 Vezměte si mapu v obálce označené “Mapa 03”
👣 Úkol: Dojděte na palouk se seníkem ➤ 📜G24
Jarek: “Dobže, že si necháte poladit. Co já se tam nachodil, kdyš sem byl mlačí a vodíval si tam holkyh, hehe. No, teď už tam zajdu jen občas, natlhat vlaní oka na mazání na klouby… Každopádně, půjdete z kopce k Vidláku a potom doleva smělem na Želejov. Ke konci lybníka vedou dvě cesty do lesa. Vy půjdete až po tý dluhý. Je tam taková veliká skála, co jí žíkáme Pilíž. To by mohl bejt váš plvní záchytnej bod, že jste splávně. A ta cesta vás potom dovede až na palouk s lozpadlým seníkem. To bude váš dluhej záchytnej bod. Z palouku potom půjdete lovně podél kolyta až k vodopádu.”
👣 Úkol: Dojděte ke skále za odbočkou do lesa ➤ 📜G17
```

## Slide 21 – karty G16–G18, H01–H04

*Kódy karet na slidu: G13, G14, G16, G17, G18, G20, G21, G24, H01, H02, H03, H04, H05, H06, H07, H08*

```text
G17

Z tohohle místa vás trochu mrazí. Na jedné straně zeď stromů, na druhé hradba skal. Slunce sem ani nepronikne a do toho ta vlezlá vlhkost. A navíc Máte pocit, že vás někdo
pozoruje. Nebo je to jen přelud?

Podle popisu od Jarka byste měli po téhle cestě
dorazit na palouk s rozpadlým seníkem a pak
se vydat podél koryta až k vodopádu.
👣 Podmínka postupu: vyhodnoťte setkání (⏳)
G18

🧠 [Získali jste píšťalku]
Odevzdat píšťalku ➤ 📜G13
Jarek: “No, víte co. Jak tu láno ten pobuda kšičel, splašil mi moje ovečky a ty se lozutekly do lesa. Jedna byla až
v Tloskovicích u tábožiště. Nejsem si úplně jistej,
jestli už sem sehnal všechny. Můžete mi je pomoct
spočítat? Já si teďka musím vyžezat píšťalku,
ktelou sem někde ztlatil. A pasáček bez píšťaky,
to je jako hlušeň bez hlušek, no nemám plavdu?”
🌿 Úkol: Spočítejte ovce v ohradě ➤ 📜G14
H04

Přicházíte k vodopádu a z toho co tu vidíte nemáte vůbec dobrý pocit. V proláklině od padající vody leží tělo muže v kápi. Máte hodně silné tušení, že je to ten, koho hledáte.
A aby toho nebylo málo, těla si ještě před vámi všiml vlk, který se už stihl pustil do díla. Naštěstí si vás zatím nevšiml.
👣 Raději odejít pryč
    ➤ 📜H05
🗡️ Pokusit se odehnat vlka ➤ 📜H04
NEBO
H01

Stačilo začít křičet a mlátit o sebe klacky. Vlk vrčel a cenil zuby, ale nakonec utekl. Škoda,
že váš hrdinský čin nikdo neocení.
Teď máte příležitost si tělo prohlédnout. Na druhou stranu je vám jasné, že takové tučné kořisti se vlk nevzdá tak snadno.
🔍 [V okruhu 20 kroků od vás se nenachází žádný pacifista]
 Prohlédnout tělo ➤ 📜H06
👣 Raději odejít ➤ 📜H05
NEBO
H03

Shledali jste, že u vodopádu už toho moc nezmůžete. Nechcete se stát dalším chodem pro vlky. Je vám jasné, že ten jeden, kterého jste potkali nebyl jediný. Sice se vám ho povedlo odehnat, ale proti celé smečce hladových vlků byste těžko obstáli. A jejich vytí už slyšíte všude kolem.a navíc, na to, abyste pochovali toho nebožtíka, nemáte lopatu. Jste si jistí, že od vodopádu jste odešli právě včas.
Je vám jasné, že ten, kdo tam ležel byl muž, kterého jste hledali. Pasáček Jarek by si určitě zasloužil vědět, jak to s ním dopadlo.

Jakmile jste vzali kámen do ruky, rozdrolil se na prach. Náraz na tvrdou skálu odvedl své. Ze záhybu kápě se při tom vykutálel svitek. Ihned jste poznali rolomenou pečeť Nebáků. Těžko říct, zda ji poničil pád, nebo ten, kdo si psaní přečetl. Mohl to být snad tenhle muž? Zvědavost po tom, co je uvnitř, vás přemohla a svitek jste rozvinuli.
Bohužel je psaný písmem, které nikdo z vás
nedokáže přečíst. Takže ani nevíte komu je
adresovaný. Snad by to písmo dokázal přečíst
Troskovický
písař.
👣 Odejít pryč ➤ 📜H07
H02
👣 Úkol: Dojděte na palouk se seníkem ➤ 📜G24
👣 Podmínka postupu: vyhodnoťte setkání (⏳)
👣 Úkol: Vraťte se zpět k ohradě s ovcemi ➤ 📜H08
G16

Jarek: “Cože? Já jich ale pšece Tolik nemám. 😊 Nepočítali ste náhodou i belany? Já sem ale žíkal ovce! Belani se pšece nesplašili a nemyslím si, že by se za mi za tu chvilku stihlo nalodit tolik mladejch.
No, tak koukám, že si je stejně budu muset pšepočítat
sám. Ale abyste si nemysleli, že sem jen neludnej dědek, tak vám můžu poladit, jak se dostat k vodopádu a nezlomit si pši tom nohu.”
🔍 [😐 > 5] Zeptat se na cestu k vodopádu ➤ 📜G20
👣 Popřát hezký den a
     odejít  ➤ 📜G21
NEBO
```

## Slide 22 – karty H05–H12

*Kódy karet na slidu: H02, H03, H05, H06, H07, H08, H09, H10, H11, H12, H13, H14, H15*

```text
H06

Muž má sice ohlodanou ruku, ale to není smrtelné
zranění. To jste našli až po sejmutí jeho kápě.
Na čele má ránu, která vede od kořene nosu nahoru.
Ten chudák nejspíš uklouzl na mokré skále a spadl
hlavou přímo na kámen. Tělo už je vychladlé a kůže
bez barvy, ale i tak není pochyb o tom, že je to ten, koho jste hledali.
Modrý kámen, který měl na krku vypadá hodně poškozeně.
👣 Raději odejít pryč
     ➤ 📜H03
🔍 Prohlédnout si modrý kámen ➤ 📜H02
NEBO

👣 Podmínka postupu: vyhodnoťte setkání (⏳)
👣 Úkol: Vraťte se k ohradě s ovcemi ➤ 📜H08
Shledali jste, že u vodopádu už toho moc nezmůžete. Nechcete se stát dalším chodem pro vlky. Je vám jasné, že ten jeden vlk, kterého jste viděli nebyl jediný a celé smečce hladových vlků byste se těžko ubránili. Jejich vytí už slyšíte všude kolem. a navíc, na to, abyste pochovali toho nebožtíka, nemáte lopatu. Jste si jistí, že od vodopádu jste odešli právě včas, ale nemáte ze sebe dobrý pocit.
Předpokládáte, že ten, kdo tam ležel byl muž, kterého jste hledali. Pasáček Jarek by si určitě zasloužil vědět, jak to s ním dopadlo.
H05
H08
H09
H10
H11

H07

Neměli jste už co ztratit a tak jste svitek rozvinuli, abyste si přečetli, co je uvnitř. Pečeť patřící Nebákům byla už stejně rozlomená. Těžko říct, zda ji rozlomil ten tajemný muž, nebo
zvědavý pasáček. Bohužel jste zjistili, že je to
napsané cizím písmem, které nikdo z vás nedokáže
přečíst, natož aby rozuměl tomu, co je tam napsané.
Snad by to dokázal troskovický písař.
Shledali jste, že u vodopádu už toho moc nezmůžete. Nechcete se stát dalším chodem pro vlky.Vlci žijí ve smečce a máte strach, že ten, kterého jste potkali nebyl jediný. Sice se vám ho povedlo odehnat, ale proti celé smečce hladových vlků byste těžko obstáli. A jejich vytí slyšíte všude kolem. a navíc, na to, abyste pochovali toho nebožtíka, nemáte lopatu. Jste si jistí, že od vodopádu jste odešli právě včas.

Je vám jasné, že ten, kdo tam ležel byl muž, kterého jste hledali. Teď je vaše jediné vodítko svitek, který měl u sebe.

👣 Úkol: Dojděte na cestu u rybníka západně odsud ➤ 📜H09

Přišli jste na cestu, která vede podél rybníku.

Když se dáte doleva, dojdete do Troskovic. Místní písař by vám snad mohl pomoci rozluštit to tajemné písmo a říci vám, jakou zprávu ten záhadný cizinec z nebákova nesl.

Když půjdete na druhou stranu, dojdete zpět nahoru do Tachova. Jarek by si možná zasloužil vědět, jak to s tím mužem dopadlo.
👑 Úkol:
Dojďte k ohradě s ovcemi za Jarkem ➤ 📜H10
Po náročném stoupání jste přišli zpět k ohradě s ovcemi. Jakrek vás posměšně vítá: “Tak to vypadá, že ste nepochodili. Že ten zmetek vzal

nohy na lamena a utek?” Když jste mu všechno řekli, zblednul. “Počkjte, snad si nemyslíte, že to je moje vina. Já ho nezabil! Oplavdu ne! Plosím, běžte se za něj pšimluvit ke smílčímu kšíži svatého Janu z Nepomuk. Já zatím dojdu do Sobotky plo hlobníka.”

v chlívě. Muselo to bej jeho. Nechte si to, já stejně neumím číst.”

Podal vám srolovaný svitek. S tím se otočil a vyrazil na cestu.
👑 Úkol: Dojďte ke kříži
    ➤ 📜H12
🔍 Ihned si prohlédněte si svitek ➤ 📜H11
👑 Úkol: Dojďte ke kříži
➤ 📜H12
👣 Úkol: Dojďte do
     Troskovic ➤ 📜H15
NEBO
NEBO
👣 Podmínka postupu: vyhodnoťte setkání (⏳)
👣 Úkol: Dojděte do troskovic ➤ 📜H15
H12

Došli jste ke křížku, zasvěcenému svatému Janu z Nepomuk, který ochraňuje zpovědní tajemství. Cestou jste zvažovali, zda se zde rovnou nevyzpovídat a říct vše o cizinci, Jarkovi a jeho možné vině na smrti toho muže. Dospěli jste k závěru, že snad bude lepší, když to necháte být a zůstane to jen mezi Jarkem a Bohem. Možná, kdybyste tu byli sami. U pomníku jste však potkali u ženu z Želejova. Dali jste se s ní do řeči a ona velice ocenila to, že jste se šli za nebožtíka přimluvit u Pána. 😊
JArkova žádost je splněna a duše toho muže v bezpečí, teď si v klidu můžete prohlédnou svitek.
🔍 Prohlédnou si svitek ➤ 📜H13
👣 Vydejte se rovnou za písařem do troskovic
    ➤ 📜H14
NEBO
Když jste Jarkovi všechno řekli, zblednul. “Počkjte, snad si nemyslíte, že to je moje vina. Já ho nezabil! Oplavdu ne! Plosím, běžte se za něj pšimluvit ke smílčímu kšíži svatýho Jana z Nepomuk. Já zatím dojdu plo hlobníka do Sobotky. Jo a tohle sem našel
```

## Slide 23 – karty H13–H15

*Kódy karet na slidu: H13, H14, H15, H16*

```text
H15

H13
H14

Přišlo vám, že cesta zpět trvala věčnost. A celou tu dobu se vaše myšlenky obracely k tomu mrtvému muži pod vodopádem. Přemýtali jste, jestli jste mohli něco udělat jinak, aby to celé dopadlo lépe. Kdyby se tak dal vrátit čas…
Konečně jste dorazili do Troskovic, kde vaše dnešní dobrodružství začalo. Jak vám to místo ráno přišlo zvláštní a cizí, tak se vám zde už teď začíná docela líbit. Čím dál tím víc si všímáte krásy této krajiny a napadlo vás, že kdyby měl být ráj někde v krajině české, klidně by to mohlo být v těchto místech.
Nejprve jste si prohlédli rozlomenou pečeť. Ihned jste poznali, že nese znak Nebáků. Těžko říct, zda ji rozlomil ten tajemný muž, nebo
zvědavý pasáček. Zvědavost, co je uvnitř vás přemohla a svitek jste rozvinuli. Nevěřícně jste na svitek koukali. Předávali jste si ho z ruky do ruky, ale bohužel, nikdo z vás ho nedokázal ani přečíst.
Je napsaný písmem které nepřečtete. Takže ani
nevíte komu je dopis adresovaný. Snad by vám
mohl pomoci
Troskovický
písař.
👣 Úkol: Dojděte do troskovic ➤ 📜H15
Kartu H15 odlože a pokračujte čtením karty H16.

Rozhodli jste se nechat věci tak jak jsou. Jarek žije v blahé nevědomosti, že záhadný cizinec, se brzy vrátí tam, odkud přišel a je to tak asi lepší. Ať je Jarek jaký je, má už svoje léta a kdoví, jak by reagoval, kdybyste mu řekli, že má pod ohradou mrtvolu.

A až budete v Troskovicích mluvit s písařem, rovnou mu o nebožtíkovi řeknete. On určitě bude vědět, kdo je místní ras a ten už se o něj postará.
⏳ Událost: Dojdete k odbočce na Želejov ➤ ⏳
👣 Úkol: Dojděte do troskovic ➤ 📜H15
```

## Slide 24 – karty H16–H22

*Kódy karet na slidu: H16, H17, H18, H19, H20, H21, H22, H23, P05*

```text
H18
H21

Písař si vás jednoho po druhém prohlédl a potom do lokálu zakřičel: “Znáte je někdo?” Díky vaší dobré reputaci se na vás snesla jen samá chvála. Písař k vám natáhl ruku se slovy: “Tak ukažte co to máte.”
Rozbalil svitek a začal ho polohlasem pročítat. Po chvíli začal vyprávět: “Je to napsané písmem zvaným abur. Jedná se o poněkud mladé písmo a tak není divu, že ho nejste schopni přečíst. Zdá se, že se jedná o dopis určený nějakému panu Jaroslavovi z Kutné Hory. Potvrzuje, že na Nebákově je poklad nesmírné hodnoty pro který by stálo za to srovnat tvrz se zemí a také, že paní Machně hrozí nebezpečí v podobě lsti.”

Písař si vás jednoho po druhém prohlédl a potom do lokálu zakřičel: “Znáte je někdo?” Někteří místní vás sice chválili, ale jiní si pod vousy brblali nehezká slova.
To písaře moc nepotěšilo. Podíval se na vás a řekl:”Nezlobte se vzácní cizinci, ale právě jsem dostal královské pověření do Prahy. Je mi líto, ale nemůžu vám pomoci neb mé myšlenky se nyní ubírají jiným směrem. Navštivte mě v mé pracovně po mém návratu. To vám snad už budu nápomocen. Do té doby jsem s Bohem.”
S tím se otočil zpět ke svému žejdlíku a přestal si vás všímat.
H20
H22

Nedokážete skrýt své zklamání. Nechápavě koukáte jeden na druhého a nechcete uvěřit tomu, že vše ztroskotalo jen kvůli tomu, že jste se snažili rychle pomoct místo toho, abyste byli vnímaví k okolí.
Shledali jste, že to zapijete v místní hospůdce, přenocujete v přilehlém tábořišti a ráno si seženete povoz, který vás odveze domů.

Dokončili jste troskovické dobrodružství, ale za jakou cenu?
Nebylo by lepší, kdyby vás tu lidé měli rádi?
Možná to budete chtít zkusit znovu a zvolit jiná rozhodnutí.
H19

“Dokonce se mu prý podařilo dostat do přízně zlosynů, kteří za tou lstí stojí. Bojí se však, že za chvíli jeho klam prohlédnou a tak žádá o pomoc a ochranu. A to jak pro sebe, tak pro tvrz samotnou. Na závěr dopisu uvádí, že se toho času bude ukrývat ve skalním městě zvaném Apolena, kde mu místní poustevník nabídl přístřeší ve své jeskyni. Bohužel tím jeho dopis končí. Pokud chcete vědět více, nejspíš budete muset do Kutné Hory a najít pana Jaroslava.” S těmito slovy vám podal dopis zpět do ruky.
Nedokážete skrýt své zklamání. Po celodenním snažení jste znovu na začátku.
H16

👣 Úkol: Dojděte k hospůdce Apolena ➤ 📜H17
Jak se tak rozhlížíte kolem, někteří místní vám jsou už i povědomí a podle jejich reakce na vás soudíte, že vy jim též. Cestou do Troskovic vám dokonce hlavou kynuli na pozdrav. Nálada se vám tak i přes nedávné pochmurné události začala zlepšovat.

Po krátkém rozhovorou s rychtářem jste zjistili, že písař dostal neodkladné královské povolání do Prahy. Sbalil si věci a vyrazil k místní hospůdce, odkud ho chvíli po klekání odveze objednaný povoz. Ještě je čas, ještě byste ho tam měli zastihnout.
Pokračujte kartou H22
Pokračujte kartou H19
Pokračujte kartou H20

Zdá se, že vaše další dobrodružství bude pokračovat někde v Kutné Hoře. Nejdřív ale bude nutné oznámit paní Machně výsledek vašeho pátrání a také, jak to dopadlo s jejím sídlem.
Shledali jste, že teď je čas občerstvit se v místní hospůdce, přenocovat v přilehlém tábořišti a ráno si sehnat povoz, který vás odveze domů.

Úspěšně jste dokončili troskovické dobrodružství a dokázali si zachovat kladnou reputaci. To je velice chvályhodné!
Ale možná ho budete chtít zažít znovu a zkusit jiná rozhodnutí.

➤ Nyní se prosím řiĎte pokyny na kartě P05.
➤ Nyní se prosím řiĎte pokyny na kartě P05.

💀 [😐 < 1]     ➤ 📜H23
👣 [😐 = 1-6] ➤ 📜H21
H17
👑 [😐 > 6]     ➤ 📜H18

Čekání na povoz si krátil pitím piva a hrou v kostky, což je v tomto kraji očividně oblíbená kratochvíle. Počkali jste až dohraje rundu a poté ho oslovili.
Na to, jak tu bylo mrtvo, když jste se vyptávali na neznámého hosta, je tu teď znatelně živěji. Hostinský běhá od stolu ke stolu, aby stihl všechny obsloužit. Teď už byste mu i věřili, že má na pilno.

Poznat mezi hosty písaře nebyl problém. Prozradilo ho, mírně řečeno, okázalé odění a velká cestovní truhla ležící u jeho nohou
```

## Slide 25 – karty H23–H26

*Kódy karet na slidu: H23, H24, H25, H26, P05*

```text
H23

Písař si vás jednoho po druhém prohlédl a potom do lokálu zakřičel: “Znáte je někdo?” Troskovičtí si vás prohlíželi a přitom se nechápavě koukali jeden na druhého. Vaším směrem se upřela také pozornost strážných, kteří do teď byli zády k vám. Něco si mezi sebou šuškali , potom vstali a vyrazili vaším směrem. Jeden z nich při tom říkal: “Zatýkáme vás za podezření ze spáchání dvou trestných činů. Buď s námi půjdete po dobrém, nebo použijeme násilí." Celá hospoda ztichla. Někteří lidé se raději koukali se do svých žejdlíků.
H25

Nemůžete uvěřit tomu, jak to celé dopadlo. Ráno rychtář jistě uzná vaši nevinu. A pokud ne, pošlete posla pro pomoc. Škoda, že v tu dobu už bude písař pryč a vy se budete muset vrátit domů s nepořízenou.
Strážní vám jednomu po druhém postupně svázali ruce. A ve chvíli, kdy vám na hlavy nasadili pytle se váš svět ponořil do tmy…

Dokončili jste troskovické dobrodružství, ale za jakou cenu?
Nebylo by lepší, kdyby vás tu lidé měli rádi?
Možná to budete chtít zkusit znovu a zvolit jiná rozhodnutí.
➤ Nyní se prosím řiĎte pokyny na kartě P05.
💬 [😐] “To musí být omyl, jsme neviní!” ➤ 📜H24
💬 [😡] “Přiznáváme se,
     odveďte nás.” ➤ 📜H26
NEBO
H26

Strážní vám postupně začali svazovat ruce. “Za tohle nás velitel pochválí,” řekl jeden. “Souhlas kamaráde. A zejtra už si s nima kat poradí. Stejně je nechápu. Zůstanou po nich dvě mrtvoly a oni si jako páni nakráčej do hospody. Co čekali? Že je za to pochválíme?” Potom vám na hlavy nasadili pytle a váš svět se ponořil do tmy…

Dokončili jste troskovické dobrodružství, ale za jakou cenu?
Nebylo by lepší, kdyby vás tu lidé měli rádi?
Možná to budete chtít zkusit znovu a zvolit jiná rozhodnutí.
➤ Nyní se prosím řiĎte pokyny na kartě P05.
H24

Strážný: "Chcete nám tvrdit, že posel z Nebákova umřel u tý lípy sám od sebe? Někdo viděl, jak se motáte kolem. A že toho u vodopádu zakousli vlci? Chudák lovčí. Přiběhl sem celej bledej a vyprávěl nám, co tam viděl. A kdoví, co se vlastně doopravdy stalo na Nebákově. Co když v tom máte taky prsty. Měli ste si dávat větší pozor, protože lidi tady se zajímaj hlavně o druhý. Zvlášť, když sou tu cizí a strkaj nos do jejich záležitostí." Snažili jste se vysvětlit, jak to bylo. Snad díky tomu, že vaše pověst tu není vyloženě špatná, si vás strážní vyslechli. “O vaší vině zítra rozhodne rychtář,” řekl ten druhý. “Noc ale strávíte u nás za mřížemi.”
Pokračujte kartou H25
```

## Slide 26 – balíček N: N01–N08 (náhodná setkání)

*Kódy karet na slidu: N01, N02, N03, N04, N05, N06, N07, N08*

```text
Smutné ženy

“Kvůli nedávným událostem bylo mnoho mužů odvedeno na frontu. Ženy a dívky, které tu zůstaly samy jsou smutné. Potěšte některou z nich květinou z čerstvě natrhaného kvítí.”

Zloděj!

“Okradli vás. A ani jste si toho nevšimli, že? Nic si z toho nedělejte, to se prostě stává.”

Možná byste se měli vydat do Troskovic a ohlásit krádež. Nebo to nechte být, ale nemine vás postih.
N01
N02
N03
N05
N06
N07
N08
Postih: 😡
Odměna: —
Dokud nevyhodnotíte tuto událost, nemůžete pokračovat v příběhu.

Potulný kostkař!

“Starý kostkař vás vyzývá, abyste předvedli svoje štěstí. Musí vám jedním hodem na šesti kostkách padnout součet přesně 21. Ale máte na to jen sedm pokusů!”

N04
Neúspěch: 😡
Úspěch: —
Dokud nevyhodnotíte tuto událost, nemůžete pokračovat v příběhu.
Můžete to provést kdykoliv v průběhu dobrodružství, ale jen jednou.
Odměna: 😊

Cikáni

“Podívejte! To jsou potulní muzikanti! A zvou vás na tancovačku! Zazpívejte si společně až dvě písně a nenechte nohy odpočinout. Přece je nechcete urazit.”
Dokud nevyhodnotíte tuto událost, nemůžete pokračovat v příběhu.
Odměna: 😊 za 1 píseň
Postih: 😡

Nepořádek po nájezdu

“Po posledním nájezdu loupežníků z řáholeckého lesa tady zůstal hrozný nepořádek. Přidejte alespoň trochu ruku k dílu. Odsud až k dalšímu zastavení uklízejte nepořádek podél cesty.”

Odměna: 😊

Pomoc v nouzi

“V Turnově se naskytly nové pracovní příležitosti. Hodně čeledínů odtáhlo a nechalo místní hospodáře bez pomoci. Nabídněte někomu z místních pomoc. Udělejte o co vás žádá a získáte odměnu.”

Můžete to provést kdykoliv v průběhu dobrodružství, ale jen jednou.
Odměna: 😊

Léčka?!

“Na cestě před vámi leží kmen stromu. Takové věci se zpravidla nedějí náhodou. Možná bude lepší, když to vezmete přes les nebo louku a nebo si prostě najdete jinou cestou. A nebo půjdete dál a pokusíte Fortunu.”
Slečna s kosou
Kde se vzala, tu se vzala, stojí před vámi dívka celá v černém s kosou v ruce. Ačkoliv je bledá a kostnatá, na jejím vzhledu je cosi podmanivého. Promluvila k vám mrazivě chladným hlasem:

“Čas od času se potkáme. Včas vás upozorním na nečekané události. Třeba zrovna teď!”

Leknutím jste mrknuli a když jste otevřeli oči, už tam nebyla.
Tuto kartu založte dospod balíčku “N” a otočte tu, co je teď navrchu. Vždy když kartu z balíčku “N” vyhodnotíte, vraťte ji dospod balíčku “N” a pokračujte v příběhu.
👣 Vyhnout se cestě vedoucí k dalšímu rozcestí
💀 Jít dál a hodit si kostkou:
        ⚁⚂⚃⚄: 😡😡
NEBO
```

## Slide 27 – balíček N: N09–N16 (náhodná setkání)

*Kódy karet na slidu: N09, N10, N11, N12, N13, N14, N15, N16, O01, O02, O03*

```text
Zkažená voda

“Mezi místními se povídá, že v troskovické studni je zkažená voda. Pokud máte zásoby vody, ihned ji všechnu vylijte. Přece nechcete mít zdravotní problémy.”

Zranění

“Kdybys tolik nepovídal a dával
pozor na cestu, nezakopl bys
o kámen. Ale neboj, za chvíli
to přejde.”

Ten kdo naposledy něco řekl si zranil pravou
nohu a bolestí na ni nemůže našlapovat. Pohybovat se může pouze s pomocí hole nebo přátel.

Bolest poleví až na konci následujícího balíčku karet.
N09
N10
N11
N13
N14
N15
N16

Střelecká výzva

“Lovčí od Věžáku vás vyzývá na
duel. Nenechte se zahanbit!”

Vyberte jednoho z vás. Ten si určí libovolný strom a pokusí se třikrát trefit do jeho kmene ze vzdálenosti 50 stop. Může házet čím chce - kámen, šiška, větev … ale má na to jen 5 pokusů.”
N12
Neúspěch: 😡
Úspěch: 😊
Tuto událost vyhodnoťte, jakmile uvidíte vhodné místo.
Dokud nevyhodnotíte tuto událost, nemůžete pokračovat v příběhu.

Chudina v nouzi

“‘Přišlaaa bídaaa, mooor a hlaaad.’
Ozvěna té písně se nese krajem. Pozvěte někoho z místních na jídlo nebo pití. Zajisté to ocení.”
Můžete to provést kdykoliv v průběhu dobrodružství, ale jen jednou.
Odměna: 😊

Hádankář

“Potkali jste cizince, který má pro vás hádanku:

‘Mám města, ale žádné zlato.
Mám domy, ale žádné lidi. Mám
lesy, ale žádnou zvěř. Mám vodu,
ale žádné ryby. Co jsem?’

Uhodnete správnou
odpověď?”
Odměna: 😊
(Nepočítá se to, pokud splníte úkol v rámci dobrodružství.)
Řešení najdete na kartě O01, uprostřed.

Hádankář

“Potkali jste cizince, který má pro vás hádanku:

‘Každý mne jí, ale nikdo neloví,
ani neseje. Nerostu na poli ani
na stromech. Kvůli mému vzniku
musí umřít moře, ale když já se
dotknu vody, zhynu. Co jsem?’

Uhodnete správnou
odpověď?”
Řešení najdete na kartě O02, vpravo nahoře.

Hádankář

“Potkali jste cizince, který má pro vás hádanku:

           ‘Můžu být všude, ale jsem
           málokde. Každý mne zná a čas
           od času si mne přeje. Pokud mne
           přivoláte, ztratím se. Je totiž
           velice těžké mne udržet. Co jsem?’

Uhodnete správnou
odpověď?”
Řešení najdete na kartě O03, uprostřed nahoře.
Odměna: 😊
Odměna: 😊

Léčka?!

“V křoví u cesty před vámi se něco zablesklo. Nemůže to být zbraň potulného lapky? Možná bude lepší, když to vezmete přes les nebo louku a nebo si prostě najdete jinou cestou. A nebo půjdete dál a pokusíte Fortunu.”
👣 Vyhnout se cestě vedoucí k dalšímu rozcestí
💀 Jít dál a hodit si kostkou:
        ⚀⚁⚄⚅: 😡😡
NEBO
```

## Slide 28 – balíček N: N17–N20 (hádanky; zdrojová extrakce je zde odříznutá)

*Kódy karet na slidu: N17, N18, N19, N20, O01, O02*

```text
N17
N18
N19
N20

Hádankář

“Potkali jste ženu, která má pro vás hádanku:

          ‘Mám jedno oko, ale i tak nevidím.
          Ač jsem malá, pro spoustu lidí
          jsem důležitá. Spojím i to, co zničil
          čas. Zakrývám živé, zatímco sama
jsem neživá a nahá. Co jsem?’

Uhodnete správnou
odpověď?”
Odměna: 😊
Řešení najdete na kartě O02, uprostřed.

Hádankář

“Potkali jste cizince, který má pro vás hádanku:
                    ‘Jsou dva bratři, kteří se nikdy
                    nepotkali. Nejí, nepijí, nechodí ven.
                    Mnozí se za nimi vypravili, ale nikdy
                    nedošli cíle. Ještě že Slunce je pravidelně navštěvuje. Znáte jejich jména?’

Uhodnete správnou
odpověď?”
Odměna: 😊
Řešení najdete na kartě O01, vpravo uprostřed a dole.

Hádankář

“Potkali jste ženu, která má pro vás hádanku:

          ‘Kdybych byla živá, neunesla
          bych tolik jako teď. Uvnitř jsem
          sice dutá, ale často plná živo
```

