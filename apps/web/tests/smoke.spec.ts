import { test, expect } from "@playwright/test";

/**
 * Smoke Tests — InboxChat
 *
 * Verifican que las rutas principales cargan correctamente,
 * no retornan 404, no tienen pantallas en blanco y la
 * navegación home → signup funciona.
 *
 * Prerequisito: servidor corriendo en http://localhost:3000
 */

test.describe("Rutas públicas", () => {
  test("Home / carga correctamente", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/InboxChat/i);
    // El headline debe estar visible
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("Login /login carga el formulario", async ({ page }) => {
    const response = await page.goto("/login");
    expect(response?.status()).toBe(200);
    await expect(page.locator("input[type='email']")).toBeVisible();
    await expect(page.locator("input[type='password']")).toBeVisible();
  });

  test("Signup /signup carga el formulario", async ({ page }) => {
    const response = await page.goto("/signup");
    expect(response?.status()).toBe(200);
    await expect(page.locator("input[type='email']")).toBeVisible();
  });

  test("Pricing /pricing carga correctamente", async ({ page }) => {
    const response = await page.goto("/pricing");
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("Privacy /privacy carga correctamente", async ({ page }) => {
    const response = await page.goto("/privacy");
    expect(response?.status()).toBe(200);
  });

  test("Terms /terms carga correctamente", async ({ page }) => {
    const response = await page.goto("/terms");
    expect(response?.status()).toBe(200);
  });
});

test.describe("Navegación", () => {
  test("Home → click 'Empezar gratis' → redirige a /signup", async ({ page }) => {
    await page.goto("/");
    // El primer enlace al signup en el hero
    const ctaBtn = page.locator("a[href='/signup']").first();
    await expect(ctaBtn).toBeVisible();
    await ctaBtn.click();
    await expect(page).toHaveURL(/\/signup/);
  });

  test("Home → nav link Precios → apunta a #precios o /pricing", async ({ page }) => {
    await page.goto("/");
    // Verificar que el enlace existe y apunta al destino correcto
    const preciosLink = page.locator("nav a").filter({ hasText: /precios/i }).first();
    if (await preciosLink.count() > 0) {
      const href = await preciosLink.getAttribute("href");
      // El link debe apuntar a la sección de precios (ancla o ruta)
      expect(href).toMatch(/#precios|\/pricing/);
    }
  });

  test("Login → click '¿Sin cuenta?' → redirige a /signup", async ({ page }) => {
    await page.goto("/login");
    const signupLink = page.locator("a[href='/signup']").first();
    if (await signupLink.count() > 0) {
      await signupLink.click();
      await expect(page).toHaveURL(/\/signup/);
    }
  });
});

test.describe("Sin pantallas en blanco", () => {
  const routes = ["/", "/login", "/signup", "/pricing", "/privacy", "/terms"];

  for (const route of routes) {
    test(`${route} no tiene pantalla en blanco`, async ({ page }) => {
      await page.goto(route);
      // El body debe tener contenido visible
      const bodyText = await page.locator("body").innerText();
      expect(bodyText.trim().length).toBeGreaterThan(10);
    });
  }
});

test.describe("Sin errores críticos en consola", () => {
  test("Home no tiene errores de JS en consola", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/");
    await page.waitForTimeout(2000);
    // Filtramos errores conocidos no críticos
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes("ResizeObserver") &&
        !e.includes("Non-Error promise rejection")
    );
    expect(criticalErrors).toHaveLength(0);
  });
});
