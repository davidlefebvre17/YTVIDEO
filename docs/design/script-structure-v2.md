# Design Document : Structure de Script v2

> **Auteur** : Editorial Score Design Team — Script Structure
> **Date** : 2026-02-20
> **Statut** : PROPOSITION — en attente de validation
> **Contexte** : Redesign de la structure narrative du Daily Recap (8-10 min)

---

## 0. Diagnostic du script actuel

### Ce qui fonctionne bien

Le script actuel (episodes du 18 et 19 fevrier) demontre deja des qualites reelles :
- **Cold opens percutants** : "Record historique. Petrole a six mois de haut. Bitcoin en chute libre." — telegraphique, intrigant, efficace.
- **Suivi J-1 honnete** : admission des erreurs, scoring transparent — c'est une force editoriale majeure.
- **Recit du jour bien structure** : connecteurs causaux, liens intermarche, narratif non-liste. C'est le meilleur segment.
- **Compliance AMF respectee** : conditionnel, scenarios, pas d'imperatifs.
- **Donnees precises** : chiffres, niveaux, pourcentages — jamais vague.

### Les 4 problemes structurels

**Probleme 1 : Couverture insuffisante (2-3 sujets au lieu de 5-7)**
Le 19 fevrier, 7 themes ont ete identifies (Iran/petrole, deficit commercial choc, airline selloff, Europe vs USA, Deere earnings, crypto fear, or $5000). Le script n'en couvre que 3 en profondeur (CAC/Airbus, KOSPI, petrole mentionne en passant). Le deficit commercial a -98.5B — un chiffre majeur — est confine dans la section News en 2 phrases. Deere +11.6% obtient une mention dans le recit du jour. L'airline selloff (8 titres a -5%+) est cite mais jamais analyse.

**Probleme 2 : Redondance intro/deep dive**
Le recit du jour du 19 fevrier consacre ~80 mots a Airbus/CAC. Le deep dive 1 reprend exactement les memes faits (Airbus -6.75%, problemes moteurs, impact CAC) et les developpe. L'auditeur entend deux fois la meme information, la deuxieme fois avec plus de details. Le recit du jour devrait poser la DYNAMIQUE ("pourquoi le marche est en tension") et le deep dive devrait apporter l'ANALYSE TECHNIQUE exclusive.

**Probleme 3 : Deep dives disproportionnes par rapport a l'interet reel**
Le 18 fevrier : deep dive argent metal (rebond +5.5% apres -5.6% la veille — OK, drama reel) + deep dive CAC 40 (record historique — OK). Justifie.
Le 19 fevrier : deep dive CAC 40 (repli de 0.36% sous le record — rechauffage du sujet de la veille) + deep dive KOSPI (+3.09% — interet faible pour un public francophone). Deux deep dives de 90-120s consomment ~4 minutes sur 8. C'est 50% du temps d'antenne pour 2 sujets, quand on rate les 5 autres.

**Probleme 4 : Structure rigide a 7 sections fixes**
Chaque episode suit exactement : cold open → suivi J-1 → recit du jour → deep dive 1 → deep dive 2 → news → zones → recap. Pas de flexibilite. Un jour calme recoit la meme structure qu'un jour de krach. Un jour avec 1 sujet dominant et 6 sujets secondaires recoit le meme traitement qu'un jour avec 3 sujets d'importance egale.

---

## A. Nouvelle structure de sections

### Principes directeurs

1. **Modularite** : le nombre et le type de segments varient selon le jour
2. **Budget temporel par sujet** : chaque sujet recoit un budget proportionnel a son importance editoriale (pas a son drama score seul)
3. **Zero repetition** : chaque seconde d'antenne apporte une information NOUVELLE
4. **Arc narratif** : l'episode a un debut (tension), un milieu (exploration), une fin (synthese + projection)

### La structure v2 : "Magazine modulaire"

```
Section               Type           Duree      Statut
-------------------------------------------------------------
1. COLD OPEN          hook           5-10s      OBLIGATOIRE
2. GENERIQUE          title_card     3-5s       OBLIGATOIRE (visuel, pas de narration)
3. SUIVI J-1          previously_on  20-40s     OBLIGATOIRE (sauf ep.1)
4. FIL CONDUCTEUR     thread         30-45s     OBLIGATOIRE — pose le theme + la dynamique du jour
5. SEGMENT x N        segment        20-90s     VARIABLE — 4 a 7 segments de profondeur variable
6. SYNTHESE MARCHE    synthesis      20-30s     OBLIGATOIRE — dashboard chiffre rapide
7. ZONES A SURVEILLER watchlist      40-50s     OBLIGATOIRE — 3 niveaux techniques
8. RECAP + CTA        recap_cta      20-30s     OBLIGATOIRE — 3 points + question

TOTAL : 480-600 secondes
```

### Explication de chaque bloc

#### 1. COLD OPEN (5-10s) — `hook`
Inchange. Phrases courtes, telegraphiques, le fait le plus frappant du jour. Maximum 15 mots. Aucun accueil.

#### 2. GENERIQUE (3-5s) — `title_card`
Visuel pur (animation titre de l'emission + date). Pas de narration a ecrire dans le script. Le generique separe le cold open du contenu — il donne un "sas" a l'auditeur pour se poser apres le choc initial.

#### 3. SUIVI J-1 (20-40s) — `previously_on`
Inchange dans l'esprit. Verification honnete des predictions de la veille. Mais avec une regle nouvelle : **le suivi J-1 ne repete aucun chiffre qui sera detaille dans les segments suivants**. Il dit "Hier je vous parlais de l'or et des 5000 — on y reviendra dans un instant" et passe au suivant. Pas de mini-analyse.

#### 4. FIL CONDUCTEUR (30-45s) — `thread`
C'est le remplacement du "Recit du jour" actuel, mais **sans chiffres detailles**. Le fil conducteur :
- Nomme le theme dominant en une phrase
- Explique POURQUOI ce theme domine (cause macro, evenement, rotation)
- Annonce la cascade : "Et ca a des consequences en chaine sur X, Y, Z — on va les voir un par un"
- Se termine par une phrase d'accroche vers le premier segment

**Ce que le fil conducteur NE fait PAS** :
- Il ne cite PAS de prix, de pourcentages, de niveaux techniques
- Il ne liste PAS les assets un par un
- Il ne repete PAS ce que les segments vont dire

**Exemple (19 fevrier)** :
> "Le theme du jour, c'est la geopolitique qui s'invite partout. Les tensions autour de l'Iran ont mis le feu aux poudres — et la cascade qui suit touche a la fois l'energie, les compagnies aeriennes, les metaux precieux, et meme le sentiment global. Mais il y a aussi une surprise macro : le deficit commercial americain qui explose a -98 milliards et demi — un chiffre que personne n'attendait. Deux forces opposees, et un marche qui ne sait pas laquelle suivre. On va decomposer tout ca."

#### 5. SEGMENTS VARIABLES (le coeur de la reforme)

C'est ici que tout change. Au lieu de 2 deep dives fixes + 1 news + 1 recit, on a **4 a 7 segments de profondeur variable**, chacun correspondant a un sujet editorial distinct.

Trois niveaux de profondeur :

| Niveau    | Nom           | Duree     | Mots (~150/min) | Usage                                            |
|-----------|---------------|-----------|-----------------|--------------------------------------------------|
| **FLASH** | Fait marquant | 20-30s    | 50-75 mots      | Chiffre + contexte en 1-2 phrases + consequence  |
| **FOCUS** | Analyse courte| 40-60s    | 100-150 mots    | Pourquoi + consequences + 1 niveau technique      |
| **DEEP**  | Analyse longue| 70-90s    | 175-225 mots    | Chaine causale + technique + scenarios + risque   |

**Regles de budget temporel :**
- Maximum 2 segments DEEP par episode (sauf jour exceptionnel)
- Minimum 2 segments FLASH par episode (pour la variete de rythme)
- Le total des segments = 300-420 secondes (5-7 minutes)
- Le premier segment est toujours le sujet le plus important (DEEP ou FOCUS)
- Le dernier segment avant la synthese est toujours un FLASH (rythme accelere avant la conclusion)

**Regles d'enchainement :**
- Chaque segment se termine par une transition vers le suivant
- Les transitions doivent creer un lien causal, thematique ou de contraste avec le segment suivant
- INTERDIT : "Passons maintenant a..." — les transitions doivent etre narratives, pas mecaniques

#### 6. SYNTHESE MARCHE (20-30s) — `synthesis`
Nouveau segment. C'est le "dashboard oral" : en 20-30 secondes, le narrateur balaie les chiffres de cloture des principaux indices et assets qui n'ont PAS ete couverts dans les segments. C'est le filet de securite qui garantit qu'aucun mouvement important n'est oublie.

**Format** : prose rapide, pas de liste, mais rythme soutenu.
> "Cote indices, le S&P recule de 0.3%, le Nasdaq de 0.25%, tandis que le DAX lache presque 1%. L'euro est stable a 1.0440 face au dollar. Et le VIX remonte a 20.23 — la nervosité s'installe sans panique."

**Ce que la synthese NE fait PAS** :
- Elle ne repete PAS les assets deja couverts dans les segments
- Elle ne fait PAS d'analyse — juste des chiffres et une phrase de contexte

#### 7. ZONES A SURVEILLER (40-50s) — `watchlist`
Similaire a l'actuel mais avec 2 ajustements :
- **3 zones maximum** (pas plus, pour la clarte)
- **Chaque zone doit concerner un asset couvert dans un segment** (pas de nouveau sujet en zones — c'est la SUITE logique, pas un nouveau chapitre)
- Format inchange : prose fluide, scenario haussier + baissier pour chaque niveau

#### 8. RECAP + CTA (20-30s) — `recap_cta`
Fusionne les anciens "recap" et "outro" pour eviter deux micro-segments en fin d'episode.
- 3 points a retenir (chacun = une phrase)
- Teaser demain (1 phrase)
- Question CTA precise et debattable (1 phrase)
- **Le CTA est la DERNIERE phrase de l'episode** — jamais un disclaimer apres

### Combien de sections au total ?

| Jour type            | Sections fixes | Segments variables | Total sections |
|----------------------|----------------|--------------------|----------------|
| Jour normal          | 5              | 4-5 segments       | 9-10           |
| Jour charge          | 5              | 6-7 segments       | 11-12          |
| Jour calme           | 5              | 3-4 segments       | 8-9            |

Minimum : 8 sections. Maximum : 12 sections.

---

## B. Regles anti-redondance

### La Regle d'Or : "Premiere mention = seule mention detaillee"

Chaque fait precis (prix, pourcentage, niveau technique, nom d'evenement) n'apparait en detail qu'UNE SEULE FOIS dans l'episode. Les mentions subsequentes peuvent y faire REFERENCE mais pas le repeter.

### Matrice de responsabilite par section

| Information              | Cold Open | Fil conducteur | Segments    | Synthese | Zones      |
|--------------------------|-----------|----------------|-------------|----------|------------|
| Fait choc du jour        | OUI       | Reference       | Detail      | NON      | NON        |
| Theme dominant           | Implicite | EXPLICITE       | Illustre    | NON      | NON        |
| Prix / % de cloture      | NON       | NON            | OUI (1 fois)| Restants | Reference  |
| Niveaux techniques       | NON       | NON            | DEEP/FOCUS  | NON      | OUI (SI/ALORS) |
| Cause macro              | NON       | Nommee          | Expliquee   | NON      | NON        |
| Scenarios conditionnels  | NON       | NON            | DEEP seul   | NON      | OUI        |
| Lien intermarche         | NON       | Cascade         | Detaille    | NON      | NON        |

### Cas particuliers

**Le cold open et le fil conducteur mentionnent le meme sujet** : Oui, mais le cold open donne le FAIT BRUT (chiffre choc) et le fil conducteur donne le POURQUOI et la CASCADE. Jamais les memes mots.

Mauvais :
> Cold open : "Le deficit commercial explose a -98 milliards."
> Fil conducteur : "Le deficit commercial americain a explose a -98.5 milliards de dollars — bien plus que les -86 milliards attendus."

Bon :
> Cold open : "Moins 98 milliards. Le trou commercial americain n'avait jamais ete aussi profond."
> Fil conducteur : "La vraie surprise du jour n'est pas venue des marches — elle est venue d'un chiffre macro. Le deficit sur les biens a presque double les attentes. Et ca change la donne pour le dollar, les taux, et tout ce qui en depend."

### La regle du "nouveau fait"

Chaque segment DOIT contenir au moins une information qui n'apparait dans AUCUN autre segment :
- Pour un FLASH : le chiffre precis + une consequence unique
- Pour un FOCUS : un lien causal ou un contexte qui n'est pas mentionne ailleurs
- Pour un DEEP : au moins 2-3 faits exclusifs (niveaux techniques, comparaison historique, scenarios)

Le prompt doit inclure une instruction explicite : "Avant d'ecrire chaque segment, verifie qu'il contient au moins 1 fait nouveau qui n'apparait dans aucun autre segment."

---

## C. Echelle de profondeur — specifications detaillees

### FLASH (20-30 secondes, 50-75 mots)

**Quand l'utiliser** :
- Mouvement notable mais sans catalyseur clair a analyser
- Fait qui merite d'etre mentionne mais pas developpe (ex: doji sur l'or -0.21%)
- Resultat d'entreprise ou indicateur macro qui se resume en un chiffre + consequence
- Asset qui bouge dans le sillage d'un autre (deja couvert en FOCUS/DEEP)

**Structure interne** :
1. Le fait en une phrase (10 mots max)
2. Le contexte ou la cause en une phrase
3. La consequence ou la projection en une phrase

**Exemple (19 fevrier — Deere & Company)** :
> "Et il y a Deere. Le fabricant de tracteurs bondit de presque 12% — les benefices battent les attentes de 15%. C'est le genre de surprise qui rappelle que meme dans un marche nerveux, les bons resultats sont recompenses."

**Exemple (19 fevrier — Or)** :
> "L'or, lui, fait du surplace. Doji a 4975, moins d'un quart de pourcent de baisse. Apres avoir frole les 5000 hier, le metal temporise — mais la pression haussiere reste intacte."

### FOCUS (40-60 secondes, 100-150 mots)

**Quand l'utiliser** :
- Mouvement significatif avec un catalyseur identifie mais pas assez de matiere pour un DEEP complet
- Sujet thematique (ex: "le secteur aerien souffre") qui regroupe plusieurs assets
- Indicateur macro important qui merite plus qu'un FLASH mais pas un DEEP
- Second sujet en importance du jour

**Structure interne** :
1. **Le fait** : quoi, combien, avec quel volume (1-2 phrases)
2. **Pourquoi** : la cause — macro, technique, news, correlation (2-3 phrases)
3. **Consequences** : ce que ca implique pour d'autres assets ou pour la suite (1-2 phrases)
4. **Un niveau technique OU un scenario** : le point d'ancrage pour le viewer (1-2 phrases)

**Exemple (19 fevrier — Airline selloff)** :
> "Le secteur aerien prend un coup de massue. Alaska Air perd 6.6%, United Airlines 5.9%, Delta 5.2%, American Airlines 5.3% — et ce n'est pas une coincidence. Le petrole a 66 dollars comprime directement les marges de ces transporteurs qui operent deja avec des couts en hausse. C'est un effet mecanique : chaque dollar de plus sur le baril, c'est de la marge en moins pour les compagnies. Si le WTI depasse les 67 dollars, cette pression va s'intensifier — et les prochains resultats trimestriels du secteur pourraient en porter la trace."

### DEEP (70-90 secondes, 175-225 mots)

**Quand l'utiliser** :
- Mouvement majeur avec catalyseur clair + matiere technique suffisante
- Sujet #1 du jour (le drama score seul ne suffit pas — il faut aussi de la matiere analytique)
- Sujet qui connecte plusieurs assets ou themes (ex: petrole → airlines → inflation → Fed)
- Maximum 2 par episode, ideal = 1 DEEP + 2-3 FOCUS + 2-3 FLASH

**Structure interne** :
1. **Contexte** : ou en etait l'asset + le trend recent (2-3 phrases, 15s)
2. **Le mouvement du jour** : quoi, combien, volume (1-2 phrases, 10s)
3. **Pourquoi** : cause macro, technique, news, correlation — la chaine causale (3-4 phrases, 20s)
4. **Technique** : niveaux cles, RSI, EMA, confluences (2-3 phrases, 15s)
5. **Scenarios** : "SI [X] ALORS [Y]" — toujours conditionnel (2-3 phrases, 15s)
6. **Risque d'invalidation** : ce qui casserait le scenario (1 phrase, 5s)

**Ce qui distingue le DEEP du FOCUS** :
- Le DEEP a des SCENARIOS CONDITIONNELS complets (haussier + baissier)
- Le DEEP a une analyse technique avec niveaux precis
- Le DEEP mentionne le risque d'invalidation
- Le FOCUS n'a qu'UN scenario ou UN niveau — pas les deux

### Criteres de selection de la profondeur

Le choix de profondeur DOIT etre guide par l'**editorial score** (concu par l'equipe quant), pas uniquement par le drama score technique. Criteres indicatifs :

| Critere                              | DEEP (70-90s) | FOCUS (40-60s) | FLASH (20-30s) |
|--------------------------------------|---------------|----------------|-----------------|
| Mouvement > 3% avec catalyseur       | X             |                |                 |
| Cluster de 5+ news sur le sujet      | X             |                |                 |
| Chaine causale multi-assets          | X             | X              |                 |
| Mouvement > 1% avec catalyseur       |               | X              |                 |
| Cluster de 2-4 news sur le sujet     |               | X              |                 |
| Sujet thematique (secteur, macro)    |               | X              |                 |
| Mouvement notable sans catalyseur    |               |                | X               |
| Resultat d'entreprise isole          |               |                | X               |
| Doji / mouvement < 0.5%             |               |                | X (ou omis)     |

---

## D. Fil conducteur

### Comment identifier le fil conducteur

Le fil conducteur n'est PAS toujours le sujet #1 en termes de drama score. C'est le **theme qui connecte le plus de sujets entre eux**. L'algorithme conceptuel :

1. Lister les 5-7 sujets du jour
2. Pour chaque paire de sujets, verifier s'il existe un lien causal, thematique ou correlationnel
3. Le theme qui relie le plus de sujets = fil conducteur

Exemples de fils conducteurs et ce qui les active :

| Fil conducteur                          | Se declenche quand...                                    |
|-----------------------------------------|----------------------------------------------------------|
| "La geopolitique s'invite partout"      | Petrole + or + defense + airlines bougent ensemble       |
| "La Fed au centre de tout"              | Yields + dollar + actions + or reagissent a un chiffre   |
| "L'Europe decroche de Wall Street"      | Indices EU divergent de US de > 1%                       |
| "Risk-off generalise"                   | VIX > 25, crypto chute, or monte, obligations montent    |
| "La saison des resultats fait le tri"   | 3+ earnings significatifs bougent des indices             |
| "Un chiffre a tout change"              | 1 indicateur macro surprend de > 2 ecarts-types          |
| "Le petrole dicte la danse"             | WTI > 3% et cascade sur airlines, inflation, Fed         |

### Comment tisser le fil sans forcer

**Regle 1 : Le fil conducteur est NOMME dans le segment "thread", puis REFERENCE (pas repete) dans les segments**

Le fil conducteur apparait :
- Explicitement dans le segment `thread` (30-45s)
- Par reference dans les transitions entre segments ("et ca renforce ce qu'on disait sur la geopolitique")
- En conclusion dans le recap ("le theme du jour, c'etait...")

**Regle 2 : Si un segment n'a PAS de lien avec le fil conducteur, ne pas forcer**

Certains sujets sont independants (ex: Deere +11.6% n'a rien a voir avec la geopolitique). Le segment le traite comme un fait autonome, et la transition peut utiliser le contraste : "A cote de cette tension geopolitique, il y a des entreprises qui vivent leur vie..."

**Regle 3 : Le fil conducteur change l'ORDRE des segments**

L'ordre des segments suit la logique du fil conducteur, pas l'ordre decroissant du drama score. Si le fil est "la geopolitique s'invite partout", l'ordre pourrait etre :
1. Petrole (DEEP) — le declencheur
2. Airlines (FOCUS) — la premiere consequence
3. Or (FLASH) — l'autre face du flight to safety
4. Deficit commercial (FOCUS) — la surprise macro qui renforce l'incertitude
5. Deere (FLASH) — le contrepoint
6. KOSPI (FLASH) — la divergence asiatique

### Exemple concret avec les donnees du 19 fevrier

**Fil conducteur identifie** : "La geopolitique et la macro s'invitent en meme temps — et le marche ne sait pas quel signal suivre"

Justification : les tensions Iran/petrole + le deficit commercial choc + les resultats Airbus convergent pour creer un marche ou les forces contradictoires s'accumulent. Le petrole monte (inflationniste) mais le deficit se creuse (demande forte = croissance). Les resultats Airbus decoivent (micro) mais Deere surprend (micro positif). C'est un jour de signaux contradictoires.

**Tissage dans l'episode** :
- Thread : "Deux forces opposees aujourd'hui — la geopolitique qui pousse le petrole et les refuges a la hausse, et une surprise macro qui questionne la trajectoire de l'economie americaine."
- Transition segment 1→2 : "Le petrole en hausse, ca ne touche pas que les prix a la pompe — ca touche directement les marges d'un secteur entier."
- Transition segment 2→3 : "Et ce n'est pas que l'energie qui met les entreprises sous pression — Airbus prouve que les problemes d'approvisionnement n'ont pas disparu."
- Transition segment 3→4 : "Mais la vraie bombe du jour, c'est peut-etre un chiffre qu'on n'a pas assez regarde."
- Transition segment 4→5 : "A cote de toute cette tension, il y a des entreprises qui vivent tres bien — Deere en tete."
- Recap : "Le theme du jour, c'etait un marche tiraille entre geopolitique et macro — et demain, c'est Lagarde qui pourrait trancher."

---

## E. Script ideal du 19 fevrier — plan detaille

### Donnees disponibles (rappel)
- 7 themes : Iran/petrole, deficit commercial -$98.5B, airline selloff (8 titres), Airbus -6.75% + CAC, Deere +11.6%, crypto fear 7/100, or doji $5000
- 36 assets, 100+ stocks screenes, 276 news, 140 earnings, 20+ events calendrier
- KOSPI +3.09% (volume x2.5), DAX -0.93%, S&P -0.30%

### Le plan ideal

```
COLD OPEN (8s, ~20 mots)
"Moins 98 milliards. Le deficit commercial americain bat tous les records.
Et le petrole s'en mele."

GENERIQUE (4s, pas de narration)

SUIVI J-1 (30s, ~75 mots)
- Or et 5000 : "Hier le seuil a resiste — on fait le point dans un instant"
- Bitcoin et 66000 : "Le support tient, mais sans conviction. RSI toujours en zone basse."
- CAC et 8400 : "Les 8400 ont lache — mais c'est la gueule de bois post-record, pas un retournement."
(Bilan : 2/3 correct, honnete et rapide — pas de repetition avec les segments)

FIL CONDUCTEUR (40s, ~100 mots)
Theme : "La geopolitique et la macro envoient des signaux contradictoires"
- Les tensions Iran poussent le petrole en hausse → cascade sur airlines + inflation
- Le deficit commercial choc questionne la force du dollar et la trajectoire economique
- Les resultats d'entreprises sont mixtes : Airbus decoie, Deere surprend
- "Un marche qui ne sait pas quel signal suivre — on va decomposer."

SEGMENT 1 — DEEP : Petrole + cascade Iran (80s, ~200 mots)
Sujet : WTI +1.90% a 66.43$, contexte geopolitique Iran
- Contexte : les tensions Iran mentionnees dans 12 news, hausse de 4.6% la veille deja
- Le mouvement : continuation haussiere, approche des 67$ = plus haut 52 semaines
- Pourquoi : flight to safety energie, anticipation de disruption d'approvisionnement
- Technique : EMA9 et EMA21 depassees, RSI en zone haute mais pas encore surachat
- Scenarios : cassure des 67$ → pression inflation → complication Fed vs. repli sous 65$ → soulagement
- Risque : desescalade diplomatique = correction rapide

SEGMENT 2 — FOCUS : L'airline selloff (50s, ~125 mots)
Sujet : 8 compagnies aeriennes a -5%+ (Alaska, United, Delta, American, Southwest...)
- Le fait : c'est un selloff sectoriel coordonne, pas des mouvements individuels
- Pourquoi : petrole + couts operationnels + saison basse + perspectives de marges
- Consequence : si le petrole depasse les 67$, la pression s'intensifie
- Un chiffre : Alaska Air -6.64% avec volume en spike → le marche sanctionne le secteur

SEGMENT 3 — FOCUS : Airbus et le CAC sous pression (50s, ~125 mots)
Sujet : Airbus -6.75% → CAC -0.36% sous les 8400 apres le record de la veille
- Le fait : problemes moteurs → livraisons 2026 freinee → sanction immediate
- Ce qui est NOUVEAU (pas dans le recit) : impact sur les sous-traitants, Renault aussi decoie
- Le CAC : 8398 = juste sous le record → pas un retournement, une pause
- Un chiffre : Orange +7.46% compense partiellement — le CAC n'est pas monochromatique

SEGMENT 4 — FOCUS : Le deficit commercial choc (45s, ~112 mots)
Sujet : Balance commerciale US biens -98.5B vs -86B attendu
- Le fait : ecart de 12.5B vs consensus — c'est MASSIF
- Pourquoi c'est important : ca pese sur le dollar, ca reflete une demande interieure americaine encore tres forte, et ca complique le recit "l'inflation baisse"
- Le contrepoint : Philly Fed Manufacturing a 16.3 vs 7.5 attendu — la production va bien
- Consequence : signaux contradictoires pour la Fed — la prochaine reunion devient plus incertaine

SEGMENT 5 — FLASH : Deere & Company (25s, ~62 mots)
Sujet : DE +11.58% apres earnings qui battent de 15%
- Le fait + contexte + consequence en 3 phrases
- "Meme dans un marche nerveux, les bons resultats sont recompenses — et Deere le prouve"

SEGMENT 6 — FLASH : Crypto en zone de peur extreme (25s, ~62 mots)
Sujet : BTC +0.8% mais Fear&Greed a 7/100, sentiment desastreux
- Le fait : le rebond est technique, pas convaincu — RSI a 36, sous les EMA
- Perspective : "Historiquement, des niveaux de peur aussi extremes precedent des rebonds — mais aussi des capitulations"

SYNTHESE MARCHE (25s, ~62 mots)
Les chiffres non couverts : S&P -0.30%, Nasdaq -0.25%, DAX -0.93%, FTSE -0.55%,
EUR/USD stable a 1.0440, VIX +3.11% a 20.23
KOSPI +3.09% en mention rapide : "la surprise asiatique du jour"
10Y yield, spread 10Y-2Y en une phrase

ZONES A SURVEILLER (45s, ~112 mots)
1. WTI et les 67$ — resistance 52 semaines, cassure = inflationniste
2. CAC 40 et les 8400 — ex-record devenu support a reconquerir
3. BTC et les 66000 — support vs. route vers 60000

RECAP + CTA (25s, ~62 mots)
3 points : (1) le petrole tire les ficelles — inflation, airlines, geopolitique ;
(2) le deficit commercial choc brouille le message macro pour la Fed ;
(3) les resultats sont polarises — Airbus chute, Deere explose.
Teaser : "Demain, Lagarde parle — et son ton sur l'inflation pourrait tout changer."
CTA : "Le petrole a 70 dollars d'ici fin mars — realiste ou fantasy ? Dites-moi."
```

### Comparaison avec le script actuel

| Critere                      | Script actuel (19 fev)         | Script ideal v2                           |
|------------------------------|-------------------------------|-------------------------------------------|
| **Sujets couverts**          | 3 (CAC, KOSPI, petrole en passant) | 7 (petrole, airlines, Airbus/CAC, deficit, Deere, crypto, + synthese) |
| **Sujets rates**             | Deficit commercial, airlines, Deere, crypto en profondeur | Aucun sujet majeur rate             |
| **Redondance intro/deep**    | Airbus mentionne 2x en detail | Chaque fait apparait 1 seule fois en detail |
| **KOSPI**                    | Deep dive 90s (interet faible FR) | Flash 10s dans synthese                   |
| **Deficit commercial -98.5B**| 2 phrases en section news     | Focus 45s — traitement a la hauteur de l'importance |
| **Airline selloff**          | Cite dans le recit, pas analyse | Focus 50s — le secteur entier             |
| **Deere +11.6%**             | 1 phrase dans le recit        | Flash 25s — le contrepoint                |
| **Rythme**                   | 2 blocs longs (120s + 90s)    | Variable : 80s + 50s + 50s + 45s + 25s + 25s |
| **Engagement viewer**        | Diminue apres le 2e deep dive | Relances regulieres toutes les 30-60s     |
| **Temps total narration**    | ~468s                         | ~500s (dans le budget 480-600s)           |

---

## F. Impact sur le JSON schema

### Nouveaux SectionType

```typescript
export type SectionType =
  | "hook"           // Cold open (ex "intro")
  | "title_card"     // Generique visuel (nouveau, pas de narration)
  | "previously_on"  // Suivi J-1 (inchange)
  | "thread"         // Fil conducteur (remplace market_overview dans son role)
  | "segment"        // Segment variable FLASH/FOCUS/DEEP (remplace deep_dive + news)
  | "synthesis"      // Synthese chiffree rapide (nouveau)
  | "watchlist"      // Zones a surveiller (ex "predictions")
  | "recap_cta";     // Recap + CTA (ex "outro")
```

### Nouveau champ : `depth` sur ScriptSection

```typescript
export interface ScriptSection {
  id: string;
  type: SectionType;
  depth?: "flash" | "focus" | "deep";  // NOUVEAU — requis si type === "segment"
  title: string;
  narration: string;
  durationSec: number;
  visualCues: VisualCue[];
  data?: Record<string, unknown>;
}
```

### Nouveau champ : `topic` sur ScriptSection

Pour les segments variables, on a besoin de savoir quel sujet est couvert (pour le rendu visuel et les transitions) :

```typescript
export interface ScriptSection {
  id: string;
  type: SectionType;
  depth?: "flash" | "focus" | "deep";
  topic?: string;            // NOUVEAU — ex: "petrole-iran", "airline-selloff", "airbus-cac"
  assets?: string[];         // NOUVEAU — symboles des assets couverts dans ce segment
  title: string;
  narration: string;
  durationSec: number;
  visualCues: VisualCue[];
  data?: Record<string, unknown>;
}
```

### Nouveaux champs sur EpisodeScript

```typescript
export interface EpisodeScript {
  episodeNumber: number;
  date: string;
  type: EpisodeType;
  lang: Language;
  title: string;
  description: string;
  coldOpen: string;                    // Deja present dans le prompt, a officialiser dans le type
  dominantTheme: string;               // Deja present dans le prompt, a officialiser
  threadSummary: string;               // NOUVEAU — le fil conducteur en 1 phrase (pour SEO, thumbnail)
  moodMarche: "risk-on" | "risk-off" | "incertain" | "rotation";  // Deja present
  sections: ScriptSection[];
  totalDurationSec: number;
  segmentCount: number;                // NOUVEAU — nombre de segments variables (pour validation)
  coverageTopics: string[];            // NOUVEAU — liste des sujets couverts (pour validation anti-redondance)
}
```

### Nouveau type VisualCue a ajouter

```typescript
export interface VisualCue {
  type:
    | "highlight_asset"
    | "show_chart"
    | "show_level"
    | "direction_arrow"
    | "flash"
    | "transition"
    | "sector_heatmap"    // NOUVEAU — pour les segments sectoriels (airlines, defense...)
    | "macro_stat"        // NOUVEAU — pour afficher un chiffre macro en grand
    | "comparison";       // NOUVEAU — pour les contrastes cote a cote
  asset?: string;
  value?: number;
  label?: string;
  direction?: "up" | "down";
  confidence?: "high" | "medium" | "low";
}
```

### Schema JSON complet pour le prompt LLM

```json
{
  "title": "string — titre accrocheur (50-60 chars)",
  "description": "string — description YouTube (2-3 phrases)",
  "coldOpen": "string — phrase(s) choc du cold open",
  "dominantTheme": "string — le theme du jour (slug)",
  "threadSummary": "string — le fil conducteur en 1 phrase",
  "moodMarche": "risk-on | risk-off | incertain | rotation",
  "sections": [
    {
      "id": "hook",
      "type": "hook",
      "title": "Cold Open",
      "narration": "string — 5-10s",
      "durationSec": 8,
      "visualCues": [],
      "data": {}
    },
    {
      "id": "title_card",
      "type": "title_card",
      "title": "Generique",
      "narration": "",
      "durationSec": 4,
      "visualCues": [],
      "data": {}
    },
    {
      "id": "previously_on",
      "type": "previously_on",
      "title": "Suivi J-1",
      "narration": "string — 20-40s",
      "durationSec": 30,
      "visualCues": [],
      "data": {}
    },
    {
      "id": "thread",
      "type": "thread",
      "title": "string — le fil conducteur",
      "narration": "string — 30-45s, SANS chiffres detailles",
      "durationSec": 40,
      "visualCues": [],
      "data": {}
    },
    {
      "id": "seg_1",
      "type": "segment",
      "depth": "deep",
      "topic": "petrole-iran",
      "assets": ["CL=F", "BZ=F"],
      "title": "string",
      "narration": "string — 70-90s",
      "durationSec": 80,
      "visualCues": [
        { "type": "show_chart", "asset": "CL=F" },
        { "type": "show_level", "asset": "CL=F", "value": 67, "label": "Resistance 52w" }
      ],
      "data": {}
    },
    {
      "id": "seg_2",
      "type": "segment",
      "depth": "focus",
      "topic": "airline-selloff",
      "assets": ["ALK", "UAL", "DAL", "AAL"],
      "title": "string",
      "narration": "string — 40-60s",
      "durationSec": 50,
      "visualCues": [
        { "type": "sector_heatmap" }
      ],
      "data": {}
    },
    "... (autres segments)",
    {
      "id": "synthesis",
      "type": "synthesis",
      "title": "Le marche en bref",
      "narration": "string — 20-30s, chiffres non couverts",
      "durationSec": 25,
      "visualCues": [],
      "data": {}
    },
    {
      "id": "watchlist",
      "type": "watchlist",
      "title": "Zones a surveiller",
      "narration": "string — 40-50s, 3 niveaux max",
      "durationSec": 45,
      "visualCues": [
        { "type": "show_level", "asset": "CL=F", "value": 67, "label": "Resistance" }
      ],
      "data": {
        "predictions": [
          { "asset": "CL=F", "direction": "bullish", "confidence": "medium", "reasoning": "string" }
        ]
      }
    },
    {
      "id": "recap_cta",
      "type": "recap_cta",
      "title": "3 points + CTA",
      "narration": "string — 20-30s",
      "durationSec": 25,
      "visualCues": [],
      "data": {}
    }
  ],
  "totalDurationSec": 500,
  "segmentCount": 6,
  "coverageTopics": ["petrole-iran", "airline-selloff", "airbus-cac", "deficit-commercial", "deere-earnings", "crypto-sentiment"]
}
```

---

## G. Implications pour les scenes Remotion

### Scenes a modifier

| Scene actuelle        | Correspondance v2        | Changement                                          |
|-----------------------|--------------------------|-----------------------------------------------------|
| IntroScene            | HookScene                | Renommage, logique inchangee                        |
| (nouveau)             | TitleCardScene           | Animation titre + date, 3-5s                        |
| PreviouslyOnScene     | PreviouslyOnScene        | Inchange                                           |
| MarketOverviewScene   | ThreadScene              | Redesign : moins de chiffres, plus de narratif      |
| ChartDeepDiveScene    | SegmentScene             | Doit gerer 3 niveaux (flash/focus/deep) visuellement|
| NewsScene             | (absorbe dans segments)  | Supprimee en tant que scene dediee                  |
| (nouveau)             | SynthesisScene           | Dashboard rapide, chiffres en grille               |
| PredictionsScene      | WatchlistScene           | Renommage + redesign pour 3 zones max              |
| OutroScene            | RecapCtaScene            | Fusionne recap + outro                             |

### La SegmentScene — le composant cle

La `SegmentScene` doit etre capable de rendre les 3 niveaux de profondeur avec des traitements visuels distincts :

- **FLASH** : fond uni, chiffre en grand format, pas de graphique — apparition/disparition rapide
- **FOCUS** : graphique simplifie + 1 niveau technique + texte de contexte
- **DEEP** : graphique complet + niveaux multiples + scenarios haussier/baissier en overlay

Ceci est un sujet de design visuel a traiter separement (Bloc E dans le build order).

---

## H. Risques et mitigations

| Risque                                                   | Mitigation                                                        |
|----------------------------------------------------------|-------------------------------------------------------------------|
| Le LLM produit trop de segments DEEP (depasse le budget) | Validation post-generation : max 2 DEEP, rejet si > 2            |
| Le LLM repete des infos entre segments                   | Instruction explicite "nouveau fait" + validation post-gen        |
| Le fil conducteur est force sur des sujets non-lies      | Instruction "si pas de lien, ne pas forcer — utiliser contraste"  |
| La synthese marche est trop longue                       | Budget fixe a 30s max, validation mot-count                      |
| Transition vers segments variables complexifie le prompt  | Exemples concrets dans le prompt (pas juste des regles)          |
| Les scenes Remotion ne supportent pas le format variable  | SegmentScene parametrique par depth — design visuel a anticiper  |
| La profondeur FLASH est trop superficielle               | Minimum 50 mots, doit contenir fait + contexte + consequence     |

---

## Annexe : Mapping ancien → nouveau pour la migration

Pour la retrocompatibilite pendant la migration :

```
"intro"          → "hook"
"previously_on"  → "previously_on" (inchange)
"market_overview" → "thread"
"deep_dive"      → "segment" avec depth="deep"
"news"           → "segment" avec depth="focus" ou "flash"
"predictions"    → "watchlist"
"outro"          → "recap_cta"
```

Les scripts existants (episodes 1-2) restent valides avec l'ancien schema. Le nouveau schema entre en vigueur a partir de l'episode suivant le deploiement.
