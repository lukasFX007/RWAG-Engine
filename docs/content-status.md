# Stav obsahu — Tajemství Nebákova

Generováno nástrojem `tools/content_status.py` z `games/nebakov/scenario.json` a `events.json`. Spusť ho znovu po každé úpravě karet.

## Souhrn

- scén: **146**, karet balíčku N: **20**
- poznámek `todo`: **22**
- **zastavuje průchod hrou: 0**
- dosažitelných scén bez východu: 3 (`card_C11`, `card_D12`, `card_P05`)
  - z toho označených jako konec hry (`ending: true`): `card_P05`
- nedosažitelných scén: 6 (`card_B12`, `card_P01`, `card_P02`, `card_P03`, `card_P04`, `card_legenda`)

> Podstatné zjištění: velká většina poznámek `todo` **nejsou chybějící návaznosti**. Jsou to buď karty, které správně žádné pokračování nemají (předměty, osobní karty, náhodná setkání), nebo nejistota, na které kartě má text sedět. Hra je tedy prakticky průchozí a kritickou cestou k produkčnímu stavu je engine, ne dopisování obsahu.

## C. Není to scéna — potřebuje datový model — 4

Karty, které správně nemají žádné „goto“: předměty do inventáře, osobní karty, nápovědy pro konkrétního hráče, náhodná setkání, referenční listy. Nechybí u nich obsah, chybí jim v enginu odpovídající pojem.

- **B12** · `card_B12` · slide 8, 9 · nedosažitelná
  - Šest fyzických karet se stejným kódem B12 (předměty/znalosti do inventáře), nikoli scéna s návazností. Přiřazení textu „Pomůže ti od břichabolu…“ ke Kontryhelu je rekonstruované.
- **N01** · `card_N01` · slide 5, 26 · balíček N
  - Karta N01 leží navrchu balíčku „N“ – uvádí mechaniku náhodných setkání. Nemá návaznost.
- **N12** · `card_N12` · slide 20, 27 · balíček N
  - Kartu N12 vyvolává karta G22 (lovčí u konce cesty). Sama nemá návaznost.
- **card_legenda** · `card_legenda` · nedosažitelná
  - Referenční stránka (rub karty rolí), nikoli herní scéna. Obsah odpovídá legend.json. „📜A29“ je pouze ilustrativní příklad, nejde o skutečný odkaz na kartu.

## D. Ověřit přiřazení textu ke kartě — 7

Na zdrojovém slidu je víc karet pohromadě a extrakce nezachovala jejich hranice. Hra se hraje, ale text může sedět na jiné kartě, než má. Nutná kontrola proti originálu.

- 6 karet se stejnou poznámkou:
  - **A03** · `card_A03` · slide 6
  - **A12** · `card_A12` · slide 7
  - **A13** · `card_A13` · slide 7
  - **A14** · `card_A14` · slide 7
  - **C15** · `card_C15` · slide 11
  - **G11** · `card_G11` · slide 19
  - Přiřazení textu ke kódu karty je rekonstruované ze slidu, na kterém je vysázeno více karet – ověřte proti originálu.
- **H14** · `card_H14` · slide 22, 23
  - Text karty („necháte věci tak, jak jsou“) nezapadá zcela do návaznosti z H12 („Vydejte se rovnou za písařem“) – přiřazení textu ke kódu H14 ověřte proti originálu.

## G. Vyžaduje rozhodnutí — 11

Poznámka, na kterou nesedlo žádné pravidlo.

- **F14** · `card_F14` · slide 17, 18
  - Karta obsahuje pouze rámečky s podmínkami, samostatný narativní text na ní ve zdroji není.
- **G09** · `card_G09` · slide 18, 19
  - Autor ve druhém dotazníku uvedl, že tahle volba míří na G10 — jenže v prvním dotazníku (Q17a) potvrdil párování G08→G10, G09→G11, a při G09→G10 se na G11 nedá vůbec dostat. Ponecháno podle prvního dotazníku, k rozhodnutí autora.
- **H20** · `card_H20` · slide 24
  - Konec hry (Q22b): H20, H22, H25 a H26 jsou čtyři závěry příběhu a všechny ústí do P05, což je závěrečná obrazovka. Míří sem H19 (dobrá reputace).
- **H21** · `card_H21` · slide 24
  - Cíl volby odvozený: autor potvrdil (Q22b), že konce jsou H20, H22, H25 a H26, a text „Nedokážete skrýt své zklamání…“ patří podle Q22a na H19. Karta H20, na kterou tahle volba mířila, tím přestala být mezikrokem a stala se kladným koncem – ten na větev, kde písař odmítl pomoci, nesedí. H22 je jediný konec, který zbývá. Potvrdit v druhém dotazníku.
- **H23** · `card_H23` · slide 24, 25
  - Hradla obou větví jsou odvozená z toho, že se doplňují: „[😡]“ pokrývá zápornou reputaci, takže „[😐]“ dostalo zbytek (0 a víc). Samotné 😐 znamená podle legendy přesně 0 – potvrďte, že tady jde o „ne špatnou“ reputaci, ne o přesnou nulu.
- 5 karet se stejnou poznámkou:
  - **P01** · `card_P01` · slide 5 · nedosažitelná
  - **P02** · `card_P02` · slide 5 · nedosažitelná
  - **P03** · `card_P03` · slide 5, 7 · nedosažitelná
  - **P04** · `card_P04` · slide 5 · nedosažitelná
  - **P05** · `card_P05` · slide 5, 24, 25
  - Přepsáno pro digitální verzi (Q25a). Původní tištěný text zůstává v poli printedText. Znění je můj návrh — projděte ho prosím v druhém dotazníku.
- **card_mapa01** · `card_mapa01`
  - Obrázek mapy 1 zatím není dodaný (mapa01.jpg). Do té doby se místo něj ukáže poznámka, že chybí.

## Chybí mimo karty

- **Balíček O** (`O01`–`O03`, případně `O04`) — řešení hádanek balíčku N. Odkazuje se na něj pět hádanek, v repu není vůbec.
- **Karty REP+ / REP−** — zmíněné v pravidlech na `card_P02`, nikdy nedigitalizované.
- **Obrázek `lipa02.jpg`** — používají ho `card_C05` a `card_C06`.
- **Souřadnice GPS zón** — `pubs` a `village` se používají v `roles.json`, nikde nejsou definované.
- **Mapy a obálky** — fyzické rekvizity („Mapa 03“, tři obálky); v plně digitální verzi je potřeba nahradit obsahem.

