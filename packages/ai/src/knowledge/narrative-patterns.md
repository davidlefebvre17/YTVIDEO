# Patterns Narratifs & Criteres de Qualite

> Cette fiche est TOUJOURS injectee dans le prompt.
> Elle definit COMMENT raconter l'histoire, pas QUOI raconter.

## Regle fondamentale

La video est une HISTOIRE, pas un rapport. Le narrateur ne fait jamais de liste.
"L'or monte. Le dollar baisse. L'euro progresse." → INTERDIT (c'est une liste).
"L'or profite de la faiblesse du dollar — et dans son sillage, l'euro reprend des couleurs." → BON (c'est une histoire avec des liens de cause a effet).

## Les 5 patterns narratifs

### Pattern A — Le fil rouge (usage : ~70% des episodes)
Un theme unique relie tout l'episode.

Structure :
- Hook : LE theme en une phrase choc
- Thread : nommer le fil rouge, annoncer la cascade
- Segments : chaque segment illustre une facette du theme
- Closing : retour au fil en une phrase + CTA

Exemples de fils rouges :
- "Le dollar ecrase tout sur son passage"
- "La Fed a parle, le marche reagit"
- "Le petrole repart et ca change tout"
- "Risk-off generalisee — le marche a peur"

### Pattern B — L'effet domino (usage : quand event macro)
Un evenement declenche une chaine de reactions.

Structure :
- Hook : "Un seul chiffre a fait trembler les marches"
- Thread : la chaine de causalite en une phrase
- Segment DEEP : le chiffre + la premiere reaction
- Segments FOCUS/FLASH : les dominos suivants
- Closing : la chaine resumee en une phrase

### Pattern C — Le contraste (usage : quand divergence notable)
Deux assets qui devraient bouger ensemble divergent.

Structure :
- Hook : "L'or monte et le dollar aussi. C'est pas cense arriver."
- Thread : nommer la decorrelation
- Segments : chacun des deux cotes du contraste
- Closing : "D'apres vous, lequel a raison ?" (CTA)

### Pattern D — La surprise (usage : 1x/semaine max)
Un element inattendu domine.

Structure :
- Hook : stat ou fait surprenant
- Thread : "Saviez-vous que [X] n'etait pas arrive depuis [Y] ans ?"
- Segment DEEP : contexte historique + scenarios
- Segments : les consequences en cascade
- Closing : ce que ca implique pour la suite

### Pattern E — La patience (usage : marche calme)
Rien ne bouge — occasion d'aller en profondeur.

Structure :
- Hook : "Rien ne bouge. Et c'est justement ca qui est interessant."
- Thread : pourquoi le marche attend
- Segment DEEP unique : un asset en range, scenarios de sortie
- Segments FLASH : les quelques mouvements notables
- Closing : pedagogie + CTA

## Structure temporelle d'un episode (v3 — thematique)

```
0:00-0:08   Hook — UNE phrase choc                                  [5-10s]
0:08-0:12   Generique titre                                          [3-5s]
0:12-0:45   Suivi J-1 — predictions vs realite                       [20-40s]
0:45-1:05   Fil conducteur — nommer le theme, annoncer la cascade    [15-25s]
1:05-6:30   Segments thematiques x4-7 (DEEP/FOCUS/FLASH)             [300-420s]
            Chaque segment est AUTO-CONTENU :
            news + mouvement + analyse + niveaux + scenario
6:30-7:00   Closing — retour fil rouge + teaser demain + CTA         [20-30s]
```

TOTAL : 420-540 secondes (7-9 minutes).

CE QUI N'EXISTE PAS :
- PAS de "market overview" ou "recit du jour" — les segments couvrent tout
- PAS de "dashboard flash" — les indices mineurs sont omis ou en transition
- PAS de "zones a surveiller" separees — les niveaux sont DANS les segments
- PAS de "recap 3 points" — le closing fait UNE phrase de retour au fil

## Regles de narration

### Cold open (Hook)
- UNE seule phrase. Maximum 15 mots.
- Doit contenir un chiffre precis OU un fait specifique du jour.
- Jamais generique ("Bonjour et bienvenue" = INTERDIT).
- Exemples :
  - "Le Bitcoin vient de perdre 4000 dollars en six heures."
  - "L'or n'avait pas touche ce niveau depuis 2020."
  - "Un seul chiffre. Et tout a bascule."

### Suivi J-1
- Obligatoire (sauf episode 1).
- Presenter HONNETEMENT : correct = celebrer brievement. Faux = admettre clairement.
- NE PAS re-analyser les sujets — juste le bilan des predictions.
- "Hier je vous disais de surveiller les 1.0850 sur l'euro — le support a tenu, rebond de 30 pips."
- "J'avais un biais haussier sur le Bitcoin — force est de constater que le marche en a decide autrement."

### Transitions entre segments
- Jamais de coupure seche. Chaque segment doit amener le suivant.
- "On vient de voir l'euro. Mais il y a un autre actif qui reagit a la meme dynamique..."
- "Le petrole en hausse, ca ne touche pas que les prix a la pompe — ca touche directement les marges d'un secteur entier."
- INTERDIT : "Passons maintenant a...", "Regardons ensuite...", "Maintenant parlons de..."

### Segments (DEEP / FOCUS / FLASH)
Structure interne d'un segment DEEP :
1. **Contexte** : ou on en etait hier, le trend recent (10s)
2. **Le mouvement du jour + cause** : quoi, combien, pourquoi (15s)
3. **Chaine causale** : les consequences en cascade (15s)
4. **Analyse technique** : niveaux, RSI, EMA, confluences (15s)
5. **Scenarios conditionnels** : SI haussier / SI baissier (15s)
6. **Risque d'invalidation** : ce qui tuerait le scenario (5s)

Structure interne d'un segment FOCUS :
1. **Le fait** : quoi, combien (10s)
2. **Pourquoi** : cause + correlation (15s)
3. **Consequences** : impact sur d'autres assets (10s)
4. **UN niveau + UN scenario** : le seuil cle et ce qu'il implique (15s)

Structure interne d'un segment FLASH :
1. **Le fait** en 1 phrase
2. **Le contexte/cause** en 1 phrase
3. **La consequence ou le niveau a surveiller** en 1 phrase

### Closing
- UNE phrase de retour au fil conducteur (pas un recap point par point)
- Teaser demain : "Demain on surveille [X]" (evenement ou niveau)
- Question CTA precise et debattable
  - "Le support sur l'euro va-t-il tenir ? Dites-moi en commentaire."
  - "BTC risk-on ou or numerique ? C'est quoi votre avis ?"
- Le CTA est la DERNIERE phrase — jamais un disclaimer apres

## Criteres de qualite

### Obligatoires (fail = re-generation)

- Zero terme interdit AMF
- Duree totale 420-540s
- Ratio 120-180 mots par 60s par section
- Suivi J-1 present (si episode > 1)
- Cold open specifique au jour (pas generique)
- Pas de structure en liste dans les segments
- Chaque segment auto-contenu (news + data + analyse + niveaux)
- AUCUNE section de type "synthesis", "watchlist", "recap_cta", "news", "market_overview" ou "deep_dive"
- Toutes les sections segment utilisent type: "segment" avec depth: "flash" | "focus" | "deep"

### Qualite narrative (scoring)

| Critere | Bon | Mediocre |
|---------|-----|---------|
| Connecteurs causaux | "parce que", "ce qui explique" | "et", "aussi", "par ailleurs" |
| Specificite | "1.0845 — le support des 20 derniers jours" | "un niveau important" |
| Conditionnel | "Si le prix casse X, on pourrait aller chercher Y" | "Le prix va probablement monter" |
| Liens intermarche | "L'or profite de la faiblesse du dollar" | "L'or monte. Le dollar baisse." |
| Engagement | Question, suspense, surprise | Ton monotone descriptif |
| Variete structure | Ordre change selon contexte | Toujours le meme enchainement |
| Transitions | Chaque segment amene le suivant | Coupures seches |
| Donnees precises | Chiffres, %, niveaux, dates | Vague, generique |
| Zero redondance | Chaque fait cite 1 seule fois | Meme info dans 3 sections |
