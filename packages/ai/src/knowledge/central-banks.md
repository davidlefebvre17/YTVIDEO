# Banques centrales — Guide d'interprétation

## Fed (Federal Reserve)

Mandat dual : stabilité des prix (cible 2% PCE) + plein emploi.

**Transition de présidence** : le mandat de Jerome Powell se termine le 15 mai 2026. Kevin Warsh a été nommé par Trump pour lui succéder (nomination envoyée au Sénat le 4 mars 2026). La confirmation fait face à un blocage sénatorial (au moins un sénateur républicain s'oppose). Warsh est perçu comme plus hawkish que Powell — sa confirmation pourrait signaler des taux plus élevés plus longtemps.

**Indicateurs clés surveillés** : Core PCE (inflation préférée), NFP + taux de chômage, ISM Services/Manufacturing, salaires horaires moyens, croissance des salaires (aussi important que le NFP — si plus élevée que prévu, c'est inflationniste).

**Mécanisme de transmission** :
- Hausse taux → dollar ↑, or ↓, tech ↓ (duration longue), yields ↑
- Baisse taux → dollar ↓, or ↑, tech ↑, yields ↓
- Pause → interprétation contextuelle ("pause hawkish" vs "pause dovish")
- **QE (Quantitative Easing)** : rachat massif d'obligations d'État → injection liquidité → masse monétaire ↑ → indices ↑, dollar ↓, inflation future ↑
- **QT (Quantitative Tightening)** : réduction du bilan → liquidité ↓ → tech ↓, indices ↓, VIX ↑
- **Corrélation bilan/SP500** : quasi chirurgicale — le SP500 a chuté début 2022 exactement quand le bilan Fed a commencé à stagner puis diminuer

**Projections économiques du FOMC** :
- Publiées trimestriellement (mars, juin, sept, déc) — tableau avec PIB, PCE inflation, Core PCE, chômage pour années N, N+1, N+2
- **Dot plot** : chaque point = prévision anonyme d'un membre du FOMC sur le taux cible en fin d'année. 7 gouverneurs + 12 présidents Fed régionales = 19 points
- Écart dot plot vs marché (CME FedWatch) = source principale de volatilité
- Si projections montrent PCE en hausse → signal que taux resteront élevés plus longtemps → haussier dollar

**FedWatch Tool — utilisation avancée** :
- **Erreur #1** : ne regarder que la prochaine réunion. Il faut analyser au minimum 3 réunions d'affilée
- **Erreur #2** : réagir à de petites variations (82% → 85%) sans trigger fondamental. FedWatch évolue constamment — ne prendre position que sur des mouvements nets et confirmés par des data macro
- **Ce qui est déjà pricé ne bouge plus** : si le marché anticipe à 90% une baisse, c'est déjà dans le prix du dollar
- **Zones d'opportunité** : quand les probabilités sont serrées (45/55%) entre deux scénarios, les prochaines data macro feront basculer → fort mouvement sur le dollar
- **Outil "Compare"** : comparer les probabilités à 1 jour, 1 semaine, 1 mois — permet de voir la direction du pricing
- **Outil "Historical"** : corréler l'évolution des probabilités avec le prix du dollar — la corrélation est souvent chirurgicale
- **Règle d'or** : FedWatch + analyse fondamentale. Un mouvement de probabilités sans trigger fondamental peut se retourner. Un mouvement confirmé par des data = mouvement durable

**Signaux à détecter** :
- Dot plot : écart entre projections et marché = volatilité
- Minutes vs conférence de presse : les Minutes révèlent les dissidences internes
- "Data-dependent" = la Fed ne s'engage pas → marché réagit à chaque stat macro
- Pivot signal : changement de langage ("some" → "significant" → "substantial" progress)
- **Frontloading** : quand la Fed démarre un cycle avec un cut de 50bp au lieu de 25bp, c'est un signal fort — soit stimulation urgente, soit alarme économique sous-jacente

**Statistiques historiques des baisses de taux (depuis 1950)** :
- Sur 12 cycles de baisse post-hausse : **75% ont été positifs pour les actions** (hausse moyenne +25,5% du SP500 pendant le cycle)
- Les 3 échecs : bulle dot-com (2001), subprimes (2008), Covid (2020) — tous liés à des crises structurelles, pas à la politique monétaire elle-même
- **80% des cycles de baisse ont coïncidé avec une récession** — mais récession ≠ baisse du marché actions (le PIB peut être négatif alors que la bourse monte)
- Quand la Fed cut alors que le SP500 est à un ATH (à 2% près) : 1 mois après, le marché est plus haut dans 45% des cas. À 6 mois : environ 70%

**Bilan de la Fed (balance sheet)** :
- Visible sur TradingView : "United States Central Bank Balance Sheet"
- **Hausse du bilan** = injection monétaire = dovish → indices ↑, dollar ↓
- **Baisse du bilan** = resserrement = hawkish → pression baissière indices, dollar ↑
- Exemple clé : avril 2023, faillites banques régionales US → bilan Fed explose en hausse (sauvetage) alors que la BCE continuait son QT → divergence massive → EUR/USD explose à la hausse. Une fois le sauvetage terminé, bilan repart en baisse → dollar reprend sa hausse
- Le bilan n'est pas toujours corrélé aux taux : on peut avoir un bilan qui monte avec des taux qui restent élevés (ex: sauvetage bancaire 2023)

**Masses monétaires M1, M2, M3** :
- M1 = monnaie en circulation + dépôts à vue (la plus liquide)
- M2 = M1 + dépôts à terme + livrets d'épargne
- M3 = M2 + instruments financiers à moyen terme
- **Hausse M2** = plus de liquidité en circulation → inflationniste à terme, haussier actions court terme
- **Baisse M2** = resserrement, déflationniste, baissier actions
- Utile pour confirmer la direction globale, pas pour le trading quotidien

**Calendrier** : 8 réunions/an (FOMC), ~6 semaines d'intervalle. Minutes publiées 3 semaines après. Projections éco + dot plot = uniquement les réunions trimestrielles.

## BCE (Banque Centrale Européenne)

Mandat unique : stabilité des prix (cible 2% HICP). L'emploi est secondaire.

**Indicateurs clés** : HICP zone euro, PMI composite, crédit bancaire, M3, salaires négociés.

**Mécanisme de transmission** :
- Hausse taux → EUR ↑ vs USD, obligations EU ↓, spreads périphériques ↑ (Italie, Grèce)
- Baisse taux → EUR ↓, actions EU ↑ (surtout cycliques/banques)
- Écart de politique Fed/BCE → EUR/USD (différentiel de taux = driver #1 du cross)

**Signaux à détecter** :
- Spread BTP-Bund (Italie-Allemagne) : >200bp = stress, >250bp = TPI activable
- Fragmentation : la BCE surveille les écarts entre pays comme risque systémique
- "Determined to ensure" vs "committed to" = escalade du langage
- **Fréquence des discours BCE** : la présidente de la BCE parle très souvent (parfois 3 fois/semaine) → impact dilué. Un discours BCE rare = plus impactant
- **Projections macro BCE** : si les politiques économiques de l'UE (investissements défense, IA, tech) sont annoncées comme inflationnistes dans les projections, c'est hawkish même en cas de baisse de taux

**Piège classique — baisse de taux hawkish** :
- La BCE peut baisser les taux (ex: 2,50% → 2,25%) tout en étant perçue comme hawkish par le marché
- Si les projections montrent une inflation en hausse (ex: politiques budgétaires inflationnistes), le marché anticipe que la BCE ne baissera plus aussi vite → EUR ↑ malgré la baisse de taux
- **Règle** : ce ne sont jamais les taux d'intérêt en eux-mêmes qui comptent, mais le discours + les projections qui les accompagnent

**Attention au seuil des 2%** :
- Être à 2% d'inflation ne signifie pas "inflation vaincue" — elle peut repartir (ex: Canada descendu sous 2% puis remonté à 2,6%)
- La BCE ne veut surtout pas baisser les taux trop vite et voir l'inflation rebondir — "précipiter" la baisse = erreur fatale
- Un taux à 2% avec risque de rebond → la BCE reste prudente

**Calendrier** : ~6 réunions/an. Staff projections trimestrielles (mars, juin, sept, déc) = plus informatives.

## BoJ (Bank of Japan)

Mandat : stabilité des prix + croissance. Historiquement ultra-accommodante.

**Spécificités** :
- Seule grande banque centrale à avoir maintenu des taux négatifs longtemps
- Yield Curve Control (YCC) : contrôle direct du rendement JGB 10 ans
- Intervention forex : la BoJ peut intervenir sur USD/JPY (seuil historique ~150-155)
- **Discours rares = fort impact** : contrairement à la BCE, la BoJ communique peu → chaque déclaration du gouverneur est un événement majeur

**Mécanisme de transmission** :
- Normalisation BoJ → yen ↑ fort, Nikkei ↓, carry trade inverse (AUD/JPY, NZD/JPY ↓)
- Maintien accommodant → yen ↓, exportateurs japonais ↑

**Cas d'école — divergence USD/JPY 2022** :
- Janvier 2022 : inflation US à 7,6% vs Japon à 0,6% → divergence massive
- La Fed devait monter les taux agressivement, la BoJ n'avait aucune raison d'agir
- Résultat : USD/JPY en hausse spectaculaire de mars à octobre 2022 (+30% environ)
- **Enseignement** : les divergences d'inflation prédisent les divergences de politique monétaire qui prédisent les tendances forex sur des mois/années

**Signaux à détecter** :
- USD/JPY > 150 : zone d'intervention verbale puis réelle
- Modification de la bande YCC : signal fort de normalisation
- "Patiently" vs "appropriately" = gradation d'urgence

**Calendrier** : 8 réunions/an. Outlook Report trimestriel (janv, avril, juil, oct).

## BoE (Bank of England)

**Résumé** : mandat inflation 2% CPI. Économie UK sensible à l'immobilier (taux variables). GBP/USD corrélé au différentiel taux vs Fed. Split votes fréquents (MPC 9 membres) → le vote count est un signal.

**Spécificité UK** : les politiques fiscales du gouvernement peuvent être inflationnistes (ex: dépenses publiques expansionnistes) → BoE forcée de garder des taux plus élevés → GBP ↑. Des politiques fiscales expansionnistes peuvent pousser l'inflation → BoE forcée de garder des taux élevés → GBP haussière.

## Divergences inter-banques centrales

**Principe fondamental** : sur le Forex, on trade toujours une monnaie face à une autre. Les tendances majeures (mois, années) viennent des **divergences de politiques monétaires** entre banques centrales.

**Comment détecter une divergence** :
1. **Comparer les trajectoires d'inflation** entre deux zones (ex: US 7,6% vs Japon 0,6% en 2022)
2. **Comparer les anticipations de taux** : si le marché prévoit -100bp pour la Fed vs -50bp pour la BoE → GBP/USD haussier
3. **Comparer les bilans** : si le bilan Fed monte (injection) pendant que le bilan BCE baisse (resserrement) → EUR/USD ↑
4. **Spreads de prévisions** : plus le spread entre deux BC se creuse, plus la tendance forex s'amplifie

**Cas historiques majeurs** :
- **2002-2008** : Fed très dovish (post bulle Internet) vs BCE neutre → EUR/USD haussier pendant 6 ans
- **2008** : crise subprimes → dollar refuge → EUR/USD chute brutale (-21%)
- **2009-2011** : Fed lance QE en premier, BCE attend → EUR/USD repart à la hausse malgré la crise
- **2014** : BCE lance enfin son QE alors que la Fed a déjà fini le sien → EUR/USD s'effondre
- **2022** : Fed monte les taux agressivement, BoJ reste à taux négatifs → USD/JPY explose (+30%)
- **2023** : faillites bancaires US → bilan Fed explose vs BCE en QT → EUR/USD rebondit

**Règle pour la narration** : identifier la divergence active du moment et expliquer la chaîne causale (inflation → anticipation taux → pricing → mouvement forex)

## Analyse des discours de banquiers centraux

**Règle de rareté** : plus un banquier central parle rarement, plus son prochain discours aura d'impact. La présidente de la BCE parle très souvent (parfois 3 fois/semaine) → impact dilué. Gouverneur BoJ parle rarement → chaque mot compte.

**Quand un discours est-il important ?**
1. **Rareté** du locuteur (gouverneur vs adjoint vs membre junior)
2. **Attentes élevées** du marché sur le sujet (ex: première indication sur la fin d'un cycle)
3. **Contexte macro tendu** (probabilités FedWatch serrées, data ambiguës)
4. S'il y a un événement majeur récent non encore commenté par la BC

**Phrases-clés à surveiller** :
- **Hawkish** : "data-dependent", "premature to declare victory", "inflation risks remain", "we will stay the course"
- **Dovish** : "progress on inflation", "labor market cooling", "we can begin to ease", "risks are balanced"
- **Pivot signal** : changement de vocabulaire entre deux discours successifs — passer de "some progress" à "significant progress" = signal fort

**Outils pour suivre les discours** :
- **Financial Juice** : extraits en temps réel des phrases les plus importantes
- **Bloomberg** : articles détaillés sur les discours majeurs
- **Trading Economics** : résumé + réaction marché + contexte
- **Calendrier économique** : planifier les discours à l'avance en début de semaine

**Ce qui compte vraiment dans une décision de taux** :
- Les taux eux-mêmes : le marché s'en fiche souvent (déjà pricés)
- **Le discours** : ton, vocabulaire, nuances = 60% de la réaction marché
- **Les projections (SEP/dot plot)** : trajectoire inflation, croissance, chômage = 30%. Si les projections montrent GDP et PCE revus à la hausse → le cycle de cuts sera limité → dollar haussier, même le jour d'un cut
- La décision elle-même = 10% (sauf surprise totale)

**Le forward looking mechanism — comment lire une séquence de données** :

Le marché ne réagit pas aux annonces — il les anticipe via une chaîne de données qui confirment ou invalident progressivement les attentes. La séquence typique avant un FOMC :

1. **Data de croissance** (NFP, emploi) → confirme ou invalide la nécessité d'agir. Si faible → le marché commence à pricer un cut → dollar chute EN AMONT
2. **Data d'inflation** (CPI, PCE) → dernier verrou. Si conforme aux attentes → confirme le pricing. Si surprise à la hausse → remet tout en question
3. **Décision de taux** → déjà pricée à ce stade. Ce qui bouge le marché : les projections économiques (SEP) et le ton du discours
4. **Repricing post-décision** → le marché réévalue immédiatement la TRAJECTOIRE FUTURE, pas la décision passée

**Les 3 questions du narrateur face à une annonce CB** :
- **Était-ce attendu ?** Si le cut/hike était pricé à >80%, la décision est du passé dès qu'elle tombe
- **Qu'est-ce que ça change pour la suite ?** Regarder les projections, le dot plot, le ton — pas le chiffre
- **Le positionnement est-il asymétrique ?** Si tout le monde est dovish, la barre est haute pour surprendre dans ce sens — mais décevoir est très facile → repricing violent

**Piège "buy the rumor, sell the news"** : le mouvement se fait en amont de l'annonce (pendant que le marché price). Le jour de l'annonce, si confirmation → le mouvement s'arrête ou s'inverse, parce qu'il n'y a plus d'acheteurs/vendeurs à convaincre. Le narrateur doit expliquer ce mécanisme au spectateur quand le marché "fait l'inverse de la logique"

## Règles de narration banques centrales

1. JAMAIS prédire une décision ("la Fed va baisser") → "si la Fed venait à assouplir sa politique"
2. Toujours mentionner le CONSENSUS marché avant l'événement (FedWatch, Bloomberg surveys)
3. Après l'événement : comparer décision vs attentes (le mouvement vient de la SURPRISE, pas de la décision)
4. Mentionner l'impact cross-market (taux → devises → commodities → actions)
5. **Identifier le spread de politique monétaire actif** : quelle divergence drive le marché aujourd'hui ?
6. **Contextualiser avec le bilan** : si le marché parle des taux mais que le bilan raconte une autre histoire, le mentionner
7. **Ne jamais dire "l'inflation est vaincue"** — toujours conditionnel ("si l'inflation continue de refluer", "sous réserve que les prochains chiffres confirment")
8. **Relier aux data** : chaque mouvement de BC est une réponse aux data macro — toujours citer le déclencheur (NFP, CPI, PMI)
9. **Expliquer les chaînes causales** : "les politiques budgétaires expansionnistes → anticipation inflation ↑ → BCE prudente sur les baisses → EUR ↑"

## Patterns de comportement marché face aux banques centrales

### Fed — Pivot de cycle et anticipations excessives

Quand une banque centrale signale officiellement la fin d'un cycle de hausse, le marché anticipe immédiatement un rythme plus agressif de baisses que le scénario communiqué. Une première baisse agressive (50bp au lieu de 25bp) est souvent déjà fully pricée par le marché, qui déplace alors son attention sur la trajectoire future.

**Pattern clé** : une réaction de baisse initiale complètement pricée entraîne une démotivation court terme — "buy the rumor, sell the news" — avant que l'euphorie ne reprenne sur les perspectives long terme.

### Fed — Baisse de taux hawkish

Une réduction de taux accompagnée d'un ton prudent ou d'avertissements sur l'inflation produit une réaction paradoxalement négative — le marché interprète la baisse comme un pansement sur une plaie plus grave. Contrairement à une baisse neutre (sans discours alarmiste), la "baisse hawkish" crée une confusion : est-ce un assouplissement bienvenu ou une admonestation ?

**Pattern** : le discours (60% du mouvement) et les projections (30%) comptent bien plus que la décision elle-même (10%).

### Fed — Indépendance et pression politique

Quand des pressions politiques cherchent à influencer la politique monétaire, la réaction marché porte moins sur les taux eux-mêmes que sur la peur de compromettre l'indépendance institutionnelle. La menace à l'institution crée une volatilité supérieure à ce que justifierait la simple divergence de politique.

### Fed — Le "Fed Put"

Quand les marchés subissent des dégradations suffisamment prononcées, le ton de la banque centrale tend à devenir dovish, créant un mécanisme d'assurance psychologique perçu comme implicite. Ce n'est pas un niveau de prix défini, mais un "seuil de douleur" — plus le marché souffre, plus le put devient tangible. Le retournement des colombes vers une dominance dovish marque souvent un point d'inflexion : les faucons "capitulent" et provoquent un rebond brutal dans les probabilités de baisse.

### Fed — Discours ignorés du marché

Un discours de ton ferme ("les taux resteront élevés plus longtemps") provoque rarement un retournement durable. Le marché corrige en séance, puis reprend sa hausse, car la "surprise" attendue serait un changement de direction, pas une confirmation de stance existante. Les probabilités FedWatch oscillent brièvement (allocation entre deux mois pour les baisses) mais ne changent pas de direction structurelle.

### BCE — Données-dépendance maintenaine post-baisse

Contrairement à la Fed qui signale une trajectoire avec clarté, la BCE maintient une flexibilité "données-dépendantes" même après avoir initié un cycle de baisse. Chaque décision de baisse s'accompagne de prudence sur l'inflation intérieure, ce qui crée une ambiguïté : la baisse est-elle le signal d'une nouvelle trajectoire dovish ou une mesure isolée ?

**Pattern** : baisse des taux + ton prudent = réaction mitigée. Les secteurs sensibles (immobilier, banques) réagissent au ton plus qu'à la baisse elle-même.

### BCE — Inflation près du seuil 2%

Le seuil psychologique de 2% d'inflation ne marque pas automatiquement une "victoire" — l'inflation peut rebondir après. La BCE reste prudente sur les baisses quand ce seuil approche, car précipiter l'assouplissement risque une rechute de l'inflation. Un taux à 2% avec risque de rebond = pause stratégique, même si le marché réclame de la baisse.

### BoJ — Carry trade et effet cascade

Un relèvement de taux par la BoJ déclenche deux effets : emprunter en yen devient plus coûteux ET le yen se renforce, créant une double perte pour les portefeuilles financés en yen et placés en actifs à rendement élevé. Les liquidations du carry trade commencent par les actifs les plus liquides et les plus abondamment financés par le carry, provoquant un effet cascade de contagion.

**Pattern** : la BoJ communiquant rarement, chaque déclaration est un événement majeur. Le marché reste traumatisé longtemps après un carry trade unwind.

### BoJ — Divergence permanente avec la Fed

Quand la Fed maintient des taux élevés et la BoJ rester accommodante, le différentiel de taux se creuse et pèse mécaniquement sur le yen. Le dollar se renforce, le yen s'affaiblit, et le Nikkei souffre (moins de rendement de change pour compenser une économie décélérante). Le seuil psychologique vers 150-155 USD/JPY provoque des inquiétudes d'intervention.

