// Vues de l'app : des fonctions qui renvoient du HTML. Tout texte variable passe par esc().
import { render, widgetLines } from '../../engine/engine.js';
import { dayLong, dayShort, decimal, degrees, esc, hourLabel, MONTHS } from './format.js';

export const VERSION = '0.1.0';
export const TRANSPORTS = [['poussette', 'Poussette'], ['porte_bebe', 'Porte-bébé'], ['voiture', 'Voiture']];
const SLOT_LABEL = {
  hors_jour: 'nuit',
  canicule_heures_chaudes: 'chaleur',
  ozone_apres_midi: 'ozone',
  froid_extreme: 'froid vif',
  pluie: 'pluie',
  vent: 'rafales',
};
const SCRIPTABLE_URL = 'https://apps.apple.com/fr/app/scriptable/id1405459188';
const SVG = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
const ICON = {
  refresh: `<svg ${SVG}><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></svg>`,
  settings: `<svg ${SVG}><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>`,
  back: `<svg ${SVG}><path d="M15 6l-6 6 6 6"/></svg>`,
};

const capitalize = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '');
const transportLabel = (value) => TRANSPORTS.find(([v]) => v === value)?.[1] ?? value;
const clock = (ms) =>
  new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }).format(new Date(ms)).replace(':', ' h ');
const crans = (n) => (Math.abs(n) === 1 ? "d'un cran" : 'de deux crans');

export const loading = () => '<p class="boot">Chargement…</p>';

export const fatal = (message) =>
  `<div class="page"><h1>Superbébé</h1><p>${esc(message)}</p><button class="btn" data-action="reload">Recharger</button></div>`;

function topbar({ place, busy, back }) {
  if (back) {
    return `<header class="topbar"><a class="icon-btn" href="#" aria-label="Retour">${ICON.back}</a><span class="brand">${esc(back)}</span></header>`;
  }
  return `<header class="topbar">
    <span class="brand">Superbébé</span>
    <a class="place" href="#reglages" aria-label="Commune : ${esc(place)}, modifier les réglages">${esc(place)}</a>
    <button class="icon-btn" data-action="refresh" aria-label="Actualiser la météo"${busy ? ' aria-busy="true"' : ''}>${ICON.refresh}</button>
    <a class="icon-btn" href="#reglages" aria-label="Réglages">${ICON.settings}</a>
  </header>`;
}

// Formulaires : commune, naissance, transport.
export function communeResults(results) {
  return results
    .map((c, i) => `<li><button type="button" data-action="pick-commune" data-index="${i}"><span>${esc(c.nom)}</span><span class="dep">${esc(c.cp || c.dep)}</span></button></li>`)
    .join('');
}

function communePicker(draft, results) {
  const chosen = draft.commune;
  return `<div class="field">
    <label class="label" for="commune-q">Où vit bébé ?</label>
    <input id="commune-q" type="search" inputmode="search" autocomplete="off" autocapitalize="words" spellcheck="false"
      placeholder="Commune ou code postal" value="${esc(draft.query ?? '')}" aria-describedby="commune-help" aria-controls="commune-results">
    <ul id="commune-results" class="results"${results.length ? '' : ' hidden'}>${communeResults(results)}</ul>
    <div class="search-foot">
      <p id="commune-help" class="${chosen ? 'chosen' : 'hint'}">${chosen ? `✓ ${esc(chosen.nom)} (${esc(chosen.dep)})` : 'Sert uniquement à récupérer la météo.'}</p>
      <button type="button" class="link-btn" data-action="locate">Utiliser ma position</button>
    </div>
  </div>`;
}

function birthPicker(draft, today) {
  const year = Number(today.slice(0, 4));
  const years = [year, year - 1, year - 2, year - 3];
  return `<div class="field">
    <span class="label" id="birth-label">Mois de naissance de bébé</span>
    <div class="row2">
      <select id="birth-month" aria-labelledby="birth-label">${MONTHS.map((m, i) => {
        const v = String(i + 1).padStart(2, '0');
        return `<option value="${v}"${draft.birthMonth === v ? ' selected' : ''}>${m}</option>`;
      }).join('')}</select>
      <select id="birth-year" aria-labelledby="birth-label">${years.map((y) => `<option value="${y}"${draft.birthYear === String(y) ? ' selected' : ''}>${y}</option>`).join('')}</select>
    </div>
    ${draft.birthError ? `<p class="hint danger">${esc(draft.birthError)}</p>` : ''}
  </div>`;
}

function transportPicker(current, action) {
  return `<div class="seg" role="radiogroup" aria-label="Mode de transport">${TRANSPORTS.map(
    ([v, l]) => `<button type="button" role="radio" aria-checked="${current === v}" data-action="${action}" data-value="${v}">${l}</button>`,
  ).join('')}</div>`;
}

export function viewOnboarding(state) {
  const { draft, results, today } = state;
  const ready = Boolean(draft.commune);
  return `<section class="onboard">
    <div class="hero">
      <img src="icons/icon-192.png" alt="" width="64" height="64">
      <h1>Superbébé</h1>
      <p>Chaque jour : le meilleur moment pour sortir avec bébé, la tenue qui va avec, et ce qu'il lui faudra bientôt.</p>
    </div>
    <form class="card form" data-form="onboarding" novalidate>
      ${communePicker(draft, results)}
      ${birthPicker(draft, today)}
      <fieldset class="field"><legend class="label">Pour sortir, le plus souvent</legend>${transportPicker(draft.transport, 'draft-transport')}</fieldset>
      <p class="fineprint">Les repères de santé viennent de sources publiques (Santé publique France, ministère de la Santé, Météo-France…), toujours citées : ce n'est pas un avis médical. Vos réglages restent sur ce téléphone.</p>
      <button class="btn" type="submit"${ready ? '' : ' disabled'}>Voir la journée</button>
    </form>
  </section>`;
}

// Écran principal.
function relayItem(state, id, params = {}, open = false) {
  const M = state.bundle.messages;
  const msg = M.messages[id];
  if (!msg) return '';
  const sources = (msg.sources ?? []).map((sid) => state.sourcesById.get(sid)).filter(Boolean);
  const links = sources
    .map((s) => (s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.publisher)}</a>` : esc(s.publisher)))
    .join(' · ');
  const pending = sources.some((s) => s.verification === 'a_verifier');
  return `<details class="relay"${open ? ' open' : ''}>
    <summary>${esc(render(M, id, 'short', params))}</summary>
    <div class="relay-body"><p>${esc(render(M, id, 'text', params))}</p><p class="src">Source : ${links}${pending ? ' · citation en cours de vérification' : ''}</p></div>
  </details>`;
}

function daybar(state, date) {
  const tabs = [['aujourdhui', "Aujourd'hui"], ['demain', 'Demain']];
  return `<div class="daybar">
    <div class="seg" role="tablist" aria-label="Jour">${tabs.map(([v, l]) => `<button role="tab" aria-selected="${state.day === v}" data-action="day" data-value="${v}">${l}</button>`).join('')}</div>
    <p class="date">${esc(dayLong(date))}</p>
  </div>`;
}

function banners(state, ctx) {
  const out = [];
  if (!ctx.input.forecast.hourly.length) {
    out.push('<div class="banner warn"><span>Les prévisions enregistrées ne couvrent pas ce jour : actualisez avec une connexion.</span><button class="btn-ghost" data-action="refresh">Actualiser</button></div>');
  } else if (ctx.forecast.offline) {
    out.push(`<div class="banner warn"><span>Hors ligne : prévisions de ${esc(clock(ctx.forecast.at))}.</span><button class="btn-ghost" data-action="refresh">Réessayer</button></div>`);
  }
  if (state.installPrompt) {
    out.push('<div class="banner info"><span>Ajoutez Superbébé à l\'écran d\'accueil.</span><button class="btn-ghost" data-action="install">Installer</button></div>');
  }
  return out.join('');
}

function widgetPreview(state, ctx) {
  const { result, moment, tomorrow } = ctx;
  const lines = widgetLines(result, moment, state.bundle.messages);
  const when = tomorrow ? 'Demain matin' : moment === 'jour' ? 'En journée' : 'Le soir';
  const toggle = tomorrow ? '' : `<button data-action="toggle-moment">${moment === 'jour' ? 'Voir la version du soir' : 'Voir la version de jour'}</button>`;
  return `<section class="widget-preview" aria-label="Aperçu du widget">
    <p class="w-when">${when} · aperçu du widget</p>
    ${lines.map((l) => `<p class="w-line">${esc(l)}</p>`).join('')}
    <div class="w-actions">${toggle}<a href="#widget">Installer le widget</a></div>
  </section>`;
}

function pickedDetail(state, picked) {
  const M = state.bundle.messages;
  const items = picked.items.map((i) => M.labels.items[i]).join(', ');
  const why = picked.reasons.length ? ` Heure déconseillée : ${picked.reasons.map((r) => SLOT_LABEL[r] ?? r).join(', ')}.` : '';
  const notes = picked.notes
    .filter((n) => n.startsWith('practical.rain') || n === 'practical.wind')
    .map((n) => render(M, n, 'short', picked.params));
  return `<div class="hour-detail"><strong>À ${hourLabel(state.pickedHour)} :</strong> ${degrees(picked.feels_c)} ressentis.${esc(why)} Tenue : ${esc(items)}.${notes.length ? ` ${esc(notes.join(' · '))}.` : ''}</div>`;
}

function outingCard(state, ctx) {
  const M = state.bundle.messages;
  const { result, picked } = ctx;
  const w = result.outing.window;
  const p = state.profile;
  const inWindow = (t) => Boolean(w) && t >= w.start && t < w.end;
  const hours = result.outing.slots.map((s) => {
    const blocked = s.reasons.length > 0;
    const best = !blocked && inWindow(s.time);
    const status = blocked ? SLOT_LABEL[s.reasons[0]] ?? '' : best ? 'idéal' : s.precip_prob >= 30 ? `pluie ${s.precip_prob} %` : 'possible';
    const cls = blocked ? 'hour blocked' : best ? 'hour best' : 'hour';
    return `<button class="${cls}" data-action="pick-hour" data-hour="${s.time}" aria-pressed="${state.pickedHour === s.time}" aria-label="${hourLabel(s.time)}, ${Math.round(s.feels_c)} degrés ressentis, ${esc(status)}">
      <span class="h">${hourLabel(s.time)}</span><span class="t">${Math.round(s.feels_c)}°</span><span class="s">${esc(status)}</span></button>`;
  }).join('');
  const headline = w
    ? `<p class="big">${hourLabel(w.start)} – ${hourLabel(w.end)}</p>
       <div class="facts"><span class="chip">${degrees(w.feels_c)} ressentis</span><span class="chip">pluie ${w.precip_prob_max} %</span>${w.uv_max >= 3 ? `<span class="chip chip-sun">UV ${decimal(w.uv_max, 0)}</span>` : ''}${w.gust_max >= 40 ? `<span class="chip">rafales ${Math.round(w.gust_max)} km/h</span>` : ''}</div>`
    : `<p class="big none">${esc(render(M, `outing.none.${result.outing.reason}`, 'text'))}</p>`;
  return `<section class="card" aria-labelledby="t-creneau">
    <h2 id="t-creneau">Meilleur moment pour sortir</h2>
    ${headline}
    ${hours ? `<div class="hours" role="group" aria-label="Heures de la journée">${hours}</div>` : ''}
    ${picked ? pickedDetail(state, picked) : '<p class="hint">Touchez une heure pour voir la tenue à ce moment-là.</p>'}
    <p class="fineprint">Entre ${hourLabel(p.outing_window.from)} et ${hourLabel(p.outing_window.to)}, sortie de ${p.outing_duration_h} h · <a href="#reglages">modifier</a></p>
  </section>`;
}

function outfitCard(state, ctx) {
  const M = state.bundle.messages;
  const { result } = ctx;
  const o = result.outfit;
  if (!o) return '';
  const offset = state.profile.outfit_offset ?? 0;
  const notes = o.notes.map((n) => `<p class="note">${esc(render(M, n, 'text', result.params))}</p>`).join('');
  const fb = [[-1, 'Trop chaud'], [0, 'Bien'], [1, 'Trop froid']];
  return `<section class="card" aria-labelledby="t-tenue">
    <div class="card-head"><h2 id="t-tenue">Tenue pour ce créneau</h2><span class="chip chip-pra">suggestion pratique</span></div>
    ${transportPicker(state.profile.transport, 'transport')}
    <ul class="items">${o.items.map((i) => `<li>${esc(capitalize(M.labels.items[i]))}</li>`).join('')}</ul>
    ${notes}
    <div class="feedback">
      <p>Avec cette tenue, bébé avait…</p>
      <div class="fb-row">${fb.map(([v, l]) => `<button class="btn-ghost" data-action="feedback" data-value="${v}">${l}</button>`).join('')}</div>
      <p class="fineprint">${offset
        ? `Réglage personnel : tenue ${offset > 0 ? 'plus chaude' : 'plus légère'} ${crans(offset)}. <button class="link-btn" data-action="reset-offset">Revenir au standard</button>`
        : 'Vos retours ajustent les prochaines tenues d\'un cran.'}</p>
    </div>
    <button class="btn-ghost" data-action="share">Envoyer à la nounou ou au co-parent</button>
  </section>`;
}

function relaysCard(state, ctx) {
  const { result } = ctx;
  const body = result.relays.length
    ? `<div class="relays">${result.relays.map((id, i) => relayItem(state, id, result.params, i === 0)).join('')}</div>`
    : '<p class="hint">Rien de particulier aujourd\'hui. Les repères apparaissent quand ils s\'appliquent : soleil, chaleur, froid, voiture, porte-bébé.</p>';
  return `<section class="card" aria-labelledby="t-reperes">
    <div class="card-head"><h2 id="t-reperes">Repères officiels du jour</h2><span class="chip chip-off">officiel</span></div>
    ${body}
  </section>`;
}

function nightCard(state, ctx) {
  const M = state.bundle.messages;
  const n = ctx.result.night;
  const range = state.bundle.rules.night.room_range_c;
  const known = n.room_temp_c !== null;
  const candidate = n.room_temp_c ?? state.profile.room?.value ?? 19;
  const status = {
    in_range: ['ok', `Dans la plage recommandée (${range.min} à ${range.max} °C).`],
    above: ['warn', `Au-dessus de la plage recommandée (${range.min} à ${range.max} °C).`],
    below: ['warn', `En dessous de la plage recommandée (${range.min} à ${range.max} °C).`],
  }[n.room_status];
  return `<section class="card" aria-labelledby="t-nuit">
    <h2 id="t-nuit">Ce soir</h2>
    <p>Température de la chambre${known ? '' : ' : relevez-la sur votre thermomètre'}</p>
    <div class="stepper">
      <button data-action="room" data-value="-0.5" aria-label="Baisser d'un demi-degré">−</button>
      <output aria-live="polite"${known ? '' : ' class="hint"'}>${decimal(candidate)} °C</output>
      <button data-action="room" data-value="0.5" aria-label="Monter d'un demi-degré">+</button>
    </div>
    ${known ? '' : `<button class="btn-ghost" data-action="room" data-value="0">Enregistrer ${decimal(candidate)} °C pour ce soir</button>`}
    ${status ? `<p class="status ${status[0]}">${status[1]}</p>` : ''}
    ${n.tog ? `<p><span class="chip chip-fab">fabricants</span> ${esc(render(M, 'fabricant.tog', 'text', { room: decimal(n.room_temp_c), tog: n.tog }))}</p>` : ''}
    <div class="relays">${n.relays.map((id) => relayItem(state, id, ctx.result.params)).join('')}</div>
  </section>`;
}

function inventory(state) {
  const M = state.bundle.messages;
  const R = state.bundle.rules;
  const inv = state.profile.inventory ?? {};
  return R.purchases.categories.map((cat) => {
    const owned = inv[cat.id] ?? [];
    const sizes = R.purchases.size_systems[cat.size_system];
    return `<div class="inv-cat"><span>${esc(capitalize(M.labels.categories[cat.id]))}</span><div class="inv-sizes">${sizes.map(
      (s) => `<button type="button" data-action="inv" data-cat="${cat.id}" data-size="${s.code}" aria-pressed="${owned.includes(s.code)}">${esc(s.code === 'unique' ? "J'en ai" : s.label)}</button>`,
    ).join('')}</div></div>`;
  }).join('');
}

function purchasesCard(state, ctx) {
  const M = state.bundle.messages;
  const { result } = ctx;
  const items = result.purchases.map((x) => {
    const official = x.relays.filter((id) => M.messages[id]?.kind === 'officiel');
    const product = x.relays.filter((id) => M.messages[id]?.kind === 'fabricant');
    return `<article class="buy">
      <h3>${esc(capitalize(M.labels.categories[x.category]))}</h3>
      <p class="when">${x.size === 'unique' ? '' : `Taille <strong>${esc(x.size_label)}</strong> · `}${x.needed_from <= ctx.date
        ? 'utile dès maintenant'
        : `utile dès le ${esc(dayShort(x.needed_from))}, à prévoir avant le ${esc(dayShort(x.order_by))}`}</p>
      <div class="why">${x.reasons.map((r) => `<span class="chip">${esc(M.labels.reasons[r] ?? r)}</span>`).join('')}</div>
      ${official.map((id) => relayItem(state, id, result.params)).join('')}
      ${product.map((id) => `<p class="fineprint"><span class="chip chip-fab">produit</span> ${esc(render(M, id, 'text'))}</p>`).join('')}
      <div class="btn-row">
        <button class="btn-ghost" data-action="own" data-cat="${x.category}" data-size="${x.size}">Je l'ai déjà</button>
        <button class="btn-ghost" data-action="hide" data-key="${esc(x.key)}">Pas utile</button>
      </div>
    </article>`;
  }).join('');
  const owned = Object.values(state.profile.inventory ?? {}).reduce((a, sizes) => a + sizes.length, 0);
  const empty = `<p class="hint">Rien à prévoir sur les 6 prochaines semaines${state.climateReady ? '' : ' (calcul en cours)'}.</p>`;
  return `<section class="card" aria-labelledby="t-prevoir">
    <div class="card-head"><h2 id="t-prevoir">À prévoir</h2><span class="chip chip-pra">suggestion pratique</span></div>
    ${owned ? '' : '<p class="note">Indiquez d\'abord ce que vous avez déjà (en bas de cette carte) : les suggestions seront plus justes.</p>'}
    ${items || empty}
    <details class="inventory" data-details="inventaire"${state.open.has('inventaire') ? ' open' : ''}><summary>Ce que j'ai déjà (${owned})</summary>${inventory(state)}</details>
    <p class="fineprint">Calcul sur 6 semaines : 16 jours de prévisions, puis la moyenne des trois années passées. Tailles indicatives selon l'âge.</p>
  </section>`;
}

function footer() {
  return `<footer class="foot">
    <p>Superbébé relaie des recommandations publiques et propose des suggestions pratiques. Ce n'est pas un avis médical. En cas d'urgence : 15 ou 112.</p>
    <p>Vigilance météo pas encore intégrée : <a href="https://vigilance.meteofrance.fr/" target="_blank" rel="noopener">consultez Météo-France</a>.</p>
    <p>Météo <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a> (CC BY 4.0), modèles de Météo-France et du CEPMMT · communes geo.api.gouv.fr</p>
    <p><a href="#widget">Widget et installation</a> · <a href="#apropos">Charte, sources, confidentialité</a> · v${VERSION}</p>
  </footer>`;
}

export function viewToday(state, ctx) {
  const head = topbar({ place: state.profile.commune.nom, busy: state.loading });
  if (!ctx) {
    const body = state.error
      ? `<div class="banner warn"><span>${esc(state.error)}</span><button class="btn-ghost" data-action="refresh">Réessayer</button></div>`
      : '<p class="boot">Récupération de la météo…</p>';
    return head + body;
  }
  return [
    head,
    daybar(state, ctx.date),
    banners(state, ctx),
    widgetPreview(state, ctx),
    outingCard(state, ctx),
    outfitCard(state, ctx),
    relaysCard(state, ctx),
    ctx.tomorrow ? '' : nightCard(state, ctx),
    purchasesCard(state, ctx),
    footer(),
  ].join('');
}

// Réglages.
function reportList(r) {
  return `<dl class="kv">
    <dt>Jours d'utilisation</dt><dd>${r.days}${r.first ? ` (du ${esc(dayShort(r.first))} au ${esc(dayShort(r.last))})` : ''}</dd>
    <dt>Retours tenue</dt><dd>${r.bien} bien · ${r.chaud} trop chaud · ${r.froid} trop froid</dd>
    <dt>À prévoir</dt><dd>${r.owned} déjà possédé(s) · ${r.hidden} pas utile(s)</dd>
    <dt>Widget iPhone</dt><dd>${r.widget ? 'configuration copiée' : 'pas encore'}</dd>
  </dl>`;
}

export function viewSettings(state) {
  const { draft, results, profile, today, report } = state;
  const hours = (from, to) => Array.from({ length: to - from + 1 }, (_, k) => `${String(from + k).padStart(2, '0')}:00`);
  const offset = profile.outfit_offset ?? 0;
  return `${topbar({ back: 'Réglages' })}
  <form class="card form" data-form="settings" novalidate>
    ${communePicker(draft, results)}
    ${birthPicker(draft, today)}
    <fieldset class="field"><legend class="label">Pour sortir, le plus souvent</legend>${transportPicker(draft.transport, 'draft-transport')}</fieldset>
    <div class="field">
      <span class="label" id="plage-label">Plage horaire des sorties</span>
      <div class="row2">
        <select id="from" aria-label="Début de la plage">${hours(6, 20).map((h) => `<option value="${h}"${draft.from === h ? ' selected' : ''}>de ${hourLabel(h)}</option>`).join('')}</select>
        <select id="to" aria-label="Fin de la plage">${hours(7, 22).map((h) => `<option value="${h}"${draft.to === h ? ' selected' : ''}>à ${hourLabel(h)}</option>`).join('')}</select>
      </div>
    </div>
    <div class="field">
      <label class="label" for="duration">Durée d'une sortie</label>
      <select id="duration">${[1, 2, 3].map((d) => `<option value="${d}"${Number(draft.duration) === d ? ' selected' : ''}>${d} h</option>`).join('')}</select>
    </div>
    ${draft.error ? `<p class="hint danger">${esc(draft.error)}</p>` : ''}
    <button class="btn" type="submit">Enregistrer</button>
  </form>
  <section class="card">
    <h2>Réglage personnel des tenues</h2>
    <p>${offset
      ? `Tenue ${offset > 0 ? 'plus chaude' : 'plus légère'} ${crans(offset)} que le standard, d'après vos retours.`
      : 'Standard. Vos retours « trop chaud » ou « trop froid » l\'ajustent d\'un cran.'}</p>
    ${offset ? '<button class="btn-ghost" data-action="reset-offset">Revenir au standard</button>' : ''}
  </section>
  <section class="card">
    <h2>Test de la v0.1</h2>
    ${reportList(report)}
    <button class="btn-ghost" data-action="copy-report">Copier mes retours de test</button>
    <p class="fineprint">À coller dans la conversation du groupe de test. Ni la commune ni la date de naissance n'y figurent.</p>
  </section>
  <section class="card">
    <h2>Données</h2>
    <p class="hint">Tout est enregistré sur ce téléphone uniquement.</p>
    <button class="btn-ghost danger" data-action="clear">${state.confirmClear ? 'Confirmer : tout effacer' : 'Effacer toutes mes données'}</button>
  </section>
  ${footer()}`;
}

// Widget et installation : la plateforme du téléphone passe en premier.
export function viewWidget(state) {
  const { loader, installPrompt, platform, androidLink } = state;
  const iphone = `
    <section class="card">
      <h2>iPhone : le widget</h2>
      <p>Il s'affiche sur l'écran d'accueil ou l'écran verrouillé, sans ouvrir l'app. Il passe par Scriptable, une app gratuite.</p>
      <ol class="steps">
        <li>Installez <a href="${SCRIPTABLE_URL}" target="_blank" rel="noopener">Scriptable</a> depuis l'App Store.</li>
        <li><button class="btn-ghost" data-action="copy-loader"${loader ? '' : ' disabled'}>Copier le script</button><br>Dans Scriptable, touchez <strong>+</strong>, collez, nommez le script « Superbébé », puis touchez ▶ une fois.</li>
        <li><button class="btn-ghost" data-action="copy-config">Copier ma configuration</button></li>
        <li>Ajoutez un widget Scriptable : appui long sur l'écran d'accueil, <strong>+</strong>, Scriptable, taille moyenne. Sur l'écran verrouillé : appui long, Personnaliser, puis un widget Scriptable rectangulaire.</li>
        <li>Touchez le widget pendant la modification : Script <strong>Superbébé</strong>, Paramètre : collez la configuration.</li>
      </ol>
      <p class="hint">Toucher le widget ouvre un menu : température de la chambre, retour sur la tenue. Si vous changez de commune ou d'horaires, recopiez la configuration.</p>
      ${loader ? `<details class="relay"><summary>Voir le script</summary><pre class="code">${esc(loader)}</pre></details>` : ''}
    </section>
    <section class="card">
      <h2>iPhone : l'app sur l'écran d'accueil</h2>
      <p>Dans Safari : bouton Partager, puis « Sur l'écran d'accueil ».</p>
    </section>`;
  const android = `
    <section class="card">
      <h2>Android : le widget</h2>
      <ol class="steps">
        <li><a class="btn-ghost" href="../dist/superbebe-android.apk" download>Télécharger l'app du widget (6 Mo)</a><br>Ouvrez le fichier téléchargé. Si Android le demande, autorisez Chrome à installer des applications.</li>
        <li><a class="btn-ghost" href="${esc(androidLink)}">Envoyer ma configuration au widget</a></li>
        <li>Appui long sur l'écran d'accueil, Widgets, puis Superbébé.</li>
      </ol>
      <p class="hint">Toucher le widget ouvre l'app : température de la chambre, retour sur la tenue. Version de test installée hors Play Store, à remplacer plus tard par la version du Play Store.</p>
    </section>
    <section class="card">
      <h2>Android : l'app sur l'écran d'accueil</h2>
      ${installPrompt
        ? '<button class="btn" data-action="install">Installer sur l\'écran d\'accueil</button>'
        : '<p>Dans Chrome : menu ⋮, puis « Installer l\'application » ou « Ajouter à l\'écran d\'accueil ».</p>'}
    </section>`;
  return `${topbar({ back: 'Widget et installation' })}
  <section class="page">${platform === 'android' ? android + iphone : iphone + android}</section>
  ${footer()}`;
}

// Charte, sources, confidentialité.
export function viewAbout(state) {
  const status = { lu: 'vérifiée', lu_via_recherche: 'à relire', a_verifier: 'à vérifier' };
  const sources = state.bundle.sources.sources
    .map((s) => `<li>${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.publisher)}</a>` : esc(s.publisher)} : ${esc(s.title)} <span class="chip">${status[s.verification] ?? ''}</span></li>`)
    .join('');
  return `${topbar({ back: 'Charte et sources' })}
  <section class="page">
    <section class="card">
      <h2>Pas d'avis médical</h2>
      <ul class="sources-list">
        <li>Les repères de santé et de sécurité sont relayés depuis des sources publiques, toujours citées.</li>
        <li>Tenues, créneaux et achats sont des suggestions pratiques, signalées comme telles.</li>
        <li>Les indications TOG viennent des fabricants : l'étiquette de la gigoteuse fait foi.</li>
        <li>Aucun produit contraire aux repères officiels n'est proposé : tour de lit, couverture, cale-bébé, crème solaire avant 1 an.</li>
        <li>Fièvre, maladie, symptômes : demandez conseil à un professionnel de santé. Urgence : 15 ou 112.</li>
      </ul>
    </section>
    <section class="card"><h2>Sources</h2><ul class="sources-list">${sources}</ul></section>
    <section class="card">
      <h2>Confidentialité</h2>
      <ul class="sources-list">
        <li>Pas de compte. Commune, mois de naissance, réglages et retours restent sur ce téléphone.</li>
        <li>Pour la météo, l'app envoie à Open-Meteo les coordonnées du centre de la commune, rien d'autre.</li>
        <li>« Ma position » envoie une position arrondie à environ 1 km à geo.api.gouv.fr pour trouver la commune ; elle n'est pas conservée.</li>
        <li>Aucune publicité, aucun outil de mesure d'audience.</li>
      </ul>
    </section>
    <section class="card">
      <h2>Limites de la v0.1</h2>
      <ul class="sources-list">
        <li>Vigilance Météo-France et épisodes de pollution pas encore intégrés.</li>
        <li>Seuils propres à l'app (−5 °C, 30 °C, indice UV 3…) à faire valider par un professionnel de santé.</li>
        <li>Mode de sortie actuel : ${esc(transportLabel(state.profile?.transport))}. Les tailles sont indicatives selon l'âge.</li>
      </ul>
    </section>
  </section>
  ${footer()}`;
}
