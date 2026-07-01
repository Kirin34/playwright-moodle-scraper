import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const SESSION_DIR = path.join(ROOT_DIR, "sessione-ecampus");
export const INPUT_DIR = path.join(ROOT_DIR, "input");
export const PPT_DIR = path.join(ROOT_DIR, "ppt");
export const OUTPUT_DIR = path.join(ROOT_DIR, "output");

export function lessonInputDir(lessonName) {
  return path.join(INPUT_DIR, sanitizeName(lessonName));
}

export function lessonPptPath(lessonName) {
  return path.join(PPT_DIR, `${sanitizeName(lessonName)}.pptx`);
}

export function lessonMarkdownPath(lessonName) {
  return path.join(OUTPUT_DIR, `${sanitizeName(lessonName)}.md`);
}

export function sanitizeName(value) {
  const safe = String(value ?? "").trim().replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
  if (!safe) throw new Error("Nome lezione mancante o non valido.");
  return safe;
}
