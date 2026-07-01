export function log(message, details = undefined) {
  const stamp = new Date().toLocaleTimeString("it-IT", { hour12: false });
  if (details === undefined) {
    console.log(`[${stamp}] ${message}`);
    return;
  }
  console.log(`[${stamp}] ${message}`, details);
}

export function fail(message) {
  console.error(`Errore: ${message}`);
  process.exitCode = 1;
}
