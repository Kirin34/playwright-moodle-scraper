import "dotenv/config";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import { fail, log } from "./lib/logger.js";
import { lessonInputDir, lessonMarkdownPath, OUTPUT_DIR } from "./lib/paths.js";

const [rawLessonName] = process.argv.slice(2);
const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
const batchSize = Number.parseInt(process.env.NOTES_BATCH_SIZE ?? "8", 10);

if (!rawLessonName) {
  fail('uso: node genera-appunti.js "Lezione_22"');
  process.exit(1);
}

if (!process.env.OPENAI_API_KEY) {
  fail("OPENAI_API_KEY mancante in .env o nell'ambiente.");
  process.exit(1);
}

const inputDir = lessonInputDir(rawLessonName);
const outputPath = lessonMarkdownPath(rawLessonName);
await mkdir(OUTPUT_DIR, { recursive: true });

const images = (await readdir(inputDir))
  .filter((name) => /\.(png|jpe?g)$/i.test(name))
  .sort((a, b) => a.localeCompare(b, "it", { numeric: true }))
  .map((name) => path.join(inputDir, name));

if (images.length === 0) {
  fail(`nessuna immagine trovata in ${inputDir}`);
  process.exit(1);
}

const client = new OpenAI();
const partials = [];

for (let start = 0; start < images.length; start += batchSize) {
  const batch = images.slice(start, start + batchSize);
  const batchNumber = Math.floor(start / batchSize) + 1;
  log(`genero appunti batch ${batchNumber} (${batch.length} immagini)`);
  partials.push(await describeBatch(client, model, rawLessonName, batch, start + 1));
}

log("fondo i batch in un unico Markdown Obsidian");
const finalMarkdown = await mergeNotes(client, model, rawLessonName, partials);
await writeFile(outputPath, finalMarkdown.trimEnd() + "\n", "utf8");
log(`Markdown creato: ${outputPath}`);

async function describeBatch(client, model, lessonName, batch, firstIndex) {
  const content = [
    {
      type: "text",
      text: [
        `Lezione: ${lessonName}`,
        `Questo batch inizia dalla slide ${String(firstIndex).padStart(3, "0")}.`,
        "Scrivi appunti in italiano, sintetici e compatibili con Obsidian.",
        "Usa formule inline con $...$ e formule importanti con $$...$$.",
        "Non inventare contenuti non visibili.",
        "Quando una formula o un testo non è leggibile, scrivi: non leggibile dalle slide.",
        "Aggiungi una sezione Idee chiave."
      ].join("\n")
    }
  ];

  for (const imagePath of batch) {
    const image = await readFile(imagePath);
    content.push({
      type: "image_url",
      image_url: { url: `data:image/png;base64,${image.toString("base64")}` }
    });
  }

  const response = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content }],
    temperature: 0.2
  });

  return response.choices[0]?.message?.content ?? "";
}

async function mergeNotes(client, model, lessonName, partials) {
  const response = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "user",
        content: [
          `Lezione: ${lessonName}`,
          "Unisci questi appunti parziali in un unico file Markdown per Obsidian.",
          "Mantieni italiano sintetico, formule con $...$ o $$...$$, e non aggiungere contenuti non presenti nei parziali.",
          "Includi una sezione finale ## Idee chiave.",
          "",
          partials.map((part, index) => `## Batch ${index + 1}\n${part}`).join("\n\n")
        ].join("\n")
      }
    ],
    temperature: 0.2
  });

  return response.choices[0]?.message?.content ?? "";
}
