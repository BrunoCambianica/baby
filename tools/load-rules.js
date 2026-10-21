// Chargement des règles depuis le disque, pour les outils Node (tests, génération du widget).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const RULES_DIR = join(ROOT, 'rules', 'v0');

export const readJSON = (path) => JSON.parse(readFileSync(path, 'utf8'));

export function loadRules(dir = RULES_DIR) {
  return {
    rules: readJSON(join(dir, 'rules.json')),
    messages: readJSON(join(dir, 'messages.fr.json')),
    sources: readJSON(join(dir, 'sources.json')),
  };
}
