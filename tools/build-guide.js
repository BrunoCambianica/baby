// Guide public de Superbébé : pages HTML statiques, sans JavaScript, lisibles par les moteurs de recherche et les IA.
// Tout vient du moteur et des règles, comme dans l'app : les tenues sortent d'evaluate() sur une journée type
// (ressenti constant, sans pluie ni vent), les repères officiels de messages.fr.json, cités avec leurs sources.
// Un repère officiel n'est publié ici que si toutes ses sources sont marquées « lu » : plus strict que l'app.
// Produit index.html (l'accueil du site), guide/**/index.html et sitemap.xml ; guide/style.css est écrit à la main.
// Usage : node tools/build-guide.js (lancé par npm run build) ; tools/test-guide.js vérifie que tout est à jour.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { drawingSvg, ITEM_DRAWINGS } from '../engine/drawings.js';
import { addDays, evaluate, render } from '../engine/engine.js';
import { loadRules, readJSON, ROOT } from './load-rules.js';

export const SITE = readJSON(join(ROOT, 'package.json')).homepage;
const REPO = 'https://github.com/BrunoCambianica/baby';
// Jour fixe des journées types : le guide ne change pas d'un build à l'autre.
const DAY = '2026-11-05';
const HOURS = Array.from({ length: 15 }, (_, k) => `${String(7 + k).padStart(2, '0')}:00`);
// Âges des journées types : un bébé (6 mois), un nourrisson (2 mois, repères du portage), un enfant (2 ans et demi).
const BABY = 6;
const NEWBORN = 2;
const CHILD = 30;
const NBSP = ' ';
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

// ——— Petits outils de texte ———

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const listFr = (xs, last = 'et') => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} ${last} ${xs.at(-1)}`);
const num = (n) => (n < 0 ? `−${-n}` : String(n));
const deg = (n) => `${num(n)}${NBSP}°C`;
const range = (lo, hi) => Array.from({ length: hi - lo + 1 }, (_, k) => lo + k);

export function dateFr(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  if (!m) return String(y);
  if (!d) return `${MONTHS[m - 1]} ${y}`;
  return `${d === 1 ? '1er' : d} ${MONTHS[m - 1]} ${y}`;
}

// ——— Tranches : bornes entières, de la plus chaude à la plus froide (dehors), de la plus fraîche à la plus chaude (pièces) ———

const rep = (lo, hi) => (lo === null ? hi : hi === null ? lo : Math.round((lo + hi) / 2));

// Dehors : la tranche du ressenti, de min_feels_c (inclus) au seuil de la tranche plus chaude (exclu).
function outdoorBands(R) {
  const bands = R.outfit.bands;
  return bands.map((b, i) => {
    const lo = b.min_feels_c;
    const hi = i === 0 ? null : bands[i - 1].min_feels_c - 1;
    return { id: b.id, lo, hi, rep: rep(lo, hi) };
  });
}

// Maison et nuit : la température arrondie au degré, jusqu'à max_c inclus.
function roomBins(bins) {
  return bins.map((b, i) => {
    const lo = i === 0 ? null : bins[i - 1].max_c + 1;
    const hi = b.max_c;
    return { ...b, lo, hi, rep: rep(lo, hi) };
  });
}

const rangeLabel = ({ lo, hi }) => (lo === null ? `${deg(hi)} et moins` : hi === null ? `${deg(lo)} et plus` : `${num(lo)} à ${deg(hi)}`);
const rangeBetween = ({ lo, hi }) => (lo === null ? `à ${deg(hi)} ou moins` : hi === null ? `à ${deg(lo)} ou plus` : `entre ${num(lo)} et ${deg(hi)}`);
const rangeSlug = ({ lo, hi }) => (lo === null ? `${hi}-degres-et-moins` : hi === null ? `${lo}-degres-et-plus` : `${lo}-a-${hi}-degres`);

// « à 18, 19 ou 20 °C », « entre 21 et 24 °C », « à 15 °C ou moins ».
function roomRangeTitle({ lo, hi }) {
  if (lo === null || hi === null) return rangeBetween({ lo, hi });
  const xs = range(lo, hi);
  return xs.length <= 3 ? `à ${listFr(xs.map(num), 'ou')}${NBSP}°C` : rangeBetween({ lo, hi });
}

// « 3, 4, 5, 6, 7 et 8 °C ressentis », « 27, 28, 29 et 30 °C ressentis, et au-delà ».
function degreesList({ lo, hi }, unit = 'ressentis') {
  const xs = lo === null ? [hi, hi - 1, hi - 2, hi - 3] : hi === null ? [lo, lo + 1, lo + 2, lo + 3] : range(lo, hi);
  const tail = lo === null ? ', et en dessous' : hi === null ? ', et au-delà' : '';
  return `${listFr(xs.map(num))}${NBSP}°C${unit ? ` ${unit}` : ''}${tail}`;
}

// « quand le ressenti va de 3 à 8 °C », « … atteint 27 °C ou plus », « … descend à 2 °C ou moins ».
const feelsPhrase = ({ lo, hi }) => (lo === null ? `quand le ressenti descend à ${deg(hi)} ou moins`
  : hi === null ? `quand le ressenti atteint ${deg(lo)} ou plus` : `quand le ressenti va de ${num(lo)} à ${deg(hi)}`);

// ——— Journées types, passées au moteur ———

function dayInput({ feels = 21, uv = 1, months = BABY, transport = 'poussette', style = null, room = null, dayRoom = null, inventory = {} } = {}) {
  return {
    date: DAY,
    now: '07:30',
    profile: {
      birth: addDays(DAY, -Math.round(months * 30.4375)),
      transport,
      outing_window: { from: '09:00', to: '18:00' },
      outing_duration_h: 1,
      outfit_offset: 0,
      room_temp_c: room,
      day_room_temp_c: dayRoom,
      inventory,
      ...(style ? { day_style: style } : {}),
    },
    forecast: {
      daylight: { sunrise: '07:00', sunset: '21:00' },
      hourly: HOURS.map((h) => ({
        time: `${DAY}T${h}`, temp_c: feels, feels_c: feels, precip_prob: 0, precip_mm: 0, gust_kmh: 10, uv, weather_code: 1,
      })),
      daily: { tmax_c: feels },
    },
    alerts: { vigilance: [], air: null },
    outlook: [],
  };
}

function context(bundle, site) {
  const { rules: R, messages: M, sources: S } = bundle;
  const childVariant = (R.indoor.age_variants ?? []).find((v) => v.id === 'enfant');
  return {
    R,
    M,
    S,
    site,
    labels: M.labels,
    sourceById: new Map(S.sources.map((s) => [s.id, s])),
    run: (opts) => evaluate(dayInput(opts), bundle),
    updated: [R.updated, S.consulted].sort().at(-1),
    bands: outdoorBands(R),
    indoorBins: roomBins(R.indoor.bins),
    childIndoorBins: childVariant ? roomBins(childVariant.bins) : null,
    nightBins: roomBins(R.night.tog_hint.bins),
  };
}

// Le soleil compte à partir du ressenti où l'app met un chapeau dans le sac (journee.bag.sun_feels_c_at_least).
const sunny = (ctx, band) => band.lo !== null && band.lo >= ctx.R.journee.bag.sun_feels_c_at_least;
const bandRun = (ctx, band, opts = {}) => ctx.run({ feels: band.rep, uv: sunny(ctx, band) ? 6 : 1, ...opts });

// ——— Vêtements ———

const itemLabel = (ctx, item) => ctx.labels.items[item] ?? item;
const sentence = (ctx, items) => cap(listFr(items.map((i) => itemLabel(ctx, i))));

// La tenue en dessins, couche par couche (« Contre la peau », « Ensuite », « Par-dessus », « Et aussi »).
function outfitHtml(ctx, items, { extra = [] } = {}) {
  const groups = new Map(Object.keys(ctx.labels.layers).map((layer) => [layer, []]));
  for (const item of items) groups.get(ctx.labels.item_layers[item] ?? 'accessoire').push(item);
  const li = (drawing, label) => `<li>${drawingSvg(drawing, { size: 30 })}<span>${esc(cap(label))}</span></li>`;
  const blocks = [...groups].filter(([, list]) => list.length).map(([layer, list]) => `<div class="layer"><p class="layer-name">${esc(ctx.labels.layers[layer])}</p>
      <ul>${list.map((item) => li(ITEM_DRAWINGS[item], itemLabel(ctx, item))).join('')}</ul></div>`);
  if (extra.length) blocks.push(`<div class="layer"><p class="layer-name">${esc(ctx.labels.layers.dessus)}</p><ul>${extra.map((x) => li(x.drawing, x.label)).join('')}</ul></div>`);
  return `<div class="outfit">${blocks.join('\n      ')}</div>`;
}

// ——— Repères officiels et sources ———

// Un repère officiel n'est publié que si chacune de ses sources est relue (« lu ») et a un lien.
function publishable(ctx, id) {
  const msg = ctx.M.messages[id];
  if (!msg) throw new Error(`Guide : message inconnu ${id}`);
  if (msg.kind !== 'officiel') return true;
  const sources = (msg.sources ?? []).map((sid) => ctx.sourceById.get(sid));
  return sources.length > 0 && sources.every((s) => s?.verification === 'lu' && s.url);
}

function citeSource(ctx, sid) {
  const s = ctx.sourceById.get(sid);
  const label = `${s.short ?? s.publisher}, « ${s.title} »`;
  const when = s.published ? `, ${dateFr(s.published)}` : '';
  return `${s.url ? `<a href="${esc(s.url)}">${esc(label)}</a>` : esc(label)}${esc(when)}`;
}

// Quand un repère s'applique, dit avec les seuils des règles (rien n'est recopié à la main).
function relayWhen(ctx, id) {
  const { R } = ctx;
  const rt = R.relay_triggers;
  const bands = R.outfit.bands;
  const below = (ids) => Math.max(...ids.map((bid) => bands[bands.findIndex((b) => b.id === bid) - 1].min_feels_c));
  const carrier = R.outfit.transport.porte_bebe?.safety;
  const heat = `Par fortes chaleurs (dès ${deg(R.outing.heat.trigger_tmax_c_at_least)} ou en vigilance canicule)`;
  const map = {
    'relay.cold.layers': `Sous ${deg(below(rt.cold_layers_bands))} ressentis`,
    'relay.cold.avoid_outings': `À ${deg(R.outing.slot_exclusions.feels_c_at_most)} ressentis ou moins, ou en vigilance grand froid`,
    'relay.cold.stroller_rather_than_carrier': `En porte-bébé, à ${deg(rt.carrier_cold_feels_c_at_most)} ressentis ou moins`,
    'relay.car.coat': `En voiture, sous ${deg(below(rt.car_coat_bands))} ressentis`,
    'relay.sun.under_1y': 'Avant 1 an',
    'relay.sun.protect': `À partir de 1 an, dès que l'indice UV atteint ${rt.uv_at_least}`,
    'relay.heat.outing_hours': heat,
    'relay.heat.protect': heat,
    'relay.heat.vehicle': heat,
    'relay.heat.stroller_sun': heat,
    'relay.heat.shutters': heat,
    'relay.heat.info_line': heat,
    'relay.carrier.cover_face': 'En porte-bébé, avec une couverture ou un manteau de portage',
    'relay.carrier.airway_heat': carrier ? `En porte-bébé, avant ${carrier.heat_under_months} mois, par forte chaleur` : null,
    'relay.carrier.slippery': 'En porte-bébé, verglas ou neige annoncés',
  };
  return map[id] ?? null;
}

// Une citation et sa source ; publiée seulement si ses sources sont relues.
function relayQuote(ctx, id, list) {
  if (!publishable(ctx, id)) throw new Error(`Guide : ${id} cite une source qui n'est pas relue (« lu »)`);
  const msg = ctx.M.messages[id];
  const body = list && msg.list
    ? `<ul>${msg.list.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`
    : `<p>${esc(render(ctx.M, id, 'text', { uv: `${ctx.R.relay_triggers.uv_at_least} ou plus` }))}</p>`;
  return `${body}<p class="src">Source : ${msg.sources.map((sid) => citeSource(ctx, sid)).join(' ; ')}</p>`;
}

// Les repères, chacun avec quand il s'applique ; ceux qui ont la même condition vont ensemble, à la place du premier.
function relays(ctx, entries) {
  const items = entries.map((e) => {
    const { id, when, list = false } = typeof e === 'string' ? { id: e } : e;
    return { id, list, when: when === undefined ? relayWhen(ctx, id) : when };
  });
  const groups = [];
  for (const item of items) {
    const same = item.when && groups.find((g) => g.when === item.when);
    if (same) same.items.push(item);
    else groups.push({ when: item.when, items: [item] });
  }
  return `<ul class="relays">
        ${groups.map((g) => `<li class="relay">${g.when ? `<p class="when">${esc(g.when)}</p>` : ''}${g.items.map((it) => relayQuote(ctx, it.id, it.list)).join('')}</li>`).join('\n        ')}
      </ul>`;
}

// Suggestion pratique ou indication des fabricants, présentée comme telle (charte, points 3 et 4).
function note(ctx, id, params = {}) {
  const msg = ctx.M.messages[id];
  const tag = msg.kind === 'fabricant' ? 'Repère des fabricants' : 'Suggestion pratique';
  const src = msg.kind === 'fabricant' && msg.sources?.length
    ? ` <span class="src">(${msg.sources.map((sid) => citeSource(ctx, sid)).join(' ; ')})</span>` : '';
  return `<p class="note"><span class="tag">${tag}</span> ${esc(render(ctx.M, id, 'text', params))}${src}</p>`;
}

// Les repères officiels d'une tranche de ressenti : ceux que l'app afficherait, du bébé à l'enfant et selon le mode
// de sortie, avec ceux qui ne valent qu'au-delà d'un seuil (fortes chaleurs, grand froid). Ceux de tous d'abord,
// puis ceux d'un mode de sortie (porte-bébé, voiture).
const MODE_RELAYS = ['relay.cold.stroller_rather_than_carrier', 'relay.car.coat'];
const modeRelay = (id) => id.startsWith('relay.carrier.') || MODE_RELAYS.includes(id);
function bandRelayIds(ctx, band) {
  const { R } = ctx;
  const runs = [
    bandRun(ctx, band, { months: BABY }),
    bandRun(ctx, band, { months: CHILD }),
    bandRun(ctx, band, { months: BABY, transport: 'porte_bebe' }),
    bandRun(ctx, band, { months: BABY, transport: 'voiture' }),
  ];
  if (band.hi === null) {
    const hot = R.outing.heat.trigger_tmax_c_at_least;
    runs.push(ctx.run({ feels: hot, uv: 6, months: BABY }), ctx.run({ feels: hot, uv: 6, months: NEWBORN, transport: 'porte_bebe' }));
  }
  if (band.lo === null) runs.push(ctx.run({ feels: R.outing.slot_exclusions.feels_c_at_most - 1, months: BABY }));
  const ids = new Set(runs.flatMap((r) => [...(r.outfit?.notes ?? []).filter((id) => id.startsWith('relay.')), ...r.relays]));
  const ranked = [...R.relay_priority.filter((id) => ids.has(id)), ...[...ids].filter((id) => !R.relay_priority.includes(id))];
  const ok = ranked.filter((id) => publishable(ctx, id));
  return { general: ok.filter((id) => !modeRelay(id)), modes: ok.filter(modeRelay) };
}

// ——— Mise en page ———

const up = (path) => '../'.repeat(path.split('/').filter(Boolean).length);
const href = (from, to) => `${up(from)}${to}` || './';

const GUIDE_NAV = [
  ['guide/dehors/', 'Dehors'],
  ['guide/maison/', 'À la maison'],
  ['guide/nuit/', 'La nuit'],
  ['guide/nouveau-ne/', 'Nouveau-né'],
  ['guide/porte-bebe/', 'En porte-bébé'],
  ['guide/voiture/', 'En voiture'],
  ['guide/hiver/', 'En hiver'],
  ['guide/ete-canicule/', 'En été'],
  ['guide/trop-chaud-trop-froid/', 'Trop chaud, trop froid ?'],
  ['guide/sources/', 'Sources et méthode'],
  ['guide/confidentialite/', 'Confidentialité'],
];

function cta(ctx, path, title = 'La tenue d\'aujourd\'hui, chez vous') {
  return `<aside class="cta">
      <h2>${esc(title)}</h2>
      <p>Le ressenti change d'heure en heure. Superbébé prend la météo de votre commune et l'âge de votre enfant : la tenue du matin, ce qu'on enlève ou remet dans la journée, ce qui va dans le sac, puis la tenue de nuit.</p>
      <p class="free">Gratuit, sans publicité, sans compte.</p>
      <a class="btn primary" href="${href(path, 'app/')}">Voir la tenue du jour</a>
    </aside>`;
}

function jsonLd(ctx, page) {
  const url = ctx.site + page.path;
  const graph = [{
    '@type': 'WebPage',
    '@id': `${url}#page`,
    url,
    name: page.title,
    description: page.description,
    inLanguage: 'fr-FR',
    dateModified: ctx.updated,
    isPartOf: { '@id': `${ctx.site}#site` },
    ...(page.citations?.length ? { citation: page.citations } : {}),
  }];
  if (page.path === '') {
    graph.push({
      '@type': 'WebSite', '@id': `${ctx.site}#site`, url: ctx.site, name: 'Superbébé', inLanguage: 'fr-FR',
    }, {
      '@type': 'WebApplication',
      name: 'Superbébé',
      url: `${ctx.site}app/`,
      applicationCategory: 'LifestyleApplication',
      operatingSystem: 'Web, Android, iOS',
      inLanguage: 'fr-FR',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
      description: 'Comment habiller bébé aujourd\'hui, dehors, à la maison et la nuit, selon la météo de sa commune, avec les repères officiels cités.',
      sameAs: [REPO],
    });
  } else {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: page.crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: ctx.site + c.path })),
    });
  }
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
}

function layout(ctx, page) {
  const u = up(page.path);
  const url = ctx.site + page.path;
  const crumbs = page.path === '' ? '' : `<nav class="crumbs" aria-label="Vous êtes ici"><ol>${page.crumbs.map((c, i) => (i === page.crumbs.length - 1
    ? `<li aria-current="page">${esc(c.name)}</li>`
    : `<li><a href="${href(page.path, c.path)}">${esc(c.name)}</a></li>`)).join('')}</ol></nav>`;
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(page.title)}</title>
  <meta name="description" content="${esc(page.description)}">
  <link rel="canonical" href="${esc(url)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Superbébé">
  <meta property="og:locale" content="fr_FR">
  <meta property="og:title" content="${esc(page.h1)}">
  <meta property="og:description" content="${esc(page.description)}">
  <meta property="og:url" content="${esc(url)}">
  <meta property="og:image" content="${esc(ctx.site)}guide/partage.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Superbébé : comment habiller bébé selon la température, dehors, à la maison et la nuit">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="theme-color" content="#3b8cf6">
  <link rel="icon" type="image/png" href="${u}app/icons/icon-192.png">
  <link rel="apple-touch-icon" href="${u}app/icons/apple-touch-icon.png">
  <link rel="stylesheet" href="${u}guide/style.css">
  <script type="application/ld+json">${jsonLd(ctx, page)}</script>
</head>
<body>
  <header class="top"><div class="wrap">
    <a class="brand" href="${href(page.path, '')}"><img src="${u}app/icons/icon-192.png" width="28" height="28" alt="">Superbébé</a>
    <a class="btn small" href="${u}app/">Ouvrir l'app</a>
  </div></header>
  <main class="wrap">
    ${crumbs}
    <h1>${esc(page.h1)}</h1>
    ${page.body.trim()}
  </main>
  <footer class="foot"><div class="wrap">
    <nav aria-label="Le guide"><ul>${GUIDE_NAV.map(([p, name]) => `<li><a href="${href(page.path, p)}">${esc(name)}</a></li>`).join('')}</ul></nav>
    <p>${esc(ctx.M.disclaimer)}</p>
    <p>Sources vérifiées le ${esc(dateFr(ctx.updated))}. Les règles et le code sont ouverts : <a href="${REPO}">GitHub</a> · <a href="${REPO}/issues">signaler une erreur</a>.</p>
  </div></footer>
</body>
</html>
`;
}

// ——— Pages ———

const HOME = { name: 'Accueil', path: '' };
const crumb = (name, path) => ({ name, path });

function bandName(ctx, band) {
  return ctx.labels.bands[band.id];
}

function hubPage(ctx) {
  const path = '';
  const outdoorRows = ctx.bands.map((band) => {
    const r = bandRun(ctx, band, { months: BABY });
    return `<tr><th scope="row"><a href="guide/dehors/${rangeSlug(band)}/">${esc(rangeLabel(band))}</a><span class="band">${esc(bandName(ctx, band))}</span></th><td>${esc(sentence(ctx, r.outfit.items))}</td></tr>`;
  });
  const indoorRows = ctx.indoorBins.map((bin, i) => {
    const baby = ctx.run({ dayRoom: bin.rep, months: BABY }).indoor;
    const child = ctx.run({ dayRoom: bin.rep, months: CHILD }).indoor;
    return `<tr><th scope="row">${esc(rangeLabel(bin))}</th><td data-label="Moins de 2 ans">${esc(sentence(ctx, baby.wear))}</td><td data-label="2 ans et plus">${esc(sentence(ctx, child.wear))}</td></tr>`;
  });
  const nightRows = ctx.nightBins.map((bin) => {
    const n = ctx.run({ room: bin.rep }).night;
    return `<tr><th scope="row"><a href="guide/nuit/chambre-${rangeSlug(bin)}/">${esc(rangeLabel(bin))}</a></th><td>${esc(n.tog)}${NBSP}TOG</td><td>${esc(sentence(ctx, n.wear))}</td></tr>`;
  });
  const body = `
    <p class="lead">Dehors, à la maison et la nuit, de la naissance à 6 ans, avec les repères officiels cités (Assurance Maladie, Santé.fr, Santé publique France).</p>
    <p class="actions"><a class="btn primary" href="app/">Voir la tenue du jour pour ma ville</a></p>

    <section id="dehors">
      <h2>Dehors : la tenue selon la température ressentie</h2>
      <p>Pour un bébé de moins de 2 ans, en poussette. Le ressenti tient compte du vent et de l'humidité.</p>
      <div class="table"><table>
        <thead><tr><th scope="col">Ressenti</th><th scope="col">Tenue</th></tr></thead>
        <tbody>
        ${outdoorRows.join('\n        ')}
        </tbody>
      </table></div>
      <p>En porte-bébé, une couche de moins (<a href="guide/porte-bebe/">détails</a>) ; en voiture, le manteau par-dessus le harnais (<a href="guide/voiture/">détails</a>) ; à partir de 2 ans, haut et pantalon, manteau plutôt que combinaison (<a href="guide/dehors/">toutes les tenues</a>).</p>
    </section>

    <section id="maison">
      <h2>À la maison : la tenue selon la température de la pièce</h2>
      <div class="table"><table class="stack">
        <thead><tr><th scope="col">Pièce</th><th scope="col">Moins de 2 ans</th><th scope="col">2 ans et plus</th></tr></thead>
        <tbody>
        ${indoorRows.join('\n        ')}
        </tbody>
      </table></div>
      <p><a href="guide/maison/">Habiller bébé à la maison : la page complète</a></p>
    </section>

    <section id="nuit">
      <h2>La nuit : quelle gigoteuse selon la chambre</h2>
      <p>Le TOG dit la chaleur de la gigoteuse ; ce qu'on met dessous s'y ajoute. Repère des fabricants : l'étiquette de la gigoteuse fait foi.</p>
      <div class="table"><table>
        <thead><tr><th scope="col">Chambre</th><th scope="col">Gigoteuse</th><th scope="col">Dessous</th></tr></thead>
        <tbody>
        ${nightRows.join('\n        ')}
        </tbody>
      </table></div>
      <p><a href="guide/nuit/">Habiller bébé pour la nuit : la page complète</a></p>
    </section>

    <section id="reperes">
      <h2>Les repères officiels à connaître</h2>
      ${relays(ctx, [
    'relay.sleep.room_range',
    { id: 'relay.sleep.basics', list: true },
    'relay.sleep.duvet_age',
    'relay.check_neck',
    'relay.indoor.dress_like_you',
    'relay.indoor.hat_off',
    'relay.cold.layers',
    'relay.sun.under_1y',
    'relay.car.coat',
    'relay.heat.outing_hours',
  ])}
    </section>

    <section id="pourquoi">
      <h2>Pourquoi une app plutôt qu'un tableau ?</h2>
      <p>Un tableau donne la tenue pour une température. Mais dehors, le ressenti change d'heure en heure, et la tenue dépend aussi de l'âge, du mode de sortie et de la chambre. Superbébé fait ce calcul avec la météo de votre commune :</p>
      <ul class="ticks">
        <li>la tenue du matin, ce qu'on enlève ou remet dans la journée, et ce qui va dans le sac ;</li>
        <li>le meilleur moment pour sortir, et pourquoi ;</li>
        <li>la tenue de nuit selon la température de sa chambre ;</li>
        <li>les repères officiels du jour : chaleur, grand froid, soleil, porte-bébé, siège auto ;</li>
        <li>des widgets pour l'écran d'accueil (Android, et iPhone avec Scriptable) et une fiche du jour à envoyer à la nounou ou à la crèche.</li>
      </ul>
      <p>Gratuit, sans publicité, sans compte. Le profil de l'enfant reste sur le téléphone. Les règles et le code sont publics : <a href="guide/sources/">nos sources et notre méthode</a>.</p>
      <p class="actions"><a class="btn primary" href="app/">Ouvrir Superbébé</a></p>
    </section>

    <section id="guide">
      <h2>Tout le guide</h2>
      <ul class="links">
        <li><a href="guide/dehors/">Comment habiller bébé dehors</a> : ${ctx.bands.map((b) => `<a href="guide/dehors/${rangeSlug(b)}/">${esc(rangeLabel(b))}</a>`).join(', ')}</li>
        <li><a href="guide/maison/">Comment habiller bébé à la maison</a></li>
        <li><a href="guide/nuit/">Comment habiller bébé pour la nuit</a> : ${ctx.nightBins.map((b) => `<a href="guide/nuit/chambre-${rangeSlug(b)}/">chambre ${esc(rangeLabel(b))}</a>`).join(', ')}</li>
        <li><a href="guide/nouveau-ne/">Comment habiller un nouveau-né</a></li>
        <li><a href="guide/hiver/">Comment habiller bébé en hiver</a> · <a href="guide/ete-canicule/">en été et par fortes chaleurs</a></li>
        <li><a href="guide/une-couche-de-plus/">Faut-il une couche de plus que soi ?</a></li>
        <li><a href="guide/porte-bebe/">En porte-bébé</a> · <a href="guide/voiture/">En voiture</a> · <a href="guide/trop-chaud-trop-froid/">A-t-il trop chaud ou trop froid ?</a></li>
        <li><a href="guide/sources/">Sources et méthode</a></li>
      </ul>
    </section>`;
  return {
    path,
    title: 'Comment habiller bébé selon la température : dehors, maison, nuit | Superbébé',
    h1: 'Comment habiller bébé selon la température',
    description: 'La tenue de bébé pour chaque température, dehors, à la maison et la nuit (gigoteuse et TOG), de la naissance à 6 ans, avec les repères officiels cités. Gratuit, sans compte.',
    crumbs: [HOME],
    citations: citations(ctx, ['relay.sleep.room_range', 'relay.check_neck', 'relay.cold.layers', 'relay.sun.under_1y', 'relay.car.coat', 'relay.indoor.hat_off']),
    body,
  };
}

function citations(ctx, ids) {
  return [...new Set(ids.flatMap((id) => ctx.M.messages[id].sources ?? []))].map((sid) => ctx.sourceById.get(sid).url).filter(Boolean);
}

function dehorsIndex(ctx) {
  const path = 'guide/dehors/';
  const rows = ctx.bands.map((band) => {
    const baby = bandRun(ctx, band, { months: BABY });
    const child = bandRun(ctx, band, { months: CHILD });
    return `<tr><th scope="row"><a href="${rangeSlug(band)}/">${esc(rangeLabel(band))}</a><span class="band">${esc(bandName(ctx, band))}</span></th><td data-label="Moins de 2 ans">${esc(sentence(ctx, baby.outfit.items))}</td><td data-label="2 ans et plus">${esc(sentence(ctx, child.outfit.items))}</td></tr>`;
  });
  const T = ctx.R.outfit.transport;
  const body = `
    <p class="lead">La tenue suit la température <strong>ressentie</strong>, qui tient compte du vent et de l'humidité. Sept tranches, de « très chaud » à « très froid », pour un enfant en poussette ; le porte-bébé, la marche et la voiture changent la tenue.</p>
    <div class="table"><table class="stack">
      <thead><tr><th scope="col">Ressenti</th><th scope="col">Moins de 2 ans</th><th scope="col">2 ans et plus</th></tr></thead>
      <tbody>
      ${rows.join('\n      ')}
      </tbody>
    </table></div>

    <section>
      <h2>Selon le mode de sortie</h2>
      <ul class="ticks">
        <li><a href="../porte-bebe/">En porte-bébé</a> : une couche de moins qu'en poussette (votre chaleur le réchauffe), pas de pyjama à pieds, et la couverture ou le manteau de portage par-dessus vous deux.</li>
        <li>À pied, à partir de ${T.a_pied.min_age_m / 12} ans : une couche de moins qu'en poussette, à remettre s'il s'arrête ou remonte dans la poussette.</li>
        <li><a href="../voiture/">En voiture</a> : la combinaison ou le manteau devient une couverture, par-dessus le harnais.</li>
        <li>En poussette, avec une chancelière (avant ${T.poussette_chanceliere.max_age_m / 12} ans) : elle remplace la combinaison, pieds dedans, et la combinaison va dans le sac.</li>
      </ul>
      <p class="muted">Suggestions pratiques, sans portée sanitaire : aucune source officielle ne chiffre l'habillage selon le mode de sortie.</p>
    </section>

    <section>
      <h2>Dans la journée</h2>
      <p>Habillé une fois le matin pour la journée : quand le ressenti monte, on enlève d'abord la couche du dessus ; quand il redescend, on remet d'abord ce qu'on a enlevé. Body et pyjama (ou haut et pantalon) ne changent pas. Le sac garde ce qu'on a enlevé, et la protection contre la pluie.</p>
      ${note(ctx, 'practical.wind')}
      ${note(ctx, 'practical.rain.cover', { gear: ctx.labels.rain_gear[T.poussette.rain_gear] })}
    </section>

    <section>
      <h2>Les repères officiels</h2>
      ${relays(ctx, ['relay.cold.avoid_outings', 'relay.cold.layers', 'relay.sun.under_1y', 'relay.sun.protect', 'relay.heat.outing_hours', 'relay.heat.stroller_sun', 'relay.indoor.hat_off', { id: 'relay.check_neck', when: 'Toujours' }])}
    </section>
    ${cta(ctx, path)}`;
  return {
    path,
    title: 'Comment habiller bébé dehors selon la température ressentie | Superbébé',
    h1: 'Comment habiller bébé dehors selon la température',
    description: 'Tableau des tenues de bébé dehors, de très chaud à très froid, avant et après 2 ans, en poussette, porte-bébé, voiture ou à pied, avec les repères officiels du froid et du soleil.',
    crumbs: [HOME, crumb('Dehors', path)],
    citations: citations(ctx, ['relay.cold.layers', 'relay.sun.under_1y', 'relay.heat.outing_hours', 'relay.check_neck']),
    body,
  };
}

function bandPage(ctx, band, i) {
  const slug = rangeSlug(band);
  const path = `guide/dehors/${slug}/`;
  const main = bandRun(ctx, band, { months: BABY });
  const items = main.outfit.items;
  const same = (list) => list.join() === items.join();
  const variants = [
    { label: 'En porte-bébé', opts: { months: BABY, transport: 'porte_bebe' }, link: '../../porte-bebe/' },
    { label: 'En voiture', opts: { months: BABY, transport: 'voiture' }, link: '../../voiture/' },
    { label: 'En poussette, avec une chancelière', opts: { months: BABY, inventory: { chanceliere: ['unique'] } } },
    { label: 'Avec un pyjama plutôt qu\'un haut et un pantalon', opts: { months: BABY, style: 'pyjama' } },
    { label: 'À partir de 2 ans, en poussette', opts: { months: CHILD } },
    { label: 'À partir de 2 ans, à pied', opts: { months: CHILD, transport: 'a_pied' } },
  ].map((v) => ({ ...v, items: bandRun(ctx, band, v.opts).outfit.items }))
    .filter((v) => !same(v.items));
  const name = bandName(ctx, band);
  const between = rangeBetween(band);
  const warmer = ctx.bands[i - 1];
  const colder = ctx.bands[i + 1];
  const hasHat = items.some((item) => item.startsWith('bonnet'));
  const ids = bandRelayIds(ctx, band);
  const body = `
    <p class="lead"><strong>${esc(sentence(ctx, items))}</strong> : la tenue d'un bébé de moins de 2 ans, en poussette, ${esc(feelsPhrase(band))} (tranche « ${esc(name.toLowerCase())} »).</p>
    <p class="applies">Vaut pour ${esc(degreesList(band))}.</p>
    ${outfitHtml(ctx, items)}

    <section>
      <h2>Selon le mode de sortie et l'âge</h2>
      <dl class="variants">
        ${variants.map((v) => `<div><dt>${v.link ? `<a href="${v.link}">${esc(v.label)}</a>` : esc(v.label)}</dt><dd>${esc(sentence(ctx, v.items))}</dd></div>`).join('\n        ')}
      </dl>
    </section>

    <section>
      <h2>Les repères officiels ${esc(between)}</h2>
      ${relays(ctx, [...ids.general, { id: 'relay.check_neck', when: 'Toujours' }, ...(hasHat ? [{ id: 'relay.indoor.hat_off', when: 'En rentrant' }] : []), ...ids.modes])}
    </section>

    <section>
      <h2>À adapter</h2>
      ${note(ctx, 'practical.wind')}
      ${note(ctx, 'practical.rain.cover', { gear: ctx.labels.rain_gear[ctx.R.outfit.transport.poussette.rain_gear] })}
      <p>${warmer ? `Plus doux : <a href="../${rangeSlug(warmer)}/">${esc(rangeLabel(warmer))}</a>. ` : ''}${colder ? `Plus froid : <a href="../${rangeSlug(colder)}/">${esc(rangeLabel(colder))}</a>.` : ''}</p>
    </section>
    ${cta(ctx, path)}`;
  const title = `Comment habiller bébé dehors ${between}`;
  return {
    path,
    title: `${title} | Superbébé`,
    h1: title,
    description: `${cap(rangeLabel(band))} ressentis : ${sentence(ctx, items).toLowerCase()}. En porte-bébé, en voiture et après 2 ans, avec les repères officiels.`,
    crumbs: [HOME, crumb('Dehors', 'guide/dehors/'), crumb(rangeLabel(band), path)],
    citations: citations(ctx, [...ids.general, ...ids.modes, 'relay.check_neck']),
    body,
  };
}

function maisonPage(ctx) {
  const path = 'guide/maison/';
  const I = ctx.R.indoor;
  const rows = ctx.indoorBins.map((bin, k) => {
    const baby = ctx.run({ dayRoom: bin.rep, months: BABY }).indoor;
    const child = ctx.run({ dayRoom: ctx.childIndoorBins?.[k]?.rep ?? bin.rep, months: CHILD }).indoor;
    const pyjama = baby.styles.find((s) => s.id === 'pyjama');
    const alt = pyjama && pyjama.wear.join() !== baby.wear.join() ? `<span class="or">ou ${esc(sentence(ctx, pyjama.wear).toLowerCase())}</span>` : '';
    return `<tr><th scope="row">${esc(rangeLabel(bin))}</th><td data-label="Moins de 2 ans">${esc(sentence(ctx, baby.wear))}${alt}</td><td data-label="2 ans et plus">${esc(sentence(ctx, child.wear))}</td></tr>`;
  });
  const mid = ctx.run({ dayRoom: (I.comfort_range_c.min + I.comfort_range_c.max) / 2, months: BABY }).indoor;
  const body = `
    <p class="lead">Dans une pièce entre ${I.comfort_range_c.min} et ${deg(I.comfort_range_c.max)}, une température jugée « adéquate » par le guide Mieux vivre (INSPQ, Québec) : <strong>${esc(sentence(ctx, mid.wear).toLowerCase())}</strong>. Plus frais, une couche de plus ; plus chaud, plus léger.</p>
    ${outfitHtml(ctx, mid.wear)}
    <section>
      <h2>La tenue selon la température de la pièce</h2>
      <div class="table"><table class="stack">
        <thead><tr><th scope="col">Pièce</th><th scope="col">Moins de 2 ans</th><th scope="col">2 ans et plus</th></tr></thead>
        <tbody>
        ${rows.join('\n        ')}
        </tbody>
      </table></div>
      <p class="muted">Suggestions pratiques pour la journée, à la maison comme à la crèche. Pour la nuit, voir <a href="../nuit/">comment habiller bébé pour dormir</a>.</p>
    </section>
    <section>
      <h2>Les repères officiels</h2>
      ${relays(ctx, [
    { id: 'relay.indoor.dress_like_you', when: null },
    { id: 'relay.indoor.temperature', when: null },
    { id: 'relay.indoor.no_overwrap', when: null },
    { id: 'relay.indoor.hat_off', when: 'En rentrant' },
    { id: 'relay.check_neck', when: 'Toujours' },
    { id: 'relay.heat.shutters', when: `Pièce à ${deg(I.heat_room_c_at_least)} ou plus` },
    { id: 'relay.heat.protect', when: `Pièce à ${deg(I.heat_room_c_at_least)} ou plus` },
  ])}
    </section>
    ${cta(ctx, path, 'Notez la température chez vous')}`;
  return {
    path,
    title: 'Comment habiller bébé à la maison selon la température de la pièce | Superbébé',
    h1: 'Comment habiller bébé à la maison',
    description: `Tenue de bébé à la maison selon la température de la pièce, de ${deg(ctx.indoorBins[0].hi)} à ${deg(ctx.indoorBins.at(-1).lo)} et plus, avant et après 2 ans, avec les repères officiels : habillez-le comme vous, ne l'enveloppez pas trop.`,
    crumbs: [HOME, crumb('À la maison', path)],
    citations: citations(ctx, ['relay.indoor.dress_like_you', 'relay.indoor.temperature', 'relay.indoor.no_overwrap', 'relay.check_neck']),
    body,
  };
}

const NIGHT_RELAYS = [
  { id: 'relay.sleep.basics', list: true, when: null },
  { id: 'relay.sleep.room_range', when: null },
  { id: 'relay.sleep.few_layers', when: null },
  { id: 'relay.sleep.duvet_age', when: null },
  { id: 'relay.sleep.no_positioners', when: null },
];

function nightOutfit(ctx, n) {
  return outfitHtml(ctx, n.wear, { extra: [{ drawing: 'gigoteuse', label: `gigoteuse ${n.tog} TOG` }] });
}

function nuitIndex(ctx) {
  const path = 'guide/nuit/';
  const range = ctx.R.night.room_range_c;
  const mid = ctx.run({ room: (range.min + range.max) / 2 }).night;
  const rows = ctx.nightBins.map((bin) => {
    const n = ctx.run({ room: bin.rep }).night;
    return `<tr><th scope="row"><a href="chambre-${rangeSlug(bin)}/">${esc(rangeLabel(bin))}</a></th><td>${esc(n.tog)}${NBSP}TOG</td><td>${esc(sentence(ctx, n.wear))}</td></tr>`;
  });
  const body = `
    <p class="lead">Une chambre entre ${range.min} et ${deg(range.max)}, bébé sur le dos dans une gigoteuse adaptée à sa taille, sans couverture ni couette. À ${deg(Math.round((range.min + range.max) / 2))}, <strong>une gigoteuse de ${esc(mid.tog)}${NBSP}TOG, avec dessous : ${esc(listFr(mid.wear.map((i) => itemLabel(ctx, i))))}</strong>.</p>
    ${nightOutfit(ctx, mid)}
    <section>
      <h2>Quelle gigoteuse selon la température de la chambre</h2>
      <div class="table"><table>
        <thead><tr><th scope="col">Chambre</th><th scope="col">Gigoteuse</th><th scope="col">Dessous</th></tr></thead>
        <tbody>
        ${rows.join('\n        ')}
        </tbody>
      </table></div>
      ${note(ctx, 'fabricant.night.compensation')}
      <p class="muted">Les tableaux TOG des marques sont voisins, pas identiques : l'étiquette de votre gigoteuse fait foi.</p>
    </section>
    <section>
      <h2>Les repères officiels pour dormir</h2>
      ${relays(ctx, [...NIGHT_RELAYS, { id: 'relay.check_neck', when: 'Pour vérifier' }])}
    </section>
    ${cta(ctx, path, 'La tenue de nuit, chaque soir')}`;
  return {
    path,
    title: 'Comment habiller bébé la nuit : gigoteuse et TOG selon la chambre | Superbébé',
    h1: 'Comment habiller bébé pour la nuit',
    description: `Quelle gigoteuse (TOG) et quel pyjama selon la température de la chambre, de ${deg(ctx.nightBins[0].hi)} à ${deg(ctx.nightBins.at(-1).lo)} et plus. Chambre entre ${range.min} et ${deg(range.max)}, sur le dos, sans couette : les repères de l'Assurance Maladie.`,
    crumbs: [HOME, crumb('La nuit', path)],
    citations: citations(ctx, NIGHT_RELAYS.map((r) => r.id)),
    body,
  };
}

function nightPage(ctx, bin, i) {
  const path = `guide/nuit/chambre-${rangeSlug(bin)}/`;
  const n = ctx.run({ room: bin.rep }).night;
  const range = ctx.R.night.room_range_c;
  const status = bin.hi !== null && bin.hi < range.min ? 'below' : bin.lo !== null && bin.lo > range.max ? 'above' : 'in_range';
  const statusText = render(ctx.M, `maison.nuit.${status}`, 'text', { min: range.min, max: range.max });
  const options = n.options.filter((o) => o.id !== 'principal');
  const hotFrom = ctx.R.night.heat_room_c_at_least;
  const hot = bin.hi === null || bin.hi >= hotFrom;
  const mainSources = n.options[0].sources;
  const warmer = ctx.nightBins[i + 1];
  const cooler = ctx.nightBins[i - 1];
  const where = roomRangeTitle(bin);
  const body = `
    <p class="lead"><strong>Une gigoteuse d'environ ${esc(n.tog)}${NBSP}TOG, avec dessous : ${esc(listFr(n.wear.map((item) => itemLabel(ctx, item))))}</strong>, d'après les tableaux des fabricants (l'étiquette de la gigoteuse fait foi). ${esc(statusText)}</p>
    <p class="src">Repère des fabricants : ${mainSources.map((sid) => citeSource(ctx, sid)).join(' ; ')}.</p>
    <p class="applies">Vaut pour une chambre à ${esc(degreesList(bin, ''))}.</p>
    ${nightOutfit(ctx, n)}
    ${options.length ? `<section>
      <h2>Selon la gigoteuse que vous avez</h2>
      <ul class="options">
        ${options.map((o) => `<li><strong>Gigoteuse ${esc(o.tog)}${NBSP}TOG</strong> : ${esc(listFr(o.wear.map((item) => itemLabel(ctx, item))))} <span class="src">(${o.sources.map((sid) => citeSource(ctx, sid)).join(' ; ')})</span></li>`).join('\n        ')}
      </ul>
      ${note(ctx, 'fabricant.night.compensation')}
    </section>` : ''}
    <section>
      <h2>Les repères officiels pour dormir</h2>
      ${relays(ctx, [...NIGHT_RELAYS, { id: 'relay.check_neck', when: 'Pour vérifier' }, ...(hot ? [{ id: 'relay.heat.shutters', when: `Chambre à ${deg(hotFrom)} ou plus` }] : [])])}
    </section>
    <p>${cooler ? `Plus frais : <a href="../chambre-${rangeSlug(cooler)}/">chambre ${esc(rangeLabel(cooler))}</a>. ` : ''}${warmer ? `Plus chaud : <a href="../chambre-${rangeSlug(warmer)}/">chambre ${esc(rangeLabel(warmer))}</a>.` : ''}</p>
    ${cta(ctx, path, 'La tenue de nuit, chaque soir')}`;
  const title = `Chambre de bébé ${where} : quelle gigoteuse et quel pyjama ?`;
  return {
    path,
    title: `${title} | Superbébé`,
    h1: title,
    description: `Chambre ${rangeBetween(bin)} : gigoteuse d'environ ${n.tog} TOG avec ${listFr(n.wear.map((item) => itemLabel(ctx, item)))} dessous${options.length ? ', et les autres tenues selon votre gigoteuse' : ''}. Repères des fabricants et de l'Assurance Maladie.`,
    crumbs: [HOME, crumb('La nuit', 'guide/nuit/'), crumb(`Chambre ${rangeLabel(bin)}`, path)],
    citations: citations(ctx, NIGHT_RELAYS.map((r) => r.id)),
    body,
  };
}

function modeTable(ctx, transport, path) {
  const rows = ctx.bands.map((band) => {
    const r = bandRun(ctx, band, { months: BABY, transport });
    return `<tr><th scope="row"><a href="${href(path, `guide/dehors/${rangeSlug(band)}/`)}">${esc(rangeLabel(band))}</a></th><td>${esc(sentence(ctx, r.outfit.items))}</td></tr>`;
  });
  return `<div class="table"><table>
        <thead><tr><th scope="col">Ressenti</th><th scope="col">Tenue</th></tr></thead>
        <tbody>
        ${rows.join('\n        ')}
        </tbody>
      </table></div>`;
}

function porteBebePage(ctx) {
  const path = 'guide/porte-bebe/';
  const S = ctx.R.outfit.transport.porte_bebe.safety;
  const body = `
    <p class="lead">En porte-bébé, votre chaleur le réchauffe : <strong>une couche de moins qu'en poussette</strong>, pas de pyjama à pieds, et par temps froid une couverture ou un manteau de portage <strong>par-dessus vous deux, jamais sur son visage</strong>.</p>
    <section>
      <h2>La tenue en porte-bébé selon le ressenti</h2>
      <p>Pour un bébé de moins de 2 ans.</p>
      ${modeTable(ctx, 'porte_bebe', path)}
      ${note(ctx, 'practical.carrier.body_heat')}
      ${note(ctx, 'practical.carrier.no_footed')}
      <p class="muted">Aucune source officielle ne chiffre l'habillage en portage, ni ne distingue écharpe, porte-bébé, devant ou dos : la couche de moins est une suggestion pratique.</p>
    </section>
    <section>
      <h2>Les repères de sécurité</h2>
      ${relays(ctx, [S.cover_relay, S.heat_relay, S.slippery_relay, 'relay.cold.stroller_rather_than_carrier'])}
    </section>
    <section>
      <h2>Bien porter : 5 repères de Santé Canada</h2>
      ${relays(ctx, S.principles.map((id) => ({ id, when: ctx.M.messages[id].short })))}
    </section>
    ${cta(ctx, path)}`;
  return {
    path,
    title: 'Comment habiller bébé en porte-bébé selon la température | Superbébé',
    h1: 'Comment habiller bébé en porte-bébé',
    description: 'En porte-bébé : une couche de moins qu\'en poussette, pas de pyjama à pieds, couverture de portage jamais sur son visage. La tenue pour chaque température et les repères de sécurité officiels.',
    crumbs: [HOME, crumb('En porte-bébé', path)],
    citations: citations(ctx, [S.cover_relay, S.heat_relay, S.slippery_relay, ...S.principles]),
    body,
  };
}

function voiturePage(ctx) {
  const path = 'guide/voiture/';
  const body = `
    <p class="lead">Dans le siège auto, <strong>pas de manteau ni de combinaison sous le harnais</strong> : on les enlève pour l'attacher, puis on les remet par-dessus.</p>
    <section>
      <h2>Les repères officiels</h2>
      ${relays(ctx, [{ id: 'relay.car.coat', when: null }, { id: 'relay.indoor.hat_off', when: 'En montant en voiture' }, 'relay.heat.vehicle'])}
    </section>
    <section>
      <h2>La tenue en voiture selon le ressenti</h2>
      <p>Pour un bébé de moins de 2 ans : la combinaison devient une couverture, par-dessus le harnais.</p>
      ${modeTable(ctx, 'voiture', path)}
    </section>
    ${cta(ctx, path)}`;
  return {
    path,
    title: 'Bébé en voiture : comment l\'habiller dans le siège auto | Superbébé',
    h1: 'Comment habiller bébé en voiture',
    description: 'Siège auto : doudoune ou combinaison empêchent le harnais de jouer son rôle (Santé.fr). Les enlever pour l\'attacher, couvrir par-dessus : la tenue pour chaque température.',
    crumbs: [HOME, crumb('En voiture', path)],
    citations: citations(ctx, ['relay.car.coat', 'relay.indoor.hat_off', 'relay.heat.vehicle']),
    body,
  };
}

function checkPage(ctx) {
  const path = 'guide/trop-chaud-trop-froid/';
  const ids = ['relay.check_neck', 'relay.sleep.check_temp', 'relay.sleep.few_layers', 'relay.indoor.no_overwrap', 'relay.indoor.dress_like_you', 'relay.indoor.hat_off'];
  const body = `
    <p class="lead"><strong>Touchez sa nuque, pas ses mains.</strong> Nuque moite : une couche de moins. Des mains ou des pieds frais, c'est normal.</p>
    <section>
      <h2>Les repères officiels</h2>
      ${relays(ctx, ids.map((id) => ({ id, when: null })))}
      <p><a href="../une-couche-de-plus/">Faut-il l'habiller avec une couche de plus que soi ?</a></p>
    </section>
    <section>
      <h2>Ce que Superbébé ne fait pas</h2>
      <p>Superbébé ne donne pas d'avis médical : ni fièvre, ni symptômes, ni médicaments. En cas de doute sur sa santé, appelez votre médecin.</p>
      ${relays(ctx, [{ id: 'relay.emergency', when: null }])}
    </section>
    ${cta(ctx, path)}`;
  return {
    path,
    title: 'Comment savoir si bébé a trop chaud ou trop froid | Superbébé',
    h1: 'Bébé a-t-il trop chaud ou trop froid ?',
    description: 'Touchez sa nuque : vous ne devez pas sentir de sueur sous vos doigts (Assurance Maladie). Des mains ou des pieds frais, c\'est normal (NHS). Les repères officiels pour ne pas trop le couvrir.',
    crumbs: [HOME, crumb('Trop chaud, trop froid ?', path)],
    citations: citations(ctx, ids),
    body,
  };
}

// Le nouveau-né s'habille comme un bébé plus grand, à la même température : la page le dit, avec les repères
// officiels qui valent dès la naissance (couchage, nuque, bonnet à l'intérieur, soleil, portage avant 4 mois).
function nouveauNePage(ctx) {
  const path = 'guide/nouveau-ne/';
  const S = ctx.R.outfit.transport.porte_bebe.safety;
  const I = ctx.R.indoor;
  const range = ctx.R.night.room_range_c;
  const home = ctx.run({ dayRoom: (I.comfort_range_c.min + I.comfort_range_c.max) / 2, months: NEWBORN }).indoor;
  const night = ctx.run({ room: (range.min + range.max) / 2, months: NEWBORN }).night;
  const outdoor = ctx.bands.map((band) => {
    const r = bandRun(ctx, band, { months: NEWBORN });
    return `<tr><th scope="row"><a href="../dehors/${rangeSlug(band)}/">${esc(rangeLabel(band))}</a></th><td>${esc(sentence(ctx, r.outfit.items))}</td></tr>`;
  });
  const ids = ['relay.sleep.basics', 'relay.sleep.room_range', 'relay.check_neck', 'relay.indoor.hat_off', 'relay.sun.under_1y', S.heat_relay, S.cover_relay];
  const body = `
    <p class="lead">Un nouveau-né s'habille selon la température, comme un bébé plus grand : à la maison, dans une pièce à ${I.comfort_range_c.min}-${deg(I.comfort_range_c.max)}, <strong>${esc(sentence(ctx, home.wear).toLowerCase())}</strong> ; pour dormir, dans une chambre à ${range.min}-${deg(range.max)}, <strong>une gigoteuse d'environ ${esc(night.tog)}${NBSP}TOG, avec dessous : ${esc(listFr(night.wear.map((item) => itemLabel(ctx, item))))}</strong>.</p>
    ${outfitHtml(ctx, home.wear)}
    <section>
      <h2>Dès la naissance : les repères officiels</h2>
      ${relays(ctx, [
    { id: 'relay.sleep.basics', list: true, when: 'Pour dormir' },
    { id: 'relay.sleep.room_range', when: null },
    { id: 'relay.check_neck', when: 'Pour vérifier' },
    { id: 'relay.indoor.hat_off', when: 'En rentrant' },
    'relay.sun.under_1y',
    S.heat_relay,
    S.cover_relay,
  ])}
    </section>
    <section>
      <h2>Dehors, selon le ressenti</h2>
      <p>En poussette. <a href="../porte-bebe/">En porte-bébé</a>, une couche de moins, et avant ${S.guide_open_under_months} mois, les cinq repères de position de Santé Canada.</p>
      <div class="table"><table>
        <thead><tr><th scope="col">Ressenti</th><th scope="col">Tenue</th></tr></thead>
        <tbody>
        ${outdoor.join('\n        ')}
        </tbody>
      </table></div>
    </section>
    <section>
      <h2>À la maison et la nuit</h2>
      <p><a href="../maison/">La tenue selon la température de la pièce</a> · <a href="../nuit/">la gigoteuse et la tenue de nuit selon la chambre</a> · <a href="../trop-chaud-trop-froid/">a-t-il trop chaud ou trop froid ?</a></p>
    </section>
    ${cta(ctx, path)}`;
  return {
    path,
    title: 'Comment habiller un nouveau-né selon la température | Superbébé',
    h1: 'Comment habiller un nouveau-né',
    description: `Habiller un nouveau-né à la maison, dehors et pour dormir, selon la température : chambre à ${range.min}-${range.max} °C, sur le dos dans une gigoteuse, nuque à vérifier, bonnet enlevé à l'intérieur. Les repères officiels cités.`,
    crumbs: [HOME, crumb('Nouveau-né', path)],
    citations: citations(ctx, ids),
    body,
  };
}

function sourcesPage(ctx) {
  const path = 'guide/sources/';
  const { R, S } = ctx;
  const levelName = { A: 'Autorité publique française', 'A-etranger': 'Autorité publique étrangère', B: 'Société savante', C: 'Fabricant ou norme' };
  const statusName = { lu: 'Relue', lu_via_recherche: 'À relire', a_verifier: 'À vérifier' };
  const order = ['A', 'A-etranger', 'B', 'C'];
  const sources = [...S.sources].sort((a, b) => order.indexOf(a.level) - order.indexOf(b.level));
  const bandRows = ctx.bands.map((band) => `<tr><th scope="row">${esc(bandName(ctx, band))}</th><td>${esc(rangeLabel(band))}</td></tr>`);
  const body = `
    <p class="lead">Superbébé relaie des repères officiels, toujours cités avec leur source, et propose des suggestions pratiques, présentées comme telles. Il ne donne aucun avis médical.</p>
    <section>
      <h2>Ce que dit Superbébé, et d'où ça vient</h2>
      <dl class="variants">
        <div><dt>Repère officiel</dt><dd>Cité entre guillemets ou fidèlement résumé, avec l'organisme et un lien : autorités publiques françaises d'abord (Assurance Maladie, Santé.fr, Santé publique France), étrangères faute de source française, nommées comme telles.</dd></div>
        <div><dt>Suggestion pratique</dt><dd>Les tenues, l'heure de sortie et les achats à prévoir. Sans portée sanitaire, elles ne contredisent jamais un repère officiel.</dd></div>
        <div><dt>Repère des fabricants</dt><dd>Les TOG des gigoteuses et ce qu'on met dessous, d'après les tableaux publiés par les marques. L'étiquette du produit fait foi.</dd></div>
        <div><dt>Météo</dt><dd>Températures ressenties, pluie, vent et indice UV heure par heure, fournis par Open-Meteo.</dd></div>
      </dl>
    </section>
    <section>
      <h2>Comment la tenue est choisie</h2>
      <p>Chaque heure reçoit la tranche de son ressenti. Le mode de sortie décale la tranche (porte-bébé, à pied) ou remplace des vêtements (voiture, chancelière) ; à partir de 2 ans, haut et pantalon remplacent body et pyjama. La journée est découpée en au plus trois périodes : le matin, on habille pour la première ; ensuite, on enlève ou on remet une couche, et le sac garde ce qu'on a enlevé.</p>
      <div class="table"><table>
        <thead><tr><th scope="col">Tranche</th><th scope="col">Ressenti</th></tr></thead>
        <tbody>
        ${bandRows.join('\n        ')}
        </tbody>
      </table></div>
      <p>À la maison, la tenue suit la température de la pièce ; la nuit, celle de la chambre, avec le TOG des fabricants. Sans relevé, l'app part du repère officiel (${R.indoor.comfort_range_c.min} à ${deg(R.indoor.comfort_range_c.max)} le jour, ${R.night.room_range_c.min} à ${deg(R.night.room_range_c.max)} la nuit) et le dit.</p>
    </section>
    <section>
      <h2>Notre charte</h2>
      <ol>
        <li>Aucun avis médical : ni fièvre, ni symptômes, ni médicaments, et aucune promesse de sécurité.</li>
        <li>Toute phrase qui touche à la santé ou à la sécurité relaie une source officielle, citée avec l'organisme et un lien.</li>
        <li>Les tenues, l'heure de sortie et les achats sont des suggestions pratiques, présentées comme telles.</li>
        <li>Les indications des fabricants (TOG, normes) sont présentées comme telles : l'étiquette fait foi.</li>
        <li>Rien de contraire aux repères officiels n'est proposé : ni tour de lit, ni couverture, ni couette, ni oreiller, ni cale-bébé, ni réducteur de lit, ni crème solaire avant 1 an.</li>
        <li>Une citation non vérifiée sur sa source d'origine n'est pas publiée. Sur ce guide, chaque repère officiel cite des sources relues.</li>
        <li>Des tests automatiques vérifient la charte avant chaque mise en ligne.</li>
      </ol>
    </section>
    <section>
      <h2>Les sources</h2>
      <div class="table"><table class="sources stack">
        <thead><tr><th scope="col">Source</th><th scope="col">Type</th><th scope="col">État</th></tr></thead>
        <tbody>
        ${sources.map((s) => `<tr><th scope="row">${citeSource(ctx, s.id)}</th><td data-label="Type">${esc(levelName[s.level] ?? s.level)}</td><td data-label="État">${esc(statusName[s.verification] ?? s.verification)}</td></tr>`).join('\n        ')}
        </tbody>
      </table></div>
      <p class="muted">Registre consulté le ${esc(dateFr(S.consulted))}. Une source « à relire » ou « à vérifier » n'appuie aucun repère officiel de ce guide.</p>
    </section>
    <section>
      <h2>Relecture et corrections</h2>
      <p>Les règles, les textes et les sources sont publics, avec leurs tests : <a href="${REPO}">github.com/BrunoCambianica/baby</a>. Une erreur, une source plus récente ? <a href="${REPO}/issues">Signalez-la</a>. La relecture des textes par un professionnel de santé est prévue.</p>
    </section>
    <section>
      <h2>Confidentialité</h2>
      <p>Pas de compte, pas de publicité, pas de mesure d'audience : le profil de l'enfant reste sur le téléphone. Le détail : <a href="../confidentialite/">ce qui reste sur le téléphone, et ce qui en part</a>.</p>
    </section>`;
  return {
    path,
    title: 'Sources et méthode | Superbébé',
    h1: 'Nos sources et notre méthode',
    description: 'D\'où viennent les repères de Superbébé : autorités publiques citées avec leur lien, suggestions pratiques présentées comme telles, TOG des fabricants. La charte, la méthode et le registre des sources.',
    crumbs: [HOME, crumb('Sources et méthode', path)],
    citations: S.sources.filter((s) => s.verification === 'lu' && s.url).map((s) => s.url),
    body,
  };
}

// Tableaux à trois colonnes : tenue avant et après 2 ans (dehors ou à la maison), empilés sur téléphone.
function ageRows(ctx, entries) {
  return entries.map(({ head, baby, child }) => `<tr><th scope="row">${head}</th><td data-label="Moins de 2 ans">${esc(sentence(ctx, baby))}</td><td data-label="2 ans et plus">${esc(sentence(ctx, child))}</td></tr>`);
}
const ageTable = (first, rows) => `<div class="table"><table class="stack">
        <thead><tr><th scope="col">${esc(first)}</th><th scope="col">Moins de 2 ans</th><th scope="col">2 ans et plus</th></tr></thead>
        <tbody>
        ${rows.join('\n        ')}
        </tbody>
      </table></div>`;
const nightTable = (ctx, path, bins) => `<div class="table"><table>
        <thead><tr><th scope="col">Chambre</th><th scope="col">Gigoteuse</th><th scope="col">Dessous</th></tr></thead>
        <tbody>
        ${bins.map((bin) => {
    const n = ctx.run({ room: bin.rep }).night;
    return `<tr><th scope="row"><a href="${href(path, `guide/nuit/chambre-${rangeSlug(bin)}/`)}">${esc(rangeLabel(bin))}</a></th><td>${esc(n.tog)}${NBSP}TOG</td><td>${esc(sentence(ctx, n.wear))}</td></tr>`;
  }).join('\n        ')}
        </tbody>
      </table></div>`;
const outdoorAgeRows = (ctx, path, bands) => ageRows(ctx, bands.map((band) => ({
  head: `<a href="${href(path, `guide/dehors/${rangeSlug(band)}/`)}">${esc(rangeLabel(band))}</a><span class="band">${esc(bandName(ctx, band))}</span>`,
  baby: bandRun(ctx, band, { months: BABY }).outfit.items,
  child: bandRun(ctx, band, { months: CHILD }).outfit.items,
})));
const indoorAgeRows = (ctx, bins) => ageRows(ctx, bins.map((bin) => ({
  head: esc(rangeLabel(bin)),
  baby: ctx.run({ dayRoom: bin.rep, months: BABY }).indoor.wear,
  child: ctx.run({ dayRoom: bin.rep, months: CHILD }).indoor.wear,
})));

// L'hiver : les tranches où l'on met une couche « par-dessus » (combinaison, manteau), la maison sous la plage de jour,
// les chambres jusqu'au haut de la plage officielle, et les repères du froid.
function hiverPage(ctx) {
  const path = 'guide/hiver/';
  const { R } = ctx;
  const cold = ctx.bands.filter((band) => bandRun(ctx, band, { months: BABY }).outfit.items.some((item) => ctx.labels.item_layers[item] === 'dessus'));
  const rooms = ctx.indoorBins.filter((bin) => bin.hi !== null && bin.hi < R.indoor.comfort_range_c.min);
  const nights = ctx.nightBins.filter((bin) => bin.hi !== null && bin.hi <= R.night.room_range_c.max);
  const body = `
    <p class="lead">Dehors, <strong>plusieurs couches superposées, et la tête, les mains et les pieds couverts</strong>. En rentrant, on enlève le bonnet et les couches en trop. La nuit, une gigoteuse plus chaude dans une chambre à ${R.night.room_range_c.min}-${deg(R.night.room_range_c.max)}, jamais de couverture ni de couette.</p>
    <section>
      <h2>Dehors, quand il fait froid</h2>
      <p>La tenue suit la température ressentie, qui tient compte du vent.</p>
      ${ageTable('Ressenti', outdoorAgeRows(ctx, path, cold))}
      ${relays(ctx, ['relay.cold.layers', 'relay.cold.avoid_outings', { id: 'relay.check_neck', when: 'Toujours' }, { id: 'relay.indoor.hat_off', when: 'En rentrant' }, 'relay.cold.stroller_rather_than_carrier', 'relay.car.coat'])}
    </section>
    <section>
      <h2>À la maison, dans une pièce fraîche</h2>
      ${ageTable('Pièce', indoorAgeRows(ctx, rooms))}
      ${relays(ctx, [{ id: 'relay.indoor.temperature', when: null }, { id: 'relay.indoor.dress_like_you', when: null }])}
    </section>
    <section>
      <h2>La nuit</h2>
      ${nightTable(ctx, path, nights)}
      ${relays(ctx, [{ id: 'relay.sleep.room_range', when: null }, { id: 'relay.sleep.basics', list: true, when: null }, { id: 'relay.sleep.duvet_age', when: null }, { id: 'relay.sleep.few_layers', when: null }])}
    </section>
    ${cta(ctx, path, 'Le froid change d\'heure en heure')}`;
  return {
    path,
    title: 'Comment habiller bébé en hiver : dehors, à la maison, la nuit | Superbébé',
    h1: 'Comment habiller bébé en hiver',
    description: `Habiller bébé en hiver : la tenue pour chaque température ressentie sous ${deg(cold[0].hi + 1)}, à la maison et la nuit, avant et après 2 ans. Couches superposées, tête, mains et pieds couverts : les repères officiels du froid.`,
    crumbs: [HOME, crumb('En hiver', path)],
    citations: citations(ctx, ['relay.cold.layers', 'relay.cold.avoid_outings', 'relay.indoor.hat_off', 'relay.car.coat', 'relay.sleep.room_range']),
    body,
  };
}

// L'été et les fortes chaleurs : les tranches où le soleil compte, la maison au-dessus de la plage de jour,
// les chambres au-dessus de la plage officielle, et les repères de la chaleur et du soleil.
function etePage(ctx) {
  const path = 'guide/ete-canicule/';
  const { R } = ctx;
  const warm = ctx.bands.filter((band) => sunny(ctx, band));
  const rooms = ctx.indoorBins.filter((bin) => bin.lo !== null && bin.lo > R.indoor.comfort_range_c.max);
  const nights = ctx.nightBins.filter((bin) => bin.lo !== null && bin.lo > R.night.room_range_c.max);
  const carrier = R.outfit.transport.porte_bebe.safety;
  const body = `
    <p class="lead"><strong>Des vêtements légers, amples et clairs, un chapeau à larges bords, et pas de soleil direct avant 1 an.</strong> Par fortes chaleurs, on sort le matin avant 11 h ou le soir après 21 h.</p>
    <section>
      <h2>Dehors, quand il fait chaud</h2>
      ${ageTable('Ressenti', outdoorAgeRows(ctx, path, warm))}
      ${relays(ctx, ['relay.sun.under_1y', 'relay.sun.protect', { id: 'relay.sun.hours', when: null }, 'relay.heat.outing_hours', 'relay.heat.protect', 'relay.heat.stroller_sun', 'relay.heat.vehicle', 'relay.heat.info_line', carrier.heat_relay])}
    </section>
    <section>
      <h2>À la maison, dans une pièce chaude</h2>
      ${ageTable('Pièce', indoorAgeRows(ctx, rooms))}
      ${relays(ctx, [{ id: 'relay.indoor.no_overwrap', when: null }, { id: 'relay.heat.shutters', when: `Pièce à ${deg(R.indoor.heat_room_c_at_least)} ou plus` }])}
    </section>
    <section>
      <h2>La nuit</h2>
      ${nightTable(ctx, path, nights)}
      ${relays(ctx, [{ id: 'relay.sleep.few_layers', when: null }, { id: 'relay.check_neck', when: 'Pour vérifier' }, { id: 'relay.sleep.room_range', when: null }])}
    </section>
    ${cta(ctx, path, 'Les heures les plus chaudes, chez vous')}`;
  return {
    path,
    title: 'Comment habiller bébé en été et par canicule | Superbébé',
    h1: 'Comment habiller bébé en été et par fortes chaleurs',
    description: `Habiller bébé en été : la tenue à partir de ${deg(warm.at(-1).lo)} ressentis, à la maison et la nuit. Pas de soleil direct avant 1 an, sorties avant 11 h ou après 21 h par fortes chaleurs : les repères officiels cités.`,
    crumbs: [HOME, crumb('En été', path)],
    citations: citations(ctx, ['relay.sun.under_1y', 'relay.sun.protect', 'relay.heat.outing_hours', 'relay.heat.protect', 'relay.indoor.no_overwrap']),
    body,
  };
}

// « Une couche de plus que soi » : une règle que les IA répètent. D'où elle vient (une société savante américaine,
// citée comme telle, pas comme repère officiel), et ce que disent les repères publics, cités.
function coucheDePlusPage(ctx) {
  const path = 'guide/une-couche-de-plus/';
  const aap = ctx.sourceById.get('aap-dressing-newborn');
  const ids = ['relay.indoor.dress_like_you', 'relay.indoor.no_overwrap', 'relay.sleep.few_layers', 'relay.cold.layers', 'relay.indoor.hat_off', 'relay.check_neck'];
  const body = `
    <p class="lead"><strong>À la maison, non : habillez-le comme vous.</strong> La règle « une couche de plus que l'adulte » vient de l'Académie américaine de pédiatrie. Les repères publics disent plutôt : comme vous à la maison, sans trop l'envelopper ; plusieurs couches superposées dehors quand il fait froid ; et toujours, touchez sa nuque.</p>
    <section>
      <h2>D'où vient la règle</h2>
      <p>L'Académie américaine de pédiatrie, une société savante et non une autorité publique, écrit : « A good rule of thumb is to dress the baby in one more layer of clothing than you are wearing to be comfortable in the same environment » (une couche de plus que ce que vous portez pour être à l'aise au même endroit).</p>
      <p class="src">Source : ${citeSource(ctx, aap.id)}</p>
    </section>
    <section>
      <h2>Ce que disent les repères officiels</h2>
      ${relays(ctx, [
    { id: 'relay.indoor.dress_like_you', when: 'À la maison' },
    { id: 'relay.indoor.no_overwrap', when: 'À la maison' },
    { id: 'relay.sleep.few_layers', when: 'Pour dormir' },
    'relay.cold.layers',
    { id: 'relay.indoor.hat_off', when: 'En rentrant' },
    { id: 'relay.check_neck', when: 'Toujours' },
  ])}
    </section>
    <section>
      <h2>Et dans Superbébé ?</h2>
      <p>Les tenues ne se comptent pas en « couches de plus » : elles suivent la température ressentie dehors, celle de la pièce à la maison, celle de la chambre la nuit, avec des repères chiffrés. Ensuite, la nuque dit s'il faut enlever une couche.</p>
      <p><a href="../dehors/">Dehors</a> · <a href="../maison/">à la maison</a> · <a href="../nuit/">la nuit</a></p>
    </section>
    ${cta(ctx, path)}`;
  return {
    path,
    title: 'Faut-il habiller bébé avec une couche de plus que soi ? | Superbébé',
    h1: 'Faut-il habiller bébé avec une couche de plus que soi ?',
    description: 'La règle « une couche de plus que l\'adulte » vient de l\'Académie américaine de pédiatrie. Les repères publics disent : à la maison, habillez-le comme vous, sans trop l\'envelopper ; dehors par le froid, plusieurs couches ; touchez sa nuque.',
    crumbs: [HOME, crumb('Une couche de plus ?', path)],
    citations: [aap.url, ...citations(ctx, ids)],
    body,
  };
}

// Confidentialité : ce que fait l'app aujourd'hui (sans serveur à elle), dit simplement. Exigée par le Play Store.
function confidentialitePage(ctx) {
  const path = 'guide/confidentialite/';
  const body = `
    <p class="lead">Pas de compte, pas de publicité, pas de mesure d'audience. <strong>Le profil de votre enfant reste sur votre téléphone.</strong></p>
    <section>
      <h2>Ce qui reste sur votre téléphone</h2>
      <p>Le mois de naissance de l'enfant et, si vous le voulez, son prénom ou un surnom ; la commune, les réglages, la garde-robe, les températures notées et vos réponses « il avait trop chaud, juste, trop froid ».</p>
    </section>
    <section>
      <h2>Ce qui en part, et pourquoi</h2>
      <ul class="ticks">
        <li><strong>La météo</strong> : la position de la commune est envoyée à Open-Meteo, pour les prévisions heure par heure et les températures des années passées.</li>
        <li><strong>La commune</strong> : le nom tapé, ou votre position arrondie à environ 1 km si vous la demandez, est envoyé à geo.api.gouv.fr, un service public, pour trouver la commune.</li>
        <li><strong>Le partage avec l'autre parent</strong> : un lien à envoyer par message, avec les prénoms et les réglages. Il ne passe par aucun serveur de Superbébé.</li>
        <li><strong>La fiche du jour</strong> pour la nounou ou la crèche : une image et un lien, avec le prénom seulement, ni nom de famille ni adresse. Les données sont dans le lien, après le « # », que le navigateur n'envoie pas au serveur.</li>
        <li><strong>Les retours de test</strong> : un résumé sans prénom (âges, modes de sortie, réponses), que vous envoyez vous-même si vous le voulez.</li>
      </ul>
      <p>Le rappel du soir est calculé sur le téléphone, par l'app Android ou par le widget iPhone.</p>
    </section>
    <section>
      <h2>Hébergement</h2>
      <p>Le site, l'app et le guide sont servis par GitHub Pages : GitHub peut traiter des données techniques de connexion, comme l'adresse IP, selon sa propre politique de confidentialité. Les pages du guide n'ont ni script ni cookie.</p>
    </section>
    <section>
      <h2>Effacer vos données</h2>
      <p>Dans l'app : Réglages, « Effacer toutes mes données ». Désinstaller l'app, ou effacer les données du site dans le navigateur, fait de même.</p>
    </section>
    <section>
      <h2>Une question</h2>
      <p>Par le dépôt public du projet : <a href="${REPO}/issues">github.com/BrunoCambianica/baby</a>.</p>
    </section>`;
  return {
    path,
    title: 'Confidentialité | Superbébé',
    h1: 'Confidentialité',
    description: 'Superbébé fonctionne sans compte, sans publicité ni mesure d\'audience : le profil de l\'enfant reste sur le téléphone. Ce qui en part (météo, commune) et pourquoi, et comment tout effacer.',
    crumbs: [HOME, crumb('Confidentialité', path)],
    citations: [],
    body,
  };
}

// ——— Le guide complet ———

export function buildGuide(bundle, { site = SITE } = {}) {
  const ctx = context(bundle, site);
  const pages = [
    hubPage(ctx),
    dehorsIndex(ctx),
    ...ctx.bands.map((band, i) => bandPage(ctx, band, i)),
    maisonPage(ctx),
    nuitIndex(ctx),
    ...ctx.nightBins.map((bin, i) => nightPage(ctx, bin, i)),
    nouveauNePage(ctx),
    hiverPage(ctx),
    etePage(ctx),
    porteBebePage(ctx),
    voiturePage(ctx),
    checkPage(ctx),
    coucheDePlusPage(ctx),
    sourcesPage(ctx),
    confidentialitePage(ctx),
  ];
  const files = new Map();
  for (const page of pages) files.set(`${page.path}index.html`, layout(ctx, page));
  files.set('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `  <url><loc>${esc(site + p.path)}</loc><lastmod>${ctx.updated}</lastmod></url>`).join('\n')}
</urlset>
`);
  return { files, pages };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { files } = buildGuide(loadRules());
  for (const [rel, content] of files) {
    const path = join(ROOT, rel);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  }
  console.log(`guide : ${files.size} fichiers écrits`);
}
