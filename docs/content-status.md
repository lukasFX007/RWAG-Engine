# Stav obsahu — Tajemství Nebákova

Generováno nástrojem `tools/content_status.py` z `games/nebakov/scenario.json` a `events.json`. Spusť ho znovu po každé úpravě karet.

## Souhrn

- scén: **146**, karet balíčku N: **19**
- poznámek `todo`: **46**
- **zastavuje průchod hrou: 1**
- dosažitelných scén bez východu: 2 (`card_B02`, `card_P05`)
  - z toho označených jako konec hry (`ending: true`): `card_P05`
- nedosažitelných scén: 10 (`card_B12`, `card_C11`, `card_D12`, `card_G17`, `card_P01`, `card_P02`, `card_P03`, `card_P04`, `card_intro_dopis`, `card_legenda`)

> Podstatné zjištění: velká většina poznámek `todo` **nejsou chybějící návaznosti**. Jsou to buď karty, které správně žádné pokračování nemají (předměty, osobní karty, náhodná setkání), nebo nejistota, na které kartě má text sedět. Hra je tedy prakticky průchozí a kritickou cestou k produkčnímu stavu je engine, ne dopisování obsahu.

## A. Zastavuje průchod hrou — 1

Dosažitelná scéna bez východu, u které východ chybět nemá. Tohle je jediná kategorie, která brání dohrát hru.

- **B02** · `card_B02` · slide 7, 8
  - Na kartě nebyl ve zdroji nalezen explicitní odkaz na další kartu (pravděpodobně se pokračuje zpět na B03/B04) – doplní autor scénáře.

## C. Není to scéna — potřebuje datový model — 23

Karty, které správně nemají žádné „goto“: předměty do inventáře, osobní karty, nápovědy pro konkrétního hráče, náhodná setkání, referenční listy. Nechybí u nich obsah, chybí jim v enginu odpovídající pojem.

- **B12** · `card_B12` · slide 8, 9 · nedosažitelná
  - Šest fyzických karet se stejným kódem B12 (předměty/znalosti do inventáře), nikoli scéna s návazností. Přiřazení textu „Pomůže ti od břichabolu…“ ke Kontryhelu je rekonstruované.
- **C11** · `card_C11` · slide 11 · nedosažitelná
  - Osobní karta klatby (ponechává si ji jeden hráč), nikoli scéna s návazností.
- **D12** · `card_D12` · slide 13, 15 · nedosažitelná
  - Nápovědná karta pro dva hráče hrající stráže (viz D02), nikoli scéna s návazností.
- **N01** · `card_N01` · slide 5, 26 · balíček N
  - Karta N01 leží navrchu balíčku „N“ – uvádí mechaniku náhodných setkání. Nemá návaznost.
- **N12** · `card_N12` · slide 20, 27 · balíček N
  - Kartu N12 vyvolává karta G22 (lovčí u konce cesty). Sama nemá návaznost.
- 16 karet se stejnou poznámkou:
  - **card_chudina_v_nouzi** · `card_chudina_v_nouzi` · balíček N
  - **card_cikani** · `card_cikani` · balíček N
  - **card_hadankar_bratri** · `card_hadankar_bratri` · balíček N
  - **card_hadankar_jehla** · `card_hadankar_jehla` · balíček N
  - **card_hadankar_kraj** · `card_hadankar_kraj` · balíček N
  - **card_hadankar_sul** · `card_hadankar_sul` · balíček N
  - **card_hadankar_ticho** · `card_hadankar_ticho` · balíček N
  - **card_lecka_kmen** · `card_lecka_kmen` · balíček N
  - **card_lecka_zablesk** · `card_lecka_zablesk` · balíček N
  - **card_neporadek_po_najezdu** · `card_neporadek_po_najezdu` · balíček N
  - **card_pomoc_v_nouzi** · `card_pomoc_v_nouzi` · balíček N
  - **card_potulny_kostkar** · `card_potulny_kostkar` · balíček N
  - **card_smutne_zeny** · `card_smutne_zeny` · balíček N
  - **card_zkazena_voda** · `card_zkazena_voda` · balíček N
  - **card_zlodej** · `card_zlodej` · balíček N
  - **card_zraneni** · `card_zraneni` · balíček N
  - Karta balíčku „N“ (náhodné setkání) – ve zdroji nemá odkaz na další kartu; vyhodnocuje se na místě. Kódy N02–N11 a N13–N16 nelze ze zdroje jednoznačně přiřadit ke konkrétním textům, proto je použit slug. Zvaž přesun do samostatného events.json, na který scenario.json už odkazuje.
- **card_intro_dopis** · `card_intro_dopis` · nedosažitelná
  - Zvací dopis je fyzická příloha v obálce; ve hře se čte na kartě B09. Návaznost není na dopise uvedena.
- **card_legenda** · `card_legenda` · nedosažitelná
  - Referenční stránka (rub karty rolí), nikoli herní scéna. Obsah odpovídá legend.json. „📜A29“ je pouze ilustrativní příklad, nejde o skutečný odkaz na kartu.

## D. Ověřit přiřazení textu ke kartě — 17

Na zdrojovém slidu je víc karet pohromadě a extrakce nezachovala jejich hranice. Hra se hraje, ale text může sedět na jiné kartě, než má. Nutná kontrola proti originálu.

- 9 karet se stejnou poznámkou:
  - **A03** · `card_A03` · slide 6
  - **A12** · `card_A12` · slide 7
  - **A13** · `card_A13` · slide 7
  - **A14** · `card_A14` · slide 7
  - **C12** · `card_C12` · slide 11
  - **C15** · `card_C15` · slide 11
  - **G11** · `card_G11` · slide 19
  - **G21** · `card_G21` · slide 19, 20, 21
  - **H19** · `card_H19` · slide 24
  - Přiřazení textu ke kódu karty je rekonstruované ze slidu, na kterém je vysázeno více karet – ověřte proti originálu.
- **B08** · `card_B08` · slide 8
  - Přiřazení textu prokletí ke kartě B08 je rekonstruované – ověřte proti originálu.
- **C19** · `card_C19` · slide 11, 12, 13
  - Dva rámečky „Následek“ (⏳ / 😡😡) jsou ve zdroji vysázené mezi kartami C19 a C21 – jejich přiřazení právě ke C19 je rekonstruované, ověřte proti originálu.
- **G09** · `card_G09` · slide 18, 19
  - Rozdělení dvojice karet G10 / G11 mezi G08 (vlídná varianta) a G09 (nevlídná varianta) je rekonstruované – ověřte proti originálu.
- **H14** · `card_H14` · slide 22, 23
  - Text karty („necháte věci tak, jak jsou“) nezapadá zcela do návaznosti z H12 („Vydejte se rovnou za písařem“) – přiřazení textu ke kódu H14 ověřte proti originálu.
- 4 karet se stejnou poznámkou:
  - **P01** · `card_P01` · slide 5 · nedosažitelná
  - **P02** · `card_P02` · slide 5 · nedosažitelná
  - **P03** · `card_P03` · slide 5, 7 · nedosažitelná
  - **P04** · `card_P04` · slide 5 · nedosažitelná
  - Balíček P: rozdělení textu mezi karty P01–P05 je rekonstruované – na slidu je všech pět karet pohromadě a extrakce nezachovala jejich hranice. Ověřte proti originálu.

## E. Chybí obsah ve zdroji — 1

Zdrojová prezentace nebyla stažená celá.

- **card_hadankar_neuplna** · `card_hadankar_neuplna` · balíček N
  - POZOR: text této hádanky je ve zdrojové extrakci odříznutý (prezentace nebyla stažena celá). Doplňte celý text a řešení z originálu.

## F. Přepsat pro digitální verzi — 1

Text popisuje zacházení s fyzickými kartami a v plně digitální hře nemá smysl.

- **P05** · `card_P05` · slide 5, 24, 25
  - Plně digitální verze: text je úklid fyzických karet po hře a je potřeba ho přepsat na závěrečnou obrazovku. Míří sem čtyři konce z balíčku H (H19, H22, H25, H26).

## G. Vyžaduje rozhodnutí — 3

Poznámka, na kterou nesedlo žádné pravidlo.

- **F14** · `card_F14` · slide 17, 18
  - Karta obsahuje pouze rámečky s podmínkami, samostatný narativní text na ní ve zdroji není.
- **G23** · `card_G23` · slide 20
  - Úkol i cíl jsou potvrzené autorem. Zbývá dvojí: podmínka postupu je zatím jen text v kartě a potřebuje datový model (úkol se má odemknout až po jejím splnění), a je třeba potvrdit, která podmínka to je – na slidu 20 je vedle sebe vysázená obecná „vyhodnoťte setkání (⏳)“ i konkrétní „Vyhodnoťte 📜N12; pro odměnu musí výzvu splnit dva členové výpravy“.
- **H23** · `card_H23` · slide 24, 25
  - Hradla obou větví jsou odvozená z toho, že se doplňují: „[😡]“ pokrývá zápornou reputaci, takže „[😐]“ dostalo zbytek (0 a víc). Samotné 😐 znamená podle legendy přesně 0 – potvrďte, že tady jde o „ne špatnou“ reputaci, ne o přesnou nulu.

## Chybí mimo karty

- **Balíček O** (`O01`–`O03`, případně `O04`) — řešení hádanek balíčku N. Odkazuje se na něj pět hádanek, v repu není vůbec.
- **Karty REP+ / REP−** — zmíněné v pravidlech na `card_P02`, nikdy nedigitalizované.
- **Obrázek `lipa02.jpg`** — používají ho `card_C05` a `card_C06`.
- **Souřadnice GPS zón** — `pubs` a `no_village` se používají v `roles.json`, nikde nejsou definované.
- **Mapy a obálky** — fyzické rekvizity („Mapa 03“, tři obálky); v plně digitální verzi je potřeba nahradit obsahem.

