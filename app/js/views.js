// Vues de l'app : des fonctions qui renvoient du HTML. Tout texte variable passe par esc().
import { ageMonths, homeMoment, homeStatus, hourFr, journeeRange, render, skyTheme, toMin, widgetLines } from '../../engine/engine.js';
import { configChildren } from '../../engine/adapter.js';
import { dayLong, dayShort, decimal, esc, MONTHS } from './format.js';
import { bagReason } from './fiche.js';
import { ageLabel } from './household.js';
import { icon, weatherIcon } from './icons.js';
import { CATEGORY_DRAWINGS, drawingSvg, ITEM_DRAWINGS } from '../../engine/drawings.js';

export const VERSION = '0.13.4';
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
        <a class="hero-place" href="#reglages">${icon('pin', { size: 18 })}${esc(state.profile.commune.nom)}</a>
        <p class="hero-date">${esc(dayLong(date))}</p>
      </div>
      <a class="glass glass-btn" href="#reglages" aria-label="Réglages">${icon('settings', { size: 20 })}</a>
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

// La veille au soir : demain, à préparer ce soir (ressenti et pluie de demain).
function heroEvening(state, ctx) {
  const M = state.bundle.messages;
  const next = ctx.evening.result;
  const range = journeeRange(next.journee, next.journee.from);
  const who = state.profile.count > 1 ? `${esc(childName(state.profile, state.profile.index))} · ` : '';
  const slots = next.outing.slots.filter((s) => s.time >= next.journee.from && s.time < next.journee.to);
  const w = next.outing.window;
  const outing = w ? `sortie idéale ${hourFr(w.start)} – ${hourFr(w.end)}` : render(M, `outing.none.${next.outing.reason}`, 'short');
  return `<header class="hero hero--nuit">${heroArt('moonStars')}${heroTop(state, ctx.date)}
    <p class="hero-label">${who}Demain · à préparer ce soir</p>
    <p class="hero-big">${range.stable ? `${range.first}°` : `${range.first}° → ${range.extreme}°`}</p>
    <p class="hero-sub"><span>${esc(slots.length ? `${conditions(slots)} · ` : '')}${esc(outing)}</span></p>
  </header>`;
}

function heroSortir(state, ctx) {
  if (ctx.evening?.result.journee) return heroEvening(state, ctx);
  const M = state.bundle.messages;
  const { result, date, tomorrow } = ctx;
  const theme = sortirTheme(ctx);
  const w = result.outing.window;
  const j = result.journee;
  const days = `<div class="days glass" role="tablist" aria-label="Jour">${[['aujourdhui', "Aujourd'hui"], ['demain', 'Demain']]
    .map(([v, l]) => `<button role="tab" aria-selected="${state.day === v}" data-action="day" data-value="${v}">${l}</button>`).join('')}</div>`;
  let main;
  if (j && result.outing.reason !== 'vigilance') {
    // La journée : le ressenti du matin (ou de l'heure qu'il est) jusqu'au plus chaud ou au plus froid ; la sortie idéale ensuite.
    const range = journeeRange(j, tomorrow ? j.from : ctx.input.now);
    const who = state.profile.count > 1 ? `${esc(childName(state.profile, state.profile.index))} · ` : '';
    const slots = result.outing.slots.filter((s) => s.time >= j.from && s.time < j.to);
    const first = (w && slots.find((s) => s.time === w.start)) ?? slots[0];
    const night = first ? first.time >= ctx.input.forecast.daylight.sunset : false;
    const outing = w ? `sortie idéale ${hourFr(w.start)} – ${hourFr(w.end)}` : render(M, `outing.none.${result.outing.reason}`, 'short');
    main = `<p class="hero-label">${who}${tomorrow ? 'Demain' : range.when}</p>
      <p class="hero-big">${range.stable ? `${range.first}°` : `${range.first}° → ${range.extreme}°`}</p>
      <p class="hero-sub">${first ? icon(weatherIcon(first.weather_code, { night, precipProb: first.precip_prob }), { size: 22 }) : ''}<span>${esc(slots.length ? `${conditions(slots)} · ` : '')}${esc(outing)}</span></p>`;
  } else if (w) {
    const slots = windowSlots(result);
    const night = slots[0].time >= ctx.input.forecast.daylight.sunset;
    main = `<p class="hero-label">Sortie idéale${tomorrow ? ' demain' : ''}</p>
      <p class="hero-big">${hourFr(w.start)} – ${hourFr(w.end)}</p>
      <p class="hero-sub">${icon(weatherIcon(slots[0].weather_code, { night, precipProb: slots[0].precip_prob }), { size: 22 })}${Math.round(w.feels_c)}° ressentis · ${esc(conditions(slots))}</p>`;
  } else {
    const over = result.outing.reason === 'journee_terminee';
    main = `<p class="hero-label">${tomorrow ? 'Demain' : "Aujourd'hui"}</p>
      <p class="hero-big words">${esc(render(M, `outing.none.${result.outing.reason}`, 'short'))}</p>
      ${!tomorrow ? `<div class="hero-actions"><button class="glass glass-pill" data-action="day" data-value="demain">Voir demain ${icon('chevronRight', { size: 18 })}</button></div>` : ''}
      ${over ? '' : `<p class="hero-sub">${esc(render(M, `outing.none.${result.outing.reason}`, 'text'))}</p>`}`;
  }
  const art = { clair: 'sun', nuageux: 'cloud', pluie: 'rain', chaleur: 'sun', froid: 'snow', soir: 'moon', nuit: 'moonStars' }[theme];
  return `<header class="hero hero--${theme}">${heroArt(art)}${heroTop(state, date)}${days}${main}</header>`;
}

function modes(state, current, birth) {
  return `<div class="modes" role="radiogroup" aria-label="Mode de sortie">${modesFor(state, birth).map(([v, l, i]) =>
    `<button role="radio" aria-checked="${current === v}" data-action="transport" data-value="${v}">${icon(i, { size: 22 })}${l}</button>`).join('')}</div>`;
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
function dressList(state, outfit) {
  const labels = state.bundle.messages.labels;
  const layered = outfit.items.filter((i) => labels.item_layers[i] !== 'accessoire');
  const extras = outfit.items.filter((i) => labels.item_layers[i] === 'accessoire');
  if (drawingsOn(state)) {
    return `<ul class="dress">${[...layered, ...extras].map((item) => `<li${labels.item_layers[item] === 'accessoire' ? ' class="extra"' : ''}>
        <span class="dress-ico">${drawingSvg(ITEM_DRAWINGS[item], { size: 34 })}</span><span class="dress-name">${esc(capitalize(labels.items_short[item]))}</span>
        ${labels.item_hints?.[item] ? `<span class="dress-hint">${esc(labels.item_hints[item])}</span>` : ''}</li>`).join('')}</ul>`;
  }
  let previous = null;
  const rows = layered.map((item) => {
    const layer = labels.item_layers[item];
    const name = layer !== previous ? `<p class="layer-name">${esc(labels.layers[layer])}</p>` : '';
    previous = layer;
    return `<li class="layer"><span class="layer-dot"></span><div>${name}<p class="layer-items">${esc(capitalize(labels.items[item]))}</p></div></li>`;
  }).join('');
  return `<ol class="layers">${rows}</ol>
    ${extras.length ? `<div class="extras">${extras.map((i) => `<span class="tag">${esc(capitalize(labels.items_short[i]))}</span>`).join('')}</div>` : ''}`;
}

// Tenue sans plan de la journée (prévisions qui ne couvrent pas la plage horaire) : celle du créneau conseillé.
function outfitCard(state, ctx) {
  const M = state.bundle.messages;
  const outfit = ctx.result.outfit;
  if (!outfit) return '';
  const tips = outfit.notes.map((n) => `<li>${icon(NOTE_ICON[n] ?? 'info', { size: 20 })}<span>${esc(render(M, n, 'text', ctx.result.params))}</span></li>`).join('');
  return `<section class="card" aria-labelledby="t-tenue">
    <div class="card-head">
      <h2 class="card-title" id="t-tenue">${icon('shirt', { size: 18 })}Comment l'habiller</h2>
      <button class="icon-btn" data-action="share" aria-label="Envoyer à la nounou ou au co-parent">${icon('share', { size: 18 })}</button>
    </div>
    ${modes(state, ctx.result.transport, state.profile.birth)}
    ${bandTitle(state, outfit)}
    ${dressList(state, outfit)}
    ${tips ? `<ul class="tips">${tips}</ul>` : ''}
  </section>`;
}

// Une tenue au choix : ses dessins (ou rien, en mode texte) et son nom, à adopter d'un geste.
function altButton(state, drawings, text, attrs) {
  const art = drawingsOn(state) ? `<span class="alt-art">${drawings.map((id) => drawingSvg(id, { size: 22 })).join('')}</span>` : '';
  return `<button class="alt" ${attrs}>${art}<span class="alt-text">${esc(text)}</span>${chev(16)}</button>`;
}

// Un vêtement du plan : dessin et nom, avec « − » (on l'enlève) ou « + » (on le remet).
function changeItem(state, item, sign) {
  const labels = state.bundle.messages.labels;
  return `<li class="${sign === '−' ? 'minus' : 'plus'}"><span class="dress-ico">${drawingSvg(ITEM_DRAWINGS[item], { size: 28 })}<span class="sign" aria-hidden="true">${sign}</span></span>
    <span class="dress-name">${esc(capitalize(labels.items_short[item] ?? item))}</span></li>`;
}

// La journée en couches : la tenue du matin, au plus deux changements, le sac, le geste de la nuque.
// Au fil de la journée, l'étape en cours est marquée « maintenant ». La veille au soir : « À préparer ce soir ».
function dayCard(state, ctx, { evening = false } = {}) {
  const M = state.bundle.messages;
  const labels = M.labels;
  const j = ctx.result.journee;
  const now = ctx.tomorrow ? null : ctx.input.now;
  const passed = now ? j.changes.filter((ch) => toMin(ch.time) <= toMin(now)).length : -1;
  const started = now && toMin(now) >= toMin(j.from);
  const mark = (k) => (k === passed && started ? ' <span class="tag blue">maintenant</span>' : '');
  const dim = (k) => (now && k < passed ? ' past' : '');
  const text = !drawingsOn(state);
  const changes = j.changes.map((ch, k) => (text
    ? `<p class="change${dim(k + 1)}"><strong>Vers ${hourFr(ch.time)}</strong>${mark(k + 1)} : ${[ch.remove.length ? `enlever ${esc(ch.remove.map((i) => labels.items[i]).join(', '))}` : '', ch.add.length ? `mettre ${esc(ch.add.map((i) => labels.items[i]).join(', '))}` : ''].filter(Boolean).join(' ; ')}</p>`
    : `<div class="change${dim(k + 1)}"><p class="change-time">Vers ${hourFr(ch.time)}${mark(k + 1)}</p>
        <ul class="dress small">${ch.remove.map((i) => changeItem(state, i, '−')).join('')}${ch.add.map((i) => changeItem(state, i, '+')).join('')}</ul></div>`)).join('');
  const rainHot = j.bag.some((b) => b.reason === 'pluie' && b.item === 'habillage_pluie'
    && (j.hours.find((h) => h.time === b.time)?.feels_c ?? 0) >= state.bundle.rules.outfit.overlays.rain_cover_warm_feels_c_at_least);
  const bag = j.bag.length
    ? `<div class="bag"><p class="bag-title">${icon('bag', { size: 18 })}Dans le sac</p><ul class="bag-list">${j.bag.map((b) => `<li>
        ${text ? '' : `<span class="dress-ico">${drawingSvg(ITEM_DRAWINGS[b.item], { size: 26 })}</span>`}
        <span><strong>${esc(capitalize(labels.items_short[b.item] ?? b.item))}</strong>${bagReason([b.item, b.reason, b.time]) ? `<span class="hint"> · ${esc(bagReason([b.item, b.reason, b.time]))}</span>` : ''}</span></li>`).join('')}</ul>
        ${rainHot ? `<p class="hint">${esc(render(M, 'practical.rain.cover_warm', 'text'))}</p>` : ''}</div>`
    : '';
  const tips = j.notes.map((n) => `<li>${icon(NOTE_ICON[n] ?? 'info', { size: 20 })}<span>${esc(render(M, n, 'text', ctx.result.params))}</span></li>`).join('');
  const check = M.messages[j.check];
  return `<section class="card day" aria-labelledby="t-jour">
    <div class="card-head">
      <h2 class="card-title" id="t-jour">${icon('shirt', { size: 18 })}${evening ? 'À préparer ce soir' : 'Habillez-le une fois'}</h2>
      <button class="icon-btn" data-action="share-fiche" aria-label="Envoyer la fiche du jour">${icon('share', { size: 18 })}</button>
    </div>
    ${modes(state, ctx.result.transport, state.profile.birth)}
    <div class="day-step${now && passed > 0 ? ' past' : ''}">
      <p class="change-time">${ctx.tomorrow ? 'Demain matin' : 'Le matin'}, dès ${hourFr(j.from)}${mark(0)}<span class="hint"> · ${esc(labels.bands[j.band])}</span></p>
      ${dressList(state, { items: j.morning })}
    </div>
    ${changes ? `<div class="changes">${changes}</div>` : `<p class="hint">Pas de changement à prévoir de ${hourFr(j.from)} à ${hourFr(j.to)}.</p>`}
    ${bag}
    <details class="check" data-details="nuque"${state.open.has('nuque') ? ' open' : ''}>
      <summary>${icon('info', { size: 18 })}<strong>${esc(check.short)}</strong>${chev(16)}</summary>
      <p>${esc(check.text)}</p><p class="source">Source : ${sourceLinks(state, check.sources ?? [])}</p>
    </details>
    ${tips ? `<ul class="tips">${tips}</ul>` : ''}
    <button class="btn soft" data-action="share-fiche">${icon('share', { size: 18 })}Envoyer la fiche du jour</button>
  </section>`;
}

function hoursCard(state, ctx) {
  const { result, input } = ctx;
  const slots = result.outing.slots;
  if (!slots.length) return '';
  const w = result.outing.window;
  const { sunrise, sunset } = input.forecast.daylight;
  const cells = slots.map((s) => {
    const best = Boolean(w) && s.time >= w.start && s.time < w.end;
    const off = s.reasons.length > 0;
    const night = s.time < sunrise || s.time >= sunset;
    const flag = best ? 'idéal' : off ? SLOT_FLAG[s.reasons[0]] ?? '' : '';
    return `<div class="h-cell${best ? ' best' : ''}${off ? ' off' : ''}" role="listitem"
        aria-label="${hourFr(s.time)}, ${Math.round(s.feels_c)} degrés ressentis${flag ? `, ${flag}` : ''}">
      <span class="h-flag">${flag}</span><span class="h-time">${hourFr(s.time)}</span>
      ${icon(weatherIcon(s.weather_code, { night, precipProb: s.precip_prob }), { size: 24 })}
      <span class="h-temp">${Math.round(s.feels_c)}°</span></div>`;
  }).join('');
  return `<details class="card fold" data-details="heures"${state.open.has('heures') ? ' open' : ''}>
    <summary>${icon('clock', { size: 18 })}Heure par heure${chev()}</summary>
    <div class="hours" role="list" aria-label="Heures de la journée">${cells}</div>
  </details>`;
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
  <span><a href="#apropos">Charte et sources</a> · Météo Open-Meteo · v${VERSION}</span></p>`;

// Ce soir, à côté de la journée de demain : la chambre, ce qu'on met sous la gigoteuse et son TOG.
function tonightCard(state, ctx) {
  const n = ctx.result.night;
  const labels = state.bundle.messages.labels;
  const wear = drawingsOn(state)
    ? `<ul class="dress small">${n.wear.map((item) => `<li><span class="dress-ico">${drawingSvg(ITEM_DRAWINGS[item], { size: 28 })}</span><span class="dress-name">${esc(capitalize(labels.items_short[item]))}</span></li>`).join('')}
        <li><span class="dress-ico night">${drawingSvg('gigoteuse', { size: 28 })}</span><span class="dress-name">Gigoteuse ${esc(n.tog)} TOG</span></li></ul>`
    : `<p>${esc(capitalize(n.wear.map((i) => labels.items_short[i]).join(' + ')))}, gigoteuse ≈ ${esc(n.tog)} TOG.</p>`;
  return `<section class="card">
      <div class="card-head"><h2 class="card-title">${icon('moon', { size: 18 })}Ce soir</h2>
        <span class="tag">${n.room_assumed ? 'chambre 18-20 °C' : `chambre ${decimal(n.room_temp_c)} °C`}</span></div>
      ${wear}
      <button class="btn soft" data-action="maison" data-value="nuit">${n.room_assumed ? 'Noter la chambre' : 'Préparer la nuit'}</button>
    </section>`;
}

function sortirContent(state, ctx) {
  // La veille au soir : la journée de demain à préparer, puis la nuit qui vient.
  if (ctx.evening?.result.journee) {
    return [dayCard(state, ctx.evening, { evening: true }), tonightCard(state, ctx), officialCard(state, ctx.evening.result.relays, ctx.evening.result.params), promoCard(state), foot()].join('');
  }
  if (!ctx.tomorrow && !ctx.result.outfit && !ctx.result.journee) return `${tonightCard(state, ctx)}${promoCard(state)}${foot()}`;
  return [
    ctx.result.journee ? dayCard(state, ctx) : outfitCard(state, ctx),
    hoursCard(state, ctx),
    officialCard(state, ctx.result.relays, ctx.result.params),
    ctx.tomorrow ? '' : promoCard(state),
    foot(),
  ].join('');
}

// Onglet Maison : la journée dans la pièce où il vit, la nuit dans sa chambre, chacune avec son relevé (16 heures).
// Le jour comparé au repère de 20 à 22 °C (Mieux vivre, Québec), la nuit à celui de la chambre, 18 à 20 °C.
// Jour ou nuit selon l'heure (de 6 h à 18 h, le jour), ou choisi à la main.
const maisonKind = (state, ctx) => state.maison ?? homeMoment(ctx.input.now);

function heroMaison(state, ctx) {
  const night = maisonKind(state, ctx) === 'nuit';
  const plan = night ? ctx.result.night : ctx.result.indoor;
  const kind = night ? 'nuit' : 'jour';
  const known = plan.room_temp_c !== null;
  const fallback = night ? 19 : 21;
  const last = night ? state.profile.room : state.profile.room_day;
  const value = plan.room_temp_c ?? last?.value ?? fallback;
  // État du relevé par rapport au repère : les mêmes mots que le widget Maison.
  const status = [plan.room_status === 'in_range' ? 'ok' : 'warn', homeStatus(plan, kind, state.bundle.rules, state.bundle.messages)];
  const who = state.profile.count > 1 ? `${esc(childName(state.profile, state.profile.index))} · ` : '';
  const seg = `<div class="days glass" role="tablist" aria-label="Jour ou nuit">${[['jour', 'Jour'], ['nuit', 'Nuit']]
    .map(([v, l]) => `<button role="tab" aria-selected="${kind === v}" data-action="maison" data-value="${v}">${l}</button>`).join('')}</div>`;
  const step = (delta, label, ico) => `<button class="glass glass-btn" data-action="room" data-kind="${kind}" data-value="${delta}" data-base="${fallback}" aria-label="${label}">${icon(ico)}</button>`;
  return `<header class="hero hero--${night ? 'nuit' : 'maison'}">${heroArt(night ? 'moonStars' : 'home')}${heroTop(state, ctx.date)}${seg}
    <p class="hero-label">${who}${night ? 'La nuit, dans sa chambre' : 'La journée, chez vous'}</p>
    <div class="stepper">
      ${step('-0.5', "Baisser d'un demi-degré", 'minus')}
      <p class="hero-big${known ? '' : ' pending'}" aria-live="polite">${decimal(value)}°</p>
      ${step('0.5', "Monter d'un demi-degré", 'plus')}
    </div>
    ${known
      ? `<p class="status-pill glass"><span class="dot ${status[0]}"></span>${status[1]}</p>`
      : `<button class="status-pill glass" data-action="room" data-kind="${kind}" data-value="0" data-base="${fallback}">${icon('check', { size: 18 })}${night ? "C'est la température de sa chambre" : "C'est la température chez vous"}</button>`}
  </header>`;
}

// À la maison, en journée : la tenue pour la température de la pièce, et les repères de Mieux vivre (Québec)
// et de Santé Manitoba ; ceux de Santé publique France quand il fait chaud dedans.
function indoorCard(state, ctx) {
  const M = state.bundle.messages;
  const labels = M.labels;
  const i = ctx.result.indoor;
  const day = state.bundle.rules.indoor.comfort_range_c;
  const room = i.room_assumed ? `Pour ${day.min} à ${day.max} °C, le repère de Mieux vivre (Québec)` : `Chez vous à ${decimal(i.room_temp_c)} °C`;
  const wear = drawingsOn(state)
    ? `<ul class="dress">${i.wear.map((item) => `<li><span class="dress-ico">${drawingSvg(ITEM_DRAWINGS[item], { size: 34 })}</span>
        <span class="dress-name">${esc(capitalize(labels.items_short[item]))}</span></li>`).join('')}</ul>`
    : `<p>${esc(capitalize(i.wear.map((item) => labels.items[item]).join(', ')))}.</p>`;
  const sources = [...new Set(i.relays.flatMap((id) => M.messages[id]?.sources ?? []))];
  // Avec ou sans pyjama : l'autre tenue en un geste ; le choix vaut aussi pour les sorties.
  const other = i.styles?.length > 1 ? i.styles.find((st) => st.id !== i.day_style) : null;
  const choice = other
    ? `<div class="alts"><p class="alts-title">${i.day_style ? 'Sans pyjama la journée, dehors comme à la maison. Ou :' : 'Ou sans pyjama, dehors comme à la maison :'}</p>
        ${altButton(state, other.wear.map((item) => ITEM_DRAWINGS[item]), `${other.id ? 'Sans pyjama' : 'Avec pyjama'} : ${other.wear.map((item) => labels.items_short[item]).join(', ')}`, `data-action="day-style" data-value="${esc(other.id ?? '')}"`)}</div>`
    : '';
  return `<section class="card">
      <div class="card-head"><h2 class="card-title">${icon('home', { size: 18 })}Pour la journée</h2><span class="tag">pratique</span></div>
      <p class="band"><strong>${esc(room)}</strong></p>
      ${wear}
      ${choice}
      <ul class="facts">${i.relays.filter((id) => id !== 'relay.indoor.temperature').map((id) => `<li>${icon('check', { size: 18 })}<span>${esc(render(M, id, 'short'))}</span></li>`).join('')}</ul>
      <p class="source">Sources : ${sourceLinks(state, sources)}</p>
    </section>`;
}

// Le widget Maison depuis son onglet. Dans l'app Android 0.13 et plus, sans widget Maison posé : le poser d'ici, sans
// chercher dans la liste des widgets du téléphone. Dans le navigateur d'un téléphone Android : il est dans l'app Android.
function homeWidgetPromo(state) {
  const card = (text) => `<section class="card promo">
    <span class="promo-ico">${icon('home')}</span>
    <div><h3>Le widget Maison</h3><p>${text}</p></div>
  </section>`;
  if (state.host === 'android') {
    return state.androidHome && !state.homeWidgets
      ? card(`La température à noter avec − et + depuis l'écran d'accueil, et la tenue qui va avec. <button class="link" data-action="add-home-widget" data-child="${esc(state.profile.id)}">Ajouter</button>`)
      : '';
  }
  return state.device === 'android' && !state.host && state.androidLink
    ? card(`Il est dans l'app Android Superbébé (version 0.13 ou plus), pas dans cette version navigateur. <a class="link" href="${esc(state.androidLink)}">Ouvrir l'app</a>`)
    : '';
}

// Où l'app est ouverte : utile pour savoir d'où viennent les widgets (seule l'app Android en pose sur Android).
function openedIn(state) {
  if (state.host === 'android') return `app Android ${state.androidVersion || ''}`.trim();
  if (state.host === 'scriptable') return 'widget iPhone (Scriptable)';
  return state.standalone ? 'icône installée depuis le navigateur' : 'navigateur';
}

function maisonContent(state, ctx) {
  if (maisonKind(state, ctx) === 'jour') return `${indoorCard(state, ctx)}${homeWidgetPromo(state)}${foot()}`;
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
        <li><span class="dress-ico night">${drawingSvg('gigoteuse', { size: 34 })}</span><span class="dress-name">Gigoteuse ${esc(n.tog)} TOG</span></li></ul>`
    : `<p>Sous la gigoteuse : ${esc(n.wear.map((item) => labels.items[item]).join(' et '))}.</p>`;
  // Autres tenues publiées par les fabricants pour cette température, selon la gigoteuse qu'on a : plus légère, une couche
  // de plus dessous ; plus chaude, une de moins (contrôlé par lint). Le choix est gardé pour cette tranche seulement.
  const others = (n.options ?? []).filter((o) => o.id !== n.option);
  const chosen = (n.options ?? []).find((o) => o.id === n.option);
  const otherBag = (n.options ?? []).some((o) => o.tog !== (n.options ?? [])[0].tog);
  const choices = others.length
    ? `<div class="alts night"><p class="alts-title">${n.option === 'principal' ? 'Ou, selon votre gigoteuse :' : 'Votre choix pour cette température. Ou :'}</p>
        ${others.map((o) => altButton(state, [...o.wear.map((item) => ITEM_DRAWINGS[item]), 'gigoteuse'],
          `${o.tog} TOG : ${o.wear.map((item) => labels.items_short[item]).join(' + ')}${o.id === 'principal' ? ' (habituelle)' : ''}`,
          `data-action="night-option" data-bin="${esc(n.bin ?? '')}" data-value="${esc(o.id)}"`)).join('')}
        ${otherBag ? `<p class="hint">${esc(render(state.bundle.messages, 'fabricant.night.compensation', 'short'))}.</p>` : ''}</div>`
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

function prevoirContent(state, ctx) {
  const M = state.bundle.messages;
  const R = state.bundle.rules;
  const inv = state.profile.inventory ?? {};
  const owned = Object.values(inv).reduce((a, sizes) => a + sizes.length, 0);
  const items = ctx.result.purchases.map((x) => {
    const when = buyWhen(x, ctx.date);
    const why = x.reasons.map((r) => M.labels.reasons[r] ?? r).join(' · ');
    const official = x.relays.find((id) => M.messages[id]?.kind === 'officiel');
    return `<article class="buy">
      <div class="buy-head"><h3>${drawingsOn(state) ? `<span class="buy-ico">${drawingSvg(CATEGORY_DRAWINGS[x.category], { size: 26 })}</span>` : ''}${esc(capitalize(M.labels.categories[x.category]))}</h3>${x.size === 'unique' ? '' : `<span class="tag blue">${esc(x.size_label)}</span>`}</div>
      <div class="buy-meta"><span class="tag${when.urgent ? ' amber' : ''}">${esc(when.text)}</span><span class="buy-why">${esc(capitalize(why))}</span></div>
      ${official ? `<p class="source">${esc(render(M, official, 'short'))} · ${sourceLinks(state, M.messages[official].sources ?? [])}</p>` : ''}
      <div class="buy-actions">
        <button class="btn small tint" data-action="own" data-cat="${x.category}" data-size="${x.size}">${icon('check', { size: 18 })}Je l'ai déjà</button>
        <button class="btn small soft" data-action="hide" data-key="${esc(x.key)}">Masquer</button>
      </div>
    </article>`;
  }).join('');
  const cats = R.purchases.categories.map((cat) => {
    const have = inv[cat.id] ?? [];
    return `<div class="cat"><p class="cat-name">${esc(capitalize(M.labels.categories[cat.id]))}</p><div class="sizes">${R.purchases.size_systems[cat.size_system].map(
      (s) => `<button data-action="inv" data-cat="${cat.id}" data-size="${s.code}" aria-pressed="${have.includes(s.code)}">${esc(s.code === 'unique' ? "J'en ai" : s.label)}</button>`,
    ).join('')}</div></div>`;
  }).join('');
  return `${owned ? '' : `<section class="card"><p class="tip">${icon('hanger', { size: 20 })}<span>Indiquez d'abord ce que vous avez déjà dans « Ma garde-robe » : les suggestions seront plus justes.</span></p></section>`}
    ${items ? `<section class="card">${items}</section>` : `<section class="card"><p class="hint">Rien à prévoir pour l'instant${state.climateReady ? '' : ' (calcul en cours)'}. On vous préviendra ici quand la saison ou la taille changent.</p></section>`}
    <details class="card wardrobe" data-details="garde-robe"${state.open.has('garde-robe') ? ' open' : ''}>
      <summary>${icon('hanger', { size: 20 })}Ma garde-robe <span class="tag">${owned}</span>${chev()}</summary>
      ${cats}
    </details>
    <p class="hint" style="padding:0 6px">Calcul sur 6 semaines : prévisions, puis moyennes des trois dernières années. Tailles indicatives selon l'âge.</p>
    ${foot()}`;
}

function tabbar(state, ctx) {
  const count = ctx?.result.purchases.length ?? 0;
  const tabs = [['sortir', 'Sorties', 'sun'], ['nuit', 'Maison', 'home'], ['prevoir', 'Prévoir', 'bag']];
  return `<nav class="tabbar" role="tablist" aria-label="Sections">${tabs.map(([v, l, i]) =>
    `<button role="tab" aria-selected="${state.tab === v}" data-action="tab" data-value="${v}">${icon(i)}<span>${l}</span>${v === 'prevoir' && count ? `<span class="badge">${count}</span>` : ''}</button>`).join('')}</nav>`;
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
  if (state.tab === 'nuit') {
    hero = heroMaison(state, ctx);
    content = maisonContent(state, ctx);
  } else if (state.tab === 'prevoir') {
    hero = heroPrevoir(state, ctx);
    content = prevoirContent(state, ctx);
  } else {
    hero = heroSortir(state, ctx);
    content = sortirContent(state, ctx);
  }
  return `${hero}<main class="content">${stale}${content}</main>${tabbar(state, ctx)}`;
}

// Réglages, façon réglages iOS : enregistrés dès qu'on les change.
export function viewSettings(state) {
  const { draft, results, profile } = state;
  const hours = (from, to) => Array.from({ length: to - from + 1 }, (_, k) => `${String(from + k).padStart(2, '0')}:00`);
  const label = Object.fromEntries(TRANSPORTS.map(([v, l]) => [v, l]));
  const kids = state.household.children.map((c, i) => `<a class="row" href="#enfant/${esc(c.id)}">
      <span>${esc(childName(c, i))}<span class="hint"> · ${esc(ageLabel(ageMonths(c.birth, state.today)))} · ${esc(label[c.transport] ?? '')}</span></span>${chev()}</a>`).join('');
  return `<header class="page-head"><a class="back" href="#">${icon('chevronLeft')}Retour</a><h1>Réglages</h1></header>
  <div class="page">
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
        <div class="row column"><span>Commune</span>${communePicker(draft, results)}</div>
        <div class="row column"><span>Plage horaire</span>
          <div class="pair">
            <select id="from" aria-label="Début">${hours(6, 20).map((h) => `<option value="${h}"${profile.outing_window.from === h ? ' selected' : ''}>de ${hourFr(h)}</option>`).join('')}</select>
            <select id="to" aria-label="Fin">${hours(7, 22).map((h) => `<option value="${h}"${profile.outing_window.to === h ? ' selected' : ''}>à ${hourFr(h)}</option>`).join('')}</select>
          </div>
          ${draft.error ? `<p class="error">${esc(draft.error)}</p>` : ''}
        </div>
        <div class="row column"><span>Durée d'une sortie</span>
          <div class="seg" role="radiogroup" aria-label="Durée">${[1, 2, 3].map((d) =>
            `<button role="radio" aria-checked="${profile.outing_duration_h === d}" data-action="duration" data-value="${d}">${d} h</button>`).join('')}</div>
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
      </div>
      <p class="group-note">Dans l'app et le widget : un petit dessin par vêtement, ou la liste écrite.</p>
    </section>
    ${homeScreenGroup(state)}
    ${reminderGroup(state)}
    <section class="group"><h2 class="group-title">Application</h2>
      <div class="group-body">
        <button class="row" data-action="check-update"><span>${state.updateReady ? 'Installer la mise à jour' : 'Rechercher une mise à jour'}</span><span class="value">v${VERSION}</span></button>
        <div class="row"><span>Ouvert dans</span><span class="value">${esc(openedIn(state))}</span></div>
        ${state.androidVersion ? `<div class="row"><span>App Android installée</span><span class="value">${esc(state.androidVersion)}</span></div>` : ''}
        ${apkUpdate(state) ? `<a class="row" href="${esc(state.apkLatest.url)}"><span>Mettre à jour l'app Android</span><span class="value">${esc(state.apkLatest.versionName)}</span></a>` : ''}
        <button class="row" data-action="copy-report"><span>Copier mes retours de test</span>${icon('share', { size: 20 })}</button>
        <a class="row" href="#apropos"><span>Charte, sources et confidentialité</span>${chev()}</a>
      </div>
    </section>
    <section class="group"><div class="group-body"><button class="row danger" data-action="clear">${state.confirmClear ? 'Toucher à nouveau pour tout effacer' : 'Effacer toutes mes données'}</button></div></section>
  </div>`;
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
          <div class="seg" role="radiogroup" aria-label="La journée">${[['', 'Avec pyjama'], ['sans_pyjama', 'Sans pyjama']].map(([v, l]) =>
            `<button role="radio" aria-checked="${(d.dayStyle ?? '') === v}" data-action="day-style" data-value="${v}">${l}</button>`).join('')}</div>
        </div>` : ''}
      </div>
      <p class="group-note">« A chaud » allège toutes ses tenues d'un cran, « A froid » les réchauffe d'un cran. « À pied » apparaît à partir de 2 ans.${pyjamas ? ' « Sans pyjama » : pantalon et chaussettes à la place, dehors comme à la maison ; la nuit ne change pas.' : ''}</p>
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
function apkUpdate(state) {
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

// Rappel du soir : seulement si on l'active ; une notification par jour au plus, calculée sur le téléphone.
// Il passe par l'app Android ou par le widget iPhone (Scriptable) ; ailleurs, on dit comment l'avoir.
function reminderGroup(state) {
  const title = '<h2 class="group-title">Rappel du soir</h2>';
  if (!state.reminderHost && !state.webPush) {
    return `<section class="group">${title}<div class="group-body"><a class="row" href="#widget"><span>Avec le widget</span>${chev()}</a></div>
      <p class="group-note">La veille au soir, une notification avec la tenue et le sac de demain, et la nuit. Elle passe par l'app Android ou par le widget iPhone (Scriptable)${state.api ? ', ou par l\'app de l\'écran d\'accueil' : ''}.</p></section>`;
  }
  const r = state.reminder;
  const times = ['19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'];
  const refused = r.on && state.reminderState === 'refuse'
    ? `<p class="error group-note">Notifications refusées : ${state.host === 'android' ? 'Réglages d\'Android, Applications, Superbébé, Notifications' : 'autorisez-les dans les réglages du téléphone'}.</p>`
    : r.on && state.reminderState === 'indisponible' ? '<p class="error group-note">Serveur des notifications injoignable : réessayez plus tard.</p>' : '';
  return `<section class="group">${title}
    <div class="group-body">
      <div class="row column"><span>La veille, la tenue et le sac de demain</span>
        <div class="seg" role="radiogroup" aria-label="Rappel du soir">${[['off', 'Non'], ['on', 'Oui']].map(([v, l]) =>
          `<button role="radio" aria-checked="${(r.on ? 'on' : 'off') === v}" data-action="reminder" data-value="${v}">${l}</button>`).join('')}</div>
      </div>
      ${r.on ? `<div class="row column"><span>Vers</span><select id="reminder-at" aria-label="Heure du rappel">${times.map((t) => `<option value="${t}"${r.at === t ? ' selected' : ''}>${hourFr(t)}</option>`).join('')}</select></div>` : ''}
    </div>
    ${refused}
    <p class="group-note">Une notification par jour au plus, calculée sur ce téléphone${state.webPush ? ' : le serveur ne fait que le réveiller à l\'heure dite, sans rien lui envoyer d\'autre' : ', sans serveur'}.${state.host === 'scriptable' ? ' Scriptable demande l\'autorisation la première fois.' : ''}</p>
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
  return `<p class="fine">Widget Maison (la température chez vous le jour, de sa chambre la nuit, et la tenue) : un autre widget Scriptable, Parameter : <strong>maison</strong>${example}. Le toucher ouvre l'onglet Maison pour noter la température.</p>`;
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
  const lines = ctx ? widgetLines(ctx.result, ctx.moment, state.bundle.messages, { drawings: drawingsOn(state), tomorrow: ctx.evening?.result }) : [];
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
