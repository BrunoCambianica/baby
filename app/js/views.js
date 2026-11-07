// Vues de l'app : des fonctions qui renvoient du HTML. Tout texte variable passe par esc().
import { addDays, ageMonths, baseTransport, homeStatus, hourFr, needMet, ownedCount, pieceChoices, quantityFor, render, skyTheme, sleepbagCount, toMin } from '../../engine/engine.js';
import { configChildren, parisNow } from '../../engine/adapter.js';
import { dayLong, dayShort, decimal, esc, guideBandPath, MONTHS } from './format.js';
import { bagReason } from './fiche.js';
import { ageLabel, feedbackHint, outingHours } from './household.js';
import { icon, weatherIcon } from './icons.js';
import { CATEGORY_DRAWINGS, drawingSvg, ITEM_DRAWINGS } from '../../engine/drawings.js';

export const VERSION = '0.26.0';
// Durées de sortie proposées, en heures : 30 minutes (les courses, l'école), puis 1 à 4 h (une sortie de 4 h peut avoir
// un changement en route).
export const OUTING_HOURS = [0.5, 1, 2, 3, 4];
export const durationLabel = (d) => (d < 1 ? '30\u00a0min' : `${d}\u00a0h`);
export const TRANSPORTS = [
  ['poussette', 'Poussette', 'stroller'],
  ['porte_bebe', 'Porte-bébé', 'carrier'],
  ['a_pied', 'À pied', 'walk'],
  ['voiture', 'Voiture', 'car'],
];
const SLOT_FLAG = {
  hors_jour: 'nuit',
  canicule_heures_chaudes: 'chaleur',
  ozone_apres_midi: 'ozone',
  froid_extreme: 'froid vif',
  pluie: 'pluie',
  vent: 'rafales',
};
const NOTE_ICON = {
  'practical.rain.cover': 'umbrella',
  'practical.rain.cover_warm': 'umbrella',
  'practical.rain.later': 'umbrella',
  'practical.wind': 'wind',
  'practical.carrier.body_heat': 'carrier',
  'practical.carrier.no_footed': 'carrier',
  'practical.walk.body_heat': 'walk',
  'relay.carrier.cover_face': 'shield',
  'relay.carrier.airway_heat': 'shield',
  'relay.carrier.slippery': 'snow',
};
const SCRIPTABLE_URL = 'https://apps.apple.com/fr/app/scriptable/id1405459188';

const capitalize = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '');
// Tenues en dessins (par défaut) ou en texte, au choix dans les réglages.
const drawingsOn = (state) => state.profile?.outfit_view !== 'texte';
const childName = (c, i) => c.name || `Enfant ${i + 1}`;
// Le mode « à pied » n'est proposé qu'à partir de l'âge prévu par les règles (2 ans).
const canWalk = (state, birth) => ageMonths(birth, state.today) >= state.bundle.rules.outfit.transport.a_pied.min_age_m;
const modesFor = (state, birth) => TRANSPORTS.filter(([v]) => v !== 'a_pied' || canWalk(state, birth));
const chev = (size = 18) => `<span class="chev">${icon('chevronRight', { size })}</span>`;
const heroArt = (name) => `<div class="hero-art">${icon(name, { size: 150, stroke: 1.2 })}</div>`;
// Nom court dans le texte, nom complet et titre au survol ; la liste complète est dans « Charte et sources ».
const sourceName = (s) => s?.short ?? s?.publisher ?? '';
const sourceLinks = (state, ids) => ids
  .map((sid) => state.sourcesById.get(sid))
  .filter(Boolean)
  .map((s) => (s.url
    ? `<a href="${esc(s.url)}" target="_blank" rel="noopener" title="${esc(`${s.publisher} : ${s.title}`)}">${esc(sourceName(s))}</a>`
    : esc(sourceName(s))))
  .join(' · ');

export const loading = () => '<p class="boot">Chargement…</p>';

export const fatal = (message) =>
  `<div class="page"><p class="boot">${esc(message)}</p><button class="btn" data-action="reload">Recharger</button></div>`;

export function communeResults(results) {
  return results
    .map((c, i) => `<li><button type="button" data-action="pick-commune" data-index="${i}"><span>${esc(c.nom)}</span><span class="muted">${esc(c.cp || c.dep)}</span></button></li>`)
    .join('');
}

function communePicker(draft, results) {
  const chosen = draft.commune;
  return `<input id="commune-q" type="search" inputmode="search" autocomplete="off" autocapitalize="words" spellcheck="false"
      placeholder="Commune ou code postal" value="${esc(draft.query ?? '')}" aria-label="Commune ou code postal">
    <ul id="commune-results" class="results"${results.length ? '' : ' hidden'}>${communeResults(results)}</ul>
    <div class="card-head">
      <span class="${chosen ? 'tag green' : 'hint'}">${chosen ? `${icon('check', { size: 14 })} ${esc(chosen.nom)} (${esc(chosen.dep)})` : 'Choisissez dans la liste'}</span>
      <button type="button" class="link" data-action="locate">${icon('pin', { size: 16 }).replace('class="ico"', 'class="ico" style="display:inline;vertical-align:-3px"')} Ma position</button>
    </div>`;
}

function birthSelects(draft, today) {
  const year = Number(today.slice(0, 4));
  const months = MONTHS.map((m, i) => {
    const v = String(i + 1).padStart(2, '0');
    return `<option value="${v}"${draft.birthMonth === v ? ' selected' : ''}>${m}</option>`;
  }).join('');
  const years = Array.from({ length: 6 }, (_, k) => year - k)
    .map((y) => `<option value="${y}"${draft.birthYear === String(y) ? ' selected' : ''}>${y}</option>`).join('');
  return `<div class="pair">
      <select id="birth-month" aria-label="Mois de naissance">${months}</select>
      <select id="birth-year" aria-label="Année de naissance">${years}</select>
    </div>
    ${draft.birthError ? `<p class="error">${esc(draft.birthError)}</p>` : ''}`;
}

// Prénom ou surnom, facultatif : il sert à distinguer les enfants et les widgets, et reste sur le téléphone.
const nameField = (draft) => `<label class="field"><span>Prénom ou surnom <em>facultatif</em></span>
    <input id="child-name" type="text" maxlength="24" autocomplete="off" autocapitalize="words" spellcheck="false" value="${esc(draft.name ?? '')}" placeholder="Par exemple : Léo">
  </label>`;

const TRANSPORT_TEXT = {
  poussette: 'La tenue de sortie classique.',
  porte_bebe: 'Une couche de moins, sans pyjama à pieds.',
  a_pied: 'Il marche : une couche de moins qu\'en poussette.',
  voiture: 'Sans manteau épais sous le harnais.',
};
function transportChoices(state, draft, birth) {
  return `<div class="choices" role="radiogroup">${modesFor(state, birth).map(([v, title, ico]) => `
    <button class="choice" role="radio" aria-checked="${draft.transport === v}" data-action="draft-transport" data-value="${v}">
      <span class="choice-ico">${icon(ico)}</span><span><strong>${title}</strong><span>${TRANSPORT_TEXT[v]}</span></span>
    </button>`).join('')}</div>`;
}

// Premier lancement : une question par écran.
export function viewOnboarding(state) {
  const { draft, results, today } = state;
  const step = draft.step;
  const progress = `<div class="progress" aria-label="Étape ${step} sur 3">${[1, 2, 3].map((n) => `<span class="${n <= step ? 'on' : ''}"></span>`).join('')}</div>`;
  let body;
  if (step === 1) {
    body = `<h2>Où vit bébé ?</h2>
      <p class="lead">Pour la météo de votre commune, rien d'autre.</p>
      ${communePicker(draft, results)}
      <button class="btn" data-action="onboard-next"${draft.commune ? '' : ' disabled'}>Continuer</button>
      <a class="link center" href="#recevoir">L'autre parent utilise déjà Superbébé ? Recevoir ses profils</a>`;
  } else if (step === 2) {
    body = `<h2>Quand est né votre enfant ?</h2>
      <p class="lead">Pour adapter les repères et les tailles à son âge.</p>
      ${birthSelects(draft, today)}
      ${nameField(draft)}
      <button class="btn" data-action="onboard-next">Continuer</button>
      <button class="link" data-action="onboard-back">Retour</button>`;
  } else {
    body = `<h2>Comment sortez-vous le plus souvent ?</h2>
      <p class="lead">Vous pourrez changer chaque jour. Un autre enfant ? Vous l'ajouterez ensuite dans les réglages.</p>
      ${transportChoices(state, draft, `${draft.birthYear}-${draft.birthMonth}`)}
      <p class="fine">Les repères de santé viennent de sources publiques (Santé publique France, ministère de la Santé, Météo-France…), toujours citées : ce n'est pas un avis médical. Vos réglages restent sur ce téléphone.</p>
      <button class="btn" data-action="onboard-finish">C'est parti</button>
      <button class="link" data-action="onboard-back">Retour</button>`;
  }
  return `<div class="onboard">
    <header class="hero hero--clair">
      ${heroArt('sun')}
      <div class="onboard-brand"><img src="icons/icon-192.png" alt=""><h1>Superbébé</h1></div>
      <p class="onboard-tagline">Chaque jour, le bon moment pour sortir avec bébé et la tenue qui va avec.</p>
    </header>
    <div class="onboard-body">${progress}${body}</div>
  </div>`;
}

// Écran principal : un ciel qui donne la réponse, des cartes, trois onglets.
// À partir de deux enfants, des pastilles choisissent l'enfant affiché ; les trois onglets le suivent.
function heroTop(state, date) {
  const children = state.household?.children ?? [];
  const kids = children.length > 1
    ? `<div class="kids" role="tablist" aria-label="Enfant">${children.map((c, i) => `<button class="glass" role="tab" aria-selected="${c.id === state.profile.id}" data-action="kid" data-value="${esc(c.id)}">${esc(childName(c, i))}</button>`).join('')}</div>`
    : '';
  return `<div class="hero-top">
      <div>
        <a class="hero-place" href="#reglages/commune">${icon('pin', { size: 18 })}${esc(state.profile.commune.nom)}</a>
        <p class="hero-date">${esc(dayLong(date))}</p>
      </div>
      <a class="glass glass-pill hero-baby" href="#reglages" aria-label="Réglages de ${esc(state.profile.name || 'bébé')}">${esc(state.profile.name || 'Bébé')} · ${esc(ageLabel(ageMonths(state.profile.birth, state.today)))}</a>
    </div>${kids}`;
}

function windowSlots(result) {
  const w = result.outing.window;
  return w ? result.outing.slots.filter((s) => s.time >= w.start && s.time < w.end) : [];
}

export const sortirTheme = (ctx) => skyTheme(ctx.result, ctx.moment);

function conditions(slots) {
  const rain = Math.max(...slots.map((s) => s.precip_prob));
  const parts = [rain >= 50 ? 'pluie probable' : rain >= 20 ? `averse possible (${rain} %)` : 'sec'];
  if (Math.max(...slots.map((s) => s.gust_kmh)) >= 40) parts.push('venteux');
  const uv = Math.max(...slots.map((s) => s.uv));
  if (uv >= 3) parts.push(`UV ${Math.round(uv)}`);
  return parts.join(' · ');
}

// Bascule à deux choix en haut du ciel : Aujourd'hui ou Demain (Dehors), Jour ou Nuit (Dedans).
const switcher = (label, action, choices, current) => `<div class="days glass" role="tablist" aria-label="${esc(label)}">${choices
  .map(([v, l]) => `<button role="tab" aria-selected="${current === v}" data-action="${action}" data-value="${v}">${l}</button>`).join('')}</div>`;

// Ce qui fait le meilleur créneau, en clair : « Au sec avant la pluie de 12 h et plus doux qu'à 9 h ».
const whyText = (M, w) => capitalize(w.why.map((x) => render(M, x.id, 'short', { hour: x.hour ? hourFr(x.hour) : '' })).join(' et '));

// ——— Extérieur ———
// Le ciel répond à « quand sortir ? » : le créneau idéal, « Choisir » pour y faire partir la sortie, et pourquoi
// seulement si on touche « Pourquoi ? » ; puis la bande des heures, où l'on choisit sa sortie (maintenant par défaut,
// l'heure de départ d'un toucher, la durée à côté). Les cartes disent la tenue de cette sortie-là. Sans créneau idéal,
// la raison en quelques mots, et le détail sous « Pourquoi ? ».
function heroDehors(state, ctx) {
  const M = state.bundle.messages;
  const { result, tomorrow } = ctx;
  const theme = sortirTheme(ctx);
  const w = result.outing.window;
  const open = state.open.has('pourquoi');
  const whyBtn = `<button class="why-btn" data-action="fold" data-value="pourquoi" aria-expanded="${open}">Pourquoi ?</button>`;
  const who = state.profile.count > 1 ? `${esc(childName(state.profile, state.profile.index))} · ` : '';
  let main;
  if (w) {
    const slots = windowSlots(result);
    const night = slots[0].time >= ctx.input.forecast.daylight.sunset;
    const s = ctx.slot;
    const pick = s?.cells.some((c) => c.time === w.start) && s.start !== w.start
      ? `<button class="glass glass-pill pick-btn" data-action="slot" data-value="${w.start}" data-center aria-label="Choisir ce créneau pour la sortie">Choisir</button>` : '';
    main = `<div class="cockpit glass">
      <p class="hero-label">${who}Idéal pour sortir</p>
      <div class="when-row"><p class="hero-big when">${span(w)}</p>${pick}</div>
      <p class="hero-sub">${icon(weatherIcon(slots[0].weather_code, { night, precipProb: slots[0].precip_prob }), { size: 22 })}<span>${Math.round(w.feels_c)}° ressentis · ${esc(conditions(slots))}</span>${w.why ? whyBtn : ''}</p>
      ${open && w.why ? `<p class="hero-why">${esc(nbsp(whyText(M, w)))}</p>` : ''}</div>`;
  } else {
    const reason = result.outing.reason;
    main = `<div class="cockpit glass">
      <p class="hero-label">${who}${tomorrow ? 'Demain' : "Aujourd'hui"}</p>
      <p class="hero-big words">${esc(render(M, `outing.none.${reason}`, 'short'))}</p>
      <p class="hero-sub">${whyBtn}</p>
      ${open ? `<p class="hero-why">${esc(render(M, `outing.none.${reason}`, 'text'))}</p>` : ''}</div>`;
  }
  const days = switcher('Jour', 'day', [['aujourdhui', "Aujourd'hui"], ['demain', 'Demain']], tomorrow ? 'demain' : 'aujourdhui');
  const art = { clair: 'sun', nuageux: 'cloud', pluie: 'rain', chaleur: 'sun', froid: 'snow', soir: 'moon', nuit: 'moonStars' }[theme];
  return `<header class="hero hero--${theme}">${heroArt(art)}${heroTop(state, ctx.date)}${days}${main}${outingPicker(state, ctx)}</header>`;
}

// Votre sortie : une bande d'heures (aujourd'hui de l'heure en cours, « Maintenant », jusqu'au soir ; demain dès le
// matin), chacune avec son ciel et son ressenti, le créneau idéal et les autres bons créneaux marqués. Toucher une heure
// y fait partir la sortie ; les heures qu'elle couvre sont surlignées. La durée (30 minutes à 4 h) se choisit à côté.
function outingPicker(state, ctx) {
  const s = ctx.slot;
  if (!s?.cells.length) return '';
  const { result, input } = ctx;
  const bySlot = new Map(result.outing.slots.map((x) => [x.time, x]));
  const inside = (t, w) => w && t >= w.start && t < w.end;
  const others = result.outing.windows.filter((x) => !x.best);
  const { sunrise, sunset } = input.forecast.daylight;
  const end = toMin(s.start) + s.hours * 60;
  const cells = s.cells.map((h) => {
    const slot = bySlot.get(h.time);
    const best = inside(h.time, result.outing.window);
    const good = !best && others.some((w) => inside(h.time, w));
    const night = h.time < sunrise || h.time >= sunset;
    const off = Boolean(slot?.reasons.length);
    const flag = best ? 'idéal' : h.now ? 'en cours' : good ? 'bien' : off ? SLOT_FLAG[slot.reasons[0]] ?? '' : night && !slot ? 'nuit' : '';
    const chosen = toMin(h.time) >= toMin(s.start) && toMin(h.time) < end;
    const label = hourFr(h.time);
    const cls = ['h-cell', chosen ? 'sel' : '', best ? 'best' : '', off && !chosen ? 'off' : ''].filter(Boolean).join(' ');
    return `<button class="${cls}" role="radio" aria-checked="${h.time === s.start}" data-action="slot" data-value="${h.time}"${h.now ? ' data-now' : ''}
        aria-label="${h.now ? 'Maintenant' : esc(label)}, ${Math.round(h.feels_c)} degrés ressentis${flag ? `, ${flag}` : ''}">
      <span class="h-flag">${flag}</span><span class="h-time">${label}</span>
      ${icon(weatherIcon(h.weather_code, { night, precipProb: h.precip_prob }), { size: 22 })}
      <span class="h-temp">${Math.round(h.feels_c)}°</span></button>`;
  }).join('');
  const durations = OUTING_HOURS.map((d) => `<button role="radio" aria-checked="${s.hours === d}" data-action="duration" data-value="${d}">${durationLabel(d)}</button>`).join('');
  return `<div class="outing-pick">
      <div class="pick-head"><p class="hero-label">Votre sortie</p>
        <div class="dur glass" role="radiogroup" aria-label="Durée de la sortie">${durations}</div></div>
      <div class="strip" data-key="${esc(ctx.date)}" role="radiogroup" aria-label="Heure de départ de la sortie">${cells}</div>
    </div>`;
}

// Le mode de sortie, en tête de la tenue de la sortie : poussette, porte-bébé, voiture (à pied à partir de 2 ans).
function modes(state, current, birth) {
  return `<div class="modes" role="radiogroup" aria-label="Mode de sortie">${modesFor(state, birth).map(([v, l, i]) =>
    `<button role="radio" aria-checked="${current === v}" data-action="transport" data-value="${v}">${icon(i, { size: 20 })}${l}</button>`).join('')}</div>`;
}

// Tranche de ressenti en titre, comme sur les guides par température : « Frais · 14 à 18 °C ».
function bandTitle(state, outfit) {
  const bands = state.bundle.rules.outfit.bands;
  const i = bands.findIndex((b) => b.id === outfit.base_band);
  if (i < 0) return '';
  const min = bands[i].min_feels_c;
  const above = bands[i - 1]?.min_feels_c;
  const range = min === null ? `moins de ${above} °C` : above === undefined ? `${min} °C et plus` : `${min} à ${above} °C`;
  return `<p class="band"><strong>${esc(state.bundle.messages.labels.bands[outfit.base_band])}</strong><span>${range} ressentis</span></p>`;
}

// La tenue : tuiles dessinées (de la peau vers le dessus, accessoires à la fin) ou liste écrite par couches.
function dressList(state, outfit, piece = null) {
  const labels = state.bundle.messages.labels;
  const layered = outfit.items.filter((i) => labels.item_layers[i] !== 'accessoire');
  const extras = outfit.items.filter((i) => labels.item_layers[i] === 'accessoire');
  if (drawingsOn(state)) {
    return `<ul class="dress">${[...layered, ...extras].map((item) => pieceTile(state, item, { piece, hint: labels.item_hints?.[item] })).join('')}</ul>`;
  }
  let previous = null;
  const rows = layered.map((item) => {
    const layer = labels.item_layers[item];
    const name = layer !== previous ? `<p class="layer-name">${esc(labels.layers[layer])}</p>` : '';
    previous = layer;
    return `<li class="layer"><span class="layer-dot"></span><div>${name}<p class="layer-items">${pieceText(state, item, piece, labels.items[item])}</p></div></li>`;
  }).join('');
  return `<ol class="layers">${rows}</ol>
    ${extras.length ? `<div class="extras">${extras.map((i) => `<span class="tag">${esc(capitalize(labels.items_short[i]))}</span>`).join('')}</div>` : ''}`;
}

// Les conseils sous une tenue : un repère officiel (le portage) dit sa source, une suggestion pratique non.
function noteList(state, notes, params) {
  const M = state.bundle.messages;
  return notes.map((n) => {
    const msg = M.messages[n];
    const official = msg?.kind === 'officiel';
    const text = esc(typo(render(M, n, 'text', params)));
    return official
      ? `<li class="official-tip">${icon(NOTE_ICON[n] ?? 'shield', { size: 20 })}<span><strong>${esc(typo(render(M, n, 'short', params)))}.</strong> ${text}<span class="source">Source : ${sourceLinks(state, msg.sources ?? [])}</span></span></li>`
      : `<li>${icon(NOTE_ICON[n] ?? 'info', { size: 20 })}<span>${text}</span></li>`;
  }).join('');
}

// Bien porter : les cinq principes de position de Santé Canada, en porte-bébé, dans une carte repliée, dépliée d'office
// avant guide_open_under_months mois (tant que le parent ne l'a pas repliée).
function carrierCard(state, ctx) {
  const R = state.bundle.rules;
  const mode = ctx.result.transport;
  const S = R.outfit.transport[mode]?.safety;
  if (!S) return '';
  const M = state.bundle.messages;
  const young = ctx.result.age_months < S.guide_open_under_months;
  const open = state.open.has('portage') || (young && !state.closed?.has('portage'));
  const sources = [...new Set(S.principles.flatMap((id) => M.messages[id].sources ?? []))];
  return `<details class="card fold carrier-guide" data-details="portage"${open ? ' open' : ''}>
    <summary>${icon('carrier', { size: 18 })}Bien porter : 5 repères${chev()}</summary>
    <ol class="facts principles">${S.principles.map((id) => `<li>${icon('check', { size: 18 })}<span><strong>${esc(render(M, id, 'short'))}.</strong> ${esc(typo(render(M, id, 'text')))}</span></li>`).join('')}</ol>
    <p class="source">Source : ${sourceLinks(state, sources)}</p>
  </details>`;
}

// Tenue sans plan de la sortie (prévisions qui ne couvrent pas ces heures) : celle du créneau conseillé.
function outfitCard(state, ctx) {
  const o = ctx.outing ?? ctx;
  const outfit = o.result.outfit;
  if (!outfit) return '';
  const tips = noteList(state, outfit.notes, o.result.params);
  return `<section class="card" aria-labelledby="t-dehors">
    <h2 class="card-title main" id="t-dehors">${icon('sun', { size: 20 })}Pour sortir</h2>
    ${modes(state, baseTransport(o.result.transport, state.bundle.rules), state.profile.birth)}
    ${bandTitle(state, outfit)}
    ${dressList(state, outfit, { where: 'dehors', date: o.date, swapped: outfit.swapped })}
    ${swapNote(state, outfit)}
    ${tips ? `<ul class="tips">${tips}</ul>` : ''}
  </section>`;
}

// Tenues au choix : une liste déroulante, la tenue affichée sélectionnée, celle par défaut signalée (en pastille dans
// la feuille qui s'ouvre, entre parenthèses pour les lecteurs d'écran). Fermée, la tenue choisie s'affiche en entier,
// sur deux lignes s'il le faut : une liste coupe son texte ; elle reste dessous, invisible, pour le clavier.
function outfitChoice(label, action, choices, extra = '') {
  const shown = choices.find((c) => c.selected) ?? choices[0];
  return `<label class="alts"><span class="alts-title">${esc(label)}</span>
      <span class="alts-box"><span class="alts-value" aria-hidden="true"><span>${esc(shown.text)}</span>${shown.byDefault ? '<span class="tag">par défaut</span>' : ''}</span>
      <select data-action="${action}"${extra} aria-label="${esc(label)}">${choices.map((c) =>
        `<option value="${esc(c.value)}"${c.selected ? ' selected' : ''}${c.byDefault ? ` data-label="${esc(c.text)}" data-hint="par défaut"` : ''}>${esc(c.text)}${c.byDefault ? ' (par défaut)' : ''}</option>`).join('')}</select></span></label>`;
}

// Une pièce de la tenue : dessin et nom, avec « − » (on l'enlève) ou « + » (on l'ajoute, ou on la remet) s'il y a lieu.
// Avec `piece` ({ where : dedans ou dehors, date, swapped }), elle se touche : ce qui l'explique et ses équivalents
// (pieceSheet) ; une pièce choisie à la place d'une autre porte une marque.
function pieceTile(state, item, { piece = null, sign = '', size = 34, hint = '' } = {}) {
  const name = capitalize(state.bundle.messages.labels.items_short[item] ?? item);
  const swapped = piece?.swapped?.[item];
  const cls = [sign === '−' ? 'minus' : sign === '+' ? 'plus' : '', swapped ? 'swapped' : ''].filter(Boolean).join(' ');
  const inner = `<span class="dress-ico">${drawingSvg(ITEM_DRAWINGS[item], { size })}${sign ? `<span class="sign" aria-hidden="true">${sign}</span>` : ''}${swapped ? `<span class="swap-mark" aria-hidden="true">${icon('refresh', { size: 12, stroke: 2.6 })}</span>` : ''}</span>
    <span class="dress-name">${esc(name)}</span>${hint ? `<span class="dress-hint">${esc(hint)}</span>` : ''}`;
  return `<li${cls ? ` class="${cls}"` : ''}>${piece ? `<button class="dress-btn" ${pieceData(item, piece)} aria-label="${esc(name)}${swapped ? ' (choisi)' : ''} : pourquoi, et par quoi la remplacer">${inner}</button>` : inner}</li>`;
}
const pieceData = (item, piece) => `data-action="piece" data-value="${esc(item)}" data-where="${piece.where}" data-date="${esc(piece.date)}"`;
// En texte : le nom, touchable de même.
const pieceText = (state, item, piece, text) => (piece
  ? `<button class="piece-link" ${pieceData(item, piece)}>${esc(capitalize(text))}${piece.swapped?.[item] ? ` ${icon('refresh', { size: 14 })}` : ''}</button>`
  : esc(capitalize(text)));
const changeItem = (state, item, sign, size = 28, piece = null) => pieceTile(state, item, { piece, sign, size });

// Les pièces choisies à la place des pièces conseillées, en clair sous la tenue, avec de quoi revenir. Celles que la
// garde-robe a remplacées le disent (« c'est celui qu'il a »), comme celles qu'il n'a pas, avec le lien vers la garde-robe.
function swapNote(state, plan) {
  const entries = Object.entries(plan.swapped ?? {});
  const missing = plan.missing ?? [];
  if (!entries.length && !missing.length) return '';
  const labels = state.bundle.messages.labels;
  const swaps = state.profile.swaps ?? {};
  const name = (item) => esc(labels.items_short[item]);
  const wardrobe = `<button class="link" data-action="open-wardrobe">Garde-robe</button>`;
  return `<ul class="swap-notes">${entries.map(([to, from]) => (plan.wardrobe?.[to] === from
    ? `<li>${icon('hanger', { size: 16 })}<span>${esc(capitalize(labels.items_short[to]))} plutôt que ${name(from)} : c'est ce qu'il a</span>${wardrobe}</li>`
    : `<li>${icon('refresh', { size: 16 })}<span>${esc(capitalize(labels.items_short[to]))} plutôt que ${name(from)} · ${swaps[from]?.day ? (swaps[from].day === state.today ? "aujourd'hui" : 'demain') : 'toujours'}</span>
      <button class="link" data-action="unswap" data-value="${esc(from)}">Revenir</button></li>`)).join('')}
    ${missing.map((item) => `<li class="missing">${icon('hanger', { size: 16 })}<span>Pas de ${name(item)} dans sa taille dans la garde-robe</span>${wardrobe}</li>`).join('')}</ul>`;
}

// Ce qu'ouvre une pièce touchée : son rôle et pour quoi elle est là, puis ses équivalents, pour ce jour-là ou toujours ;
// sans équivalent, pourquoi (et les pièces presque équivalentes, avec ce qui les en écarte). Une pièce déjà choisie
// propose de revenir à la pièce conseillée.
export function pieceSheet(state, ctx, item, where) {
  const M = state.bundle.messages;
  const R = state.bundle.rules;
  const labels = M.labels;
  const name = (i) => capitalize(labels.items_short[i] ?? i);
  const outdoor = where === 'dehors';
  const r = ctx.result;
  const plan = outdoor ? r.journee ?? r.outfit : r.indoor;
  const from = plan?.swapped?.[item] ?? null;
  const base = from ?? item;
  const choices = pieceChoices(base, R, outdoor ? r.transport : null);
  const swap = from ? state.profile.swaps?.[from] : null;
  // Remplacée par la garde-robe : la pièce qu'il a, à la place de celle conseillée.
  const owned = Boolean(from) && plan.wardrobe?.[item] === from;
  const today = ctx.date === state.today;
  const dayLabel = today ? "Aujourd'hui" : 'Demain';
  const always = state.profile.name ? `Toujours pour ${state.profile.name}` : 'Toujours';
  const range = R.indoor.comfort_range_c;
  const feels = r.journee
    ? `${r.journee.feels.first}°${r.journee.feels.extreme !== r.journee.feels.first ? ` → ${r.journee.feels.extreme}°` : ''}`
    : `${Math.round(r.outfit?.feels_c ?? 0)}°`;
  const context = outdoor ? `Dehors, ${feels} ressentis` : `Dedans, pièce à ${r.indoor.room_temp_c !== null ? `${decimal(r.indoor.room_temp_c)} °C` : `${range.min}-${range.max} °C`}`;
  const role = labels.slot_roles[choices.slot] ?? labels.layers[labels.item_layers[item]] ?? '';
  const buttons = (to) => `<div class="piece-btns">
      <button class="btn small tint" data-action="swap" data-from="${esc(base)}" data-to="${esc(to)}" data-scope="day" data-date="${esc(ctx.date)}">${dayLabel}</button>
      <button class="btn small soft" data-action="swap" data-from="${esc(base)}" data-to="${esc(to)}" data-scope="always" data-date="${esc(ctx.date)}">${esc(always)}</button></div>`;
  const options = choices.options.filter((o) => o.item !== item);
  const gap = (g) => labels.swap_gaps[g < 0 ? 'lighter' : g > 0 ? 'warmer' : 'same'];
  const reason = choices.reason && !from ? M.messages[choices.reason] : null;
  const less = R.outfit.alternatives.coverage[base] === 'corps_entier';
  const html = `<div class="piece-head"><span class="dress-ico">${drawingSvg(ITEM_DRAWINGS[item], { size: 34 })}</span>
      <div><p class="piece-role">${esc(role)}</p><p class="hint">${esc(context)}</p></div></div>
    ${owned ? `<div class="piece-now"><p>${icon('hanger', { size: 18 })}<span>Plutôt que ${esc(labels.items_short[from])} : c'est ce qu'il a dans sa taille</span></p>
      <div class="piece-btns"><button class="btn small soft" data-action="open-wardrobe">Ma garde-robe</button></div></div>`
    : plan?.missing?.includes(item) ? `<div class="piece-now"><p>${icon('hanger', { size: 18 })}<span>Pas dans sa taille dans la garde-robe</span></p>
      <div class="piece-btns"><button class="btn small soft" data-action="open-wardrobe">Ma garde-robe</button></div></div>`
    : from ? `<div class="piece-now"><p>${icon('refresh', { size: 18 })}<span>Plutôt que ${esc(labels.items_short[from])}, ${swap?.day ? (swap.day === state.today ? "aujourd'hui" : 'demain') : 'toujours'}</span></p>
      <div class="piece-btns"><button class="btn small soft" data-action="unswap" data-value="${esc(from)}">Revenir : ${esc(name(from))}</button>
      ${swap?.day ? `<button class="btn small tint" data-action="swap" data-from="${esc(from)}" data-to="${esc(item)}" data-scope="always" data-date="${esc(ctx.date)}">${esc(always)}</button>` : ''}</div></div>` : ''}
    ${options.length ? `<p class="piece-sub">${from ? 'Ou à la place' : 'À la place'}</p>
      <ul class="piece-opts">${options.map((o) => `<li><div class="piece-opt"><span class="dress-ico">${drawingSvg(ITEM_DRAWINGS[o.item], { size: 26 })}</span>
        <span><strong>${esc(name(o.item))}</strong><span class="hint">${esc(gap(o.gap))}</span></span></div>${buttons(o.item)}</li>`).join('')}</ul>` : ''}
    ${reason ? `<p class="tip">${icon('info', { size: 20 })}<span>${esc(render(M, choices.reason, 'text'))}</span></p>
      ${reason.sources?.length ? `<p class="source">Source : ${sourceLinks(state, reason.sources)}</p>` : ''}` : ''}
    ${choices.near.length && !from ? `<ul class="piece-near">${choices.near.map((n) => `<li><strong>${esc(name(n.item))}</strong> : ${esc(labels.swap_near[less && n.coverage !== 'corps_entier' ? 'less' : 'more'])}</li>`).join('')}</ul>` : ''}`;
  return { title: name(item), html };
}

// Dedans, le jour : la tenue pour la pièce où il passe la journée (sa température se règle dans le ciel), sans gigoteuse ;
// sans température notée, pour le milieu de la plage de 20 à 22 °C (Mieux vivre, Québec), en le disant. Avec ou sans
// pyjama la journée : le choix vaut aussi pour les sorties. Les repères de la chaleur restent visibles ; les autres se
// déplient, comme le geste de la nuque.
function homeDayCard(state, ctx) {
  const M = state.bundle.messages;
  const R = state.bundle.rules;
  const labels = M.labels;
  const i = ctx.result.indoor;
  const range = R.indoor.comfort_range_c;
  const piece = { where: 'dedans', date: ctx.date, swapped: i.swapped };
  const wear = drawingsOn(state)
    ? `<ul class="dress">${i.wear.map((item) => pieceTile(state, item, { piece })).join('')}</ul>`
    : `<p class="layer-items">${i.wear.map((item) => pieceText(state, item, piece, labels.items[item])).join(', ')}</p>`;
  const basis = i.room_temp_c !== null ? `Pour une pièce à ${decimal(i.room_temp_c)} °C` : `Pour ${range.min} à ${range.max} °C, le repère de jour`;
  const byDefault = R.outfit.default_day_style;
  const choice = i.styles?.length > 1
    ? outfitChoice('Tenue de la journée, dedans comme dehors', 'day-style', i.styles.map((st) => ({
      value: st.id, selected: st.id === i.day_style, byDefault: st.id === byDefault,
      text: `${st.id === 'pyjama' ? 'Avec pyjama' : 'Sans pyjama'} : ${st.wear.map((item) => labels.items_short[item]).join(', ')}`,
    })))
    : '';
  const hot = i.relays.filter((id) => R.indoor.when_hot.includes(id));
  const facts = i.relays.filter((id) => !hot.includes(id) && id !== 'relay.indoor.temperature' && id !== R.journee.check);
  const sources = [...new Set(i.relays.flatMap((id) => M.messages[id]?.sources ?? []))];
  return `<section class="card" aria-labelledby="t-dedans">
      <h2 class="card-title main" id="t-dedans">${icon('home', { size: 20 })}Sa tenue de la journée</h2>
      <p class="card-sub">${esc(basis)}</p>
      ${wear}
      ${swapNote(state, i)}
      ${hot.length ? `<ul class="tips">${hot.map((id) => `<li>${icon('sun', { size: 20 })}<span>${esc(render(M, id, 'short'))}</span></li>`).join('')}</ul>` : ''}
      ${choice}
    </section>
    ${facts.length ? `<details class="card fold" data-details="reperes-maison"${state.open.has('reperes-maison') ? ' open' : ''}>
      <summary>${icon('shield', { size: 18 })}Repères à la maison${chev()}</summary>
      <ul class="facts">${facts.map((id) => `<li>${icon('check', { size: 18 })}<span>${esc(render(M, id, 'short'))}</span></li>`).join('')}</ul>
      <p class="source">Sources : ${sourceLinks(state, sources)}</p>
    </details>` : ''}`;
}

// Un créneau en heures pleines, « 10–11 h » ; sinon « 10 h 30 – 11 h 30 ».
const span = (w) => (w.start.endsWith(':00') && w.end.endsWith(':00')
  ? `${Number(w.start.slice(0, 2))}–${hourFr(w.end)}`
  : `${hourFr(w.start)} – ${hourFr(w.end)}`);
// « 14 h » ne se coupe pas en fin de ligne.
const nbsp = (s) => s.replace(/(\d) h\b/g, '$1 h');
// Guillemets et deux-points tenus à leurs mots, comme en typographie française.
const typo = (s) => s.replace(/« /g, '« ').replace(/ ([»:;?!])/g, ' $1');

// Le temps d'une étape, de `from` à `to` (minutes) : « 9 à 12° ressentis · pluie vers 16 h »,
// « pluie jusqu'à 16 h, puis vers 17 h » quand elle reprend.
function stepWeather(state, j, from, to) {
  const hours = j.hours.filter((h) => toMin(h.time) + 60 > from && toMin(h.time) < to);
  if (!hours.length) return '';
  const feels = hours.map((h) => Math.round(h.feels_c));
  const [lo, hi] = [Math.min(...feels), Math.max(...feels)];
  const wet = (h) => h.precip_prob >= state.bundle.rules.journee.bag.rain_prob_at_least;
  const k = hours.findIndex(wet);
  const dry = hours.findIndex((h) => !wet(h));
  const again = dry > 0 ? hours.findIndex((h, i) => i > dry && wet(h)) : -1;
  const rain = k < 0 ? 'sec' : k > 0 ? `pluie vers ${hourFr(hours[k].time)}` : dry < 0 ? 'pluie'
    : `pluie jusqu'à ${hourFr(hours[dry].time)}${again > 0 ? `, puis vers ${hourFr(hours[again].time)}` : ''}`;
  return `${lo === hi ? lo : `${lo} à ${hi}`}° ressentis · ${rain}`;
}

// En voiture chauffée ou climatisée : deux étapes. Dans le siège auto, la tenue de la maison (ou ce qui change par
// rapport à elle), et au départ la couverture par-dessus le harnais quand il fait froid ; en sortant de la voiture, ce
// qu'on lui met pour la première heure de la sortie. Le sac garde la couche la plus chaude des heures qui suivent.
function carSteps(state, o, { first, piece, text, head }) {
  const labels = state.bundle.messages.labels;
  const j = o.result.journee;
  const { car } = j;
  const arrival = car.arrival[0]?.items ?? [];
  const cover = car.cover
    ? (text
      ? `<p class="layer-items">+ ${esc(labels.items[car.cover])} au départ, à enlever quand la voiture est chaude</p>`
      : `<ul class="dress small">${changeItem(state, car.cover, '+', 28, piece)}</ul><p class="hint">Au départ, à enlever quand la voiture est chaude.</p>`)
    : '';
  const out = !arrival.length
    ? '<p class="hint">Rien à ajouter.</p>'
    : text
      ? `<p class="layer-items">mettre ${esc(arrival.map((i) => labels.items[i]).join(', '))}</p>`
      : `<ul class="dress small">${arrival.map((i) => changeItem(state, i, '+', 28, piece)).join('')}</ul>`;
  const feels = j.hours[0]?.feels_c;
  return `<ol class="timeline" aria-label="En voiture">
      <li class="tl-step first">${head('Dans le siège auto', `voiture chauffée, vers ${car.cabin_c}°`)}${first}${cover}</li>
      <li class="tl-step">${head('En sortant de la voiture', typeof feels === 'number' ? `${Math.round(feels)}° ressentis` : '', arrival.length ? '+ à mettre' : '')}${out}</li>
    </ol>`;
}

// Le réglage de la voiture, sous la tenue : chauffée ou climatisée (par défaut), ou ni l'un ni l'autre.
const carClimateLine = (on) => `<p class="hint">${on
  ? 'Pas de chauffage ni de clim dans la voiture ?'
  : 'Voiture sans chauffage ni clim : habillé comme dehors, la combinaison devenue une couverture.'}
    <button class="link" data-action="car-climate" data-value="${on ? 'non' : 'oui'}">${on ? 'Habiller comme dehors' : 'Elle est chauffée ou climatisée'}</button></p>`;

// Votre sortie : la tenue pour le créneau choisi dans le ciel, selon le mode de sortie, choisi juste au-dessus d'elle.
// Elle se lit en entier, « + » sur ce qu'on ajoute à sa tenue de la maison, et à part ce qu'on lui enlève ; si le dessous
// change aussi (body, pyjama ou pantalon, chaussettes), la tenue complète sans signe. Une sortie de quatre heures peut
// avoir un changement en route (« Vers 14 h · plus doux »). Puis le sac de cette sortie seulement : la pluie, le soleil,
// une couche s'il fraîchit, de quoi le couvrir s'il s'arrête. Les conseils ensuite, et le guide pour qui veut savoir pourquoi.
// En rentrant : ce qu'on lui enlève à la maison, de la tenue de la fin de la sortie à celle de la maison (repère du NHS :
// le bonnet et les vêtements en trop, même s'il faut le réveiller). Si le dessous change aussi, on le dit. En voiture,
// le siège a déjà la tenue de la maison : rien à ajouter.
function backWear(state, o) {
  const j = o?.result.journee;
  if (!j || j.car) return null;
  const J = state.bundle.rules.journee;
  const fixed = (item) => J.fixed_slots.some((sl) => J.slots[sl].includes(item));
  let wear = [...j.morning];
  for (const ch of j.changes) wear = [...wear.filter((i) => !ch.remove.includes(i)), ...ch.add.filter((i) => !wear.includes(i))];
  const inside = o.result.indoor.wear;
  const under = (items) => items.filter(fixed).sort().join();
  const off = wear.filter((i) => !inside.includes(i) && !fixed(i));
  return off.length ? { off, same: under(wear) === under(inside) } : null;
}

function backBlock(state, back, piece, text) {
  const labels = state.bundle.messages.labels;
  const head = 'En rentrant, à lui enlever, même s\'il faut le réveiller (NHS)';
  const rest = back.same ? '' : 'Puis sa tenue de la maison : le dessous change aussi.';
  if (text) return `<p class="layer-items">${head} : ${esc(back.off.map((i) => labels.items[i]).join(', '))}.${rest ? ` ${rest}` : ''}</p>`;
  return `<div class="less homecoming"><p class="hint">${head}</p>
      <ul class="dress small">${back.off.map((i) => changeItem(state, i, '−', 28, piece)).join('')}</ul>
      ${rest ? `<p class="hint">${rest}</p>` : ''}</div>`;
}

function outingCard(state, ctx) {
  const o = ctx.outing;
  const j = o?.result.journee;
  if (!j) return outfitCard(state, ctx);
  const M = state.bundle.messages;
  const R = state.bundle.rules;
  const J = R.journee;
  const labels = M.labels;
  const s = ctx.slot;
  const text = !drawingsOn(state);
  const piece = { where: 'dehors', date: o.date, swapped: j.swapped };
  const inside = o.result.indoor.wear;
  const now = o.tomorrow ? null : o.input.now;
  const wearing = j.car ? j.car.seat : j.morning;
  const under = (items) => items.filter((item) => J.fixed_slots.some((sl) => J.slots[sl].includes(item))).sort().join();
  const over = under(inside) === under(wearing);
  const extra = over ? wearing.filter((item) => !inside.includes(item)) : [];
  const less = over ? inside.filter((item) => !wearing.includes(item)) : [];
  const ordered = [...wearing.filter((i) => labels.item_layers[i] !== 'accessoire'), ...wearing.filter((i) => labels.item_layers[i] === 'accessoire')];
  const outfit = text
    ? `<p class="layer-items">${ordered.map((i) => `${extra.includes(i) ? '+ ' : ''}${pieceText(state, i, piece, labels.items[i])}`).join(', ')}</p>`
    : `<ul class="dress">${ordered.map((i) => pieceTile(state, i, { piece, sign: extra.includes(i) ? '+' : '', hint: labels.item_hints?.[i] })).join('')}</ul>`;
  const legend = !over ? 'Sa tenue complète pour sortir : le dessous change aussi.'
    : extra.length ? '+ : à ajouter à sa tenue de la maison.' : 'Sa tenue de la maison suffit : rien à ajouter.';
  const removal = !less.length ? ''
    : text ? `<p class="layer-items">À lui enlever : ${esc(less.map((i) => labels.items[i]).join(', '))}</p>`
      : `<div class="less"><p class="hint">À lui enlever pour sortir</p><ul class="dress small">${less.map((i) => changeItem(state, i, '−', 28, piece)).join('')}</ul></div>`;
  const first = `${outfit}<p class="hint">${legend}</p>${removal}`;
  // L'heure et son temps sur une ligne ; « − à enlever · + à mettre » dessous.
  const head = (title, weather, legendText = '') => `<p class="tl-head"><strong>${title}</strong>${weather ? `<span class="tl-weather">${esc(nbsp(weather))}</span>` : ''}</p>
      ${legendText ? `<p class="hint tl-legend">${legendText}</p>` : ''}`;
  // Un changement en route dit pourquoi : plus doux ou plus frais que l'étape d'avant (les tranches vont du plus chaud au plus froid).
  const ahead = j.changes.filter((ch) => !now || toMin(ch.time) > toMin(now));
  const bandIdx = (id) => R.outfit.bands.findIndex((b) => b.id === id);
  const trend = (ch) => {
    const k = j.changes.indexOf(ch);
    return bandIdx(ch.band) < bandIdx(k > 0 ? j.changes[k - 1].band : j.band) ? 'plus doux' : 'plus frais';
  };
  const until = (k) => (ahead[k] ? toMin(ahead[k].time) : toMin(j.to));
  let body;
  if (j.car) body = carSteps(state, o, { first, piece, text, head });
  else if (!ahead.length) body = first;
  else {
    const steps = ahead.map((ch, k) => {
      const title = `Vers ${hourFr(ch.time)} · ${trend(ch)}`;
      const weather = stepWeather(state, j, toMin(ch.time), until(k + 1));
      return text
        ? `<li class="tl-step">${head(title, weather)}<p class="layer-items">${[ch.remove.length ? `enlever ${esc(ch.remove.map((i) => labels.items[i]).join(', '))}` : '', ch.add.length ? `mettre ${esc(ch.add.map((i) => labels.items[i]).join(', '))}` : ''].filter(Boolean).join(' ; ')}</p></li>`
        : `<li class="tl-step">${head(title, weather, [ch.remove.length ? '− à enlever' : '', ch.add.length ? '+ à mettre' : ''].filter(Boolean).join(' · '))}
          <ul class="dress small">${ch.remove.map((i) => changeItem(state, i, '−', 28, piece)).join('')}${ch.add.map((i) => changeItem(state, i, '+', 28, piece)).join('')}</ul></li>`;
    }).join('');
    body = `<ol class="timeline" aria-label="Pendant la sortie">
        <li class="tl-step first">${head(s.now ? 'Au départ' : `Dès ${hourFr(s.start)}`, stepWeather(state, j, toMin(j.from), until(0)))}${first}</li>
        ${steps}
      </ol>`;
  }
  const rainHot = j.bag.some((b) => b.reason === 'pluie' && b.item === 'habillage_pluie'
    && (j.hours.find((h) => h.time === b.time)?.feels_c ?? 0) >= R.outfit.overlays.rain_cover_warm_feels_c_at_least);
  const bag = j.bag.length
    ? `<div class="bag"><p class="bag-title">${icon('bag', { size: 18 })}Dans le sac</p><ul class="bag-list">${j.bag.map((b) => `<li>
        ${text ? '' : `<span class="dress-ico">${drawingSvg(ITEM_DRAWINGS[b.item], { size: 26 })}</span>`}
        <span><strong>${esc(capitalize(labels.items_short[b.item] ?? b.item))}</strong>${bagReason([b.item, b.reason, b.time], now) ? `<span class="hint"> · ${esc(bagReason([b.item, b.reason, b.time], now))}</span>` : ''}</span></li>`).join('')}</ul>
        ${rainHot ? `<p class="hint">${esc(render(M, 'practical.rain.cover_warm', 'text'))}</p>` : ''}</div>`
    : '';
  const tips = noteList(state, j.notes, o.result.params);
  // La page du guide pour le ressenti du départ : la tenue expliquée, avec ses sources (s'ouvre hors de l'app).
  // En voiture, la page de la voiture (dans le siège, au départ, en sortant).
  const guide = j.car || o.result.transport === 'voiture' ? 'guide/voiture/' : guideBandPath(R.outfit.bands, j.hours[0]?.feels_c);
  const title = s.now ? `Maintenant → ${hourFr(s.end)}` : `${o.tomorrow ? 'Demain, de' : 'De'} ${hourFr(s.start)} à ${hourFr(s.end)}`;
  const back = backWear(state, o);
  return `<section class="card day" aria-labelledby="t-dehors">
    <h2 class="card-title main" id="t-dehors">${icon('clock', { size: 20 })}${esc(title)}</h2>
    <p class="card-sub">${esc(nbsp(stepWeather(state, j, toMin(j.from), toMin(j.to))))}</p>
    ${modes(state, baseTransport(o.result.transport, R), state.profile.birth)}
    ${body}
    ${back ? backBlock(state, back, piece, text) : ''}
    ${swapNote(state, j)}
    ${bag}
    ${o.result.transport === 'voiture' ? carClimateLine(Boolean(j.car)) : ''}
    ${tips ? `<ul class="tips">${tips}</ul>` : ''}
    ${guide ? `<p class="hint guide-link"><a class="link" href="../${guide}">Pourquoi cette tenue ? Le guide, avec ses sources</a></p>` : ''}
  </section>`;
}

// La fiche de la journée, pour la nounou, la crèche ou les grands-parents : toute la plage horaire, pas seulement la sortie.
const ficheCard = () => `<section class="card fiche-card">
    <p class="hint">Pour la nounou, la crèche ou les grands-parents : sa tenue de toute la journée, les changements, le sac et la nuit.</p>
    <button class="btn soft" data-action="share-fiche">${icon('share', { size: 18 })}Envoyer la fiche de la journée</button>
  </section>`;

// Le geste pour savoir s'il a trop chaud, dedans comme dehors : sous les deux cartes.
function checkLine(state) {
  const check = state.bundle.messages.messages[state.bundle.rules.journee.check];
  return `<details class="check" data-details="nuque"${state.open.has('nuque') ? ' open' : ''}>
      <summary>${icon('info', { size: 18 })}<strong>${esc(check.short)}</strong>${chev(16)}</summary>
      <p>${esc(check.text)}</p><p class="source">Source : ${sourceLinks(state, check.sources ?? [])}</p>
    </details>`;
}

// « C'était juste ? » : sa tenue de dehors d'aujourd'hui, jugée par le parent, sur une sortie (`done`, voir main.js,
// doneOuting), choisie ou par défaut, une fois finie. Juste après une sortie choisie (done.recent), la carte « Retour de
// la sortie » vient en tête, avec ce qu'on lui enlève en rentrant, et « Pas sorti ? Masquer » (une heure touchée pour
// regarder) ; une sortie pas encore finie, rien encore. Sans
// sortie notée, sur la journée, une fois commencée depuis une heure. Et le soir, sous la sortie de demain. Une réponse par jour, changeable ; elle reste dans
// le foyer (et chez l'autre parent). Avant d'ajouter une couche, le geste de la nuque ; deux réponses dans le même sens
// en 7 jours proposent la tendance. `ctx` : aujourd'hui.
const FEEDBACK = [['chaud', 'Trop chaud'], ['juste', 'Juste'], ['froid', 'Trop froid']];
function feedbackCard(state, ctx, done = null) {
  const j = ctx?.result.journee;
  if (!j || ctx.tomorrow || done?.pending) return '';
  if (!done && ctx.moment !== 'soir' && toMin(ctx.input.now) < toMin(j.from) + 60) return '';
  const M = state.bundle.messages;
  const p = state.profile;
  const entry = p.feedback?.[state.today];
  const hint = entry && entry.v !== 'juste' ? feedbackHint(p.feedback, state.today, p.outfit_offset ?? 0) : null;
  const after = {
    juste: 'Merci, c\'est noté.',
    chaud: 'Noté. Si ça se répète, vous pourrez l\'habiller plus léger.',
    froid: `Noté. Avant d'ajouter une couche : ${render(M, state.bundle.rules.journee.check, 'short').toLowerCase()}.`,
  };
  const tendance = hint && `<div class="fb-hint"><p>${hint.n} fois « trop ${hint.v} » cette semaine.</p>
      <button class="btn small tint" data-action="feedback-tendance" data-value="${hint.offset}">${hint.v === 'chaud' ? 'Habiller plus léger désormais' : 'Habiller plus chaudement désormais'}</button></div>`;
  const who = esc(p.name || 'il');
  const during = done && nbsp(`la sortie de ${hourFr(done.start)} à ${hourFr(done.end)}`);
  const back = done?.recent && backWear(state, done.outing);
  const head = !done ? `${icon('check', { size: 18 })}Aujourd'hui dehors, ${who} avait…`
    : done.recent ? `${icon('home', { size: 18 })}Retour de ${during}` : `${icon('check', { size: 18 })}Pendant ${during}, ${who} avait…`;
  const question = done?.recent ? `<p class="fb-q" id="t-retour-q">Pendant la sortie, ${who} avait…</p>` : '';
  return `<section class="card feedback${done?.recent ? ' back-card' : ''}" aria-labelledby="t-retour">
      <h2 class="card-title" id="t-retour">${head}</h2>
      ${back ? backBlock(state, back, { where: 'dehors', date: done.outing.date, swapped: done.outing.result.journee.swapped }, !drawingsOn(state)) : ''}
      ${question}
      <div class="fb-btns" role="group" aria-labelledby="${question ? 't-retour-q' : 't-retour'}">${FEEDBACK.map(([v, l]) =>
        `<button class="fb" data-action="feedback" data-value="${v}" aria-pressed="${entry?.v === v}">${l}</button>`).join('')}</div>
      <p class="hint">${entry ? esc(hint ? 'Noté.' : after[entry.v]) : 'Une réponse par jour : elle aide à ajuster ses tenues.'}</p>
      ${tendance || ''}
      ${done?.recent ? '<button class="link back-hide" data-action="not-out">Pas sorti ? Masquer</button>' : ''}
    </section>`;
}

function officialCard(state, ids, params) {
  if (!ids.length) return '';
  const M = state.bundle.messages;
  const [first, ...others] = ids;
  const firstMsg = M.messages[first];
  const publisher = sourceName(state.sourcesById.get(firstMsg.sources?.[0]));
  const more = others.map((id) => `<p><strong>${esc(render(M, id, 'short', params))}</strong><span>${esc(render(M, id, 'text', params))}</span><span class="source">Source : ${sourceLinks(state, M.messages[id].sources ?? [])}</span></p>`).join('');
  return `<details class="card official">
    <summary>
      <span class="official-badge">${icon('shield', { size: 20 })}</span>
      <span><p class="official-text">${esc(render(M, first, 'short', params))}</p><p class="official-src">Repère officiel · ${esc(publisher)}${others.length ? ` · ${others.length} autre${others.length > 1 ? 's' : ''}` : ''}</p></span>
      ${chev()}
    </summary>
    <div class="official-body">
      <p>${esc(render(M, first, 'text', params))}</p>
      <p class="source">Source : ${sourceLinks(state, firstMsg.sources ?? [])}</p>
      ${more ? `<div class="official-more">${more}</div>` : ''}
    </div>
  </details>`;
}

const promo = (title, text) => `<section class="card promo">
    <span class="promo-ico">${icon('phone')}</span>
    <div><h3>${title}</h3><p>${text}</p></div>
    <button class="x" data-action="hide-promo" aria-label="Masquer">${icon('x', { size: 18 })}</button>
  </section>`;

function promoCard(state) {
  if (state.promoHidden || state.host === 'scriptable') return '';
  const one = state.profile.count > 1 ? ` de ${esc(childName(state.profile, state.profile.index))}` : '';
  // Dans un onglet du navigateur, d'abord l'app en plein écran ; le widget ensuite.
  if (state.inBrowser) {
    return state.device === 'android'
      ? promo('Superbébé en plein écran', `L'app pour Android : sans barre de navigateur, avec le widget. <a class="link" href="#widget">L'installer</a>`)
      : promo('Superbébé en plein écran', 'Sans les barres de Safari : bouton Partager, puis « Sur l\'écran d\'accueil ». Ouvrez ensuite Superbébé depuis son icône.');
  }
  if (state.host === 'android') {
    return state.widgets ? '' : promo(`Ajoutez le widget${one}`, `La réponse du jour sur l'écran d'accueil, sans ouvrir l'app. <button class="link" data-action="add-widget" data-child="${esc(state.profile.id)}">Ajouter</button>`);
  }
  return state.widgetReady ? '' : promo('Ajoutez le widget', `La réponse du jour sur l'écran d'accueil, sans ouvrir l'app. <a class="link" href="#widget">Comment faire</a>`);
}

const foot = () => `<p class="foot"><span>Repères officiels relayés, pas d'avis médical. Urgence : 15 ou 112.</span>
  <span><a href="#apropos">Charte et sources</a> · <a href="../">Le guide des tenues</a> · Météo Open-Meteo · v${VERSION}</span></p>`;

// Les repères officiels de Dehors : ceux de la journée et ceux de la sortie choisie (une sortie le soir, hors de la plage
// horaire, peut en ajouter), dans l'ordre de priorité des règles.
function outingRelays(state, ctx) {
  const order = state.bundle.rules.relay_priority;
  const rank = (id) => (order.includes(id) ? order.indexOf(id) : order.length);
  const ids = [...new Set([...ctx.result.relays, ...(ctx.outing?.result.relays ?? [])])].sort((a, b) => rank(a) - rank(b));
  return { ids, params: { ...(ctx.outing?.result.params ?? {}), ...ctx.result.params } };
}

// Onglet Extérieur : la tenue de la sortie choisie, le geste de la nuque, le portage, « C'était juste ? » (en tête juste
// après une sortie), les repères officiels, puis la fiche de la journée. Aujourd'hui, une fois la dernière heure passée, plus de sortie à choisir :
// demain, à préparer.
function dehorsContent(state, ctx) {
  if (!ctx.slot?.cells.length) {
    return `<section class="card"><p class="hint">Plus d'heure de sortie à choisir aujourd'hui.</p>
      <button class="btn soft" data-action="day" data-value="demain">Préparer demain</button></section>
      ${feedbackCard(state, ctx, ctx.done)}${foot()}`;
  }
  const relays = outingRelays(state, ctx);
  // Juste après une sortie, son retour en tête : ce qu'on lui enlève, et « C'était juste ? ».
  const feedback = feedbackCard(state, ctx.tomorrow ? (ctx.today?.moment === 'soir' ? ctx.today : null) : ctx, ctx.done);
  const back = !ctx.tomorrow && ctx.done?.recent;
  return [
    back ? feedback : '',
    outingCard(state, ctx),
    checkLine(state),
    carrierCard(state, ctx.outing ?? ctx),
    back ? '' : feedback,
    officialCard(state, relays.ids, relays.params),
    ctx.result.journee ? ficheCard() : '',
    ctx.tomorrow ? '' : promoCard(state),
    foot(),
  ].join('');
}

// ——— Dedans ———
// Le ciel dit la température de la pièce, réglée avec − et + : le jour, la pièce où il passe la journée ; la nuit, sa
// chambre. Chacune garde sa température d'un jour à l'autre, comme un thermostat : passer de Jour à Nuit retrouve la
// sienne. Notée il y a plus de ROOM_CHECK_DAYS jours, elle est redemandée d'un toucher (les saisons changent la
// température des pièces) ; jamais notée, la tenue vaut pour le repère, en le disant.
export const ROOM_CHECK_DAYS = 7;
function heroDedans(state, ctx) {
  const R = state.bundle.rules;
  const M = state.bundle.messages;
  const night = state.inside === 'nuit';
  const kind = night ? 'nuit' : 'jour';
  const plan = night ? ctx.result.night : ctx.result.indoor;
  const reading = night ? state.profile.room : state.profile.room_day;
  const known = plan.room_temp_c !== null;
  const base = night ? 19 : 21;
  const value = plan.room_temp_c ?? base;
  const who = state.profile.count > 1 ? `${esc(childName(state.profile, state.profile.index))} · ` : '';
  const step = (delta, label, ico) => `<button class="glass glass-btn" data-action="room" data-kind="${kind}" data-value="${delta}" data-base="${base}" aria-label="${label}">${icon(ico)}</button>`;
  const old = known && reading?.at && Date.now() - reading.at > ROOM_CHECK_DAYS * 86_400_000;
  const status = known
    ? `<p class="status-pill glass"><span class="dot ${plan.room_status === 'in_range' ? 'ok' : 'warn'}"></span>${esc(homeStatus(plan, kind, R, M))}</p>`
    : `<button class="status-pill glass" data-action="room" data-kind="${kind}" data-value="0" data-base="${base}">${icon('check', { size: 18 })}${night ? "C'est la température de sa chambre" : "C'est la température chez vous"}</button>`;
  const check = old
    ? `<p class="hero-note">Notée le ${esc(dayShort(parisNow(new Date(reading.at)).date))} ·<button class="why-btn" data-action="room" data-kind="${kind}" data-value="0" data-base="${base}">C'est toujours ${esc(decimal(value))}°</button></p>`
    : '';
  return `<header class="hero hero--${night ? 'nuit' : 'maison'}">${heroArt(night ? 'moonStars' : 'home')}${heroTop(state, ctx.date)}
    ${switcher('Moment', 'inside', [['jour', 'Jour'], ['nuit', 'Nuit']], kind)}
    <p class="hero-label">${who}${night ? 'Cette nuit, dans sa chambre' : 'Dans la pièce où il passe la journée'}</p>
    <div class="stepper">
      ${step('-0.5', "Baisser d'un demi-degré", 'minus')}
      <p class="hero-big${known ? '' : ' pending'}" aria-live="polite">${decimal(value)}°</p>
      ${step('0.5', "Monter d'un demi-degré", 'plus')}
    </div>
    ${status}${check}
  </header>`;
}

// Le widget Maison depuis son onglet. Dans l'app Android 0.13 et plus, sans widget Maison posé : le poser d'ici, sans
// chercher dans la liste des widgets du téléphone. Dans le navigateur d'un téléphone Android : il est dans l'app Android.
function homeWidgetPromo(state) {
  const card = (text) => `<section class="card promo">
    <span class="promo-ico">${icon('home')}</span>
    <div><h3>Le widget Maison</h3><p>${text}</p></div>
  </section>`;
  if (state.host === 'android') {
    // App Android antérieure à la 0.13 : pas de widget Maison, ni dans l'app ni dans la liste des widgets du téléphone.
    if (!state.androidHome) {
      const url = state.apkLatest?.url ?? `../dist/superbebe-android.apk?v=${VERSION}`;
      const versions = `${state.androidVersion || 'ancienne'}${state.apkLatest ? ` → ${state.apkLatest.versionName}` : ''}`;
      return card(`Il faut la nouvelle version de l'app Android (${esc(versions)}) : téléchargez-la, puis ouvrez le fichier et touchez « Mettre à jour ». <a class="link" href="${esc(url)}">Mettre à jour l'app</a>`);
    }
    return state.homeWidgets
      ? ''
      : card(`La température à noter avec − et + depuis l'écran d'accueil, et la tenue qui va avec. <button class="link" data-action="add-home-widget" data-child="${esc(state.profile.id)}">Ajouter</button>`);
  }
  return state.device === 'android' && !state.host && state.androidLink
    ? card(`Il est dans l'app Android Superbébé (version 0.13 ou plus), pas dans cette version navigateur. <a class="link" href="${esc(state.androidLink)}">Ouvrir l'app</a>`)
    : '';
}

// Où l'app est ouverte : utile pour savoir d'où viennent les widgets (seule l'app Android en pose sur Android).
function openedIn(state) {
  if (state.host === 'android') return 'app Android';
  if (state.host === 'scriptable') return 'widget iPhone (Scriptable)';
  return state.standalone ? 'icône installée depuis le navigateur' : 'navigateur';
}

// Onglet Dedans : le jour, sa tenue de la journée, sans gigoteuse ; la nuit, ce qu'on met sous la gigoteuse et son TOG,
// puis les repères du couchage.
function dedansContent(state, ctx) {
  if (state.inside !== 'nuit') return `${homeDayCard(state, ctx)}${checkLine(state)}${homeWidgetPromo(state)}${foot()}`;
  const M = state.bundle.messages;
  const n = ctx.result.night;
  // Les repères du couchage du nourrisson (liste détaillée) ne concernent que les moins de 2 ans.
  const basics = n.relays.includes('relay.sleep.basics') ? M.messages['relay.sleep.basics'] : null;
  const facts = [...(basics ? basics.list ?? [basics.short] : []), ...n.relays.filter((id) => id !== 'relay.sleep.basics').map((id) => render(M, id, 'short'))];
  const sources = [...new Set(n.relays.flatMap((id) => M.messages[id]?.sources ?? []))];
  return `${nightWearCard(state, n)}
    <section class="card">
      <div class="card-head"><h2 class="card-title">${icon('shield', { size: 18 })}Pour bien dormir</h2><span class="tag green">officiel</span></div>
      <ul class="facts">${facts.map((f) => `<li>${icon('check', { size: 18 })}<span>${esc(capitalize(f))}</span></li>`).join('')}</ul>
      <p class="source">Sources : ${sourceLinks(state, sources)}</p>
    </section>
    ${homeWidgetPromo(state)}
    ${foot()}`;
}

// Tenue de nuit : ce qu'on met sous la gigoteuse et son TOG, pour la chambre relevée ou, sans relevé, pour le repère officiel.
function nightWearCard(state, n) {
  const labels = state.bundle.messages.labels;
  const range = state.bundle.rules.night.room_range_c;
  const room = n.room_assumed ? `Chambre à ${range.min}-${range.max} °C, le repère officiel` : `Chambre à ${decimal(n.room_temp_c)} °C`;
  const wear = drawingsOn(state)
    ? `<ul class="dress">${n.wear.map((item) => `<li><span class="dress-ico">${drawingSvg(ITEM_DRAWINGS[item], { size: 34 })}</span>
        <span class="dress-name">${esc(capitalize(labels.items_short[item]))}</span></li>`).join('')}
        <li><span class="dress-ico">${drawingSvg('gigoteuse', { size: 34 })}</span><span class="dress-name">Gigoteuse ${esc(n.tog)} TOG</span></li></ul>`
    : `<p>Sous la gigoteuse : ${esc(n.wear.map((item) => labels.items[item]).join(' et '))}.</p>`;
  // Autres tenues publiées par les fabricants pour cette température, selon la gigoteuse qu'on a : plus légère, une couche
  // de plus dessous ; plus chaude, une de moins (contrôlé par lint). Le choix est gardé pour cette tranche seulement.
  const options = n.options ?? [];
  const chosen = options.find((o) => o.id === n.option);
  const otherBag = options.some((o) => o.tog !== options[0].tog);
  const choices = options.length > 1
    ? `${outfitChoice('Selon votre gigoteuse', 'night-option', options.map((o) => ({
      value: o.id, selected: o.id === n.option, byDefault: o.id === 'principal',
      text: `${o.tog} TOG : ${o.wear.map((item) => labels.items_short[item]).join(' + ')}`,
    })), ` data-bin="${esc(n.bin ?? '')}"`)}
        ${otherBag ? `<p class="hint">${esc(render(state.bundle.messages, 'fabricant.night.compensation', 'short'))}.</p>` : ''}`
    : '';
  return `<section class="card">
      <div class="card-head"><h2 class="card-title">${icon('bed', { size: 18 })}Pour la nuit</h2><span class="tag amber">fabricants</span></div>
      <p class="band"><strong>≈ ${esc(n.tog)} TOG</strong><span>${room}</span></p>
      ${wear}
      ${choices}
      <p class="hint">Repère des fabricants, à adapter à bébé : l'étiquette de la gigoteuse fait foi.${n.room_assumed ? ' Notez la température de sa chambre ci-dessus pour l\'ajuster.' : ''}</p>
      ${chosen?.sources.length ? `<p class="source">Source : ${sourceLinks(state, chosen.sources)}</p>` : ''}
    </section>`;
}

// Une seule échéance par achat : utile tout de suite, à avoir pour une date proche, ou à prévoir avant une date.
function buyWhen(x, date) {
  if (x.needed_from <= date) return { text: 'Dès maintenant', urgent: true };
  if (x.order_by <= date) return { text: `Utile dès le ${dayShort(x.needed_from)}`, urgent: true };
  return { text: `Avant le ${dayShort(x.order_by)}`, urgent: false };
}

function heroPrevoir(state, ctx) {
  const list = ctx.result.purchases;
  const first = list[0];
  const when = first && buyWhen(first, ctx.date).text;
  const sub = first ? `Le premier ${esc(when[0].toLowerCase() + when.slice(1))}` : 'Sur les 6 prochaines semaines';
  return `<header class="hero hero--prevoir">${heroArt('bag')}${heroTop(state, ctx.date)}
    <p class="hero-label">À prévoir</p>
    <p class="hero-big${list.length ? '' : ' words'}">${list.length ? `${list.length} achat${list.length > 1 ? 's' : ''}` : 'Rien à prévoir'}</p>
    <p class="hero-sub">${sub}</p>
  </header>`;
}

// Combien on en a dans une taille, avec − et + : la garde-robe et les suggestions se règlent de la même façon.
function counter(label, cat, size, n) {
  return `<div class="counter" role="group" aria-label="${esc(label)} : combien vous en avez">
      <button class="step-btn" data-action="count" data-cat="${cat}" data-size="${size}" data-value="-1" aria-label="Un de moins"${n ? '' : ' disabled'}>${icon('minus', { size: 16 })}</button>
      <span class="counter-n" aria-live="polite">${n}</span>
      <button class="step-btn" data-action="count" data-cat="${cat}" data-size="${size}" data-value="1" aria-label="Un de plus">${icon('plus', { size: 16 })}</button>
    </div>`;
}

// Une taille de la garde-robe par rapport à la sienne : la suivante « bientôt », une plus petite « trop petit ».
const sizeTag = (system, sz, now) => (sz === now ? '' : ` <span class="tag">${system.indexOf(sz) < system.indexOf(now) ? 'trop petit' : 'bientôt'}</span>`);

// Achats à prévoir, avec leur quantité conseillée (suggestion pratique) : de quoi tenir entre deux lessives plus une
// pièce de rechange pour les vêtements de tous les jours, deux gigoteuses (une portée, une au lavage), une combinaison.
// La garde-robe note combien il en a par taille ; le rythme de lessive, commun au foyer, se règle en tête.
function prevoirContent(state, ctx) {
  const M = state.bundle.messages;
  const R = state.bundle.rules;
  const P = R.purchases;
  const inv = state.profile.inventory ?? {};
  const owned = Object.values(inv).reduce((a, sizes) => a + sizes.length, 0);
  const name = (catId) => capitalize(M.labels.categories[catId]);
  const bagCat = (catId) => P.categories.find((c) => c.id === catId && c.togs);
  const items = ctx.result.purchases.map((x) => {
    const when = buyWhen(x, ctx.date);
    const why = x.reasons.map((r) => M.labels.reasons[r] ?? r).join(' · ');
    const official = x.relays.find((id) => M.messages[id]?.kind === 'officiel');
    const many = x.quantity > 1;
    const label = `${name(x.category)}${x.size === 'unique' ? '' : `, ${x.size_label}`}`;
    return `<article class="buy">
      <div class="buy-head"><h3>${drawingsOn(state) ? `<span class="buy-ico">${drawingSvg(CATEGORY_DRAWINGS[x.category], { size: 26 })}</span>` : ''}${esc(name(x.category))}</h3>${x.size === 'unique' ? '' : `<span class="tag blue">${esc(x.size_label)}</span>`}</div>
      ${many ? `<p class="buy-count"><strong>Il en manque ${x.quantity - x.owned}</strong><span class="hint nowrap"> · conseillé : ${x.quantity}</span></p>` : ''}
      <div class="buy-meta"><span class="tag${when.urgent ? ' amber' : ''}">${esc(when.text)}</span><span class="buy-why">${esc(capitalize(why))}</span></div>
      ${official ? `<p class="source">${esc(render(M, official, 'short'))} · ${sourceLinks(state, M.messages[official].sources ?? [])}</p>` : ''}
      <div class="buy-actions">
        ${bagCat(x.category)
    ? `<span class="buy-have">J'en ai une de</span>${bagCat(x.category).togs.map((tog) => `<button class="btn small tint" data-action="count" data-cat="${P.sleepbags.inventory}" data-size="${x.size}|${tog}" data-value="1">${tog} TOG</button>`).join('')}`
    : many
    ? `<span class="buy-have">Vous en avez</span>${counter(label, x.category, x.size, x.owned)}`
    : `<button class="btn small tint" data-action="count" data-cat="${x.category}" data-size="${x.size}" data-value="1">${icon('check', { size: 18 })}Je l'ai déjà</button>`}
        <button class="btn small soft" data-action="hide" data-key="${esc(x.key)}">Masquer</button>
      </div>
    </article>`;
  }).join('');
  // Les catégories de son âge (et des semaines qui viennent), en deux groupes : tous les jours, puis selon la saison.
  // Pour chacune : sa taille, la suivante s'il y passe d'ici six semaines, et celles où il en a déjà.
  const age = ageMonths(state.profile.birth, state.today);
  const later = ageMonths(state.profile.birth, addDays(state.today, P.horizon_weeks * 7));
  const fits = (cat) => !(cat.min_age_m && later < cat.min_age_m) && !(cat.max_age_m && age >= cat.max_age_m);
  const catBlock = (cat) => {
    const system = P.size_systems[cat.size_system];
    const now = system.find((sz) => age < sz.max_age_m) ?? system.at(-1);
    const soon = system.find((sz) => later < sz.max_age_m) ?? system.at(-1);
    const have = inv[cat.id] ?? [];
    const sizes = system.filter((sz) => sz === now || sz === soon || have.includes(sz.code));
    const rows = sizes.map((sz) => `<div class="size-row">
        <span>${esc(sz.code === 'unique' ? 'Vous en avez' : sz.label)}${sz.code === 'unique' ? '' : sizeTag(system, sz, now)}</span>
        ${counter(`${name(cat.id)}${sz.code === 'unique' ? '' : `, ${sz.label}`}`, cat.id, sz.code, ownedCount(inv, cat.id, sz.code))}
      </div>`).join('');
    return `<div class="cat"><p class="cat-name"><span>${esc(name(cat.id))}</span>${cat.wardrobe_only ? '' : `<span class="cat-qty">conseillé : ${quantityFor(cat, state.profile, R)}</span>`}</p>${rows}</div>`;
  };
  // Gigoteuses : par taille, une ligne par TOG utile aux saisons des semaines qui viennent (ou déjà notée), avec les
  // saisons où il sert ; deux conseillées par saison.
  const bags = P.categories.filter((c) => c.togs && fits(c));
  const sleepbagBlock = () => {
    if (!bags.length) return '';
    const system = P.size_systems.gigoteuse;
    const now = system.find((sz) => age < sz.max_age_m) ?? system.at(-1);
    const soon = system.find((sz) => later < sz.max_age_m) ?? system.at(-1);
    const noted = (inv[P.sleepbags.inventory] ?? []).map((e) => e.split('|'));
    const weeks = (ctx.input.outlook ?? []).slice(0, P.horizon_weeks);
    const coming = bags.filter((c) => !weeks.length || weeks.some((w) => needMet(c.need_if, w, null, state.profile.transport)));
    const seasonsOf = (tog) => bags.filter((c) => c.togs.includes(tog)).map((c) => M.labels.sleepbag_seasons[c.id]).join(', ');
    const sizes = system.filter((sz) => sz === now || sz === soon || noted.some(([code]) => code === sz.code)
      || Object.keys(P.sleepbags.legacy).some((id) => (inv[id] ?? []).includes(sz.code)));
    const rows = sizes.map((sz) => {
      const togs = P.sleepbags.togs.filter((tog) => coming.some((c) => c.togs.includes(tog)) || sleepbagCount(inv, sz.code, [tog], R));
      return `<p class="size-title">${esc(sz.label)}${sizeTag(system, sz, now)}</p>${togs.map((tog) => `<div class="size-row">
          <span>${tog} TOG<span class="hint"> · ${esc(seasonsOf(tog))}</span></span>
          ${counter(`Gigoteuse ${tog} TOG, ${sz.label}`, P.sleepbags.inventory, `${sz.code}|${tog}`, sleepbagCount(inv, sz.code, [tog], R))}
        </div>`).join('')}`;
    }).join('');
    return `<div class="cat"><p class="cat-name"><span>Gigoteuses</span><span class="cat-qty">2 par saison</span></p>${rows}</div>`;
  };
  const group = (title, list, first = '') => (list.length || first ? `<p class="cat-group">${title}</p>${first}${list.map(catBlock).join('')}` : '');
  // Gilets et pulls : notés, ils font proposer à la tenue ceux qu'il a (jamais suggérés à l'achat).
  const cats = group('Tous les jours', P.categories.filter((c) => c.suggest_once_noted && fits(c)))
    + group('Gilets et pulls', P.categories.filter((c) => c.wardrobe_only && fits(c)), `<p class="hint">Notez ceux qu'il a : ses tenues proposeront ceux-là, à chaleur égale.</p>`)
    + group('Selon la saison', P.categories.filter((c) => !c.suggest_once_noted && !c.wardrobe_only && !c.togs && fits(c)), sleepbagBlock());
  const wash = state.profile.wash_days ?? P.quantities.wash_days_default;
  const washPick = `<label class="wash"><span>Lessive tous les</span>
      <select data-action="wash" aria-label="Lessive tous les combien de jours" data-title="Une lessive tous les…">${P.quantities.wash_days_choices.map((d) =>
        `<option value="${d}"${d === wash ? ' selected' : ''}>${d} jours</option>`).join('')}</select></label>
    <p class="hint">${esc(render(M, 'purchase.quantity_rule', 'text'))}</p>`;
  return `${owned ? '' : `<section class="card"><p class="tip">${icon('hanger', { size: 20 })}<span>Indiquez d'abord ce que vous avez déjà dans « Ma garde-robe » : les suggestions seront plus justes.</span></p></section>`}
    ${items ? `<section class="card">${items}</section>` : `<section class="card"><p class="hint">Rien à prévoir pour l'instant${state.climateReady ? '' : ' (calcul en cours)'}. On vous préviendra ici quand la saison ou la taille changent, ou s'il vous en manque.</p></section>`}
    <details class="card wardrobe" data-details="garde-robe"${state.open.has('garde-robe') ? ' open' : ''}>
      <summary>${icon('hanger', { size: 20 })}Ma garde-robe <span class="tag">${owned}</span>${chev()}</summary>
      ${washPick}
      ${cats}
    </details>
    <p class="hint" style="padding:0 6px">Calcul sur 6 semaines : prévisions, puis moyennes des trois dernières années. Tailles indicatives selon l'âge.</p>
    ${foot()}`;
}

// Quatre onglets : Extérieur (quand sortir, et la tenue de la sortie), Intérieur (le jour, la nuit), Achats, Réglages.
// Dans le code, `dehors` et `dedans`. Chaque onglet a sa couleur : bleu, sauge, violet, ardoise.
function tabbar(state, ctx, current = state.tab) {
  const count = ctx?.result.purchases.length ?? state.buyCount ?? 0;
  const tabs = [['dehors', 'Extérieur', 'sun', 'blue'], ['dedans', 'Intérieur', 'home', 'sage'], ['prevoir', 'Achats', 'bag', 'violet'], ['reglages', 'Réglages', 'settings', 'slate']];
  return `<nav class="tabbar" role="tablist" aria-label="Sections">${tabs.map(([v, l, i, tone]) =>
    `<button role="tab" class="tone-${tone}" aria-selected="${current === v}" data-action="tab" data-value="${v}"><span class="tab-ico">${icon(i, { size: 22 })}</span><span>${l}</span>${v === 'prevoir' && count ? `<span class="badge">${count}</span>` : ''}</button>`).join('')}</nav>`;
}

export function viewApp(state, ctx) {
  if (!ctx) {
    const message = state.error
      ? `<p>${esc(state.error)}</p><button class="btn" data-action="refresh">Réessayer</button>`
      : '<p class="boot">Récupération de la météo…</p>';
    return `<header class="hero hero--clair">${heroArt('sun')}${heroTop(state, state.today)}</header><main class="content"><section class="card">${message}</section></main>`;
  }
  const stale = !ctx.input.forecast.hourly.length
    ? `<section class="card"><p class="tip">${icon('refresh', { size: 20 })}<span>Les prévisions enregistrées ne couvrent pas ce jour.</span></p><button class="btn soft" data-action="refresh">Actualiser</button></section>`
    : ctx.forecast.offline ? `<section class="card"><p class="tip">${icon('info', { size: 20 })}<span>Hors ligne : prévisions de ${esc(state.updatedAt)}.</span></p></section>` : '';
  let hero;
  let content;
  if (state.tab === 'dedans') {
    hero = heroDedans(state, ctx);
    content = dedansContent(state, ctx);
  } else if (state.tab === 'prevoir') {
    hero = heroPrevoir(state, ctx);
    content = prevoirContent(state, ctx);
  } else {
    hero = heroDehors(state, ctx);
    content = dehorsContent(state, ctx);
  }
  return `${hero}<main class="content">${stale}${content}</main>${tabbar(state, ctx)}`;
}

// Réglages, façon réglages iOS : enregistrés dès qu'on les change.
export function viewSettings(state) {
  const { draft, results, profile } = state;
  const hours = (from, to) => Array.from({ length: to - from + 1 }, (_, k) => `${String(from + k).padStart(2, '0')}:00`);
  const label = Object.fromEntries(TRANSPORTS.map(([v, l]) => [v, l]));
  const kids = state.household.children.map((c, i) => `<a class="row kid-row" href="#enfant/${esc(c.id)}">
      <span class="avatar" aria-hidden="true">${esc(childName(c, i).slice(0, 1).toUpperCase())}</span>
      <span class="kid-text"><strong>${esc(childName(c, i))}</strong><span class="hint">${esc(ageLabel(ageMonths(c.birth, state.today)))} · ${esc(label[c.transport] ?? '')}</span></span>${chev()}</a>`).join('');
  return `<header class="hero hero--reglages">${heroArt('settings')}<div class="hero-top"><p class="hero-date">${esc(dayLong(state.today))}</p></div>
    <p class="hero-label">Préférences et sécurité</p>
    <p class="hero-big words">Réglages</p>
    <p class="hero-sub"><span>Les calculs d'habillage, l'autre parent, les rappels et les widgets.</span></p>
  </header>
  <div class="page sheet-page">
    <section class="group"><h2 class="group-title">Enfants</h2>
      <div class="group-body">
        ${kids}
        <a class="row" href="#enfant/nouveau"><span>Ajouter un enfant</span>${icon('userPlus', { size: 20 })}</a>
      </div>
      <p class="group-note">Mois de naissance, mode de sortie et tendance de chacun. Prénoms et réglages restent sur ce téléphone.</p>
    </section>
    ${parentsGroup(state)}
    <section class="group"><h2 class="group-title">Sorties</h2>
      <div class="group-body">
        <div class="row column" id="reglage-commune"><span>Commune</span>${communePicker(draft, results)}</div>
        <div class="row column"><span>Plage horaire</span>
          <div class="pair">
            <select id="from" aria-label="Début" data-title="Début de la plage horaire">${hours(6, 20).map((h) => `<option value="${h}"${profile.outing_window.from === h ? ' selected' : ''}>de ${hourFr(h)}</option>`).join('')}</select>
            <select id="to" aria-label="Fin" data-title="Fin de la plage horaire">${hours(7, 22).map((h) => `<option value="${h}"${profile.outing_window.to === h ? ' selected' : ''}>à ${hourFr(h)}</option>`).join('')}</select>
          </div>
          ${draft.error ? `<p class="error">${esc(draft.error)}</p>` : ''}
        </div>
        <div class="row column"><span>Durée d'une sortie</span>
          <div class="seg" role="radiogroup" aria-label="Durée">${OUTING_HOURS.map((d) =>
            `<button role="radio" aria-checked="${outingHours(profile) === d}" data-action="duration" data-value="${d}">${durationLabel(d)}</button>`).join('')}</div>
        </div>
      </div>
      <p class="group-note">Les mêmes pour tous les enfants.</p>
    </section>
    <section class="group"><h2 class="group-title">Affichage</h2>
      <div class="group-body">
        <div class="row column"><span>Tenues</span>
          <div class="seg" role="radiogroup" aria-label="Affichage des tenues">${[['dessins', 'Dessins'], ['texte', 'Texte']].map(([v, l]) =>
            `<button role="radio" aria-checked="${(profile.outfit_view ?? 'dessins') === v}" data-action="outfit-view" data-value="${v}">${l}</button>`).join('')}</div>
        </div>
        <div class="row column"><span>Heure du coucher de bébé</span>
          <select data-action="bedtime" aria-label="Heure du coucher de bébé" data-title="Heure du coucher de bébé">${['18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'].map((h) => `<option value="${h}"${state.bedtime === h ? ' selected' : ''}>${hourFr(h)}</option>`).join('')}</select>
        </div>
      </div>
      <p class="group-note">Dans l'app et le widget : un petit dessin par vêtement, ou la liste écrite. L'écran est clair le jour et passe en sombre après l'heure du coucher : la nuit, ou pour une sortie qui part après.</p>
    </section>
    ${homeScreenGroup(state)}
    ${reminderGroup(state)}
    <section class="group"><h2 class="group-title">Application</h2>
      <div class="group-body">
        <button class="row" data-action="check-update"><span>${state.updateReady ? 'Installer la mise à jour' : 'Rechercher une mise à jour'}</span>${icon('refresh', { size: 20 })}</button>
        <div class="row"><span>Version de l'app</span><span class="value">${VERSION}</span></div>
        ${apkUpdate(state)
    ? `<a class="row" href="${esc(state.apkLatest.url)}"><span>Mettre à jour l'app Android</span><span class="value nowrap">${esc(state.androidVersion)} → ${esc(state.apkLatest.versionName)}</span></a>`
    : state.androidVersion ? `<div class="row"><span>App Android et widgets</span><span class="value">${esc(state.androidVersion)}${state.apkLatest ? ' · à jour' : ''}</span></div>` : ''}
        <div class="row"><span>Ouvert dans</span><span class="value">${esc(openedIn(state))}</span></div>
        <button class="row" data-action="copy-report"><span>Copier mes retours de test</span>${icon('share', { size: 20 })}</button>
        <a class="row" href="#apropos"><span>Charte, sources et confidentialité</span>${chev()}</a>
      </div>
    </section>
    <section class="group"><div class="group-body"><button class="row danger" data-action="clear">${state.confirmClear ? 'Toucher à nouveau pour tout effacer' : 'Effacer toutes mes données'}</button></div></section>
  </div>${tabbar(state, null, 'reglages')}`;
}

// Avec l'autre parent. Avec l'API : une famille synchronisée, chiffrée sur les téléphones. Sans : un lien à usage unique.
function parentsGroup(state) {
  const title = '<h2 class="group-title">Avec l\'autre parent</h2>';
  if (!state.api) {
    return `<section class="group">${title}
      <div class="group-body">
        <button class="row" data-action="share-profiles"><span>Envoyer les profils</span>${icon('share', { size: 20 })}</button>
        <a class="row" href="#recevoir"><span>Recevoir des profils</span>${chev()}</a>
      </div>
      <p class="group-note">Un lien à envoyer par message : il contient les prénoms et les réglages, et ne passe par aucun serveur de Superbébé. Les changements faits ensuite ne se transmettent pas tout seuls.</p>
    </section>`;
  }
  if (!state.family) {
    return `<section class="group">${title}
      <div class="group-body">
        <button class="row" data-action="family-create"><span>Partager les profils avec l'autre parent</span>${icon('share', { size: 20 })}</button>
        <a class="row" href="#recevoir"><span>Recevoir un lien</span>${chev()}</a>
      </div>
      <p class="group-note">Les deux téléphones gardent les mêmes enfants, réglages, garde-robe et relevés de température, sans compte. Tout est chiffré sur le téléphone avant de partir : le serveur ne peut pas lire les prénoms.</p>
    </section>`;
  }
  const at = state.family.synced_at ? new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(state.family.synced_at)).replace(':', ' h ') : '';
  return `<section class="group">${title}
    <div class="group-body">
      <button class="row" data-action="family-sync"><span>${state.familyError ? 'Serveur injoignable, réessayer' : `Profils partagés${at ? ` · à jour à ${at}` : ''}`}</span>${icon('refresh', { size: 20 })}</button>
      <button class="row" data-action="family-share"><span>Renvoyer le lien à l'autre parent</span>${icon('share', { size: 20 })}</button>
      <button class="row" data-action="family-leave"><span>Ne plus partager sur ce téléphone</span>${icon('x', { size: 20 })}</button>
    </div>
    <p class="group-note">Chiffré sur le téléphone : le serveur ne peut pas lire les prénoms. Le lien donne accès aux profils : gardez-le pour vous deux. L'affichage et le rappel du soir restent propres à chaque téléphone.</p>
  </section>`;
}

// Fiche d'un enfant : enregistrée dès qu'on la change ; « Ajouter un enfant » ne l'enregistre qu'au bouton.
export function viewChild(state) {
  const d = state.draft;
  const fresh = d.child === 'nouveau';
  const index = state.household.children.findIndex((c) => c.id === d.child);
  const title = fresh ? 'Nouvel enfant' : childName({ name: d.name }, index);
  const birth = `${d.birthYear}-${d.birthMonth}`;
  const pref = Math.sign(d.offset ?? 0);
  // Avec ou sans pyjama la journée : seulement tant que ses tenues en comportent un (avant 2 ans).
  const pyjamas = ageMonths(birth, state.today) < (state.bundle.rules.outfit.age_variants?.[0]?.from_months ?? 24);
  const remove = !fresh && state.household.children.length > 1
    ? `<section class="group"><div class="group-body"><button class="row danger" data-action="child-remove">${d.confirmRemove ? 'Toucher à nouveau pour retirer ce profil' : `Retirer ${esc(title)}`}</button></div></section>`
    : '';
  return `<header class="page-head"><a class="back" href="#reglages">${icon('chevronLeft')}Réglages</a><h1>${esc(title)}</h1></header>
  <div class="page">
    <section class="group">
      <div class="group-body">
        <div class="row column">${nameField(d)}</div>
        <div class="row column"><span>Mois de naissance</span>${birthSelects(d, state.today)}</div>
        <div class="row column"><span>Le plus souvent</span>${modes(state, d.transport, birth)}</div>
        <div class="row column"><span>Tendance</span>
          <div class="seg" role="radiogroup" aria-label="Tendance">${[[-1, 'A chaud'], [0, 'Normal'], [1, 'A froid']].map(([v, l]) =>
            `<button role="radio" aria-checked="${pref === v}" data-action="pref" data-value="${v}">${l}</button>`).join('')}</div>
        </div>
        ${pyjamas ? `<div class="row column"><span>La journée</span>
          <div class="seg" role="radiogroup" aria-label="La journée">${[['sans_pyjama', 'Sans pyjama'], ['pyjama', 'Avec pyjama']].map(([v, l]) =>
            `<button role="radio" aria-checked="${(d.dayStyle ?? state.bundle.rules.outfit.default_day_style) === v}" data-action="day-style" data-value="${v}">${l}</button>`).join('')}</div>
        </div>` : ''}
      </div>
      <p class="group-note">« A chaud » allège toutes ses tenues d'un cran, « A froid » les réchauffe d'un cran. « À pied » apparaît à partir de 2 ans.${pyjamas ? ' « Sans pyjama » : son équivalent en vêtements de jour (un haut, un pantalon et des chaussettes), dedans comme dehors ; la nuit ne change pas.' : ''}</p>
    </section>
    ${fresh ? '<button class="btn" data-action="child-add">Ajouter</button>' : remove}
  </div>`;
}

// Famille à rejoindre (lien de l'autre parent) : ce qu'elle contient, puis l'accord.
function viewJoin(state) {
  const j = state.joining;
  const back = `<a class="back" href="#">${icon('chevronLeft')}Retour</a>`;
  if (j.status !== 'pret') {
    return `<header class="page-head">${back}<h1>Rejoindre la famille</h1></header>
      <div class="page"><p class="boot">${j.status === 'erreur' ? 'Lien invalide, famille effacée ou serveur injoignable. Demandez un nouveau lien à l\'autre parent.' : 'Lecture de la famille…'}</p>
      ${j.status === 'erreur' ? '<button class="btn soft" data-action="family-refuse">Retour</button>' : ''}</div>`;
  }
  const label = Object.fromEntries(TRANSPORTS.map(([v, l]) => [v, l]));
  const kids = j.shared.children.map((c, i) => `<div class="row"><span>${esc(childName(c, i))}</span>
      <span class="value">${esc(ageLabel(ageMonths(c.birth, state.today)))} · ${esc(label[c.transport] ?? '')}</span></div>`).join('');
  const h = state.household;
  return `<header class="page-head">${back}<h1>Rejoindre la famille</h1>
      <p class="lead">Les profils de l'autre parent, pour ${esc(j.shared.commune?.nom || 'votre commune')}, partagés entre vos deux téléphones.</p></header>
    <div class="page">
      <section class="group"><div class="group-body">${kids}</div>
        ${h ? `<p class="group-note">Ils remplacent les réglages de ce téléphone (${esc(h.commune.nom)} : ${esc(h.children.map(childName).join(', '))}).</p>` : ''}</section>
      <button class="btn" data-action="family-join">Rejoindre</button>
      <button class="link" data-action="family-refuse">Ne pas rejoindre</button>
      ${state.host ? '' : `<p class="fine">Vous utilisez Superbébé depuis l'icône de l'écran d'accueil ? Elle garde ses propres réglages : copiez le lien reçu, puis dans l'app : Réglages, « Recevoir un lien ».</p>`}
    </div>`;
}

// Profils reçus de l'autre parent : ce qu'ils contiennent, puis l'accord. Sans lien reçu, un champ pour le coller.
export function viewReceive(state) {
  if (state.joining) return viewJoin(state);
  const cfg = state.received;
  const back = state.household
    ? `<a class="back" href="#reglages">${icon('chevronLeft')}Réglages</a>`
    : `<a class="back" href="#">${icon('chevronLeft')}Retour</a>`;
  if (!cfg) {
    return `<header class="page-head">${back}<h1>${state.api ? 'Recevoir un lien' : 'Recevoir des profils'}</h1>
      <p class="lead">Collez le lien envoyé par l'autre parent.</p></header>
    <div class="page">
      <section class="group"><div class="group-body"><div class="row column">
        <textarea id="profiles-link" rows="4" placeholder="https://…#partage=SB1…" aria-label="Lien reçu"></textarea>
      </div></div></section>
      <button class="btn" data-action="read-profiles">Continuer</button>
    </div>`;
  }
  const label = Object.fromEntries(TRANSPORTS.map(([v, l]) => [v, l]));
  const kids = configChildren(cfg).map((c, i) => `<div class="row"><span>${esc(childName(c, i))}</span>
      <span class="value">${esc(ageLabel(ageMonths(c.birth, state.today)))} · ${esc(label[c.transport] ?? '')}</span></div>`).join('');
  const h = state.household;
  const replaces = h
    ? `<p class="group-note">Ils remplacent les réglages de ce téléphone (${esc(h.commune.nom)} : ${esc(h.children.map(childName).join(', '))}). Garde-robe et relevés de température sont gardés pour les mêmes enfants.</p>`
    : '';
  return `<header class="page-head">${back}<h1>Profils reçus</h1>
      <p class="lead">Envoyés par l'autre parent, pour ${esc(cfg.n || 'votre commune')}.</p></header>
    <div class="page">
      <section class="group"><div class="group-body">${kids}</div>${replaces}</section>
      <button class="btn" data-action="accept-profiles">Utiliser ces profils</button>
      <button class="link" data-action="refuse-profiles">Ne pas les utiliser</button>
      ${state.host ? '' : `<p class="fine">Vous utilisez Superbébé depuis l'icône de l'écran d'accueil ? Elle garde ses propres réglages : <button class="link" data-action="copy-profiles">copiez le lien</button>, puis dans l'app : Réglages, « Recevoir des profils ».</p>`}
    </div>`;
}

// L'app Android installée est plus ancienne que la dernière publiée (comparaison des numéros 0.13.1…).
export function apkUpdate(state) {
  const parse = (v) => String(v ?? '').split('.').map((n) => Number.parseInt(n, 10) || 0);
  if (!state.androidVersion || !state.apkLatest?.versionName) return false;
  const [a, b] = [parse(state.androidVersion), parse(state.apkLatest.versionName)];
  for (let k = 0; k < Math.max(a.length, b.length); k++) if ((a[k] ?? 0) !== (b[k] ?? 0)) return (a[k] ?? 0) < (b[k] ?? 0);
  return false;
}

// Réglages : le widget selon le téléphone. Dans l'app Android, un seul bouton ; ouverte depuis le widget iPhone, rien.
// Une app Android antérieure à la 0.13 n'a pas le widget Maison : on propose la mise à jour à sa place.
function homeScreenGroup(state) {
  if (state.host === 'scriptable') return '';
  const homeRows = state.androidHome
    ? homeWidgetRows(state, (label, attrs) => `<button class="row" ${attrs}><span>${label}</span>${icon('home', { size: 20 })}</button>`)
    : state.apkLatest ? `<a class="row" href="${esc(state.apkLatest.url)}"><span>Widget Maison : mettre à jour l'app Android</span><span class="value">${esc(state.androidVersion || '?')} → ${esc(state.apkLatest.versionName)}</span></a>` : '';
  // Version navigateur sur Android : les widgets, dont le widget Maison, sont dans l'app Android ; on l'ouvre d'ici.
  const openApp = state.device === 'android' && !state.host && state.androidLink
    ? `<a class="row" href="${esc(state.androidLink)}"><span>Ouvrir l'app Android Superbébé</span>${chev()}</a>`
    : '';
  const rows = state.host === 'android'
    ? androidWidgetRows(state, (label, attrs) => `<button class="row" ${attrs}><span>${label}</span>${icon('plus', { size: 20 })}</button>`) + homeRows
    : `${openApp}<a class="row" href="#widget"><span>Ajouter le widget</span>${chev()}</a>
        ${state.device === 'ios' && state.widgetReady && state.updateLink ? `<a class="row" href="${esc(state.updateLink)}"><span>Envoyer mes réglages au widget</span>${icon('refresh', { size: 20 })}</a>` : ''}
        ${state.installPrompt ? `<button class="row" data-action="install"><span>Installer l'app</span>${icon('download', { size: 20 })}</button>` : ''}`;
  const note = state.device === 'ios' && state.widgetReady && !state.host
    ? '<p class="group-note">Après un changement de commune ou de réglage, touchez « Envoyer mes réglages au widget ».</p>'
    : openApp ? '<p class="group-note">Ici, c\'est la version navigateur. Sur Android, les widgets (dont le widget Maison) viennent de l\'app Superbébé : ouvrez-la, ou installez-la si elle manque.</p>' : '';
  return `<section class="group"><h2 class="group-title">Écran d'accueil</h2><div class="group-body">${rows}</div>${note}</section>`;
}

// Rappels : seulement si on les active ; le soir, une notification par jour au plus ; 15 minutes avant une sortie dont
// on a choisi l'heure, sa tenue et son sac. Calculés sur le téléphone, par l'app Android ou le widget iPhone
// (Scriptable) ; le soir, aussi par l'app de l'écran d'accueil avec l'API. Ailleurs, on dit comment les avoir.
const LEAD_MIN = 15;
function reminderGroup(state) {
  const title = '<h2 class="group-title">Rappels</h2>';
  if (!state.reminderHost && !state.webPush) {
    return `<section class="group">${title}<div class="group-body"><a class="row" href="#widget"><span>Avec le widget</span>${chev()}</a></div>
      <p class="group-note">La veille au soir, une notification avec la tenue et le sac de demain, et la nuit ; ${LEAD_MIN} minutes avant une sortie dont vous avez choisi l'heure, sa tenue et son sac. Elles passent par l'app Android ou par le widget iPhone (Scriptable)${state.api ? ' ; le soir, aussi par l\'app de l\'écran d\'accueil' : ''}.</p></section>`;
  }
  const r = state.reminder;
  const times = ['19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'];
  const seg = (action, on, label) => `<div class="seg" role="radiogroup" aria-label="${label}">${[['off', 'Non'], ['on', 'Oui']].map(([v, l]) =>
    `<button role="radio" aria-checked="${(on ? 'on' : 'off') === v}" data-action="${action}" data-value="${v}">${l}</button>`).join('')}</div>`;
  const before = state.outingReminderHost
    ? `<div class="row column"><span>${LEAD_MIN} min avant une sortie dont vous avez choisi l'heure, sa tenue et son sac</span>${seg('reminder-before', r.before, 'Rappel avant une sortie')}</div>` : '';
  const refused = (r.on || r.before) && state.reminderState === 'refuse'
    ? `<p class="error group-note">Notifications refusées : ${state.host === 'android' ? 'Réglages d\'Android, Applications, Superbébé, Notifications' : 'autorisez-les dans les réglages du téléphone'}.</p>`
    : r.on && state.reminderState === 'indisponible' ? '<p class="error group-note">Serveur des notifications injoignable : réessayez plus tard.</p>' : '';
  return `<section class="group">${title}
    <div class="group-body">
      <div class="row column"><span>La veille, la tenue et le sac de demain</span>${seg('reminder', r.on, 'Rappel du soir')}</div>
      ${r.on ? `<div class="row column"><span>Vers</span><select id="reminder-at" aria-label="Heure du rappel">${times.map((t) => `<option value="${t}"${r.at === t ? ' selected' : ''}>${hourFr(t)}</option>`).join('')}</select></div>` : ''}
      ${before}
    </div>
    ${refused}
    <p class="group-note">Le soir, une notification par jour au plus${before ? ' ; avant une sortie, seulement si vous avez choisi son heure' : ''}. Calculées sur ce téléphone${state.webPush ? ' : le serveur ne fait que le réveiller à l\'heure dite, sans rien lui envoyer d\'autre' : ', sans serveur'}.${state.host === 'scriptable' ? ' Scriptable demande l\'autorisation la première fois.' : ''}</p>
  </section>`;
}

// App Android : un bouton par enfant (Android attache l'enfant au widget posé), ou un seul bouton pour un enfant.
function androidWidgetRows(state, button) {
  const children = state.household.children;
  if (children.length < 2) {
    return button(state.widgets ? 'Ajouter un autre widget' : 'Ajouter le widget', `data-action="add-widget" data-child="${esc(children[0].id)}"`);
  }
  return children.map((c, i) => {
    const placed = state.widgetKids?.[c.id] ?? 0;
    return button(`${placed ? 'Un autre widget' : 'Le widget'} de ${esc(childName(c, i))}`, `data-action="add-widget" data-child="${esc(c.id)}"`);
  }).join('');
}

// App Android 0.13 et plus : le widget Maison, un par enfant (− et + y notent la température).
function homeWidgetRows(state, button) {
  const children = state.household.children;
  const label = (c, i) => `${state.homeWidgets ? 'Un autre widget Maison' : 'Le widget Maison'}${children.length > 1 ? ` de ${esc(childName(c, i))}` : ''}`;
  return children.map((c, i) => button(label(c, i), `data-action="add-home-widget" data-child="${esc(c.id)}"`)).join('');
}

// iPhone : un widget par enfant, choisi par le champ Parameter du widget.
function iosKidsHint(state) {
  const children = state.household.children;
  if (children.length < 2) return '';
  const names = children.map((c, i) => `<strong>${esc(c.name || String(i + 1))}</strong>`).join(' ou ');
  return `<p class="fine">Un widget par enfant : posez-en un pour chacun, puis appui long sur le widget, Modifier le widget, Parameter : ${names}.</p>`;
}

// iPhone : le widget Maison, même script, « maison » dans Parameter (et le prénom s'il y a plusieurs enfants).
function iosHomeHint(state) {
  const first = state.household.children[0];
  const example = state.household.children.length > 1 ? ` (ou <strong>${esc(first.name || '1')} maison</strong>)` : '';
  return `<p class="fine">Widget Maison (la température chez vous le jour, de sa chambre la nuit, et la tenue) : un autre widget Scriptable, Parameter : <strong>maison</strong>${example}. Le toucher ouvre l'app sur l'onglet Intérieur pour noter la température : le jour, la pièce où il passe la journée ; le soir, sa chambre.</p>`;
}

// Pose du widget sur iPhone en trois vignettes : les écrans tels qu'on les voit, l'endroit à toucher en bleu.
function widgetHowTo() {
  const phone = (inner) => `<svg viewBox="0 0 120 210" aria-hidden="true"><rect class="ph" x="3" y="3" width="114" height="204" rx="20"/>${inner}</svg>`;
  const apps = Array.from({ length: 12 }, (_, i) => `<rect class="soft" x="${16 + (i % 4) * 24}" y="${44 + Math.floor(i / 4) * 26}" width="16" height="16" rx="5"/>`).join('');
  const shots = [
    ['Appui long sur l\'écran d\'accueil, puis <strong>Modifier</strong> et <strong>Ajouter un widget</strong>',
      phone(`<rect class="acc" x="10" y="15" width="48" height="16" rx="8"/><text x="34" y="26" class="on">Modifier</text>${apps}
        <circle class="tap" cx="60" cy="150" r="13"/><circle class="acc" cx="60" cy="150" r="5"/>`)],
    ['<strong>Scriptable</strong>, taille moyenne, puis <strong>Ajouter le widget</strong>',
      phone(`<rect class="sheet" x="3" y="62" width="114" height="145" rx="18"/><rect class="soft" x="14" y="74" width="92" height="12" rx="6"/>
        <rect class="soft" x="14" y="94" width="14" height="14" rx="4"/><text x="34" y="105" class="label">Scriptable</text>
        <rect class="sky" x="14" y="118" width="92" height="42" rx="10"/><rect class="acc" x="24" y="172" width="72" height="18" rx="9"/><text x="60" y="184" class="on">Ajouter</text>`)],
    ['Appui long sur le widget, <strong>Modifier le widget</strong>, Script : <strong>Superbébé</strong>',
      phone(`<rect class="sky" x="12" y="24" width="96" height="46" rx="12"/><rect class="sheet" x="12" y="80" width="96" height="58" rx="12"/>
        <rect class="acc" x="14" y="86" width="92" height="18" rx="7"/><text x="60" y="98" class="on small">Modifier le widget</text>
        <rect class="soft" x="14" y="110" width="92" height="20" rx="7"/><text x="60" y="123" class="label mid small">Script : Superbébé</text>`)],
  ];
  return `<ol class="how">${shots.map(([caption, svg], i) => `<li>${svg}<span><b>${i + 1}</b> ${caption}</span></li>`).join('')}</ol>`;
}

// Assistant du widget : la plateforme du téléphone d'abord, une action par étape.
export function viewWidget(state, ctx) {
  const lines = ctx?.widget?.lines ?? [];
  const theme = ctx ? sortirTheme(ctx) : 'clair';
  const done = (n) => (state.steps.has(`${state.platform}-${n}`) ? ' done' : '');
  const num = (n) => `<span class="step-num">${state.steps.has(`${state.platform}-${n}`) ? icon('check', { size: 16 }) : n}</span>`;
  // iPhone : quatre gestes, un bouton par étape ; l'étape à faire est mise en avant.
  const next = [1, 2, 3, 4].find((n) => !state.steps.has(`ios-${n}`)) ?? 0;
  const at = (n) => `${done(n)}${n === next ? ' current' : ''}`;
  const ios = `
    <li class="step${at(1)}">${num(1)}<div class="step-body"><h3>Installer Scriptable</h3><p>L'app gratuite qui affiche le widget.</p>
      <a class="btn small tint" href="${SCRIPTABLE_URL}" target="_blank" rel="noopener" data-step="1">Ouvrir l'App Store</a></div></li>
    <li class="step${at(2)}">${num(2)}<div class="step-body"><h3>Copier le script</h3><p>Il contient déjà vos réglages.</p>
      <button class="btn small tint" data-action="copy-loader" data-step="2"${state.script ? '' : ' disabled'}>Copier le script</button></div></li>
    <li class="step${at(3)}">${num(3)}<div class="step-body"><h3>Le coller dans Scriptable</h3>
      <a class="btn small tint" href="scriptable:///add" data-step="3">Ouvrir Scriptable</a>
      <p>Un script vide s'ouvre : appui long dedans, <strong>Coller</strong>, puis <strong>▶</strong> en bas à droite. Scriptable affiche alors la suite.</p></div></li>
    <li class="step${at(4)}">${num(4)}<div class="step-body"><h3>Poser le widget</h3>
      ${widgetHowTo()}
      <button class="btn small soft" data-step="4">C'est fait</button>
      ${iosKidsHint(state)}
      ${iosHomeHint(state)}
      <p class="fine">Toucher le widget ouvre ensuite Superbébé en plein écran. Écran verrouillé : appui long dessus, Personnaliser, puis un widget Scriptable.</p></div></li>`;
  const android = `
    <li class="step${done(1)}">${num(1)}<div class="step-body"><h3>Télécharger l'app Superbébé</h3>
      <p>L'app complète en plein écran, avec le widget.</p>
      <a class="btn small tint" href="../dist/superbebe-android.apk?v=${VERSION}" download data-step="1">Télécharger (6 Mo)</a></div></li>
    <li class="step${done(2)}">${num(2)}<div class="step-body"><h3>L'installer</h3>
      <p>Ouvrez le fichier depuis la notification de téléchargement. Si Android le demande, autorisez Chrome à installer des applications.</p></div></li>
    <li class="step${done(3)}">${num(3)}<div class="step-body"><h3>L'ouvrir avec vos réglages</h3>
      <a class="btn small tint" href="${esc(state.androidLink)}" data-step="3" data-ready>Ouvrir l'app Superbébé</a>
      <p>Vos réglages y sont repris : rien à ressaisir.</p></div></li>
    <li class="step${done(4)}">${num(4)}<div class="step-body"><h3>Poser le widget</h3>
      <p>Dans l'app : <strong>Ajouter</strong> sur la carte « Ajoutez le widget », ou Réglages, Ajouter le widget${state.household.children.length > 1 ? ' : un bouton par enfant' : ''}.</p>
      <p class="fine">Utilisez ensuite l'icône de l'app Superbébé ; celle installée depuis le navigateur peut être retirée.</p></div></li>`;
  const inApp = `
    <li class="step${state.widgets ? ' done' : ''}"><span class="step-num">${state.widgets ? icon('check', { size: 16 }) : 1}</span><div class="step-body">
      <h3>${state.widgets ? 'Widget posé' : 'Poser le widget'}</h3>
      ${state.household.children.length > 1
        ? androidWidgetRows(state, (label, attrs) => `<button class="btn small tint" ${attrs}>${label}</button>`)
        : `<button class="btn small tint" data-action="add-widget" data-child="${esc(state.profile.id)}">${state.widgets ? 'Ajouter un autre widget' : "Ajouter à l'écran d'accueil"}</button>`}
      <p>Android demande de confirmer. Sinon : appui long sur l'écran d'accueil, Widgets, puis Superbébé${state.household.children.length > 1 ? ', et choisissez l\'enfant' : ''}.</p>
      <p class="fine">Le widget suit vos réglages et le relevé de la chambre, sans rien copier. Le toucher ouvre l'app.</p></div></li>
    ${state.androidHome ? `<li class="step${state.homeWidgets ? ' done' : ''}"><span class="step-num">${state.homeWidgets ? icon('check', { size: 16 }) : 2}</span><div class="step-body">
      <h3>Le widget Maison</h3>
      <p>La température chez vous le jour, de sa chambre la nuit : − et + la notent sans ouvrir l'app, et la tenue suit.</p>
      ${homeWidgetRows(state, (label, attrs) => `<button class="btn small tint" ${attrs}>${label}</button>`)}</div></li>` : ''}`;
  const tabs = state.host === 'android' ? '' : `<div class="seg" role="tablist" aria-label="Téléphone">${[['ios', 'iPhone'], ['android', 'Android']].map(([v, l]) =>
    `<button role="tab" aria-selected="${state.platform === v}" data-action="platform" data-value="${v}">${l}</button>`).join('')}</div>`;
  const steps = state.host === 'android' ? inApp : state.platform === 'android' ? android : ios;
  return `<header class="page-head"><a class="back" href="#">${icon('chevronLeft')}Retour</a><h1>Le widget</h1>
    <p class="lead">La réponse du jour sur l'écran d'accueil, sans ouvrir l'app.</p></header>
  <div class="page">
    <div class="widget-demo hero--${theme}"><p class="w-head">${esc(state.profile.name || 'Superbébé')} · ${esc(state.profile.commune.nom)}</p>${lines.map((l) => (typeof l === 'string'
      ? `<p class="w-line">${esc(l)}</p>`
      : `<p class="w-line w-drawings" aria-label="${esc(l.label)}">${l.drawings.map((id) => drawingSvg(id, { size: 22 })).join('')}${l.text ? `<span>${esc(l.text)}</span>` : ''}</p>`)).join('')}</div>
    ${tabs}
    <ol class="steps">${steps}</ol>
    ${state.platform === 'ios' && !state.host && state.script ? `<details class="card"><summary class="hint">Voir le script</summary><pre class="code">${esc(state.script)}</pre></details>` : ''}
    ${state.host ? '' : '<p class="fine">Pourquoi une app en plus ? Un site web ne peut pas poser de widget : sur iPhone on passe par Scriptable, sur Android par l\'app Superbébé, hors Play Store pendant le test.</p>'}
  </div>`;
}

// Charte, sources, confidentialité.
export function viewAbout(state) {
  const status = { lu: 'vérifiée', lu_via_recherche: 'à relire', a_verifier: 'à vérifier' };
  const sources = state.bundle.sources.sources.map((s) =>
    `<div class="row column"><span>${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.publisher)}</a>` : esc(s.publisher)}</span><span class="hint">${esc(s.title)} · ${status[s.verification] ?? ''}</span></div>`).join('');
  return `<header class="page-head"><a class="back" href="#reglages">${icon('chevronLeft')}Réglages</a><h1>Charte et sources</h1></header>
  <div class="page">
    <section class="group"><h2 class="group-title">Pas d'avis médical</h2>
      <div class="group-body"><div class="row column prose"><ul>
        <li>Les repères de santé et de sécurité sont relayés depuis des sources publiques, toujours citées.</li>
        <li>Tenues, créneaux et achats sont des suggestions pratiques.</li>
        <li>Les indications TOG viennent des fabricants : l'étiquette de la gigoteuse fait foi.</li>
        <li>Tenues au choix : seulement celles publiées par un fabricant. La nuit, une gigoteuse plus légère va toujours avec une couche de plus dessous, une plus chaude avec une de moins.</li>
        <li>Jamais proposés : tour de lit, couverture, cale-bébé, crème solaire avant 1 an.</li>
        <li>Fièvre, maladie, symptômes : demandez conseil à un professionnel de santé. Urgence : 15 ou 112.</li>
      </ul></div></div>
    </section>
    <section class="group"><h2 class="group-title">Confidentialité</h2>
      <div class="group-body"><div class="row column prose"><ul>
        <li>Pas de compte : vos réglages et les prénoms restent sur ce téléphone${state.api ? ', sauf si vous les partagez avec l\'autre parent, chiffrés (voir plus bas)' : ''}.</li>
        <li>« Envoyer les profils » crée un lien qui contient les prénoms et les réglages : il passe par la messagerie que vous choisissez, jamais par un serveur de Superbébé.</li>
        <li>Widget iPhone : le script copié dans Scriptable contient les réglages et les prénoms ; selon vos réglages iCloud, Scriptable peut le ranger dans iCloud Drive.</li>
        <li>La météo est demandée à Open-Meteo avec les coordonnées du centre de la commune, rien d'autre.</li>
        <li>« Ma position » envoie une position arrondie à environ 1 km à geo.api.gouv.fr, sans la conserver.</li>
        <li>Ni publicité, ni mesure d'audience.</li>
      </ul></div></div>
    </section>
    ${state.api ? `<section class="group"><h2 class="group-title">Serveur de Superbébé</h2>
      <div class="group-body"><div class="row column prose"><ul>
        <li>Seulement si vous partagez les profils avec l'autre parent, activez le rappel du soir sur l'app de l'écran d'accueil, ou envoyez une fiche du jour à lien court.</li>
        <li>Profils partagés : chiffrés sur le téléphone avec une clé qui ne quitte que le lien de famille ; le serveur garde un bloc illisible et l'empreinte du jeton d'accès. Effacés après 12 mois sans ouverture, ou tout de suite avec « Effacer toutes mes données » (pour les deux téléphones).</li>
        <li>Rappel du soir : l'adresse d'envoi fournie par le téléphone et l'heure choisie. Le serveur envoie une notification vide, par le service de notifications d'Apple ou de Google ; c'est le téléphone qui calcule le rappel. Effacé à la désactivation, ou après 6 mois.</li>
        <li>Fiche du jour à lien court : chiffrée, la clé n'est que dans le lien ; effacée au bout de 48 heures.</li>
        <li>Aucune adresse IP n'est enregistrée ; elle ne sert, en mémoire, qu'à limiter le nombre de requêtes.</li>
      </ul></div></div>
    </section>` : ''}
    <section class="group"><h2 class="group-title">Sources</h2><div class="group-body">${sources}</div></section>
    <section class="group"><h2 class="group-title">Crédits</h2>
      <div class="group-body"><div class="row column prose"><p>Météo : Open-Meteo (CC BY 4.0), modèles de Météo-France et du CEPMMT. Communes : geo.api.gouv.fr. Icônes : Tabler Icons (licence MIT).</p></div></div>
    </section>
  </div>`;
}
