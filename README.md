# Playwright Moodle SCORM Scraper

Tool locale Node.js per catturare lezioni SCORM eCampus/Moodle come immagini ordinate, generare un PPTX dalle slide e creare appunti Markdown compatibili con Obsidian.

Il progetto e pensato per lavorare solo su contenuti che l'utente puo gia vedere nel browser con il proprio account. Non bypassa login, permessi o DRM.

## Funzionalita

- Login manuale con sessione Chromium persistente.
- Cattura della sola area slide, anche quando la lezione e dentro iframe/frame.
- Navigazione con click reali sul pulsante `SUCC`.
- Rilevamento dei cambiamenti visivi con `sharp`.
- Attesa della stabilizzazione dell'immagine prima del salvataggio.
- Deduplica di schermate quasi identiche.
- Creazione PPTX 4:3 con una immagine per slide.
- Generazione appunti Markdown in italiano tramite OpenAI API, con batching automatico.

## Requisiti

- Windows 11 o altro sistema con Node.js.
- Node.js 18+ consigliato.
- Account Moodle/eCampus con accesso legittimo alle lezioni.
- Chiave API OpenAI solo per `genera-appunti.js`.

## Installazione

```powershell
npm install
npx playwright install chromium
```

Se usi `pnpm`:

```powershell
pnpm install
pnpm exec playwright install chromium
```

## Configurazione

Copia `.env.example` in `.env` e compila solo quello che ti serve:

```powershell
copy .env.example .env
```

Variabili principali:

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
ECAMPUS_LOGIN_URL=https://moodle06.uniecampus.it/
ECAMPUS_HEADLESS=false
CAPTURE_CHANGE_THRESHOLD=0.001
CAPTURE_DUPLICATE_THRESHOLD=0.0007
CAPTURE_STABLE_THRESHOLD=0.0008
CAPTURE_NO_CHANGE_LIMIT=3
NOTES_BATCH_SIZE=8
```

Non committare mai `.env`, sessioni browser, cookie, HAR o output generati.

## Uso

### 1. Login manuale

```powershell
node login.js
```

Si apre Chromium. Effettua il login manualmente, poi torna sul terminale e premi `INVIO`.
La sessione viene salvata localmente in `sessione-ecampus/`.

### 2. Cattura lezione SCORM

```powershell
node cattura-lezione.js "URL_LEZIONE" "Lezione_22" 120
```

Esempio:

```powershell
node cattura-lezione.js "https://moodle06.uniecampus.it/mod/scorm/index2.php?..." "Lezione_22" 120
```

Output:

```text
input/Lezione_22/001.png
input/Lezione_22/002.png
input/Lezione_22/003.png
```

Lo script salva lo stato iniziale, clicca `SUCC`, aspetta un cambiamento visivo reale, aspetta che la schermata diventi stabile e poi salva la nuova immagine.

### 3. Crea PPTX dalle immagini

```powershell
node crea-ppt-da-slide.js "Lezione_22"
```

Output:

```text
ppt/Lezione_22.pptx
```

Ogni immagine diventa una slide 4:3 a piena pagina.

### 4. Genera appunti Markdown

```powershell
node genera-appunti.js "Lezione_22"
```

Output:

```text
output/Lezione_22.md
```

Gli appunti sono in italiano, sintetici, compatibili con Obsidian e rispettano queste regole:

- formule inline con `$...$`;
- formule importanti con `$$...$$`;
- niente contenuti inventati;
- segnalazione di parti `non leggibile dalle slide`;
- sezione `Idee chiave`.

## Tuning cattura

Alcune lezioni SCORM hanno animazioni molto piccole o transizioni rumorose. Puoi regolare le soglie in `.env`:

- `CAPTURE_CHANGE_THRESHOLD`: quanto deve cambiare l'immagine dopo un click per considerare valido il nuovo stato.
- `CAPTURE_DUPLICATE_THRESHOLD`: quanto due immagini devono essere simili per evitare un duplicato.
- `CAPTURE_STABLE_THRESHOLD`: quanto devono essere simili due screenshot consecutivi per considerare la schermata stabile.
- `CAPTURE_NO_CHANGE_LIMIT`: quanti click senza cambiamento accettare prima di fermarsi.

Se mancano step intermedi, abbassa leggermente `CAPTURE_CHANGE_THRESHOLD`.
Se vengono salvati troppi duplicati, alza leggermente `CAPTURE_DUPLICATE_THRESHOLD`.

## Sicurezza e privacy

Questo progetto:

- non contiene credenziali hardcoded;
- non stampa cookie, token, sessioni o valori `.env`;
- non carica file HAR, cookie, sessioni o chiavi API verso servizi esterni;
- usa Playwright con sessione persistente e click reali;
- lavora solo con contenuti accessibili all'utente tramite il proprio account.

Le cartelle generate e sensibili sono ignorate da Git:

```text
sessione-ecampus/
input/
output/
ppt/
node_modules/
.env
```

## Struttura

```text
login.js                 Login manuale e sessione persistente
cattura-lezione.js       Cattura stati visivi della lezione SCORM
crea-ppt-da-slide.js     Genera PPTX dalle immagini
genera-appunti.js        Genera appunti Markdown con OpenAI
lib/                     Utility condivise
fixtures/                Fixture locale per test di cattura
```

## Test locale rapido

La fixture `fixtures/test-scorm.html` permette di testare la cattura senza Moodle:

```powershell
$env:ECAMPUS_HEADLESS='true'
$fixture = (Resolve-Path fixtures\test-scorm.html).Path.Replace('\','/')
node cattura-lezione.js "file:///$fixture" Test_Cattura 5
```

Dovresti ottenere:

```text
input/Test_Cattura/001.png
input/Test_Cattura/002.png
input/Test_Cattura/003.png
```
