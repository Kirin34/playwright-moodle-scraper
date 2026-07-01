import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import pptxgen from "pptxgenjs";
import { fail, log } from "./lib/logger.js";
import { lessonInputDir, lessonPptPath, PPT_DIR } from "./lib/paths.js";

const [rawLessonName] = process.argv.slice(2);
if (!rawLessonName) {
  fail('uso: node crea-ppt-da-slide.js "Lezione_22"');
  process.exit(1);
}

const inputDir = lessonInputDir(rawLessonName);
const pptPath = lessonPptPath(rawLessonName);
await mkdir(PPT_DIR, { recursive: true });

const images = (await readdir(inputDir))
  .filter((name) => /\.(png|jpe?g)$/i.test(name))
  .sort((a, b) => a.localeCompare(b, "it", { numeric: true }))
  .map((name) => path.join(inputDir, name));

if (images.length === 0) {
  fail(`nessuna immagine trovata in ${inputDir}`);
  process.exit(1);
}

const pptx = new pptxgen();
pptx.layout = "LAYOUT_4x3";
pptx.author = "ecampus-appunti";
pptx.subject = rawLessonName;
pptx.title = rawLessonName;

for (const imagePath of images) {
  const slide = pptx.addSlide();
  slide.background = { color: "FFFFFF" };
  slide.addImage({ path: imagePath, x: 0, y: 0, w: 10, h: 7.5 });
}

await pptx.writeFile({ fileName: pptPath });
log(`PPT creato: ${pptPath}`);
