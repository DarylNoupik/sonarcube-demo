/*
 * app.js — fichier de démonstration SonarQube.
 *
 * Chaque fonction contient un ou plusieurs défauts plantés EXPRÈS pour
 * déclencher les règles SonarJS. Le commentaire au-dessus de chaque défaut
 * indique le type d'issue attendu (bug, vulnérabilité, hotspot, code smell)
 * et, quand elle est connue, la référence de la règle (Sxxxx).
 *
 * Ne JAMAIS utiliser ce code en production. C'est l'inverse d'un exemple à suivre.
 */

const crypto = require("crypto");
const childProcess = require("child_process");

// =====================================================================
// VULNÉRABILITÉS & SECURITY HOTSPOTS
// =====================================================================

// Hotspot S2068 : identifiants en dur dans le code source.
const dbPassword = "SuperSecret123";
const apiKey = "FAKE_DEMO_API_KEY_DO_NOT_USE_a1b2c3d4e5f6";

// Hotspot S1313 : adresse IP en dur.
const dbHost = "192.168.1.42";

// Vulnérabilité S3649 : injection SQL par concaténation de chaîne.
function findUserByName(name) {
  const query = "SELECT * FROM users WHERE name = '" + name + "'";
  return query;
}

// Hotspot S2076 : injection de commande OS — entrée utilisateur passée à exec.
// (Non couvert par les tests : on ne veut pas exécuter de commande réelle.)
function pingHost(userInput) {
  childProcess.exec("ping -c 1 " + userInput, (err, stdout) => {
    console.log(stdout);
  });
}

// Hotspot S1523 : exécution de code dynamique via eval.
function runExpression(expr) {
  // eslint-disable-next-line no-eval
  return eval(expr);
}

// Hotspot S4790 : algorithme de hachage faible (MD5).
function hashPassword(password) {
  return crypto.createHash("md5").update(password).digest("hex");
}

// Hotspot S2245 : générateur pseudo-aléatoire non sûr pour un usage sécurité.
function generateToken() {
  return Math.random().toString(36).substring(2);
}

// Hotspot : URL en HTTP clair au lieu de HTTPS.
const authEndpoint = "http://auth.example.com/login";

// =====================================================================
// BUGS
// =====================================================================

// Bug S3923 : les deux branches de la condition font exactement la même chose.
function checkAccess(user) {
  if (user.role === "admin") {
    return true;
  } else {
    return true;
  }
}

// Bug S1764 : opérande identique des deux côtés de l'opérateur (x === x).
function isEqualToItself(x) {
  return x === x;
}

// Bug S1862 : conditions identiques dans une chaîne if/else-if (la 2e est morte).
function describeNumber(n) {
  if (n > 0) {
    return "positif";
  } else if (n > 0) {
    return "jamais atteint";
  }
  return "negatif ou nul";
}

// Bug S1763 : code mort, instruction après un return inconditionnel.
function doubleValue(n) {
  return n * 2;
  console.log("cette ligne ne s'exécute jamais"); // eslint-disable-line no-unreachable
}

// Bug S2589 : condition toujours vraie (la variable n'est jamais nulle ici).
function alwaysTrueCheck() {
  const value = 10;
  if (value) {
    return "toujours vrai";
  }
  return "inatteignable";
}

// =====================================================================
// CODE SMELLS
// =====================================================================

// Code smell S1481 : variable locale déclarée mais jamais utilisée.
// Code smell S108 : bloc catch vide qui avale l'erreur.
function calculatePrice(qty, price) {
  var unused = 42;
  try {
    return qty * price;
  } catch (e) {
    // exception silencieusement ignorée
  }
}

// Code smell S3504 : déclaration avec var au lieu de let/const.
// Code smell S1440 : usage de == au lieu de ===.
function looseCompare(a, b) {
  var result = a == b;
  return result;
}

// Code smell S1172 : paramètre de fonction non utilisé (discount).
function applyTax(amount, discount) {
  return amount * 1.2;
}

// Code smell S1125 : littéral booléen redondant.
function isAdult(age) {
  if (age >= 18 === true) {
    return true;
  }
  return false;
}

// Code smell S3358 : ternaire imbriqué, difficile à lire.
function grade(score) {
  return score > 90 ? "A" : score > 70 ? "B" : score > 50 ? "C" : "D";
}

// Code smell S3776 : complexité cognitive trop élevée (imbrication profonde).
function classify(a, b, c) {
  if (a > 0) {
    if (b > 0) {
      if (c > 0) {
        if (a > b) {
          if (b > c) {
            return "cas 1";
          } else {
            return "cas 2";
          }
        } else if (a < c) {
          return "cas 3";
        }
      }
    } else {
      return "cas 4";
    }
  }
  return "defaut";
}

// Code smell S1656 : auto-affectation, sans effet.
function selfAssign(obj) {
  obj.value = obj.value;
  return obj;
}

// Code smell S1135 : commentaire TODO laissé dans le code.
function pendingFeature() {
  // TODO: implémenter la logique de facturation
  return null;
}

// Code smell S125 : bloc de code mis en commentaire.
function legacyCompute(x) {
  // const old = x * 3 + 1;
  // return old - 2;
  return x * 2;
}

// =====================================================================
// DUPLICATION
// =====================================================================

// Duplication : les deux fonctions suivantes sont quasi identiques.
function totalWithTaxFR(amount) {
  const tax = amount * 0.2;
  const shipping = amount > 100 ? 0 : 10;
  const handling = amount > 500 ? 0 : 5;
  return amount + tax + shipping + handling;
}

function totalWithTaxBE(amount) {
  const tax = amount * 0.2;
  const shipping = amount > 100 ? 0 : 10;
  const handling = amount > 500 ? 0 : 5;
  return amount + tax + shipping + handling;
}

// Duplication (gros bloc) : processOrderFR et processOrderDE sont identiques.
// Assez longues pour être détectées par le CPD de SonarQube.
function processOrderFR(order) {
  let subtotal = 0;
  for (let i = 0; i < order.items.length; i++) {
    const item = order.items[i];
    subtotal += item.price * item.quantity;
  }
  const tax = subtotal * 0.2;
  let shipping = 0;
  if (subtotal > 100) {
    shipping = 0;
  } else if (subtotal > 50) {
    shipping = 5;
  } else {
    shipping = 10;
  }
  let discount = 0;
  if (order.coupon === "PROMO10") {
    discount = subtotal * 0.1;
  } else if (order.coupon === "PROMO20") {
    discount = subtotal * 0.2;
  }
  const total = subtotal + tax + shipping - discount;
  return {
    subtotal: subtotal,
    tax: tax,
    shipping: shipping,
    discount: discount,
    total: total,
  };
}

function processOrderDE(order) {
  let subtotal = 0;
  for (let i = 0; i < order.items.length; i++) {
    const item = order.items[i];
    subtotal += item.price * item.quantity;
  }
  const tax = subtotal * 0.2;
  let shipping = 0;
  if (subtotal > 100) {
    shipping = 0;
  } else if (subtotal > 50) {
    shipping = 5;
  } else {
    shipping = 10;
  }
  let discount = 0;
  if (order.coupon === "PROMO10") {
    discount = subtotal * 0.1;
  } else if (order.coupon === "PROMO20") {
    discount = subtotal * 0.2;
  }
  const total = subtotal + tax + shipping - discount;
  return {
    subtotal: subtotal,
    tax: tax,
    shipping: shipping,
    discount: discount,
    total: total,
  };
}

module.exports = {
  findUserByName,
  pingHost,
  runExpression,
  hashPassword,
  generateToken,
  checkAccess,
  isEqualToItself,
  describeNumber,
  doubleValue,
  alwaysTrueCheck,
  calculatePrice,
  looseCompare,
  applyTax,
  isAdult,
  grade,
  classify,
  selfAssign,
  pendingFeature,
  legacyCompute,
  totalWithTaxFR,
  totalWithTaxBE,
  processOrderFR,
  processOrderDE,
  // exportées pour information, volontairement non testées :
  dbPassword,
  apiKey,
  dbHost,
  authEndpoint,
};
