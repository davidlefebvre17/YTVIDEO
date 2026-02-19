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
- Cold open : LE theme en une phrase
- Recit du jour : pourquoi ce theme domine + consequences en cascade
- Deep dives : 2-3 assets lies a ce theme
- Dashboard : montrer que tout est connecte au theme
- Zones : niveaux en rapport avec le theme
- Recap : 3 points qui ramenent au theme

Exemples de fils rouges :
- "Le dollar ecrase tout sur son passage"
- "La Fed a parle, le marche reagit"
- "Le petrole repart et ca change tout"
- "Risk-off generalisee — le marche a peur"

### Pattern B — L'effet domino (usage : quand event macro)
Un evenement declenche une chaine de reactions.

Structure :
- Cold open : "Un seul chiffre a fait trembler les marches"
- Le chiffre : quel event, actual vs forecast
- Domino 1 → 2 → 3 : la chaine de causalite
- Deep dive : l'asset le plus impacte
- Zones : niveaux post-choc
- Recap : la chaine en 3 etapes

### Pattern C — Le contraste (usage : quand divergence notable)
Deux assets qui devraient bouger ensemble divergent.

Structure :
- Cold open : "L'or monte et le dollar aussi. C'est pas cense arriver."
- Explication : pourquoi la correlation casse (geopolitique, flux, rotation)
- Deep dive : chacun des deux assets
- Question viewer : "D'apres vous, lequel a raison ?"

### Pattern D — La surprise (usage : 1x/semaine max)
Un element inattendu domine.

Structure :
- Cold open : stat ou fait surprenant
- "Saviez-vous que [X] n'etait pas arrive depuis [Y] ans ?"
- Contexte historique : les precedents
- Ce que ca implique pour les prochains jours

### Pattern E — La patience (usage : marche calme)
Rien ne bouge — occasion d'aller en profondeur.

Structure :
- Cold open : "Rien ne bouge. Et c'est justement ca qui est interessant."
- Pourquoi le marche attend (event a venir, indecision)
- Pedagogie : expliquer un concept en profondeur
- Deep dive unique : un asset en range, scenarios de sortie

## Structure temporelle d'un episode

```
0:00-0:08   Cold open — UNE phrase choc ou intrigue              [5-8s]
0:08-0:13   Generique titre                                       [3-5s]
0:13-0:50   Suivi J-1 — predictions vs realite                    [20-40s]
0:50-2:15   Le recit du jour — le theme, l'histoire               [60-90s]
2:15-2:50   Dashboard flash — tous les assets en 30s              [30-45s]
2:50-4:30   Deep dive 1 — asset principal                         [90-120s]
4:30-5:45   Deep dive 2 — asset secondaire                        [60-90s]
5:45-6:45   Macro/sentiment (si pertinent)                        [45-60s]
6:45-7:15   News impact (si news significative)                   [30-45s]
7:15-8:00   Zones a surveiller — "si X alors Y"                   [45-60s]
8:00-8:20   Recap 3 points                                        [15-20s]
8:20-8:35   Outro — teaser demain + CTA question                  [10-15s]
```

## Regles de narration

### Cold open
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
- "Hier je vous disais de surveiller les 1.0850 sur l'euro — le support a tenu, rebond de 30 pips."
- "J'avais un biais haussier sur le Bitcoin — force est de constater que le marche en a decide autrement."

### Transitions entre segments
- Jamais de coupure seche. Chaque segment doit amener le suivant.
- "Ca c'etait le recit du jour. Maintenant regardons les chiffres de plus pres."
- "On vient de voir l'euro. Mais il y a un autre actif qui reagit a la meme dynamique..."
- "Avant de passer aux zones, un mot sur l'actu qui fait parler."

### Deep dives
Structure interne d'un deep dive :
1. **Contexte** : ou on en etait hier, le trend recent (10-15s)
2. **Le mouvement du jour** : quoi, combien, avec quel volume (10-15s)
3. **Pourquoi** : la cause (macro, technique, news, correlation) (15-20s)
4. **Analyse technique** : niveaux, RSI, EMA, confluences (20-30s)
5. **Scenarios** : "SI [X] ALORS [Y]" — toujours conditionnel (15-20s)
6. **Risques** : ce qui pourrait invalider le scenario (5-10s)

### Outro
- Recap en 3 points (les 3 choses a retenir)
- Teaser demain : "Demain on surveille [X]" (evenement ou niveau)
- Question CTA : une seule question liee a l'analyse du jour
  - "Le support sur l'euro va-t-il tenir ? Dites-moi en commentaire."
  - "BTC risk-on ou or numerique ? C'est quoi votre avis ?"

## Criteres de qualite

### Obligatoires (fail = re-generation)

- Zero terme interdit AMF (regex)
- Disclaimer mentionne au moins 1 fois dans le corps
- Duree totale 480-600s
- Ratio 120-180 mots par 60s par section
- Suivi J-1 present (si episode > 1)
- Cold open specifique au jour (pas generique)
- Pas de structure en liste dans le recit du jour

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
