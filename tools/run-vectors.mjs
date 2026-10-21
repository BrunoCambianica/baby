// Exécute les vecteurs de test des règles v0.
// Usage : node tools/run-vectors.mjs            (tous les vecteurs)
//         node tools/run-vectors.mjs --show ID  (affiche le résultat complet d'un vecteur)
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluate, lint, loadRules } from './engine.mjs';

const rulesDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'rules', 'v0');
const bundle = loadRules(rulesDir);
const showId = process.argv[2] === '--show' ? process.argv[3] : null;

const { errors, toVerify } = lint(bundle);
if (errors.length) {
  console.error('Charte non respectée :');
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
if (!showId) {
  console.log(`Charte : OK. Sources à relire avant publication : ${toVerify.length}`);
  for (const s of toVerify) console.log(`  · ${s}`);
  console.log('');
}

const { defaults, vectors } = JSON.parse(readFileSync(join(rulesDir, 'test-vectors.json'), 'utf8'));

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
function merge(base, over) {
  if (over === undefined) return base;
  if (!isObject(base) || !isObject(over)) return over;
  const out = { ...base };
  for (const [k, v] of Object.entries(over)) out[k] = merge(base[k], v);
  return out;
}

const toMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const fmtMin = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

// Les vecteurs décrivent la journée en abrégé : une base et des surcharges par heure ("13:00") ou plage ("13:00-16:00").
function expandHourly(spec, date) {
  if (Array.isArray(spec)) return spec;
  const hours = [];
  for (let m = toMin(spec.from); m <= toMin(spec.to); m += 60) {
    const hour = { ...spec.base };
    for (const [range, values] of Object.entries(spec.overrides ?? {})) {
      const [a, b] = range.split('-');
      if (b ? m >= toMin(a) && m < toMin(b) : m === toMin(a)) Object.assign(hour, values);
    }
    hours.push({ time: `${date}T${fmtMin(m)}`, temp_c: hour.feels_c, ...hour });
  }
  return hours;
}

function get(value, segs) {
  if (!segs.length) return value;
  const [seg, ...rest] = segs;
  if (seg === '*') return (value ?? []).map((item) => get(item, rest));
  return value == null ? undefined : get(value[seg], rest);
}

function matches(actual, expected) {
  if (expected === null) return actual === null;
  if (Array.isArray(expected)) {
    return Array.isArray(actual) && actual.length === expected.length && expected.every((e, i) => matches(actual[i], e));
  }
  if (isObject(expected)) return isObject(actual) && Object.entries(expected).every(([k, v]) => matches(actual[k], v));
  return actual === expected;
}

const SUFFIX = /\.(include|exclude|contains|length)$/;
function check(result, key, expected) {
  const suffix = key.match(SUFFIX)?.[1];
  const actual = get(result, key.replace(SUFFIX, '').split('.'));
  switch (suffix) {
    case 'include': return Array.isArray(actual) && expected.every((e) => actual.includes(e));
    case 'exclude': return Array.isArray(actual) && expected.every((e) => !actual.includes(e));
    case 'contains': return typeof actual === 'string' && actual.includes(expected);
    case 'length': return actual?.length === expected;
    default: return matches(actual, expected);
  }
}

function prepare(vector) {
  const input = merge(defaults, vector.input);
  return { ...input, forecast: { ...input.forecast, hourly: expandHourly(input.forecast.hourly, input.date) } };
}

if (showId) {
  const vector = vectors.find((v) => v.id === showId);
  if (!vector) {
    console.error(`Vecteur inconnu : ${showId}`);
    process.exit(1);
  }
  console.log(JSON.stringify(evaluate(prepare(vector), bundle), null, 2));
  process.exit(0);
}

let failed = 0;
for (const vector of vectors) {
  const result = evaluate(prepare(vector), bundle);
  const misses = Object.entries(vector.expect).filter(([key, expected]) => !check(result, key, expected));
  if (!misses.length) {
    console.log(`✓ ${vector.id}`);
    continue;
  }
  failed++;
  console.log(`✗ ${vector.id} : ${vector.description}`);
  for (const [key, expected] of misses) {
    const actual = get(result, key.replace(SUFFIX, '').split('.'));
    console.log(`    ${key} : attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)}`);
  }
}
console.log(`\n${vectors.length - failed}/${vectors.length} vecteurs OK`);
process.exit(failed ? 1 : 0);
