# Étape 2 — tous les types de défauts

Objectif : voir SonarQube classer les problèmes par **type**, et apprendre à filtrer les issues.

## Le code

`app.js` est maintenant rempli de défauts plantés exprès, regroupés par catégorie. Chaque fonction porte un commentaire avec le type d'issue et la référence de règle (Sxxxx) :

- **Vulnérabilités / Security Hotspots** : secret en dur, IP en dur, injection SQL, injection de commande OS, `eval`, hachage MD5, `Math.random`, URL en HTTP.
- **Bugs** : branches identiques, comparaison avec soi-même, conditions dupliquées, code mort, condition toujours vraie.
- **Code smells** : variable inutilisée, `catch` vide, `var`, `==`, paramètre inutilisé, booléen redondant, ternaire imbriqué, complexité cognitive, auto-affectation, TODO, code commenté.
- **Duplication** : `totalWithTaxFR`/`BE` et `processOrderFR`/`DE`.

## Lancer l'analyse

```cmd
docker run --rm -v "%cd%:/usr/src" sonarsource/sonar-scanner-cli -Dsonar.projectKey=demo-js -Dsonar.sources=. -Dsonar.host.url=http://host.docker.internal:9000 -Dsonar.token=VOTRE_TOKEN
```

## Ce qu'on observe

Dans l'onglet **Issues**, utilise les filtres de gauche : par **type** (Bug, Vulnerability, Code Smell), par **sévérité**, par **règle**. Va aussi voir l'onglet **Security Hotspots** et la **duplication** dans Measures. Pas encore de couverture : ce sera l'étape suivante.

## Étape suivante

```
git checkout etape-3-tests-jest
```

On ajoute Jest, des tests unitaires et la couverture de code.
