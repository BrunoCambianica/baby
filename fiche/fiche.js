// Page de la fiche du jour : lue par la nounou, la crèche ou les grands-parents, sans rien installer.
// Les données sont dans le lien, après le # (voir app/js/fiche.js) : rien n'est envoyé au site.
import { ITEM_DRAWINGS } from '../engine/drawings.js';
import { hourFr, render } from '../engine/engine.js';
import { dayLong, esc } from '../app/js/format.js';
import { bagReason, decodeFiche, nightText } from '../app/js/fiche.js';
import { readShortFiche } from '../app/js/famille.js';
import { garment } from '../app/js/illus.js';

const root = document.getElementById('fiche');
const capitalize = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const fromBase64 = (b64) => atob(b64);

function show(html) {
  root.innerHTML = html;
}

// Lien long : la fiche est dans le lien (#f=…). Lien court : ?r=identifiant, et la clé après le # (#k=…),
// pour déchiffrer la fiche gardée 48 heures par le serveur.
async function fiche() {
  const short = new URLSearchParams(location.search).get('r');
  const key = location.hash.match(/^#k=([\w-]+)$/)?.[1];
  if (short && key) {
    try {
      return { data: await readShortFiche(short, key), expired: true };
    } catch (e) {
      return { data: null, expired: true };
    }
  }
  return { data: decodeFiche(location.hash.replace(/^#f=/, ''), fromBase64), expired: false };
}

async function main() {
  const { data, expired } = await fiche();
  if (!data) {
    show(`<div class="page"><p class="boot">${expired ? 'Cette fiche a expiré (elle reste 48 heures) : demandez aux parents la nouvelle.' : 'Cette fiche est incomplète : demandez aux parents de la renvoyer.'}</p></div>`);
    return;
  }
  let M;
  try {
    M = await (await fetch('../rules/v0/messages.fr.json')).json();
  } catch (e) {
    show('<div class="page"><p class="boot">Fiche illisible sans connexion : réessayez dans un instant.</p></div>');
    return;
  }
  const label = (i) => esc(capitalize(M.labels.items_short[i] ?? i));
  const tile = (i, sign = '', size = 64) => `<li${sign ? ` class="${sign === '−' ? 'minus' : 'plus'}"` : ''}><span class="dress-ico">${garment(ITEM_DRAWINGS[i], { size })}${sign ? `<span class="sign" role="img" aria-label="${sign === '−' ? 'enlever' : 'mettre'}">${sign}</span>` : ''}</span><span class="dress-name">${label(i)}</span></li>`;
  const f = data.f;
  const feels = Math.abs(f[1] - f[0]) >= 2 ? `${f[0]}° → ${f[1]}°` : `${f[0]}°`;
  const changes = data.c.map(([time, remove, add]) => `<div class="change"><p class="change-time">Vers ${hourFr(time)}</p>
      <ul class="dress small">${remove.map((i) => tile(i, '−', 40)).join('')}${add.map((i) => tile(i, '+', 40)).join('')}</ul></div>`).join('');
  const bag = data.s.length
    ? `<div class="bag"><h3 class="bag-title">Dans le sac</h3><ul class="bag-list">${data.s.map((b) => `<li><span class="dress-ico">${garment(ITEM_DRAWINGS[b[0]], { size: 30 })}</span>
        <span class="bag-text"><strong>${label(b[0])}</strong>${bagReason(b) ? `<span class="hint">${esc(capitalize(bagReason(b)))}</span>` : ''}</span></li>`).join('')}</ul></div>`
    : '';
  document.title = `${data.p ? `${data.p} · ` : ''}${dayLong(data.d)} · Superbébé`;
  show(`<header class="hero hero--clair"><section class="sky sky--fiche">
      <h1 class="hero-big words">${esc(data.p || 'La journée')}</h1>
      <p class="sky-title">${esc(capitalize(dayLong(data.d)))}</p>
      <p class="hero-sub">Ressenti ${esc(feels)} · de ${hourFr(data.h[0])} à ${hourFr(data.h[1])}</p>
    </section></header>
    <main class="content no-tabbar">
      <section class="card"><h2 class="card-title main">Le matin</h2><ul class="dress">${data.m.map((i) => tile(i)).join('')}</ul>
        ${changes ? `<div class="changes">${changes}</div>` : ''}
        ${bag}</section>
      <section class="card"><p>${esc(nightText(M, data.n))}</p>
        <p class="check"><strong>${esc(render(M, 'relay.check_neck', 'short'))}</strong> : ${esc(render(M, 'relay.check_neck', 'text'))}</p></section>
      <div class="share-row">
        ${navigator.share ? '<button class="btn" data-share>Partager</button>' : ''}
        <button class="btn soft" data-copy>Copier le lien</button>
      </div>
      <p class="foot"><span>Fiche envoyée par les parents avec Superbébé : suggestions pratiques, pas un avis médical. Urgence : 15 ou 112.</span></p>
    </main>`);
}

document.addEventListener('click', async (event) => {
  if (event.target.closest('[data-share]')) {
    try {
      await navigator.share({ title: document.title, url: location.href });
    } catch (e) {
      // Partage annulé.
    }
  }
  if (event.target.closest('[data-copy]')) {
    try {
      await navigator.clipboard.writeText(location.href);
      event.target.textContent = 'Lien copié';
    } catch (e) {
      event.target.textContent = 'Copie impossible';
    }
  }
});

main();
