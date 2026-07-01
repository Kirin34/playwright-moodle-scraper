\# Progetto ecampus-appunti



Obiettivo: automatizzare localmente la cattura di lezioni SCORM eCampus/Moodle e generare appunti Markdown per Obsidian.



\## Regole

\- Non inserire credenziali nel codice.

\- Non stampare cookie, token, sessioni o valori .env.

\- Non caricare file HAR, cookie, sessioni o chiavi API verso servizi esterni.

\- Non bypassare login, DRM o permessi.

\- Usare solo contenuti accessibili all’utente tramite il proprio account.

\- Evitare scraping aggressivo.

\- Preferire Playwright con sessione persistente e click reali.



\## Stack

\- Node.js ESM.

\- Playwright.

\- sharp per confronto visivo.

\- pptxgenjs per creare PPTX dalle immagini.

\- OpenAI API per generare Markdown.



\## Output attesi

\- input/Lezione\_XX/001.png

\- ppt/Lezione\_XX.pptx

\- output/Lezione\_XX.md



\## Stile appunti

\- Italiano.

\- Sintetico.

\- Compatibile Obsidian.

\- Formule inline con $...$.

\- Formule importanti con $$...$$.

\- Non inventare contenuti non visibili.

\- Segnalare “non leggibile dalle slide” quando serve.

