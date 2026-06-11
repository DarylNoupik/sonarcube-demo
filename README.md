# Démo SonarQube — analyse d'un projet JavaScript

Ce projet sert à apprendre SonarQube en partant de zéro. Le fichier [`app.js`](app.js) contient des défauts plantés exprès (un bug, une vulnérabilité, des code smells, de la duplication) pour voir concrètement ce que SonarQube détecte et comment il classe les problèmes.

## 1. Objectif

À la fin de ce tutoriel, vous saurez :

1. Lancer un serveur SonarQube en local avec Docker.
2. Analyser un projet JavaScript avec le SonarScanner.
3. Lire le rapport dans l'interface : bugs, vulnérabilités, code smells, duplication, et les notes A à E.
4. Brancher la couverture de tests Jest sur l'analyse.
5. Configurer les Rules, Quality Profiles et Quality Gates.
6. Automatiser l'analyse en CI/CD avec un runner self-hosted qui parle à votre serveur local.
7. Exporter les images Docker en fichiers tar pour les réutiliser hors ligne.
8. Éviter les pièges classiques : token dans git, `localhost` depuis un conteneur, `node_modules` analysé par erreur.

## 2. C'est quoi SonarQube ?

SonarQube est un outil d'analyse statique : il lit votre code sans l'exécuter et y repère des problèmes de qualité et de sécurité. Il y a deux briques à distinguer, et la confusion entre les deux est la première source d'erreurs quand on débute :

| Brique | Rôle |
|---|---|
| Serveur SonarQube | L'interface web sur le port 9000. Stocke les résultats, héberge les règles et les Quality Gates. |
| SonarScanner | L'outil en ligne de commande qui parcourt le code et envoie son rapport au serveur. |

Le scanner analyse, envoie au serveur, et vous consultez le résultat dans le navigateur. Le scanner ne décide rien : c'est le serveur qui applique les règles et rend le verdict.

## 3. Les concepts clés

### Les types de problèmes

SonarQube ne met pas tout dans le même sac. Chaque problème détecté (une « issue ») a un type, et chacun est illustré dans `app.js` :

| Type | Définition | Exemple dans `app.js` |
|---|---|---|
| Bug | Erreur de logique qui produira un comportement incorrect | `checkAccess()` retourne `true` dans les deux branches du `if` : le contrôle d'accès ne contrôle rien (lignes 6 à 10) |
| Vulnérabilité | Faille exploitable par un attaquant | Le mot de passe en dur `dbPassword = "SuperSecret123"` (ligne 2) |
| Code smell | Code qui fonctionne mais qui sera pénible à maintenir | La variable `unused` jamais utilisée (ligne 14), le bloc `catch` vide (ligne 18) |
| Security hotspot | Code sensible à vérifier manuellement, pas forcément une faille | Usage de secrets, de cryptographie, de fichiers temporaires |

### La sévérité

Chaque issue reçoit une sévérité : Blocker, Critical, Major, Minor ou Info. Ça sert à prioriser. Personne ne corrige 200 issues d'un coup ; on commence par les Blockers.

### La duplication

SonarQube repère le copié-collé. Ici, `totalWithTaxFR()` et `totalWithTaxBE()` sont identiques (lignes 23 à 33). Le jour où la règle de calcul change, il faudra penser à modifier les deux fonctions. Quelqu'un oubliera. C'est comme ça que naissent les bugs de duplication.

### La dette technique

SonarQube estime le temps nécessaire pour corriger toutes les issues, par exemple « 2h ». Le chiffre exact importe peu ; ce qui compte, c'est de le voir monter ou descendre d'une analyse à l'autre. C'est aussi la base du calcul de la note Maintainability (section 7).

### Le Quality Gate

C'est le verdict final : Passed ou Failed. Un Quality Gate est un ensemble de conditions, par exemple : aucun nouveau bug, couverture du nouveau code au moins à 80 %, duplication du nouveau code sous 3 %. Le gate par défaut s'appelle « Sonar way ». En entreprise, c'est souvent lui qui bloque le merge d'une Pull Request. La section 9 explique comment le configurer.

### Clean as You Code

L'idée centrale de SonarQube : corriger toute la dette historique d'un vieux projet est irréaliste, donc on exige plutôt que tout nouveau code soit propre. Le Quality Gate par défaut ne regarde que le nouveau code (depuis la dernière version, ou les 30 derniers jours selon le réglage). La dette ancienne se résorbe d'elle-même au fil des modifications.

### La couverture de tests

C'est le pourcentage de code exécuté par vos tests automatisés. Point important : SonarQube ne lance pas les tests lui-même, il lit le rapport produit par votre outil de test. Pour ce projet, ce sera Jest (voir la section 8).

## 4. Les notions Docker dont vous avez besoin

Pas besoin d'être expert Docker, mais ces notions reviennent partout dans le tutoriel :

| Notion | Explication |
|---|---|
| Image | Modèle figé d'une application (ex. `sonarqube:community`), téléchargé depuis Docker Hub. |
| Conteneur | Instance en cours d'exécution d'une image. `docker run` en crée un et le démarre. |
| Port mapping `-p 9000:9000` | Relie le port 9000 de votre machine au port 9000 du conteneur. C'est ce qui rend l'interface accessible sur `http://localhost:9000`. |
| Volume `-v "chemin:/usr/src"` | Monte un dossier de votre machine dans le conteneur. C'est ainsi que le scanner, qui tourne dans un conteneur, voit votre code qui est sur votre disque. |
| Volume nommé `-v sonarqube_data:/opt/sonarqube/data` | Stockage persistant géré par Docker. Vos analyses survivent à la suppression du conteneur. |
| `--rm` | Supprime le conteneur dès qu'il se termine. Parfait pour le scanner, qui est un outil one-shot. |
| `-d` | Mode détaché : le conteneur tourne en arrière-plan. |

Et le point qui fait perdre une heure à tout le monde la première fois : le réseau. Un conteneur a son propre réseau, donc dedans, `localhost` désigne le conteneur lui-même, pas votre PC. Si vous lancez le scanner avec `-Dsonar.host.url=http://localhost:9000` sous Windows, il cherche un serveur SonarQube à l'intérieur de son propre conteneur et échoue. La solution : sous Windows et Mac, utilisez le nom spécial `host.docker.internal` ; sous Linux, ajoutez `--network host` au `docker run` et gardez `localhost`. C'est exactement la différence entre les deux commandes de `cmd.md`.

## 5. Les étapes, pas à pas

Prérequis : [Docker Desktop](https://www.docker.com/products/docker-desktop/) installé et démarré. Vérifiez avec `docker --version`.

### Étape 1 — démarrer le serveur

```powershell
docker run -d --name sonarqube `
  -p 9000:9000 `
  -v sonarqube_data:/opt/sonarqube/data `
  -v sonarqube_extensions:/opt/sonarqube/extensions `
  -v sonarqube_logs:/opt/sonarqube/logs `
  sonarqube:community
```

Le premier démarrage prend une à deux minutes. Suivez les logs avec `docker logs -f sonarqube` et attendez la ligne `SonarQube is operational`.

### Étape 2 — première connexion

Ouvrez http://localhost:9000. Identifiants par défaut : `admin` / `admin`. SonarQube force le changement de mot de passe à la première connexion ; choisissez-en un solide.

### Étape 3 — créer le projet

Dans Projects, cliquez sur Create Project puis Local project. Donnez la clé `demo-js` (c'est l'identifiant unique du projet, celui que le scanner devra fournir). Pour la définition du nouveau code, gardez « Use the global setting ».

### Étape 4 — générer un token

Le scanner doit s'authentifier. Allez dans My Account (votre avatar en haut à droite), onglet Security, et générez un token de type Project Analysis Token lié à `demo-js`. Copiez-le tout de suite : il ne sera plus jamais affiché.

Un token est un secret. Ne le mettez jamais dans un fichier versionné par git. Dans ce projet, les commandes contenant le token sont dans `cmd.md`, exclu via `.gitignore`.

### Étape 5 — lancer l'analyse

Depuis la racine du projet, sous Windows (PowerShell) :

```powershell
docker run --rm -v "${PWD}:/usr/src" `
  sonarsource/sonar-scanner-cli `
  -Dsonar.projectKey=demo-js `
  -Dsonar.sources=. `
  -Dsonar.host.url=http://host.docker.internal:9000 `
  -Dsonar.token=VOTRE_TOKEN
```

Sous Linux :

```bash
docker run --rm --network host -v "$(pwd):/usr/src" \
  sonarsource/sonar-scanner-cli \
  -Dsonar.projectKey=demo-js \
  -Dsonar.sources=. \
  -Dsonar.host.url=http://localhost:9000 \
  -Dsonar.token=VOTRE_TOKEN
```

Ce que font les paramètres : le volume monte votre projet dans le conteneur du scanner, `sonar.projectKey` doit correspondre à la clé de l'étape 3, `sonar.sources` indique quoi analyser (`.` = tout), `sonar.host.url` pointe vers le serveur et `sonar.token` vous authentifie. L'analyse se termine par `EXECUTION SUCCESS`.

### Étape 6 — corriger et relancer

Une fois le rapport lu (section suivante), corrigez un problème dans `app.js`, par exemple supprimez la variable `unused`, et relancez la commande de l'étape 5. L'issue disparaît, les métriques bougent. C'est la boucle de travail normale : coder, analyser, corriger, ré-analyser.

## 6. Lire un rapport SonarQube

Le scanner a tourné, le projet `demo-js` apparaît sur http://localhost:9000. Voici comment se repérer dans l'interface, onglet par onglet.

### L'onglet Overview

C'est la page d'accueil du projet. Elle est coupée en deux vues, et il faut comprendre la différence :

- **New Code** : uniquement ce qui a changé depuis la période de référence. C'est la vue que regarde le Quality Gate.
- **Overall Code** : tout le projet, dette historique comprise.

Sur une première analyse, tout le code est « nouveau », donc les deux vues se ressemblent. Vous y trouvez le statut du Quality Gate (Passed ou Failed, avec la condition qui a échoué le cas échéant), le nombre d'issues par type, le pourcentage de duplication, la couverture, et les notes A à E détaillées en section 7.

### L'onglet Issues

C'est là qu'on passe le plus de temps. La colonne de gauche propose des filtres combinables : par type (bug, vulnérabilité, code smell), par sévérité, par règle, par fichier, par date de création, par statut. Quelques usages concrets :

- Filtrer Type = Bug, Sévérité = Blocker pour traiter l'urgent d'abord.
- Filtrer par règle pour corriger toutes les occurrences d'un même problème d'un coup.
- Cliquer sur une issue ouvre le code à la ligne concernée, avec l'onglet « Why is this an issue? » qui explique la règle, donne un exemple de code conforme et estime le temps de correction.

Chaque issue a aussi un cycle de vie. Vous pouvez l'assigner à quelqu'un, la commenter, ou changer son statut : Open, Confirmed, Fixed, ou la fermer comme False Positive / Won't Fix si vous estimez, après discussion, qu'elle ne s'applique pas. Ces décisions sont conservées d'une analyse à l'autre.

### L'onglet Security Hotspots

Les hotspots ont leur propre onglet parce qu'ils demandent une revue humaine. Pour chacun, SonarQube pose la question : « ce code sensible est-il utilisé de façon sûre ? ». Vous lisez le code, puis vous tranchez : Safe (l'usage est légitime), Fixed (vous avez corrigé), ou Acknowledged (problème reconnu, à traiter plus tard). Tant que les hotspots ne sont pas revus, le pourcentage « Hotspots Reviewed » reste bas, et la note Security Review (section 7) en dépend directement.

### L'onglet Measures

Toutes les métriques chiffrées, organisées par domaine : fiabilité, sécurité, maintenabilité, couverture, duplication, taille, complexité. Chaque métrique peut s'afficher en vue arborescente (quel dossier, quel fichier concentre le problème) ou en treemap, pratique pour repérer d'un coup d'œil le fichier le plus touché d'un gros projet.

### L'onglet Code

Le code source annoté : chaque fichier affiche ses issues en marge, ligne par ligne. Utile pour parcourir un fichier précis plutôt que de partir des issues.

### L'onglet Activity

L'historique des analyses, avec des graphiques d'évolution par métrique. C'est ici qu'on vérifie que la dette descend au fil des semaines, et qu'on repère l'analyse qui a fait basculer le Quality Gate.

### Récupérer les résultats hors interface

L'interface ne propose pas d'export PDF en version Community, mais tout est accessible par l'API web. Par exemple, pour lister les issues du projet :

```powershell
curl -u VOTRE_TOKEN: "http://localhost:9000/api/issues/search?componentKeys=demo-js"
```

La documentation complète de l'API est dans le footer de l'interface, lien « Web API ». C'est aussi ce qu'utilisent les intégrations CI pour récupérer le statut du Quality Gate.

## 7. Les notes A à E : Maintainability, Reliability et consorts

Sur l'Overview, chaque domaine reçoit une note de A (le mieux) à E (le pire). Ces notes existent en double : une pour le nouveau code, une pour l'ensemble du projet. Elles ne se calculent pas toutes de la même façon, et c'est ce qui déroute au début.

### Reliability et Security : la pire issue donne la note

Ces deux notes ne comptent pas le nombre d'issues, elles regardent la sévérité de la pire. Un projet avec une seule vulnérabilité Blocker est noté E en Security, même si tout le reste est impeccable. C'est volontaire : une faille critique n'est pas diluée par la qualité du reste.

| Note | Reliability (bugs) | Security (vulnérabilités) |
|---|---|---|
| A | Aucun bug | Aucune vulnérabilité |
| B | Au pire un bug Minor | Au pire une vulnérabilité Minor |
| C | Au pire un bug Major | Au pire une vulnérabilité Major |
| D | Au pire un bug Critical | Au pire une vulnérabilité Critical |
| E | Au moins un bug Blocker | Au moins une vulnérabilité Blocker |

Conséquence pratique : corriger dix bugs Minor ne change pas une note D ; corriger le seul bug Critical la fait passer à B d'un coup. Quand vous voulez améliorer une note Reliability ou Security, triez les issues par sévérité décroissante et attaquez le haut de la pile.

### Maintainability : un ratio de dette, pas un comptage

La note Maintainability (historiquement appelée note SQALE) se calcule à partir du **ratio de dette technique** :

```
ratio = temps estimé pour corriger les code smells / temps estimé pour développer le projet
```

Le coût de développement est estimé forfaitairement à 30 minutes par ligne de code (valeur par défaut, modifiable par l'administrateur). Les seuils :

| Note | Ratio de dette |
|---|---|
| A | 5 % ou moins |
| B | de 6 à 10 % |
| C | de 11 à 20 % |
| D | de 21 à 50 % |
| E | plus de 50 % |

Exemple : un projet de 10 000 lignes vaut 10 000 × 30 min = 5 000 heures de développement estimé. S'il porte 100 heures de dette, le ratio est de 2 % : note A. C'est pour ça qu'un gros projet peut avoir des centaines de code smells et rester noté A, alors qu'un petit fichier avec trois smells peut descendre à C : la note est relative à la taille, pas absolue.

### Security Review : le pourcentage de hotspots revus

Cette note ne mesure pas la présence de failles mais la discipline de revue : quelle proportion des security hotspots a été examinée (statut Safe, Fixed ou Acknowledged) ?

| Note | Hotspots revus |
|---|---|
| A | 80 % ou plus |
| B | de 70 à 80 % |
| C | de 50 à 70 % |
| D | de 30 à 50 % |
| E | moins de 30 % |

Un projet jamais passé en revue affiche E ici même s'il est sain. La note remonte sans toucher au code, simplement en faisant le travail de revue dans l'onglet Security Hotspots.

### Comment lire tout ça en pratique

L'erreur du débutant est de viser A partout sur l'Overall Code d'un projet existant. Le réflexe correct, aligné sur Clean as You Code : exiger A sur le **nouveau code** (c'est ce que fait le Quality Gate par défaut) et regarder la tendance sur l'Overall Code dans l'onglet Activity, pas sa valeur absolue. Une note Overall C qui était D il y a trois mois est une meilleure nouvelle qu'un B stable.

Dernier point de vocabulaire : les versions récentes de SonarQube (10.x et suivantes) introduisent progressivement le mode « Multi-Quality Rule », où une même règle peut impacter plusieurs qualités (Security, Reliability, Maintainability) avec des sévérités nommées Blocker/High/Medium/Low/Info. La logique des notes A à E reste la même ; seul le vocabulaire des sévérités change selon le mode activé sur votre instance.

## 8. Ajouter la couverture de tests Jest

SonarQube affiche « Coverage: 0% » tant qu'on ne lui donne pas de rapport de couverture. Il ne lance pas les tests : c'est Jest qui les exécute et produit un rapport au format LCOV, que le scanner lit ensuite. Voici la chaîne complète.

### Initialiser le projet npm et installer Jest

```powershell
npm init -y
npm install --save-dev jest
```

### Écrire un premier test

Créez `app.test.js` à côté de `app.js`. Pour que les fonctions soient testables, il faut d'abord les exporter depuis `app.js` :

```js
// à la fin de app.js
module.exports = { calculatePrice, totalWithTaxFR };
```

Puis le test :

```js
// app.test.js
const { calculatePrice, totalWithTaxFR } = require("./app");

test("calculatePrice multiplie quantité et prix", () => {
  expect(calculatePrice(3, 10)).toBe(30);
});

test("totalWithTaxFR ajoute 20% de taxe et 10 de port sous 100", () => {
  expect(totalWithTaxFR(50)).toBe(70); // 50 + 10 de taxe + 10 de port
});
```

### Générer le rapport de couverture

```powershell
npx jest --coverage
```

Jest affiche un tableau de couverture dans le terminal et crée un dossier `coverage/`. Le fichier qui intéresse SonarQube est `coverage/lcov.info`. Vous pouvez ajouter un script dans `package.json` pour ne pas retaper la commande :

```json
"scripts": {
  "test": "jest --coverage"
}
```

### Indiquer le rapport au scanner

Ajoutez deux paramètres à la commande d'analyse :

```powershell
-Dsonar.javascript.lcov.reportPaths=coverage/lcov.info `
-Dsonar.exclusions=node_modules/**,coverage/**
```

Le premier dit où trouver le rapport LCOV. Le second exclut `node_modules` et `coverage` de l'analyse, sinon le scanner analyse vos dépendances et le rapport devient illisible (et l'analyse, très lente). Le chemin `coverage/lcov.info` est relatif à la racine du projet, donc il fonctionne tel quel même quand le scanner tourne dans Docker, puisque tout le dossier est monté dans `/usr/src`.

Deux pièges connus :

- Lancez `npx jest --coverage` avant le scanner, sinon le fichier n'existe pas au moment de l'analyse et la couverture reste à zéro, sans erreur explicite.
- Il faut aussi dire à SonarQube de ne pas compter les fichiers de test dans la couverture : `-Dsonar.test.inclusions=**/*.test.js`. Sans ça, les métriques sont faussées.

Relancez l'analyse : l'onglet Overview affiche maintenant un pourcentage de couverture, et l'onglet Code montre, ligne par ligne, ce qui est couvert (vert) ou non (rouge).

## 9. Rules, Quality Profiles et Quality Gates : configurer comme un expert

Trois menus du bandeau supérieur (Rules, Quality Profiles, Quality Gates) forment le système de gouvernance de SonarQube. La confusion la plus répandue, même chez des utilisateurs avancés : le Quality Profile décide **ce qui est détecté**, le Quality Gate décide **ce qui est acceptable**. L'un produit les issues, l'autre rend le verdict.

### Les Rules : le catalogue

Le menu Rules liste toutes les règles disponibles, plusieurs centaines pour JavaScript. Chaque règle a une fiche complète : explication du problème, exemple de code non conforme, exemple corrigé, effort de correction estimé (c'est lui qui alimente le calcul de la dette), et des tags (`security`, `performance`, `convention`, les catégories OWASP et CWE...).

Le moteur de recherche est puissant et sous-utilisé : filtrez par langage, par type, par tag, par sévérité. Recherchez par exemple le tag `suspicious` en JavaScript : vous y trouverez la règle S3923 « All branches in a conditional structure should not have exactly the same implementation », celle qui attrape le `if/else` de `checkAccess()` dans ce projet.

Une règle n'a aucun effet tant qu'elle n'est pas activée dans un Quality Profile. C'est le point suivant.

### Les Quality Profiles : ce qu'on active, et pour qui

Un Quality Profile est un ensemble de règles actives **pour un langage donné**. Chaque langage a son profil par défaut, « Sonar way », fourni et maintenu par SonarSource. Il est en lecture seule, et c'est une bonne chose : il évolue à chaque mise à jour du serveur, avec des règles ajoutées ou recalibrées.

Quand le profil par défaut ne suffit plus, vous avez deux façons de le personnaliser, et le choix a des conséquences à long terme :

- **Copy** : un instantané indépendant. Vous partez de l'état actuel de Sonar way, mais les nouvelles règles des futures versions n'y arriveront jamais toutes seules. Au bout de deux ans, votre copie est figée dans le passé sans que personne ne s'en rende compte.
- **Extend** : un profil enfant qui hérite du parent. Vous n'y mettez que vos écarts (règles ajoutées, désactivées, paramètres modifiés) ; tout le reste suit automatiquement les évolutions du parent.

Le choix de l'expert est presque toujours **Extend**. Une copie ne se justifie que si vous voulez explicitement geler le référentiel, par exemple pour un audit contractuel.

Dans un profil personnalisé, vous pouvez activer ou désactiver chaque règle, changer sa sévérité, et surtout régler ses **paramètres** : beaucoup de règles sont paramétrables. Exemple classique, la règle S3776 sur la complexité cognitive accepte un seuil (15 par défaut) que certaines équipes ajustent. Modifier un paramètre vaut souvent mieux que désactiver la règle entière.

Un profil s'applique ensuite de deux façons : comme défaut global pour le langage (bouton « Set as Default »), ou projet par projet (dans le projet : Project Settings, puis Quality Profiles). Les profils s'exportent et se restaurent en XML via « Back up », ce qui permet de les versionner ou de les répliquer entre instances.

Côté gouvernance, les pratiques qui distinguent une organisation mature :

- **Un seul profil personnalisé par langage pour toute l'organisation**, pas un par équipe. Dix profils divergents, c'est dix définitions différentes de « code propre », et des développeurs perdus à chaque changement de projet.
- **Toute désactivation de règle se justifie par écrit** (un commentaire, un ticket, une décision d'équipe tracée). Une règle désactivée en douce parce qu'elle « faisait du bruit » réapparaîtra en production sous forme de bug.
- Les modifications de profil se traitent **comme des changements de code** : discutées, annoncées, et faites par peu de gens (les permissions « Administer Quality Profiles » se gèrent dans Administration, Security).
- Utilisez « Compare » pour visualiser les écarts entre votre profil et Sonar way : c'est votre liste de dérogations, elle doit rester courte.

### Les Quality Gates : le verdict

Le menu Quality Gates définit les conditions de passage. Le gate « Sonar way » fourni d'origine applique Clean as You Code : aucune nouvelle issue, tous les nouveaux hotspots revus, couverture du nouveau code à 80 % minimum, duplication du nouveau code sous 3 %. Il est en lecture seule ; pour le personnaliser, copiez-le puis modifiez la copie.

Créer ou modifier un gate consiste à empiler des conditions de la forme « métrique, opérateur, seuil », chacune portant soit sur le nouveau code, soit sur l'ensemble du code. On l'applique ensuite comme défaut global ou projet par projet (Project Settings, Quality Gate).

Les principes que les équipes expérimentées appliquent, et que les autres apprennent à leurs dépens :

- **Conditions sur le nouveau code uniquement, sauf exception réfléchie.** Une condition « couverture globale ≥ 80 % » sur un projet historique couvert à 40 % met le gate en échec permanent. Au bout de trois semaines de croix rouge, plus personne ne le regarde : un gate toujours rouge est pire que pas de gate. Les conditions sur le nouveau code, elles, sont atteignables dès aujourd'hui par n'importe quelle équipe sur n'importe quel projet.
- **Peu de conditions.** Le gate Sonar way en a quatre ou cinq, et c'est un bon ordre de grandeur. Chaque condition ajoutée est un point de friction ; ne gardez que celles qui déclencheraient réellement un refus de merge.
- **Ne baissez jamais un seuil pour faire passer une release.** Si la couverture exigée passe de 80 à 60 % « juste pour cette fois », elle ne remontera jamais. Si une situation exceptionnelle l'exige vraiment, traitez l'exception côté issues (Won't Fix argumenté), pas côté seuils.
- **Un seul gate pour presque tout le monde.** Comme pour les profils, multiplier les gates par équipe dilue le standard. Une exception légitime : un gate plus strict (par exemple sur les vulnérabilités) pour les composants exposés ou critiques.
- Le gate est calculé par le serveur après chaque analyse. Pour le rendre bloquant en CI, deux mécanismes : le paramètre `sonar.qualitygate.wait=true` du scanner (simple, vu en section 10) ou un **webhook** (Administration, Configuration, Webhooks) qui notifie votre CI dès que le résultat est prêt, plus efficace sur les grosses instances car il évite le polling.

## 10. Intégrer SonarQube à la CI/CD avec le serveur local

Jusqu'ici, vous lancez le scanner à la main. L'étape suivante, c'est qu'il tourne tout seul à chaque push, et que le Quality Gate bloque ce qui ne passe pas. Problème : votre serveur SonarQube écoute sur `http://localhost:9000`, sur votre machine. Les runners hébergés par GitHub tournent dans le cloud et ne peuvent pas l'atteindre. Deux options : exposer votre serveur sur internet (mauvaise idée pour un serveur de formation, et risqué tant que l'instance n'est pas durcie), ou faire tourner le job de CI sur votre propre machine avec un **runner self-hosted**. C'est cette deuxième option qu'on détaille, avec GitHub Actions.

### Ce qu'est un runner self-hosted

GitHub Actions sépare l'orchestration (chez GitHub : déclenchement des workflows, interface, logs) de l'exécution (le runner, un agent qui exécute les jobs). Par défaut les runners sont des machines virtuelles GitHub jetables. Un runner self-hosted, c'est ce même agent installé sur une machine à vous. Il se connecte en sortie vers GitHub (aucun port à ouvrir chez vous), attend qu'un job lui soit assigné, l'exécute, et renvoie les logs. Comme il tourne sur votre machine, il voit tout ce qu'elle voit : votre Docker, et votre serveur SonarQube sur `localhost:9000`.

Avertissement de sécurité avant de commencer, et il n'est pas optionnel : **n'attachez jamais un runner self-hosted à un dépôt public**. N'importe qui peut ouvrir une Pull Request sur un dépôt public, et selon la configuration, le code de cette PR peut s'exécuter sur votre machine. GitHub lui-même le déconseille explicitement. Pour ce tutoriel, mettez le dépôt en privé. En entreprise, on va plus loin : machine dédiée au runner (pas le poste de travail), compte utilisateur aux droits réduits, runner mis à jour régulièrement, et exécution éphémère (`--ephemeral`) pour que chaque job parte d'un agent neuf.

### Étape 1 — enregistrer le runner

1. Sur GitHub, ouvrez votre dépôt, puis Settings, Actions, Runners, et cliquez « New self-hosted runner ».
2. Choisissez l'OS (Windows x64 ici). GitHub affiche alors une série de commandes personnalisées pour votre dépôt, incluant un token d'enregistrement valable environ une heure.
3. Exécutez-les dans PowerShell. En substance :

```powershell
# créer le dossier du runner
mkdir C:\actions-runner ; cd C:\actions-runner

# télécharger et extraire l'agent (l'URL exacte est fournie par la page GitHub)
Invoke-WebRequest -Uri https://github.com/actions/runner/releases/download/vX.Y.Z/actions-runner-win-x64-X.Y.Z.zip -OutFile actions-runner.zip
Expand-Archive actions-runner.zip -DestinationPath .

# enregistrer le runner auprès du dépôt
.\config.cmd --url https://github.com/VOTRE_COMPTE/demo-js --token LE_TOKEN_AFFICHE_PAR_GITHUB
```

4. Le script `config.cmd` pose quelques questions : le groupe de runners (défaut), le **nom** du runner, ses **labels**, et le dossier de travail. Les labels sont importants : c'est par eux que vos workflows cibleront ce runner. Gardez les labels automatiques (`self-hosted`, `Windows`, `X64`) et ajoutez-en un parlant, par exemple `sonar`.

### Étape 2 — démarrer le runner

Deux modes :

- **Interactif**, pour tester : `.\run.cmd`. Le runner tourne tant que la fenêtre est ouverte. Vous voyez les jobs arriver en direct, pratique pour la première fois.
- **En service Windows**, pour de vrai : à la fin de `config.cmd`, le script propose « Would you like to run the runner as service? ». Répondez oui (il faut un PowerShell administrateur). Le runner démarre alors avec la machine, sans session ouverte. Sous Linux, l'équivalent est `sudo ./svc.sh install && sudo ./svc.sh start`.

Retournez dans Settings, Actions, Runners : le runner apparaît avec le statut « Idle ». Il est prêt.

### Étape 3 — stocker le token SonarQube dans les secrets

Le workflow aura besoin du token d'analyse. Il ne va évidemment pas dans le YAML versionné : dans le dépôt, Settings, Secrets and variables, Actions, « New repository secret ». Nommez-le `SONAR_TOKEN` et collez le token de l'étape 4 de la section 5. Le workflow y accédera via `${{ secrets.SONAR_TOKEN }}`, et GitHub masque sa valeur dans les logs.

### Étape 4 — écrire le workflow

Créez `.github/workflows/sonar.yml` :

```yaml
name: Analyse SonarQube

on:
  push:
    branches: [master, main]

jobs:
  sonarqube:
    runs-on: [self-hosted, sonar]   # cible notre runner par ses labels
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0   # historique complet, nécessaire au calcul du nouveau code

      - name: Tests et couverture
        run: |
          npm ci
          npx jest --coverage

      - name: Analyse SonarQube
        run: >
          docker run --rm -v "${{ github.workspace }}:/usr/src"
          sonarsource/sonar-scanner-cli
          -D"sonar.projectKey=demo-js"
          -D"sonar.sources=."
          -D"sonar.exclusions=node_modules/**,coverage/**"
          -D"sonar.test.inclusions=**/*.test.js"
          -D"sonar.javascript.lcov.reportPaths=coverage/lcov.info"
          -D"sonar.host.url=http://host.docker.internal:9000"
          -D"sonar.token=${{ secrets.SONAR_TOKEN }}"
          -D"sonar.qualitygate.wait=true"
```

Trois détails de ce fichier méritent une explication, parce que ce sont eux qui cassent quand on improvise :

- `fetch-depth: 0` force un clone complet. Par défaut, checkout ne récupère que le dernier commit, et SonarQube ne peut alors ni dater les issues (git blame) ni délimiter correctement le nouveau code. Symptôme classique d'un oubli : toutes les issues apparaissent « nouvelles » à chaque analyse.
- `sonar.host.url` vaut `host.docker.internal` et pas `localhost` : même piège qu'en section 4, le scanner tourne dans un conteneur, même quand c'est la CI qui le lance. Le runner, lui, tourne directement sur la machine.
- `sonar.qualitygate.wait=true` change la nature du job : sans lui, le scanner envoie son rapport et termine en succès quoi qu'il arrive. Avec lui, le scanner attend que le serveur calcule le Quality Gate et **échoue si le gate est Failed**. C'est ce qui met la croix rouge sur le commit, et c'est tout l'intérêt de la manœuvre.

Poussez ce fichier, et regardez l'onglet Actions du dépôt : le job part sur votre runner (la fenêtre `run.cmd` s'anime si vous êtes en mode interactif), et le résultat du gate décide du statut du workflow.

### Étape 5 — bloquer les merges

Pour que le gate bloque vraiment les Pull Requests : Settings, Branches (ou Rulesets), ajoutez une protection sur `main`/`master` avec « Require status checks to pass » et sélectionnez le job `sonarqube`. À partir de là, pas de merge tant que l'analyse n'est pas verte. Pour analyser aussi les PR elles-mêmes, ajoutez `pull_request:` aux déclencheurs du workflow.

### Notes pour les autres CI

Le principe est identique partout : un agent installé sur votre machine, le scanner pointé vers le serveur local, le token en secret. Avec **GitLab CI**, l'agent s'appelle `gitlab-runner` (enregistrement via Settings, CI/CD, Runners, puis `gitlab-runner register` avec un executor `shell` ou `docker`), et le job utilise les variables CI/CD masquées du projet. Avec **Jenkins**, qui est souvent lui-même auto-hébergé sur le même réseau que SonarQube, le plugin « SonarQube Scanner » et l'étape `waitForQualityGate` (alimentée par un webhook, voir section 9) remplacent `sonar.qualitygate.wait`.

## 11. Créer des fichiers tar des images Docker

À quoi ça sert : transporter une image sans passer par Docker Hub. Cas typiques : machine sans accès internet, réseau d'entreprise verrouillé, ou simplement éviter de re-télécharger 1 Go de SonarQube sur chaque poste pendant une formation.

### Exporter une image avec docker save

```powershell
docker save -o sonarqube.tar sonarqube:community
docker save -o sonar-scanner.tar sonarsource/sonar-scanner-cli
```

Le tar contient l'image complète : toutes ses couches, ses métadonnées et son tag. Comptez environ 1 Go pour SonarQube. Pour réduire la taille, compressez :

```powershell
# Windows (tar puis compression zip)
docker save -o sonarqube.tar sonarqube:community
Compress-Archive sonarqube.tar sonarqube.zip
```

```bash
# Linux/Mac (en une commande)
docker save sonarqube:community | gzip > sonarqube.tar.gz
```

### Réimporter avec docker load

Sur la machine cible :

```powershell
docker load -i sonarqube.tar
```

L'image réapparaît dans `docker images` avec son tag d'origine, prête pour un `docker run`. Si vous aviez compressé en `.tar.gz`, `docker load` le lit directement, pas besoin de décompresser.

### Ne pas confondre save et export

Docker a deux commandes qui produisent des tar, et elles ne font pas la même chose :

| Commande | Ce qu'elle exporte | Se réimporte avec |
|---|---|---|
| `docker save` | Une **image** : toutes les couches, l'historique, le tag | `docker load` |
| `docker export` | Le **système de fichiers d'un conteneur** à l'instant T, à plat, sans historique ni tag | `docker import` |

Pour transporter SonarQube ou le scanner, c'est `docker save` qu'il vous faut. `docker export` sert à des cas particuliers, comme figer l'état d'un conteneur pour l'inspecter.

Attention enfin à un détail : `docker save` exporte l'image, pas vos données. Les analyses, les utilisateurs et la configuration de votre serveur vivent dans les volumes (`sonarqube_data`, etc.). Pour migrer un serveur complet vers une autre machine, il faut sauvegarder les volumes en plus de l'image.

## 12. Cycle de vie du serveur

```powershell
docker stop sonarqube      # arrêter le serveur
docker start sonarqube     # le redémarrer, les données sont conservées
docker logs -f sonarqube   # suivre les logs
docker rm -f sonarqube     # supprimer le conteneur (les volumes nommés persistent)
docker volume ls           # lister les volumes
```

## 13. Les conseils qu'on apprend avec l'expérience

Sur la sécurité d'abord. Jamais de token en clair dans git ; passez-le par variable d'environnement (`-Dsonar.token=$env:SONAR_TOKEN`) ou par les secrets de la CI (section 10). Et si un token a déjà été commité, le retirer du fichier ne suffit pas : il reste dans l'historique git. La seule réponse correcte est de le révoquer dans My Account, onglet Security, et d'en générer un autre. Préférez aussi les tokens de type Project Analysis, aux droits minimaux, à un token global utilisateur. Le mot de passe en dur de `app.js` illustre la même règle côté code : en production, les secrets vont dans des variables d'environnement ou un gestionnaire de secrets.

Sur la configuration. Plutôt que d'empiler les `-D` dans la commande, créez un fichier `sonar-project.properties` à la racine :

```properties
sonar.projectKey=demo-js
sonar.projectName=Demo JS
sonar.sources=.
sonar.exclusions=node_modules/**,coverage/**,dist/**
sonar.test.inclusions=**/*.test.js
sonar.javascript.lcov.reportPaths=coverage/lcov.info
```

La commande du scanner se réduit alors au host et au token, et la configuration est versionnée avec le projet. Ça simplifie aussi le workflow de CI, qui n'a plus que deux `-D` à passer.

Sur l'usage en production. L'image Docker seule tourne sur une base H2 embarquée : très bien pour apprendre, à proscrire en production parce qu'elle ne permet ni migration ni sauvegarde fiable. En production, on branche un PostgreSQL externe, en général via `docker compose`. Sous Linux, prévoyez aussi `sysctl -w vm.max_map_count=262144`, exigé par Elasticsearch qui tourne à l'intérieur de SonarQube.

Sur la méthode enfin. La vraie valeur de SonarQube apparaît quand l'analyse tourne dans la CI et que le Quality Gate bloque les PR (section 10). Résistez à la tentation de désactiver une règle parce qu'elle gêne ; si elle est vraiment inadaptée à votre contexte, adaptez le Quality Profile en équipe et tracez la décision (section 9). Et installez SonarLint dans votre IDE : c'est la même analyse, mais pendant que vous tapez, ce qui évite la moitié des allers-retours avec le serveur. SonarCloud, enfin, est la version hébergée, gratuite pour les projets open source.

## 14. Pour aller plus loin

- [ ] Corriger tous les défauts de `app.js` et obtenir un Quality Gate Passed
- [ ] Ajouter les tests Jest de la section 8 et vérifier la couverture dans l'interface
- [ ] Déplacer la configuration dans `sonar-project.properties`
- [ ] Créer un Quality Profile « Extend » et un Quality Gate personnalisé (section 9)
- [ ] Installer le runner self-hosted et brancher le workflow GitHub Actions (section 10)
- [ ] Monter une stack `docker compose` avec SonarQube et PostgreSQL
- [ ] Installer SonarLint dans VS Code

## Ressources

- Documentation officielle : https://docs.sonarsource.com/sonarqube-server/
- Règles JavaScript : https://rules.sonarsource.com/javascript/
- Image Docker SonarQube : https://hub.docker.com/_/sonarqube
- Image du scanner : https://hub.docker.com/r/sonarsource/sonar-scanner-cli
- Runners self-hosted GitHub Actions : https://docs.github.com/en/actions/hosting-your-own-runners
