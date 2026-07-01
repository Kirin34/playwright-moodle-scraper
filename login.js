import "dotenv/config";
import { mkdir } from "node:fs/promises";
import { SESSION_DIR } from "./lib/paths.js";
import { log } from "./lib/logger.js";
import { openPersistentContext } from "./lib/playwright-utils.js";

const loginUrl = process.argv[2] || process.env.ECAMPUS_LOGIN_URL || "https://moodle06.uniecampus.it/";

await mkdir(SESSION_DIR, { recursive: true });

log("apro Chromium con sessione persistente locale");
const context = await openPersistentContext();
const page = context.pages()[0] || await context.newPage();

await page.goto(loginUrl, { waitUntil: "domcontentloaded" });
log("effettua il login manualmente nella finestra del browser");
log("quando hai finito, torna qui e premi INVIO: la sessione resterà in ./sessione-ecampus");

process.stdin.setEncoding("utf8");
process.stdin.resume();
process.stdin.once("data", async () => {
  log("chiudo il browser e salvo la sessione persistente");
  await context.close();
  process.exit(0);
});
