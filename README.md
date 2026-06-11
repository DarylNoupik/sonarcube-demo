# Étape 4 — rapport d'exécution des tests

Objectif : voir dans SonarQube le **nombre de tests exécutés** et le taux de réussite, en plus de la couverture.

## Ce qui change

La couverture (`lcov.info`) ne dit que *quelles lignes* sont exécutées. Elle ne dit rien sur le **nombre de tests**, lesquels passent ou échouent. Pour ça il faut un second rapport, au format générique de SonarQube.

- `package.json` : ajoute le reporter `jest-sonar`, qui génère `test-report.xml` à chaque `npm test`.

## Lancer les tests puis l'analyse

```cmd
npm install
npm test
```

`npm test` produit maintenant **deux** rapports : `coverage/lcov.info` (couverture) et `test-report.xml` (exécution). Puis :

```cmd
docker run --rm -v "%cd%:/usr/src" sonarsource/sonar-scanner-cli -Dsonar.projectKey=demo-js -Dsonar.sources=. -Dsonar.tests=. -Dsonar.test.inclusions=**/*.test.js -Dsonar.exclusions=node_modules/**,coverage/** -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info -Dsonar.testExecutionReportPaths=test-report.xml -Dsonar.host.url=http://host.docker.internal:9000 -Dsonar.token=VOTRE_TOKEN
```

Le seul paramètre nouveau est `-Dsonar.testExecutionReportPaths=test-report.xml`.

## Ce qu'on observe

Dans Measures apparaissent les métriques **Unit Tests** (20), **Test Success Density** (100 %), **Test Errors/Failures** (0) et la durée.

À savoir : SonarQube affiche seulement le **compteur** de tests, jamais la liste test par test. Pour voir chaque test nommé, il faut un rapport HTML (`jest-html-reporter`) ou le détail côté CI — c'est ce que fait la branche `main`.

## Étape suivante

```
git checkout main
```

La version complète : rapport HTML test par test, plus le README tutoriel détaillé (CI/CD, Quality Gates, notes A–E, export Docker…).
