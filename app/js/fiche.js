// Fiche du jour pour la nounou, la crèche ou les grands-parents : la tenue du matin, les changements, le sac
// et la nuit, en image et en lien. Le prénom (ou surnom) seulement : ni nom de famille, ni adresse, ni commune.
// Les données voyagent dans le lien, après le # : elles ne passent par aucun serveur.
// Servi à l'app (création, image) et à la page fiche/ (lecture).
import { DRAWING_STROKE, DRAWINGS, ITEM_DRAWINGS } from '../../engine/drawings.js';
import { hourFr, render, toMin } from '../../engine/engine.js';

const PREFIX = 'F1.';
const toBase64Url = (text, toBase64) => toBase64(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export function encodeFiche(data, toBase64) {
  const ascii = JSON.stringify(data).replace(/[\u007f-￿]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
  return PREFIX + toBase64Url(ascii, toBase64);
}

export function decodeFiche(text, fromBase64) {
  const raw = String(text ?? '').trim();
  if (!raw.startsWith(PREFIX)) return null;
  try {
    let b64 = raw.slice(PREFIX.length).replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const data = JSON.parse(fromBase64(b64));
    return data && data.v === 1 && /^\d{4}-\d{2}-\d{2}$/.test(data.d ?? '') && Array.isArray(data.m) ? data : null;
  } catch (e) {
    return null;
  }
}

// Ce que contient la fiche : le jour du plan (aujourd'hui ou demain) et la nuit qui suit.
export function ficheData({ result, date }, name) {
  const j = result.journee;
  const n = result.night;
  return {
    v: 1,
    p: name ?? '',
    d: date,
    f: [j.feels.first, j.feels.extreme],
    h: [j.from, j.to],
    m: j.morning,
    c: j.changes.map((ch) => [ch.time, ch.remove, ch.add]),
    s: j.bag.map((b) => [b.item, b.reason, b.time ?? '']),
    n: { t: n.tog, w: n.wear, r: n.room_temp_c },
  };
}

const short = (M, items) => items.map((i) => M.labels.items_short[i] ?? i).join(', ');
const long = (M, items) => items.map((i) => M.labels.items[i] ?? i).join(', ');
const range = (f) => (Math.abs(f[1] - f[0]) >= 2 ? `${f[0]}° → ${f[1]}°` : `${f[0]}°`);

// Pourquoi un objet est dans le sac, en quelques mots. Avec `now`, l'heure déjà commencée devient « dès maintenant ».
export function bagReason([, reason, time], now = null) {
  const current = Boolean(time && now && toMin(time) <= toMin(now));
  const at = time && !current ? hourFr(time) : '';
  return {
    plus_tard: at && `pour ${at}`,
    pluie: current ? 'pluie dès maintenant' : at ? `pluie vers ${at}` : 'pluie',
    soleil: current ? 'soleil dès maintenant' : at ? `soleil vers ${at}` : 'soleil',
    pause: "s'il s'arrête",
    hors_poussette: "s'il sort de la poussette",
    voiture: 'en sortant de la voiture',
    si_frais: at ? `si ça fraîchit vers ${at}` : 'si ça fraîchit',
  }[reason] ?? '';
}

export function changeText(M, [time, remove, add]) {
  const parts = [];
  if (remove.length) parts.push(`enlever ${short(M, remove)}`);
  if (add.length) parts.push(`mettre ${short(M, add)}`);
  return `Vers ${hourFr(time)} : ${parts.join(' ; ')}`;
}

export const nightText = (M, n) => `Ce soir : ${short(M, n.w)} + gigoteuse ≈ ${n.t} TOG${n.r === null ? '' : ` (chambre à ${String(n.r).replace('.', ',')} °C)`}`;

// Version texte, pour une messagerie qui ne prend pas l'image.
export function ficheText(data, M, dayLabel) {
  return [
    `${data.p ? `${data.p} · ` : ''}${dayLabel}`,
    `Ressenti ${range(data.f)} (de ${hourFr(data.h[0])} à ${hourFr(data.h[1])})`,
    `Le matin : ${long(M, data.m)}`,
    ...data.c.map((c) => changeText(M, c)),
    data.s.length ? `Dans le sac : ${data.s.map((b) => `${M.labels.items_short[b[0]] ?? b[0]}${bagReason(b) ? ` (${bagReason(b)})` : ''}`).join(', ')}` : '',
    nightText(M, data.n),
    render(M, 'relay.check_neck', 'card'),
    'Suggestions pratiques de Superbébé, pas un avis médical.',
  ].filter(Boolean).join('\n');
}

// Image de la fiche (1080 de large, au moins 1350 de haut, format des messageries) : titre, tenue du matin
// en dessins, changements, sac, nuit, geste de la nuque. Dessinée sur une grande toile, puis recadrée au contenu.
export function ficheCanvas(data, M, dayLabel, doc = document) {
  const W = 1080;
  const H = 2400;
  const canvas = doc.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const font = (size, weight = 500) => `${weight} ${size}px -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
  const sky = ctx.createLinearGradient(0, 0, 0, 360);
  sky.addColorStop(0, '#3b8cf6');
  sky.addColorStop(1, '#9dcdff');
  ctx.fillStyle = '#f2f3f7';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, 360);
  ctx.fillStyle = '#ffffff';
  ctx.font = font(44, 600);
  ctx.fillText(dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1), 72, 110);
  ctx.font = font(92, 750);
  ctx.fillText(data.p || 'La journée', 72, 220);
  ctx.font = font(48, 600);
  ctx.fillText(`Ressenti ${range(data.f)}`, 72, 300);

  // Tenue du matin : un dessin par vêtement, nom dessous, quatre par rangée.
  let y = 420;
  ctx.fillStyle = '#5b6474';
  ctx.font = font(36, 650);
  ctx.fillText(`Le matin, dès ${hourFr(data.h[0])}`, 72, y);
  y += 30;
  const cell = 234;
  data.m.forEach((item, i) => {
    const x = 72 + (i % 4) * cell;
    const top = y + Math.floor(i / 4) * 220;
    ctx.fillStyle = '#e8f0fe';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, top, 200, 150, 32);
    else ctx.rect(x, top, 200, 150);
    ctx.fill();
    drawItem(ctx, ITEM_DRAWINGS[item], x + 50, top + 25, 100, '#2f6fd8');
    ctx.fillStyle = '#1d2a3a';
    ctx.font = font(28, 600);
    ctx.textAlign = 'center';
    ctx.fillText(fit(ctx, capitalize(M.labels.items_short[item] ?? item), 220), x + 100, top + 192);
    ctx.textAlign = 'left';
  });
  y += Math.ceil(data.m.length / 4) * 220 + 40;

  ctx.fillStyle = '#1d2a3a';
  const lines = [
    ...data.c.map((c) => changeText(M, c)),
    data.s.length ? `Dans le sac : ${data.s.map((b) => M.labels.items_short[b[0]] ?? b[0]).join(', ')}` : '',
    nightText(M, data.n),
  ].filter(Boolean);
  ctx.font = font(38, 600);
  for (const line of lines) y = wrap(ctx, line, 72, y, W - 144, 50) + 18;

  ctx.fillStyle = '#5b6474';
  ctx.font = font(32, 500);
  y = wrap(ctx, render(M, 'relay.check_neck', 'card'), 72, y + 20, W - 144, 42);
  const height = Math.max(1350, y + 90);
  ctx.font = font(28, 500);
  ctx.fillText('Superbébé · suggestions pratiques, pas un avis médical', 72, height - 60);
  const out = doc.createElement('canvas');
  out.width = W;
  out.height = height;
  out.getContext('2d').drawImage(canvas, 0, 0);
  return out;
}

const capitalize = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

function fit(ctx, text, max) {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > max) t = t.slice(0, -1);
  return `${t}…`;
}

function wrap(ctx, text, x, y, max, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let top = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > max && line) {
      ctx.fillText(line, x, top);
      line = word;
      top += lineHeight;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, top);
  return top + lineHeight;
}

// Dessin d'un vêtement (engine/drawings.js) sur un canvas : contours, formes et points pleins.
function drawItem(ctx, id, x, y, size, color) {
  const parts = DRAWINGS[id];
  if (!parts || typeof Path2D === 'undefined') return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = DRAWING_STROKE;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const part of parts) {
    const path = new Path2D();
    if (part.c) path.arc(part.c[0], part.c[1], part.c[2], 0, Math.PI * 2);
    else path.addPath(new Path2D(part.d));
    if (part.fill) ctx.fill(path);
    if (!(part.fill && part.c)) ctx.stroke(path);
  }
  ctx.restore();
}
