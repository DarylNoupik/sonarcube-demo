# Étape 1 — un premier défaut

Objectif : faire tourner SonarQube pour la première fois sur un fichier minuscule et lire deux issues.

## Le code

`app.js` contient seulement deux défauts plantés exprès :

- un **mot de passe en dur** (Security Hotspot) ;
- un **bug** : un `if/else` dont les deux branches font la même chose.

## Lancer l'analyse

Le serveur SonarQube doit tourner sur http://localhost:9000 (voir le README de la branche `main` pour le démarrer avec Docker).

```cmd
docker run --rm -v "%cd%:/usr/src" sonarsource/sonar-scanner-cli -Dsonar.projectKey=demo-js -Dsonar.sources=. -Dsonar.host.url=http://host.docker.internal:9000 -Dsonar.token=VOTRE_TOKEN
```

## Ce qu'on observe

Sur le dashboard du projet : 1 bug et 1 security hotspot. Ouvre chaque issue et lis l'onglet « Why is this an issue? ». C'est tout pour cette étape.

## Étape suivante

```
git checkout etape-2-tous-les-defauts
```

On y remplit `app.js` de tous les types de défauts.
