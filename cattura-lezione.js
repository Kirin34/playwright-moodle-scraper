import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { log, fail } from "./lib/logger.js";
import { lessonInputDir } from "./lib/paths.js";
import { captureSlideScreenshot, clickSafely, findNextButton, openPersistentContext, waitForPageReady } from "./lib/playwright-utils.js";
import { normalizedDiff } from "./lib/image-diff.js";

const [url, rawLessonName, rawMaxClicks] = process.argv.slice(2);
const maxClicks = Number.parseInt(rawMaxClicks ?? "120", 10);
const changeThreshold = Number(process.env.CAPTURE_CHANGE_THRESHOLD ?? 0.001);
const duplicateThreshold = Number(process.env.CAPTURE_DUPLICATE_THRESHOLD ?? 0.0007);
const stableThreshold = Number(process.env.CAPTURE_STABLE_THRESHOLD ?? 0.0008);
const noChangeLimit = Number.parseInt(process.env.CAPTURE_NO_CHANGE_LIMIT ?? "3", 10);

if (!url || !rawLessonName || !Number.isFinite(maxClicks)) {
  fail('uso: node cattura-lezione.js "URL_LEZIONE" "Lezione_22" 120');
  process.exit(1);
}

const outputDir = lessonInputDir(rawLessonName);
await mkdir(outputDir, { recursive: true });

const context = await openPersistentContext();
const page = context.pages()[0] || await context.newPage();

try {
  log("apro la lezione");
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitForPageReady(page);

  let savedCount = 0;
  let noChangeClicks = 0;
  let lastSaved = null;
  let current = await captureSlideScreenshot(page);

  ({ savedCount, lastSaved } = await saveIfUseful(current, outputDir, savedCount, lastSaved));

  for (let clickIndex = 1; clickIndex <= maxClicks; clickIndex += 1) {
    const next = await findNextButton(page);
    if (!next) {
      log("SUCC non trovato: fine cattura");
      break;
    }

    log(`click SUCC ${clickIndex}/${maxClicks}`);
    const clicked = await clickSafely(next);
    if (!clicked) {
      log("click SUCC non riuscito: provo a fermarmi senza crash");
      break;
    }

    const changed = await waitForVisualChange(page, current, changeThreshold);
    if (!changed) {
      noChangeClicks += 1;
      log(`nessun cambio reale dopo il click (${noChangeClicks}/${noChangeLimit})`);
      if (noChangeClicks >= noChangeLimit) {
        log("troppi click senza cambiamenti: fine cattura");
        break;
      }
      continue;
    }

    noChangeClicks = 0;
    log("cambio rilevato");
    current = await waitForStableSlide(page, stableThreshold);
    log("schermata stabile");

    const result = await saveIfUseful(current, outputDir, savedCount, lastSaved, duplicateThreshold);
    savedCount = result.savedCount;
    lastSaved = result.lastSaved;
  }

  log(`cattura completata: ${savedCount} immagini in ${outputDir}`);
} finally {
  await context.close();
}

async function waitForVisualChange(page, before, threshold) {
  const started = Date.now();
  while (Date.now() - started < 10000) {
    await page.waitForTimeout(350);
    const after = await captureSlideScreenshot(page);
    const diff = await normalizedDiff(before, after);
    if (diff >= threshold) return after;
  }
  return null;
}

async function waitForStableSlide(page, threshold) {
  let previous = await captureSlideScreenshot(page);
  let stableHits = 0;
  const started = Date.now();

  while (Date.now() - started < 12000) {
    await page.waitForTimeout(450);
    const next = await captureSlideScreenshot(page);
    const diff = await normalizedDiff(previous, next);
    if (diff <= threshold) {
      stableHits += 1;
      if (stableHits >= 2) return next;
    } else {
      stableHits = 0;
    }
    previous = next;
  }

  return previous;
}

async function saveIfUseful(buffer, outputDir, savedCount, lastSaved, threshold = duplicateThreshold) {
  if (lastSaved) {
    const diff = await normalizedDiff(lastSaved, buffer);
    if (diff < threshold) {
      log(`duplicato evitato (diff ${diff.toFixed(4)})`);
      return { savedCount, lastSaved };
    }
  }

  const nextCount = savedCount + 1;
  const fileName = `${String(nextCount).padStart(3, "0")}.png`;
  const filePath = path.join(outputDir, fileName);
  await writeFile(filePath, buffer);
  log(`salvata slide ${String(nextCount).padStart(3, "0")}`);
  return { savedCount: nextCount, lastSaved: buffer };
}
