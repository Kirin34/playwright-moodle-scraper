import { chromium } from "playwright";
import { SESSION_DIR } from "./paths.js";
import { log } from "./logger.js";

const NEXT_SELECTORS = [
  "text=/^\\s*SUCC\\s*$/i",
  "text=/^\\s*AVANTI\\s*$/i",
  "text=/^\\s*NEXT\\s*$/i",
  "button:has-text('SUCC')",
  "a:has-text('SUCC')",
  "[role='button']:has-text('SUCC')",
  "input[value*='SUCC' i]",
  "[aria-label*='successiva' i]",
  "[aria-label*='next' i]",
  ".next",
  "#next",
  "[data-acc-text*='next' i]"
];

export async function openPersistentContext(options = {}) {
  const headless = process.env.ECAMPUS_HEADLESS === "true";
  return chromium.launchPersistentContext(SESSION_DIR, {
    headless,
    viewport: { width: 1366, height: 768 },
    acceptDownloads: false,
    ...options
  });
}

export async function waitForPageReady(page) {
  await page.waitForLoadState("domcontentloaded").catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800);
}

export async function findNextButton(page) {
  return findVisibleLocator(page, NEXT_SELECTORS);
}

export async function findVisibleLocator(page, selectors) {
  for (const frame of page.frames()) {
    for (const selector of selectors) {
      const locator = frame.locator(selector).first();
      if (await isUsable(locator)) return locator;
    }
  }
  return null;
}

export async function clickSafely(locator) {
  try {
    await locator.scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => {});
    await locator.click({ timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

export async function captureSlideScreenshot(page) {
  const target = await findSlideTarget(page);
  if (target?.locator) {
    try {
      return await target.locator.screenshot({ animations: "disabled", type: "png" });
    } catch (error) {
      log("screenshot area slide fallito, uso fallback viewport", shortError(error));
    }
  }

  return page.screenshot({ animations: "disabled", type: "png" });
}

async function findSlideTarget(page) {
  const frames = page.frames();
  const scored = [];

  for (const frame of frames) {
    const candidate = await frame.evaluate(() => {
      const preferredSelectors = [
        "#slide",
        ".slide",
        "#player",
        ".player",
        "#preso",
        ".presentation",
        ".slide-container",
        ".storyline-slide",
        "[class*='slide']",
        "[id*='slide']",
        "canvas",
        "svg",
        "video",
        "img"
      ];

      const seen = new Set();
      const elements = [];
      for (const selector of preferredSelectors) {
        document.querySelectorAll(selector).forEach((element) => {
          if (!seen.has(element)) {
            seen.add(element);
            elements.push(element);
          }
        });
      }

      const viewportArea = Math.max(1, window.innerWidth * window.innerHeight);
      let best = null;

      for (const element of elements) {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        const width = Math.max(0, Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0));
        const height = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
        const area = width * height;
        if (area < 40000 || style.visibility === "hidden" || style.display === "none" || Number(style.opacity) === 0) continue;

        const name = `${element.id} ${element.className} ${element.tagName}`.toLowerCase();
        const aspect = width / Math.max(1, height);
        const areaRatio = area / viewportArea;
        let score = area;
        if (/(slide|player|preso|presentation|story|stage)/.test(name)) score *= 2.2;
        if (aspect >= 1.1 && aspect <= 1.9) score *= 1.5;
        if (areaRatio > 0.95) score *= 0.3;

        if (!best || score > best.score) best = { element, score, area, width, height };
      }

      if (!best) return null;
      const marker = `capture-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      best.element.setAttribute("data-capture-target", marker);
      return { marker, score: best.score, area: best.area, width: best.width, height: best.height };
    }).catch(() => null);

    if (candidate) scored.push({ frame, ...candidate });
  }

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (!best) return null;
  return { locator: best.frame.locator(`[data-capture-target="${best.marker}"]`).first(), meta: best };
}

async function isUsable(locator) {
  try {
    return (await locator.count()) > 0 && await locator.isVisible({ timeout: 500 }) && await locator.isEnabled({ timeout: 500 });
  } catch {
    return false;
  }
}

function shortError(error) {
  return String(error?.message ?? error).split("\n")[0];
}
