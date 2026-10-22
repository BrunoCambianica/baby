// Vues de l'app : des fonctions qui renvoient du HTML. Tout texte variable passe par esc().
import { hourFr, render, skyTheme, widgetLines } from '../../engine/engine.js';
import { dayLong, dayShort, decimal, esc, MONTHS } from './format.js';
import { icon, weatherIcon } from './icons.js';
import { CATEGORY_DRAWINGS, drawingSvg, ITEM_DRAWINGS } from '../../engine/drawings.js';

export const VERSION = '0.5.1';
export const TRANSPORTS = [
  ['poussette', 'Poussette', 'stroller'],
  ['porte_bebe', 'Porte-bébé', 'carrier'],
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
  'practical.rain.later': 'umbrella',
  'practical.wind': 'wind',
  'practical.carrier.body_heat': 'carrier',
  'practical.carrier.no_footed': 'carrier',
};
const SCRIPTABLE_URL = 'https://apps.apple.com/fr/app/scriptable/id1405459188';

const capitalize = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '');
// Tenues en dessins (par défaut) ou en texte, au choix dans les réglages.
const drawingsOn = (state) => state.profile?.outfit_view !== 'texte';
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
  const years = [year, year - 1, year - 2, year - 3]
    .map((y) => `<option value="${y}"${draft.birthYear === String(y) ? ' selected' : ''}>${y}</option>`).join('');
  return `<div class="pair">
      <select id="birth-month" aria-label="Mois de naissance">${months}</select>
      <select id="birth-year" aria-label="Année de naissance">${years}</select>
    </div>
    ${draft.birthError ? `<p class="error">${esc(draft.birthError)}</p>` : ''}`;
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
      <button class="btn" data-action="onboard-next"${draft.commune ? '' : ' disabled'}>Continuer</button>`;
  } else if (step === 2) {
    body = `<h2>Quand est né bébé ?</h2>
      <p class="lead">Pour adapter les repères et les tailles à son âge.</p>
      ${birthSelects(draft, today)}
      <button class="btn" data-action="onboard-next">Continuer</button>
      <button class="link" data-action="onboard-back">Retour</button>`;
  } else {
    const choices = [
      ['poussette', 'Poussette', 'La tenue de sortie classique.'],
      ['porte_bebe', 'Porte-bébé', 'Une couche de moins, sans pyjama à pieds.'],
      ['voiture', 'Voiture', 'Sans manteau épais sous le harnais.'],
    ];
    const iconOf = Object.fromEntries(TRANSPORTS.map(([v, , i]) => [v, i]));
    body = `<h2>Comment sortez-vous le plus souvent ?</h2>
      <p class="lead">Vous pourrez changer chaque jour.</p>
      <div class="choices" role="radiogroup">${choices.map(([v, title, text]) => `
        <button class="choice" role="radio" aria-checked="${draft.transport === v}" data-action="draft-transport" data-value="${v}">
          <span class="choice-ico">${icon(iconOf[v])}</span><span><strong>${title}</strong><span>${text}</span></span>
        </button>`).join('')}</div>
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
function heroTop(state, date) {
  return `<div class="hero-top">
      <div>
        <a class="hero-place" href="#reglages">${icon('pin', { size: 18 })}${esc(state.profile.commune.nom)}</a>
        <p class="hero-date">${esc(dayLong(date))}</p>
      </div>
      <a class="glass glass-btn" href="#reglages" aria-label="Réglages">${icon('settings', { size: 20 })}</a>
    </div>`;
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

function heroSortir(state, ctx) {
  const M = state.bundle.messages;
  const { result, date, tomorrow } = ctx;
  const theme = sortirTheme(ctx);
  const w = result.outing.window;
  const days = `<div class="days glass" role="tablist" aria-label="Jour">${[['aujourdhui', "Aujourd'hui"], ['demain', 'Demain']]
    .map(([v, l]) => `<button role="tab" aria-selected="${state.day === v}" data-action="day" data-value="${v}">${l}</button>`).join('')}</div>`;
  let main;
  if (w) {
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

function modes(current) {
  return `<div class="modes" role="radiogroup" aria-label="Mode de sortie">${TRANSPORTS.map(([v, l, i]) =>
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

function outfitCard(state, ctx) {
  const M = state.bundle.messages;
  const { result, picked } = ctx;
  const outfit = picked ?? result.outfit;
  if (!outfit) return '';
  const params = picked ? picked.params : result.params;
  const tips = outfit.notes.map((n) => `<li>${icon(NOTE_ICON[n] ?? 'info', { size: 20 })}<span>${esc(render(M, n, 'text', params))}</span></li>`).join('');
  const pickedBar = picked
    ? `<div class="picked"><span>À ${hourFr(state.pickedHour)} · ${Math.round(picked.feels_c)}° ressentis${picked.reasons.length ? ` · ${esc(picked.reasons.map((r) => SLOT_FLAG[r] ?? r).join(', '))}` : ''}</span>
        <button class="icon-btn" data-action="pick-hour" data-hour="${state.pickedHour}" aria-label="Revenir au créneau idéal">${icon('x', { size: 18 })}</button></div>`
    : '';
  return `<section class="card" aria-labelledby="t-tenue">
    <div class="card-head">
      <h2 class="card-title" id="t-tenue">${icon('shirt', { size: 18 })}${picked ? 'Tenue à cette heure' : "Comment l'habiller"}</h2>
      <button class="icon-btn" data-action="share" aria-label="Envoyer à la nounou ou au co-parent">${icon('share', { size: 18 })}</button>
    </div>
    ${pickedBar}
    ${modes(state.profile.transport)}
    ${bandTitle(state, outfit)}
    ${dressList(state, outfit)}
    ${tips ? `<ul class="tips">${tips}</ul>` : ''}
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
    return `<button class="h-cell${best ? ' best' : ''}${off ? ' off' : ''}" data-action="pick-hour" data-hour="${s.time}" aria-pressed="${state.pickedHour === s.time}"
        aria-label="${hourFr(s.time)}, ${Math.round(s.feels_c)} degrés ressentis${flag ? `, ${flag}` : ''}">
      <span class="h-flag">${flag}</span><span class="h-time">${hourFr(s.time)}</span>
      ${icon(weatherIcon(s.weather_code, { night, precipProb: s.precip_prob }), { size: 24 })}
      <span class="h-temp">${Math.round(s.feels_c)}°</span></button>`;
  }).join('');
  return `<section class="card" aria-labelledby="t-heures">
    <h2 class="card-title" id="t-heures">${icon('clock', { size: 18 })}Heure par heure</h2>
    <div class="hours" role="group" aria-label="Heures de la journée">${cells}</div>
    ${state.pickedHour ? '' : '<p class="hint">Touchez une heure pour voir la tenue à ce moment-là.</p>'}
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
  // Dans un onglet du navigateur, d'abord l'app en plein écran ; le widget ensuite.
  if (state.inBrowser) {
    return state.device === 'android'
      ? promo('Superbébé en plein écran', `L'app pour Android : sans barre de navigateur, avec le widget. <a class="link" href="#widget">L'installer</a>`)
      : promo('Superbébé en plein écran', 'Sans les barres de Safari : bouton Partager, puis « Sur l\'écran d\'accueil ». Ouvrez ensuite Superbébé depuis son icône.');
  }
  if (state.host === 'android') {
    return state.widgets ? '' : promo('Ajoutez le widget', `La réponse du jour sur l'écran d'accueil, sans ouvrir l'app. <button class="link" data-action="add-widget">Ajouter</button>`);
  }
  return state.widgetReady ? '' : promo('Ajoutez le widget', `La réponse du jour sur l'écran d'accueil, sans ouvrir l'app. <a class="link" href="#widget">Comment faire</a>`);
}

const foot = () => `<p class="foot"><span>Repères officiels relayés, pas d'avis médical. Urgence : 15 ou 112.</span>
  <span><a href="#apropos">Charte et sources</a> · Météo Open-Meteo · v${VERSION}</span></p>`;

// Plus de sortie aujourd'hui : plutôt qu'un écran vide, la tenue de demain et la nuit qui vient.
function laterCards(state, ctx) {
  const next = ctx.next;
  const w = next?.result.outing.window;
  const tomorrow = next?.result.outfit
    ? `<section class="card">
      <div class="card-head"><h2 class="card-title">${icon('sun', { size: 18 })}Demain</h2>${w ? `<span class="tag blue">${hourFr(w.start)} – ${hourFr(w.end)} · ${Math.round(w.feels_c)}°</span>` : ''}</div>
      ${bandTitle(state, next.result.outfit)}
      ${dressList(state, next.result.outfit)}
      <button class="btn soft" data-action="day" data-value="demain">Voir demain en détail</button>
    </section>`
    : '';
  const n = ctx.result.night;
  return `${tomorrow}<section class="card">
      <div class="card-head"><h2 class="card-title">${icon('moon', { size: 18 })}Ce soir</h2></div>
      <p class="hint">${n.room_assumed ? 'Chambre à 18-20 °C' : `Chambre à ${decimal(n.room_temp_c)} °C`} : ${esc(n.wear.map((i) => state.bundle.messages.labels.items_short[i]).join(' + '))}, gigoteuse ≈ ${esc(n.tog)} TOG.</p>
      <button class="btn soft" data-action="tab" data-value="nuit">Préparer la nuit</button>
    </section>`;
}

function sortirContent(state, ctx) {
  if (!ctx.tomorrow && !ctx.result.outfit) return `${laterCards(state, ctx)}${promoCard(state)}${foot()}`;
  return [
    outfitCard(state, ctx),
    hoursCard(state, ctx),
    officialCard(state, ctx.result.relays, ctx.result.params),
    ctx.tomorrow ? '' : promoCard(state),
    foot(),
  ].join('');
}

function heroNuit(state, ctx) {
  const n = ctx.result.night;
  const known = n.room_temp_c !== null;
  const value = n.room_temp_c ?? state.profile.room?.value ?? 19;
  const range = state.bundle.rules.night.room_range_c;
  const status = {
    in_range: ['ok', 'Dans la plage recommandée'],
    above: ['warn', `Un peu chaud : au-dessus de ${range.max} °C`],
    below: ['warn', `Un peu frais : sous ${range.min} °C`],
  }[n.room_status];
  return `<header class="hero hero--nuit">${heroArt('moonStars')}${heroTop(state, ctx.date)}
    <p class="hero-label">Ce soir · chambre de bébé</p>
    <div class="stepper">
      <button class="glass glass-btn" data-action="room" data-value="-0.5" aria-label="Baisser d'un demi-degré">${icon('minus')}</button>
      <p class="hero-big${known ? '' : ' pending'}" aria-live="polite">${decimal(value)}°</p>
      <button class="glass glass-btn" data-action="room" data-value="0.5" aria-label="Monter d'un demi-degré">${icon('plus')}</button>
    </div>
    ${known
      ? `<p class="status-pill glass"><span class="dot ${status[0]}"></span>${status[1]}</p>`
      : `<button class="status-pill glass" data-action="room" data-value="0">${icon('check', { size: 18 })}C'est la température de ce soir</button>`}
  </header>`;
}

function nuitContent(state, ctx) {
  const M = state.bundle.messages;
  const n = ctx.result.night;
  const basics = M.messages['relay.sleep.basics'];
  const facts = [...(basics.list ?? [basics.short]), ...n.relays.filter((id) => id !== 'relay.sleep.basics').map((id) => render(M, id, 'short'))];
  const sources = [...new Set(n.relays.flatMap((id) => M.messages[id]?.sources ?? []))];
  return `${nightWearCard(state, n)}
    <section class="card">
      <div class="card-head"><h2 class="card-title">${icon('shield', { size: 18 })}Pour bien dormir</h2><span class="tag green">officiel</span></div>
      <ul class="facts">${facts.map((f) => `<li>${icon('check', { size: 18 })}<span>${esc(capitalize(f))}</span></li>`).join('')}</ul>
      <p class="source">Sources : ${sourceLinks(state, sources)}</p>
    </section>
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
  return `<section class="card">
      <div class="card-head"><h2 class="card-title">${icon('bed', { size: 18 })}Pour la nuit</h2><span class="tag amber">fabricants</span></div>
      <p class="band"><strong>≈ ${esc(n.tog)} TOG</strong><span>${room}</span></p>
      ${wear}
      <p class="hint">Repère des fabricants, à adapter à bébé : l'étiquette de la gigoteuse fait foi.${n.room_assumed ? ' Notez la température de la chambre ci-dessus pour l\'ajuster.' : ''}</p>
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
  const tabs = [['sortir', 'Sortir', 'sun'], ['nuit', 'Nuit', 'moon'], ['prevoir', 'Prévoir', 'bag']];
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
    hero = heroNuit(state, ctx);
    content = nuitContent(state, ctx);
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
  const { draft, results, profile, today } = state;
  const hours = (from, to) => Array.from({ length: to - from + 1 }, (_, k) => `${String(from + k).padStart(2, '0')}:00`);
  const pref = Math.sign(profile.outfit_offset ?? 0);
  return `<header class="page-head"><a class="back" href="#">${icon('chevronLeft')}Retour</a><h1>Réglages</h1></header>
  <div class="page">
    <section class="group"><h2 class="group-title">Bébé</h2>
      <div class="group-body">
        <div class="row column"><span>Commune</span>${communePicker(draft, results)}</div>
        <div class="row column"><span>Mois de naissance</span>${birthSelects(draft, today)}</div>
        <div class="row column"><span>Tendance de bébé</span>
          <div class="seg" role="radiogroup" aria-label="Tendance de bébé">${[[-1, 'A chaud'], [0, 'Normal'], [1, 'A froid']].map(([v, l]) =>
            `<button role="radio" aria-checked="${pref === v}" data-action="pref" data-value="${v}">${l}</button>`).join('')}</div>
        </div>
      </div>
      <p class="group-note">« A chaud » allège toutes les tenues d'un cran, « A froid » les réchauffe d'un cran.</p>
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
    <section class="group"><h2 class="group-title">Sorties</h2>
      <div class="group-body">
        <div class="row column"><span>Le plus souvent</span>${modes(profile.transport)}</div>
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
    </section>
    ${homeScreenGroup(state)}
    <section class="group"><h2 class="group-title">Application</h2>
      <div class="group-body">
        <button class="row" data-action="check-update"><span>${state.updateReady ? 'Installer la mise à jour' : 'Rechercher une mise à jour'}</span><span class="value">v${VERSION}</span></button>
        <button class="row" data-action="copy-report"><span>Copier mes retours de test</span>${icon('share', { size: 20 })}</button>
        <a class="row" href="#apropos"><span>Charte, sources et confidentialité</span>${chev()}</a>
      </div>
    </section>
    <section class="group"><div class="group-body"><button class="row danger" data-action="clear">${state.confirmClear ? 'Toucher à nouveau pour tout effacer' : 'Effacer toutes mes données'}</button></div></section>
  </div>`;
}

// Réglages : le widget selon le téléphone. Dans l'app Android, un seul bouton ; ouverte depuis le widget iPhone, rien.
function homeScreenGroup(state) {
  if (state.host === 'scriptable') return '';
  const rows = state.host === 'android'
    ? `<button class="row" data-action="add-widget"><span>${state.widgets ? 'Ajouter un autre widget' : 'Ajouter le widget'}</span>${icon('plus', { size: 20 })}</button>`
    : `<a class="row" href="#widget"><span>Ajouter le widget</span>${chev()}</a>
        ${state.device === 'ios' && state.widgetReady && state.updateLink ? `<a class="row" href="${esc(state.updateLink)}"><span>Envoyer mes réglages au widget</span>${icon('refresh', { size: 20 })}</a>` : ''}
        ${state.installPrompt ? `<button class="row" data-action="install"><span>Installer l'app</span>${icon('download', { size: 20 })}</button>` : ''}`;
  const note = state.device === 'ios' && state.widgetReady && !state.host
    ? '<p class="group-note">Après un changement de commune ou de réglage, touchez « Envoyer mes réglages au widget ».</p>'
    : '';
  return `<section class="group"><h2 class="group-title">Écran d'accueil</h2><div class="group-body">${rows}</div>${note}</section>`;
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
  const lines = ctx ? widgetLines(ctx.result, ctx.moment, state.bundle.messages, { drawings: drawingsOn(state) }) : [];
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
      <p class="fine">Toucher le widget ouvre ensuite Superbébé en plein écran. Écran verrouillé : appui long dessus, Personnaliser, puis un widget Scriptable.</p></div></li>`;
  const android = `
    <li class="step${done(1)}">${num(1)}<div class="step-body"><h3>Télécharger l'app Superbébé</h3>
      <p>L'app complète en plein écran, avec le widget.</p>
      <a class="btn small tint" href="../dist/superbebe-android.apk" download data-step="1">Télécharger (6 Mo)</a></div></li>
    <li class="step${done(2)}">${num(2)}<div class="step-body"><h3>L'installer</h3>
      <p>Ouvrez le fichier depuis la notification de téléchargement. Si Android le demande, autorisez Chrome à installer des applications.</p></div></li>
    <li class="step${done(3)}">${num(3)}<div class="step-body"><h3>L'ouvrir avec vos réglages</h3>
      <a class="btn small tint" href="${esc(state.androidLink)}" data-step="3" data-ready>Ouvrir l'app Superbébé</a>
      <p>Vos réglages y sont repris : rien à ressaisir.</p></div></li>
    <li class="step${done(4)}">${num(4)}<div class="step-body"><h3>Poser le widget</h3>
      <p>Dans l'app : <strong>Ajouter</strong> sur la carte « Ajoutez le widget », ou Réglages, Ajouter le widget.</p>
      <p class="fine">Utilisez ensuite l'icône de l'app Superbébé ; celle installée depuis le navigateur peut être retirée.</p></div></li>`;
  const inApp = `
    <li class="step${state.widgets ? ' done' : ''}"><span class="step-num">${state.widgets ? icon('check', { size: 16 }) : 1}</span><div class="step-body">
      <h3>${state.widgets ? 'Widget posé' : 'Poser le widget'}</h3>
      <button class="btn small tint" data-action="add-widget">${state.widgets ? 'Ajouter un autre widget' : "Ajouter à l'écran d'accueil"}</button>
      <p>Android demande de confirmer. Sinon : appui long sur l'écran d'accueil, Widgets, puis Superbébé.</p>
      <p class="fine">Le widget suit vos réglages et le relevé de la chambre, sans rien copier. Le toucher ouvre l'app.</p></div></li>`;
  const tabs = state.host === 'android' ? '' : `<div class="seg" role="tablist" aria-label="Téléphone">${[['ios', 'iPhone'], ['android', 'Android']].map(([v, l]) =>
    `<button role="tab" aria-selected="${state.platform === v}" data-action="platform" data-value="${v}">${l}</button>`).join('')}</div>`;
  const steps = state.host === 'android' ? inApp : state.platform === 'android' ? android : ios;
  return `<header class="page-head"><a class="back" href="#">${icon('chevronLeft')}Retour</a><h1>Le widget</h1>
    <p class="lead">La réponse du jour sur l'écran d'accueil, sans ouvrir l'app.</p></header>
  <div class="page">
    <div class="widget-demo hero--${theme}"><p class="w-head">Superbébé · ${esc(state.profile.commune.nom)}</p>${lines.map((l) => (typeof l === 'string'
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
        <li>Jamais proposés : tour de lit, couverture, cale-bébé, crème solaire avant 1 an.</li>
        <li>Fièvre, maladie, symptômes : demandez conseil à un professionnel de santé. Urgence : 15 ou 112.</li>
      </ul></div></div>
    </section>
    <section class="group"><h2 class="group-title">Confidentialité</h2>
      <div class="group-body"><div class="row column prose"><ul>
        <li>Pas de compte : vos réglages restent sur ce téléphone.</li>
        <li>La météo est demandée à Open-Meteo avec les coordonnées du centre de la commune, rien d'autre.</li>
        <li>« Ma position » envoie une position arrondie à environ 1 km à geo.api.gouv.fr, sans la conserver.</li>
        <li>Ni publicité, ni mesure d'audience.</li>
      </ul></div></div>
    </section>
    <section class="group"><h2 class="group-title">Sources</h2><div class="group-body">${sources}</div></section>
    <section class="group"><h2 class="group-title">Crédits</h2>
      <div class="group-body"><div class="row column prose"><p>Météo : Open-Meteo (CC BY 4.0), modèles de Météo-France et du CEPMMT. Communes : geo.api.gouv.fr. Icônes : Tabler Icons (licence MIT).</p></div></div>
    </section>
  </div>`;
}
