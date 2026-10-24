// Feuille qui monte du bas de l'écran, aux couleurs de l'app : les listes déroulantes, et ce qu'on ouvre en touchant
// une pièce de la tenue (openSheet).
// Listes déroulantes : la feuille remplace la liste du système (sur Android, une fenêtre blanche qui coupe les libellés
// et ignore le thème). La <select> reste dans la page : elle garde la valeur et ce que disent les lecteurs d'écran ;
// la feuille la règle et lui envoie « change », comme un choix fait dans la liste. Les listes ne reçoivent plus le
// toucher (style.css) : on ouvre la feuille de celle touchée.
// Sur une <option> : data-label (le libellé sans la mention), data-hint (« par défaut », en pastille), data-icon.
// Sur la <select> : data-title, le titre de la feuille quand aria-label est trop court.
import { icon } from './icons.js';

const CLOSE_DRAG_PX = 80;
let open = null;
let after = null;

document.documentElement.classList.add('sheets');

// La liste touchée : celle du libellé (la pastille du mode de sortie, « Selon votre gigoteuse »), sinon celle sous le doigt.
function touched(event) {
  const own = event.target.closest?.('label')?.querySelector('select');
  if (own) return own;
  return [...document.querySelectorAll('#app select')].find((s) => {
    const r = s.getBoundingClientRect();
    return event.clientX >= r.left && event.clientX <= r.right && event.clientY >= r.top && event.clientY <= r.bottom;
  }) ?? null;
}

// Après un nouveau rendu de l'écran, la liste d'origine n'est plus dans la page : on retrouve celle qui l'a remplacée.
function live(select) {
  if (select.isConnected) return select;
  if (select.id) return document.getElementById(select.id);
  return select.dataset.action ? document.querySelector(`select[data-action="${select.dataset.action}"]`) : null;
}

// Le cadre : voile, feuille, poignée et titre, puis le contenu.
function frame(title) {
  const scrim = document.createElement('div');
  scrim.className = 'sheet-scrim';
  const sheet = document.createElement('div');
  sheet.className = 'sheet';
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-label', title);
  sheet.tabIndex = -1;
  sheet.innerHTML = '<div class="sheet-head"><span class="sheet-grip" aria-hidden="true"></span><p class="sheet-title"></p></div>';
  sheet.querySelector('.sheet-title').textContent = title;
  return { scrim, sheet };
}

// Tirer la feuille vers le bas par son en-tête la ferme, comme sur le téléphone.
function draggable(o) {
  const head = o.sheet.querySelector('.sheet-head');
  let y0 = null;
  head.addEventListener('pointerdown', (e) => {
    y0 = e.clientY;
    head.setPointerCapture(e.pointerId);
    o.sheet.classList.add('dragging');
  });
  head.addEventListener('pointermove', (e) => {
    if (y0 !== null) o.sheet.style.transform = `translateY(${Math.max(0, e.clientY - y0)}px)`;
  });
  const end = (e) => {
    if (y0 === null) return;
    const dy = e.clientY - y0;
    y0 = null;
    o.sheet.classList.remove('dragging');
    if (dy > CLOSE_DRAG_PX && open === o) close();
    else o.sheet.style.transform = '';
  };
  head.addEventListener('pointerup', end);
  head.addEventListener('pointercancel', end);
}

// Clavier : Échap ferme ; flèches et Tab passent d'un bouton à l'autre sans sortir de la feuille.
function onKey(event) {
  if (event.key === 'Escape') {
    event.preventDefault();
    close();
    return;
  }
  const opts = [...open.sheet.querySelectorAll('button:not([disabled]), a[href]')];
  const k = opts.indexOf(document.activeElement);
  const tab = event.shiftKey ? k - 1 : k + 1;
  const to = { ArrowDown: k + 1, ArrowUp: k - 1, Home: 0, End: opts.length - 1, Tab: (tab + opts.length) % opts.length }[event.key];
  if (to === undefined || !opts.length) return;
  event.preventDefault();
  opts[Math.max(0, Math.min(opts.length - 1, to))].focus();
}

function show(o, focus) {
  open = o;
  document.body.append(o.scrim, o.sheet);
  document.documentElement.classList.add('sheet-lock');
  // Le bouton retour d'Android ferme la feuille au lieu de quitter l'écran.
  history.pushState({ sheet: true }, '');
  // Sans bouton dans la feuille, elle prend le focus elle-même : Échap la ferme.
  (focus ?? o.sheet).focus({ preventScroll: true });
  o.sheet.getBoundingClientRect();
  o.scrim.classList.add('open');
  o.sheet.classList.add('open');
  o.scrim.addEventListener('click', () => close());
  o.sheet.addEventListener('keydown', onKey);
  draggable(o);
}

export function openList(select, { keyboard = false } = {}) {
  if (open || select.disabled || !select.options.length) return;
  const o = { select, keyboard, ...frame(select.dataset.title ?? select.getAttribute('aria-label') ?? '') };
  const list = document.createElement('div');
  list.className = 'sheet-list';
  list.setAttribute('role', 'radiogroup');
  list.setAttribute('aria-label', o.sheet.getAttribute('aria-label'));
  [...select.options].forEach((opt, i) => {
    const chosen = i === select.selectedIndex;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'sheet-opt';
    b.dataset.index = String(i);
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(chosen));
    b.innerHTML = `${opt.dataset.icon ? icon(opt.dataset.icon, { size: 22 }) : ''}<span class="sheet-text"></span>${opt.dataset.hint ? '<span class="tag"></span>' : ''}`
      + `<span class="sheet-check">${chosen ? icon('check', { size: 20, stroke: 2.4 }) : ''}</span>`;
    b.querySelector('.sheet-text').textContent = opt.dataset.label ?? opt.textContent;
    if (opt.dataset.hint) b.querySelector('.tag').textContent = opt.dataset.hint;
    list.append(b);
  });
  list.addEventListener('click', (e) => {
    const b = e.target.closest('.sheet-opt');
    if (b) choose(Number(b.dataset.index));
  });
  o.sheet.append(list);
  const current = list.querySelector('[aria-checked="true"]') ?? list.firstElementChild;
  show(o, current);
  list.scrollTop = current.offsetTop - (list.clientHeight - current.offsetHeight) / 2;
}

// Une feuille au contenu libre (HTML déjà échappé par les vues) ; ses boutons data-action passent par main.js,
// qui la ferme avec closeSheet.
export function openSheet(title, html, { keyboard = false } = {}) {
  if (open) return;
  const o = { keyboard, ...frame(title) };
  const body = document.createElement('div');
  body.className = 'sheet-content';
  body.innerHTML = html;
  o.sheet.append(body);
  show(o, body.querySelector('button:not([disabled]), a[href]'));
}

function dismiss(o) {
  o.scrim.classList.remove('open');
  o.sheet.classList.remove('open');
  o.sheet.style.transform = '';
  document.documentElement.classList.remove('sheet-lock');
  setTimeout(() => {
    o.scrim.remove();
    o.sheet.remove();
  }, 300);
  if (o.keyboard && o.select) live(o.select)?.focus({ preventScroll: true });
}

// Ce qui suit la fermeture passe une fois la page revenue où elle était (après le retour dans l'historique).
function flush() {
  const then = after;
  after = null;
  then?.();
}

function close(then = null) {
  if (!open) return;
  const o = open;
  open = null;
  dismiss(o);
  after = then;
  if (history.state?.sheet) {
    history.back();
    setTimeout(flush, 400);
  } else flush();
}

export const closeSheet = close;

function choose(index) {
  const { select } = open;
  close(() => {
    const target = live(select);
    if (!target || target.selectedIndex === index) return;
    target.selectedIndex = index;
    target.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

window.addEventListener('popstate', () => {
  if (open) {
    const o = open;
    open = null;
    dismiss(o);
  }
  flush();
});

document.addEventListener('click', (event) => {
  if (open) return;
  const select = touched(event);
  if (!select || select.disabled) return;
  event.preventDefault();
  event.stopPropagation();
  openList(select);
}, true);

// Au clavier, la liste reste une liste (flèches) ; Entrée, Espace ou Alt + flèche ouvrent la feuille.
document.addEventListener('keydown', (event) => {
  if (open || event.target.tagName !== 'SELECT') return;
  if (event.key === 'Enter' || event.key === ' ' || event.key === 'F4' || (event.altKey && event.key === 'ArrowDown')) {
    event.preventDefault();
    openList(event.target, { keyboard: true });
  }
});
