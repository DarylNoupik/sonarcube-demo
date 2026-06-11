/*
 * Tests unitaires Jest pour app.js.
 *
 * On teste VOLONTAIREMENT une partie seulement des fonctions, pour que la
 * couverture remontée à SonarQube soit partielle (autour de 50-60 %). Les
 * fonctions non testées (pingHost, runExpression, hashPassword, generateToken,
 * classify, legacyCompute...) apparaîtront en rouge dans l'onglet Code de
 * SonarQube : c'est le but, voir la couverture fonctionner.
 */

const {
  findUserByName,
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
  selfAssign,
  pendingFeature,
  totalWithTaxFR,
  totalWithTaxBE,
} = require("./app");

describe("findUserByName", () => {
  test("construit une requête contenant le nom", () => {
    expect(findUserByName("alice")).toBe(
      "SELECT * FROM users WHERE name = 'alice'"
    );
  });
});

describe("checkAccess", () => {
  test("autorise un admin", () => {
    expect(checkAccess({ role: "admin" })).toBe(true);
  });

  test("autorise aussi un non-admin (bug planté)", () => {
    expect(checkAccess({ role: "guest" })).toBe(true);
  });
});

describe("isEqualToItself", () => {
  test("renvoie true pour une valeur définie", () => {
    expect(isEqualToItself(5)).toBe(true);
  });
});

describe("describeNumber", () => {
  test("positif", () => {
    expect(describeNumber(3)).toBe("positif");
  });

  test("negatif ou nul", () => {
    expect(describeNumber(-2)).toBe("negatif ou nul");
    expect(describeNumber(0)).toBe("negatif ou nul");
  });
});

describe("doubleValue", () => {
  test("double la valeur", () => {
    expect(doubleValue(7)).toBe(14);
  });
});

describe("alwaysTrueCheck", () => {
  test("renvoie toujours la branche vraie", () => {
    expect(alwaysTrueCheck()).toBe("toujours vrai");
  });
});

describe("calculatePrice", () => {
  test("multiplie quantité et prix", () => {
    expect(calculatePrice(3, 10)).toBe(30);
  });
});

describe("looseCompare", () => {
  test("compare avec == (1 et '1' sont égaux)", () => {
    expect(looseCompare(1, "1")).toBe(true);
  });

  test("valeurs différentes", () => {
    expect(looseCompare(1, 2)).toBe(false);
  });
});

describe("applyTax", () => {
  test("applique 20 % de taxe", () => {
    expect(applyTax(100, 0)).toBe(120);
  });
});

describe("isAdult", () => {
  test("majeur", () => {
    expect(isAdult(20)).toBe(true);
  });

  test("mineur", () => {
    expect(isAdult(15)).toBe(false);
  });
});

describe("grade", () => {
  test("note A pour un score élevé", () => {
    expect(grade(95)).toBe("A");
  });

  test("note D pour un score faible", () => {
    expect(grade(20)).toBe("D");
  });
});

describe("selfAssign", () => {
  test("renvoie l'objet inchangé", () => {
    expect(selfAssign({ value: 9 })).toEqual({ value: 9 });
  });
});

describe("pendingFeature", () => {
  test("renvoie null pour l'instant", () => {
    expect(pendingFeature()).toBeNull();
  });
});

describe("totaux avec taxe (FR et BE, dupliqués)", () => {
  test("FR : petit montant avec port et frais", () => {
    // 50 + 10 (taxe) + 10 (port) + 5 (handling) = 75
    expect(totalWithTaxFR(50)).toBe(75);
  });

  test("BE : gros montant sans port ni frais", () => {
    // 600 + 120 (taxe) + 0 + 0 = 720
    expect(totalWithTaxBE(600)).toBe(720);
  });
});
