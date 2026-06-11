# Étape 3 — tests Jest et couverture

Objectif : ajouter des tests unitaires et voir la **couverture de code** remonter dans SonarQube.

## Ce qui change

- `app.test.js` : 20 tests Jest. On en couvre volontairement une partie seulement, pour que la couverture soit partielle (~42 %) et visible.
- `package.json` : configure Jest avec le rapport de couverture au format `lcov`.

Rappel important : SonarQube **ne lance pas** les tests. C'est Jest qui les exécute et produit `coverage/lcov.info`, que le scanner lit ensuite.

## Lancer les tests puis l'analyse

```cmd
npm install
npm test
```

`npm test` crée le dossier `coverage/` avec `lcov.info`. Ensuite seulement :

```cmd
docker run --rm -v "%cd%:/usr/src" sonarsource/sonar-scanner-cli -Dsonar.projectKey=demo-js -Dsonar.sources=. -Dsonar.tests=. -Dsonar.test.inclusions=**/*.test.js -Dsonar.exclusions=node_modules/**,coverage/** -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info -Dsonar.host.url=http://host.docker.internal:9000 -Dsonar.token=VOTRE_TOKEN
```

## Ce qu'on observe

Le bloc **Coverage** affiche un pourcentage. Dans l'onglet **Code**, la marge montre les lignes couvertes (vert), non couvertes (rouge) et partiellement couvertes (jaune). Les fonctions non testées (`pingHost`, `runExpression`, `classify`…) ressortent en rouge.

Piège classique : si la couverture reste à 0 %, c'est que `npm test` n'a pas été lancé avant le scanner.

## Étape suivante

```
git checkout etape-4-rapport-tests
```

On ajoute le rapport d'exécution des tests (nombre de tests, réussis/échoués).
