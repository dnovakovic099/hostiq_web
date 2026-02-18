import fs from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer";

const WEB_URL = "http://localhost:3000";
const API_URL = "http://localhost:3001";
const LOGIN_EMAIL = "admin@hostiq.app";
const LOGIN_PASSWORD = "admin123!";

const OUTPUT_DIR = path.resolve(process.cwd(), "audit-output-local");
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
  baseUrl: WEB_URL,
  apiUrl: API_URL,
  routes: [],
  jsErrors: [],
  consoleErrors: [],
  networkFailures: [],
  buttonInteractions: [],
  apiSmoke: [],
  summary: {},
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

// Navigate to a page and capture status + screenshot
async function navigateAndCapture(page, route, tag) {
  const url = `${WEB_URL}${route}`;
  const start = Date.now();
  let status = "ok";
  let errMessage = null;
  let httpStatus = null;

  try {
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    httpStatus = response?.status() ?? null;
    await waitForSettled(page);
  } catch (err) {
    status = "navigation_error";
    errMessage = err instanceof Error ? err.message : String(err);
  }

  const shot = await screenshot(page, `${tag}-${slug(route || "root")}`);
  const pageTitle = await page.title().catch(() => "");
  const finalUrl = page.url();

  // Check if page has visible error content
  const hasErrorBanner = await page.evaluate(() => {
    const body = document.body?.innerText || "";
    return /error|500|404|unhandled|exception/i.test(body.slice(0, 500));
  }).catch(() => false);

  const entry = {
    route,
    tag,
    status,
    httpStatus,
    errMessage,
    durationMs: Date.now() - start,
    screenshot: shot,
    title: pageTitle,
    finalUrl,
    hasErrorBanner,
  };

  report.routes.push(entry);
  const icon = status === "ok" && !hasErrorBanner ? "✅" : "❌";
  console.log(`  ${icon} ${tag.padEnd(8)} ${route.padEnd(20)} ${entry.durationMs}ms ${hasErrorBanner ? "(ERROR CONTENT)" : ""}`);
  return entry;
}

// Login flow - uses API token injection for reliable Puppeteer auth
async function login(page) {
  console.log("\n🔐 Logging in...");

  // First, get a real token via the API
  const token = await getAuthToken();
  if (!token) {
    console.log("  ❌ Could not get auth token from API");
    report.login = { success: false, method: "api_token", error: "no token" };
    return false;
  }

  // Fetch user info from the login response
  let user = null;
  try {
    const resp = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: LOGIN_EMAIL, password: LOGIN_PASSWORD }),
    });
    const data = await resp.json();
    user = data?.data?.user || null;
  } catch {}

  // Navigate to login page first (need a page context to set localStorage)
  await page.goto(`${WEB_URL}/login`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await waitForSettled(page);
  await screenshot(page, "login-page");

  // Inject token and user into localStorage (matching auth-store format)
  await page.evaluate((t, u) => {
    localStorage.setItem("hostiq_token", t);
    if (u) {
      localStorage.setItem("hostiq_user", JSON.stringify(u));
    }
  }, token, user);

  // Navigate to dashboard - should be authenticated now
  await page.goto(`${WEB_URL}/dashboard`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await waitForSettled(page);

  const currentUrl = page.url();
  const success = currentUrl.includes("/dashboard");
  await screenshot(page, "login-result");

  console.log(`  ${success ? "✅" : "❌"} Login via token injection ${success ? "succeeded" : "failed"} → ${currentUrl}`);
  report.login = { success, finalUrl: currentUrl, method: "api_token" };
  return success;
}

// Click all visible, non-destructive buttons on a page
async function interactWithButtons(page, route) {
  const buttons = await page.$$(
    "button:not([disabled]), a[role='button'], [type='button']:not([disabled])"
  );

  let clicked = 0;
  let errors = 0;

  for (const b of buttons) {
    const info = await b.evaluate((el) => {
      const text = (el.textContent || "").trim().slice(0, 80).replace(/\s+/g, " ");
      const rect = el.getBoundingClientRect();
      return { text, visible: rect.width > 0 && rect.height > 0, tag: el.tagName };
    });

    if (!info.text || !info.visible) continue;
    // Skip destructive / nav-away buttons
    if (/sign out|logout|delete|remove|cancel/i.test(info.text)) continue;
    // Skip submit buttons (don't send forms)
    if (/submit/i.test(info.text)) continue;

    try {
      await b.evaluate((el) => el.scrollIntoView({ block: "center" }));
      await sleep(100);
      await b.click({ delay: 20 });
      clicked++;
      await sleep(400);
    } catch (err) {
      errors++;
      report.buttonInteractions.push({
        route,
        text: info.text,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (clicked > 0) {
    await screenshot(page, `buttons-after-${slug(route)}`);
  }

  console.log(`    🖱️  Clicked ${clicked} buttons (${errors} errors)`);
  return { clicked, errors };
}

// Smoke-test critical API endpoints
async function apiSmokeTests(authToken) {
  console.log("\n🔌 API Smoke Tests...");

  const endpoints = [
    { method: "GET", path: "/health" },
    { method: "GET", path: "/api/dashboard/stats", auth: true },
    { method: "GET", path: "/api/properties", auth: true },
    { method: "GET", path: "/api/reservations", auth: true },
    { method: "GET", path: "/api/messages", auth: true },
    { method: "GET", path: "/api/messages/threads", auth: true },
    { method: "GET", path: "/api/issues", auth: true },
    { method: "GET", path: "/api/cleaning", auth: true },
    { method: "GET", path: "/api/cleaning/schedule", auth: true },
    { method: "GET", path: "/api/notifications", auth: true },
    { method: "GET", path: "/api/reports/owner-summary", auth: true },
    { method: "GET", path: "/api/reports/performance", auth: true },
    { method: "GET", path: "/api/reports/cleaning", auth: true },
    { method: "GET", path: "/api/admin/users", auth: true },
    { method: "GET", path: "/api/admin/integrations/health", auth: true },
    { method: "GET", path: "/api/admin/audit", auth: true },
  ];

  for (const ep of endpoints) {
    const url = `${API_URL}${ep.path}`;
    const headers = { "Content-Type": "application/json" };
    if (ep.auth && authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    const start = Date.now();
    try {
      const resp = await fetch(url, { method: ep.method, headers });
      const status = resp.status;
      let body = null;
      try {
        body = await resp.json();
      } catch {
        body = await resp.text().catch(() => null);
      }

      const ok = status >= 200 && status < 400;
      const entry = {
        method: ep.method,
        path: ep.path,
        status,
        ok,
        durationMs: Date.now() - start,
        hasData: body && typeof body === "object" && ("data" in body || "success" in body),
      };
      report.apiSmoke.push(entry);
      console.log(`  ${ok ? "✅" : "❌"} ${ep.method} ${ep.path} → ${status} (${entry.durationMs}ms)`);
    } catch (err) {
      report.apiSmoke.push({
        method: ep.method,
        path: ep.path,
        status: "FETCH_ERROR",
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - start,
      });
      console.log(`  ❌ ${ep.method} ${ep.path} → FETCH ERROR`);
    }
  }
}

// Get auth token via login API
async function getAuthToken() {
  try {
    const resp = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: LOGIN_EMAIL, password: LOGIN_PASSWORD }),
    });
    const data = await resp.json();
    return data?.data?.token || data?.token || null;
  } catch {
    return null;
  }
}

// ============================================
// MAIN
// ============================================
async function run() {
  await ensureDirs();
  console.log("🚀 HostIQ Local Audit - Full Puppeteer Test");
  console.log(`   Web: ${WEB_URL}  |  API: ${API_URL}\n`);

  // Phase 0: Quick health check
  console.log("⚡ Health check...");
  try {
    const hRes = await fetch(`${API_URL}/health`);
    const hData = await hRes.json();
    console.log(`  ✅ API is up: ${JSON.stringify(hData)}`);
  } catch (err) {
    console.error("  ❌ API is DOWN. Aborting.");
    process.exit(1);
  }
  try {
    const wRes = await fetch(`${WEB_URL}`);
    console.log(`  ✅ Web is up: HTTP ${wRes.status}`);
  } catch (err) {
    console.error("  ❌ Web is DOWN. Aborting.");
    process.exit(1);
  }

  // Phase 1: Get auth token for API tests
  console.log("\n🔑 Acquiring auth token...");
  const token = await getAuthToken();
  console.log(`  ${token ? "✅ Got token" : "❌ No token (API tests will be limited)"}`);

  // Phase 2: API Smoke Tests
  await apiSmokeTests(token);

  // Phase 3: Browser tests
  console.log("\n🌐 Launching browser...");
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1440, height: 900 },
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  // Capture JS errors
  page.on("pageerror", (err) => {
    report.jsErrors.push({
      url: page.url(),
      message: err.message,
      stack: (err.stack ?? "").slice(0, 500),
    });
  });

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      report.consoleErrors.push({
        url: page.url(),
        text: msg.text().slice(0, 500),
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

  // Phase 3a: Public routes
  console.log("\n📄 Public Routes:");
  for (const route of publicRoutes) {
    await navigateAndCapture(page, route, "public");
  }

  // Phase 3b: Login
  const didLogin = await login(page);

  if (!didLogin) {
    console.log("  ⚠️  Login failed - portal routes will be tested unauthenticated");
  }

  // Phase 3c: Portal routes
  console.log("\n🏠 Portal Routes:");
  for (const route of portalRoutes) {
    const entry = await navigateAndCapture(page, route, "portal");
    if (entry.status === "ok") {
      await interactWithButtons(page, route);
    }
  }

  // Phase 3d: Check for the seed endpoint (should 404 now)
  console.log("\n🔒 Security check: /seed endpoint...");
  try {
    const seedResp = await fetch(`${API_URL}/seed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: "test" }),
    });
    const seedGone = seedResp.status === 404;
    report.securityChecks = { seedEndpointRemoved: seedGone, seedStatus: seedResp.status };
    console.log(`  ${seedGone ? "✅" : "❌"} POST /seed → ${seedResp.status} (want 404)`);
  } catch (err) {
    report.securityChecks = { seedEndpointRemoved: "error", error: err.message };
    console.log(`  ❌ Could not reach /seed endpoint`);
  }

  await browser.close();

  // Build summary
  const totalRoutes = report.routes.filter((r) => r.tag !== "button-scan").length;
  const okRoutes = report.routes.filter((r) => r.status === "ok" && !r.hasErrorBanner && r.tag !== "button-scan").length;
  const apiTotal = report.apiSmoke.length;
  const apiOk = report.apiSmoke.filter((e) => e.ok).length;

  report.summary = {
    totalRoutes,
    okRoutes,
    failedRoutes: totalRoutes - okRoutes,
    jsErrors: report.jsErrors.length,
    consoleErrors: report.consoleErrors.length,
    networkFailures: report.networkFailures.length,
    buttonErrors: report.buttonInteractions.length,
    apiTotal,
    apiOk,
    apiFailed: apiTotal - apiOk,
    loginSuccess: didLogin,
  };

  report.finishedAt = new Date().toISOString();
  await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("  AUDIT SUMMARY");
  console.log("=".repeat(60));
  console.log(`  Pages tested:     ${okRoutes}/${totalRoutes} OK`);
  console.log(`  API endpoints:    ${apiOk}/${apiTotal} OK`);
  console.log(`  JS errors:        ${report.jsErrors.length}`);
  console.log(`  Console errors:   ${report.consoleErrors.length}`);
  console.log(`  Network failures: ${report.networkFailures.length}`);
  console.log(`  Button errors:    ${report.buttonInteractions.length}`);
  console.log(`  Login:            ${didLogin ? "✅" : "❌"}`);
  console.log("=".repeat(60));
  console.log(`  Report: ${REPORT_PATH}`);
  console.log(`  Screenshots: ${SHOTS_DIR}/`);
  console.log("=".repeat(60));

  if (report.jsErrors.length > 0) {
    console.log("\n⚠️  JS Errors:");
    for (const e of report.jsErrors) {
      console.log(`  • ${e.url}: ${e.message.slice(0, 120)}`);
    }
  }

  const failedApi = report.apiSmoke.filter((e) => !e.ok);
  if (failedApi.length > 0) {
    console.log("\n⚠️  Failed API Endpoints:");
    for (const e of failedApi) {
      console.log(`  • ${e.method} ${e.path} → ${e.status}`);
    }
  }
}

run().catch(async (err) => {
  report.fatalError = err instanceof Error ? err.message : String(err);
  report.finishedAt = new Date().toISOString();
  await ensureDirs();
  await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
  console.error("\n💥 Fatal error:", err);
  process.exit(1);
});
