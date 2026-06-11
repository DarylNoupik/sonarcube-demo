/*
 * Étape 1 — un premier défaut à détecter avec SonarQube.
 *
 * Le fichier est volontairement minuscule : juste de quoi voir SonarQube
 * remonter UN bug et UN problème de sécurité. On part de là.
 */

// Vulnérabilité / Security Hotspot : mot de passe en dur dans le code source.
const dbPassword = "SuperSecret123";

// Bug : les deux branches de la condition font exactement la même chose,
// donc le contrôle d'accès ne contrôle rien.
function checkAccess(user) {
  if (user.role === "admin") {
    return true;
  } else {
    return true;
  }
}

console.log(checkAccess({ role: "admin" }));
