import fs from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer";

const BASE_URL = "https://web-production-d832b.up.railway.app";
const LOGIN_EMAIL = "admin@hostiq.app";
const LOGIN_PASSWORD = "admin123!";

const OUTPUT_DIR = path.resolve(process.cwd(), "audit-output");
const SHOTS_DIR = path.join(OUTPUT_DIR, "screenshots");
const REPORT_PATH = path.join(OUTPUT_DIR, "puppeteer-audit-report.json");

const publicRoutes = ["/", "/login", "/register", "/forgot-password"];
const portalRoutes = [
  "/dashboard",
  "/reservations",
  "/messages",
  "/cleaners",
  "/pricing",
  "/revenue",
  "/marketing",
  "/reviews",
  "/issues",
  "/settings",
  "/admin",
  "/tickets",
];

const report = {
  startedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  routes: [],
  jsErrors: [],
  consoleErrors: [],
  networkFailures: [],
  unhandledButtons: [],
};

function slug(input) {
  return input.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
}

async function ensureDirs() {
  await fs.mkdir(SHOTS_DIR, { recursive: true });
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function screenshot(page, name) {
  const filename = `${name}.png`;
  await page.screenshot({
    path: path.join(SHOTS_DIR, filename),
    fullPage: true,
  });
  return filename;
}

async function waitForSettled(page) {
  await page.waitForNetworkIdle({ idleTime: 500, timeout: 15000 }).catch(() => {});
  await sleep(300);
}

async function navigateAndCapture(page, route, tag) {
  const url = `${BASE_URL}${route}`;
  const start = Date.now();
  let status = "ok";
  let errMessage = null;

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await waitForSettled(page);
  } catch (err) {
    status = "navigation_error";
    errMessage = err instanceof Error ? err.message : String(err);
  }

  const shot = await screenshot(page, `${tag}-${slug(route || "root")}`);
  report.routes.push({
    route,
    tag,
    status,
    errMessage,
    durationMs: Date.now() - start,
    screenshot: shot,
    title: await page.title().catch(() => ""),
    url: page.url(),
  });
}

async function login(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector("#email", { timeout: 15000 });
  await page.type("#email", LOGIN_EMAIL);
  await page.type("#password", LOGIN_PASSWORD);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {}),
    page.click("button[type='submit']"),
  ]);
  await waitForSettled(page);
  return page.url().includes("/dashboard");
}

async function clickVisibleButtons(page, route) {
  const buttons = await page.$$(
    "button:not([disabled]), a[role='button'], [type='button']:not([disabled]), [type='submit']:not([disabled])"
  );

  let clicked = 0;
  for (let i = 0; i < buttons.length; i++) {
    const b = buttons[i];
    const text = (
      await b.evaluate((el) => (el.textContent || "").trim().slice(0, 80))
    ).replace(/\s+/g, " ");

    if (!text) continue;
    if (/sign out/i.test(text)) continue;

    try {
      await b.evaluate((el) => {
        el.scrollIntoView({ block: "center" });
      });
      await sleep(100);
      await b.click({ delay: 20 });
      clicked++;
      await sleep(350);
    } catch (err) {
      report.unhandledButtons.push({
        route,
        text,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return clicked;
}

async function run() {
  await ensureDirs();
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1440, height: 900 },
  });
  const page = await browser.newPage();

  page.on("pageerror", (err) => {
    report.jsErrors.push({
      url: page.url(),
      message: err.message,
      stack: err.stack ?? "",
    });
  });

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      report.consoleErrors.push({
        url: page.url(),
        text: msg.text(),
      });
    }
  });

  page.on("requestfailed", (req) => {
    report.networkFailures.push({
      url: page.url(),
      requestUrl: req.url(),
      method: req.method(),
      reason: req.failure()?.errorText ?? "unknown",
    });
  });

  for (const route of publicRoutes) {
    await navigateAndCapture(page, route, "public");
  }

  const didLogin = await login(page);
  await screenshot(page, "portal-dashboard-after-login");

  report.login = {
    success: didLogin,
    finalUrl: page.url(),
  };

  for (const route of portalRoutes) {
    await navigateAndCapture(page, route, "portal");
    const clicked = await clickVisibleButtons(page, route);
    report.routes.push({
      route,
      tag: "button-scan",
      status: "ok",
      clickedButtons: clicked,
      screenshot: await screenshot(page, `portal-buttons-${slug(route)}`),
      url: page.url(),
    });
  }

  await browser.close();
  report.finishedAt = new Date().toISOString();
  await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
  console.log(`Report written to ${REPORT_PATH}`);
}

run().catch(async (err) => {
  report.fatalError = err instanceof Error ? err.message : String(err);
  report.finishedAt = new Date().toISOString();
  await ensureDirs();
  await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
  console.error(err);
  process.exit(1);
});
