import { randomUUID } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";

function replaceOnce(source, oldText, newText, label) {
  const occurrences = source.split(oldText).length - 1;
  if (occurrences !== 1) {
    throw new Error(`cannot patch ${label}: expected one match, found ${occurrences}`);
  }
  return source.replace(oldText, newText);
}

export function patchSessionFormatSource(source) {
  if (source.includes('"thoughtSignature", "thought_signature"')) return source;
  const target = `function assertReleasedV0Keys(record, required, optional = [], label) {
\tconst allowed = new Set([...required, ...optional]);`;
  const replacement = `function assertReleasedV0Keys(record, required, optional = [], label) {
\tconst allowed = new Set([...required, ...optional, "thoughtSignature", "thought_signature"]);`;
  if (source.includes(target)) {
    return replaceOnce(source, target, replacement, "assertReleasedV0Keys allowed members");
  }
  const targetCrlf = target.replace(/\n/g, "\r\n");
  const replacementCrlf = replacement.replace(/\n/g, "\r\n");
  if (source.includes(targetCrlf)) {
    return replaceOnce(source, targetCrlf, replacementCrlf, "assertReleasedV0Keys allowed members");
  }
  return replaceOnce(source, "const allowed = new Set([...required, ...optional]);", "const allowed = new Set([...required, ...optional, \"thoughtSignature\", \"thought_signature\"]);", "assertReleasedV0Keys allowed members");
}

async function patchFile(filePath) {
  if (!filePath) return;
  const source = await readFile(filePath, "utf8");
  const patched = patchSessionFormatSource(source);
  if (patched === source) return;
  const tempPath = `${filePath}.${randomUUID()}.tmp`;
  await writeFile(tempPath, patched, "utf8");
  await rename(tempPath, filePath);
  console.log(`Patched session format: ${filePath}`);
}

const files = process.argv.slice(2);
for (const file of files) {
  await patchFile(file);
}
