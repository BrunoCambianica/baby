// Partie propre au widget iPhone (Scriptable).
// tools/build-widget.js la concatène après engine/engine.js et engine/adapter.js, avec les règles embarquées.
/* global ListWidget, Color, Font, LinearGradient, Point, Request, FileManager, Data, Script, Safari, WebView, DrawContext, Alert,
   Path, Rect, Size, Notification, config, args, SB_BASE_URL, SB_CONFIG_LOADER, SB_RULES */

const SB_APP_URL = `${SB_BASE_URL}app/`;
const SB_ROOM_TTL_MS = 16 * 3600 * 1000;
// Même ciel que l'app : la couleur dit le temps qu'il fait au moment conseillé.
const SB_SKY = {
  clair: ['#3b8cf6', '#9dcdff'],
  nuageux: ['#5b7aa0', '#aec3da'],
  pluie: ['#3f5d7c', '#8ea7be'],
  chaleur: ['#ec7f24', '#f9cd84'],
  froid: ['#4a72c0', '#b8d3f4'],
  nuit: ['#121a33', '#3a4a80'],
  maison: ['#2f8f83', '#8fd3c6'],
};

function sbFiles() {
  const fm = FileManager.local();
  const dir = fm.joinPath(fm.documentsDirectory(), 'superbebe');
  if (!fm.fileExists(dir)) fm.createDirectory(dir, true);
  const path = (name) => fm.joinPath(dir, name);
  return {
    read(name) {
      try {
        return fm.fileExists(path(name)) ? JSON.parse(fm.readString(path(name))) : null;
      } catch (e) {
        return null;
      }
    },
    write(name, value) {
      fm.writeString(path(name), JSON.stringify(value));
    },
  };
}

const sbDecode = (b64) => Data.fromBase64String(b64).toRawString();
const sbValid = (text) => Boolean(text) && Boolean(decodeConfig(text, sbDecode));
// Relevé de l'enfant, valable 16 heures : sa chambre (`room` vient des versions à un seul enfant) ou, avec `day`,
// la pièce où il passe la journée (widget Maison).
function sbFreshRoom(state, childId, first, day = false) {
  const room = day ? state.dayRooms?.[childId] : state.rooms?.[childId] ?? (first ? state.room : null);
  return room && Date.now() - room.at < SB_ROOM_TTL_MS ? room.value : null;
}

// Champ Parameter du widget : le prénom ou le numéro de l'enfant, et « maison » pour le widget Maison (« Léo maison »).
function sbParam(param) {
  const words = String(param ?? '').trim().split(/[\s,;]+/).filter(Boolean);
  const home = words.some((w) => plainName(w) === 'maison');
  return { home, ref: words.filter((w) => plainName(w) !== 'maison').join(' ') };
}

// Réglages : le dernier changement l'emporte, qu'il vienne du script copié depuis l'app (chargeur),
// du champ Parameter du widget, ou de l'app elle-même (voir sbApply).
// Le champ Parameter peut aussi désigner l'enfant de ce widget : son prénom ou son numéro (1, 2…).
function sbResolveConfig(state, param) {
  if (sbValid(SB_CONFIG_LOADER) && SB_CONFIG_LOADER !== state.loaderSeen) {
    state.config = SB_CONFIG_LOADER;
    state.loaderSeen = SB_CONFIG_LOADER;
  }
  if (sbValid(param) && param !== state.paramSeen) {
    state.config = param;
    state.paramSeen = param;
  }
}

function sbRoom(state, childId, text, key = 'rooms') {
  const [value, at] = String(text ?? '').split('@').map(Number);
  if (!(value >= 5 && value <= 40 && at > (state[key]?.[childId]?.at ?? 0))) return;
  state[key] = { ...state[key], [childId]: { value, at } };
}

// Réglages et relevés envoyés par l'app : config=SB1.… et rooms=enfant:valeur@horodatage,… pour les chambres
// (room=valeur@horodatage pour le premier enfant, dans les versions à un seul enfant), dayrooms=… pour les pièces de jour ;
// rappel=HH:MM (rappel du soir activé dans l'app) ou rappel=0.
function sbApply(state, params) {
  const config = String(params.config ?? '');
  if (sbValid(config)) state.config = config;
  if (params.rappel !== undefined) {
    const at = String(params.rappel);
    state.reminder = /^\d{2}:\d{2}$/.test(at) ? { on: true, at } : { on: false };
  }
  const cfg = decodeConfig(state.config ?? '', sbDecode);
  if (params.room && cfg) sbRoom(state, configChildren(cfg)[0].id, params.room);
  for (const [param, key] of [['rooms', 'rooms'], ['dayrooms', 'dayRooms']]) {
    for (const part of String(params[param] ?? '').split(',')) {
      const colon = part.indexOf(':');
      if (colon > 0) sbRoom(state, part.slice(0, colon), part.slice(colon + 1), key);
    }
  }
}

function sbQuery(url) {
  const params = {};
  for (const part of url.slice(url.indexOf('?') + 1).split('&')) {
    const eq = part.indexOf('=');
    if (eq > 0) params[part.slice(0, eq)] = decodeURIComponent(part.slice(eq + 1));
  }
  return params;
}

// Toucher le widget relance ce script dans Scriptable (le réglage « When Interacting » est ignoré)…
const sbTapUrl = (childId, home) => `scriptable:///run/${encodeURIComponent(Script.name())}?ouvrir=app${childId ? `&enfant=${childId}` : ''}${home ? '&onglet=maison' : ''}`;

// … qui ouvre l'app en plein écran, sur l'enfant du widget (et l'onglet Maison pour le widget Maison).
// L'app y renvoie ses changements par des liens superbebe-sync:?…
async function sbOpenApp(state, configText, childId, home = false) {
  const url = `${SB_APP_URL}?hote=scriptable${childId ? `&enfant=${encodeURIComponent(childId)}` : ''}${home ? '&onglet=maison' : ''}#import=${configText}`;
  if (typeof WebView === 'undefined') {
    Safari.open(url);
    return;
  }
  const view = new WebView();
  view.shouldAllowRequest = (request) => {
    const target = String(request.url ?? '');
    if (target.startsWith('superbebe-sync:')) {
      sbApply(state, sbQuery(target));
      return false;
    }
    if (target.startsWith(SB_APP_URL) || target.startsWith('about:')) return true;
    if (/^https?:/.test(target)) Safari.open(target);
    return false;
  };
  try {
    await view.loadURL(url);
    await view.present(false);
  } catch (e) {
    Safari.open(url);
  }
}

// Premier lancement à la main (après le collage du script) : la dernière étape, dite dans Scriptable même.
async function sbWelcome() {
  const name = Script.name();
  const alert = new Alert();
  alert.title = 'Superbébé est prêt';
  alert.message = [
    'Dernière étape : poser le widget.',
    "1. Écran d'accueil : appui long sur un espace vide, Modifier, puis Ajouter un widget.",
    '2. Scriptable, taille moyenne, Ajouter le widget.',
    `3. Appui long sur le widget, Modifier le widget, Script : « ${name} ».`,
    'Plusieurs enfants ? Un widget par enfant : dans Parameter, écrivez son prénom.',
    'Widget Maison (température chez vous ou de sa chambre, et la tenue) : un autre widget, Parameter : maison.',
    name === 'Superbébé' ? '' : "Astuce : renommez ce script « Superbébé » (touchez son nom en haut) pour que l'app puisse lui envoyer vos réglages.",
  ].filter(Boolean).join('\n\n');
  alert.addAction('Compris');
  await alert.presentAlert();
}

// Dessins des vêtements (engine/drawings.js) tracés en blanc : commandes absolues M, L, Q, C et Z.
function sbPath(d, k) {
  const path = new Path();
  const t = d.match(/[MLQCZ]|-?\d*\.?\d+/g) ?? [];
  const point = (i) => new Point(Number(t[i]) * k, Number(t[i + 1]) * k);
  let i = 0;
  while (i < t.length) {
    const cmd = t[i++];
    if (cmd === 'M') path.move(point(i));
    else if (cmd === 'L') path.addLine(point(i));
    else if (cmd === 'Q') path.addQuadCurve(point(i + 2), point(i));
    else if (cmd === 'C') path.addCurve(point(i + 4), point(i), point(i + 2));
    else if (cmd === 'Z') path.closeSubpath();
    i += { M: 2, L: 2, Q: 4, C: 6 }[cmd] ?? 0;
  }
  return path;
}

function sbDrawing(id, size) {
  const parts = DRAWINGS[id];
  if (!parts) return null;
  const k = size / 24;
  const ctx = new DrawContext();
  ctx.size = new Size(size, size);
  ctx.opaque = false;
  ctx.respectScreenScale = true;
  ctx.setStrokeColor(Color.white());
  ctx.setFillColor(Color.white());
  ctx.setLineWidth(DRAWING_STROKE * k);
  for (const part of parts) {
    const shape = () => {
      if (!part.c) return sbPath(part.d, k);
      const [cx, cy, r] = part.c;
      const circle = new Path();
      circle.addEllipse(new Rect((cx - r) * k, (cy - r) * k, 2 * r * k, 2 * r * k));
      return circle;
    };
    // Comme dans l'app : un contour plein est aussi tracé, un point plein ne l'est pas.
    if (part.fill) {
      ctx.addPath(shape());
      ctx.fillPath();
    }
    if (!(part.fill && part.c)) {
      ctx.addPath(shape());
      ctx.strokePath();
    }
  }
  return ctx.getImage();
}

// Ligne de dessins : jusqu'à `max` dessins, puis « +n » et le texte éventuel (TOG de la gigoteuse).
function sbDrawingsRow(widget, line, size, max, color) {
  const row = widget.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  row.spacing = Math.round(size / 4);
  for (const id of line.drawings.slice(0, max)) {
    const image = sbDrawing(id, size);
    if (image) row.addImage(image).imageSize = new Size(size, size);
  }
  const rest = line.drawings.length - max;
  const text = [rest > 0 ? `+${rest}` : '', line.text].filter(Boolean).join('  ');
  if (text) {
    const t = row.addText(text);
    t.font = Font.boldSystemFont(Math.round(size * 0.62));
    t.textColor = color;
    t.lineLimit = 1;
  }
}

function sbText(widget, text, size, options = {}) {
  const t = widget.addText(text);
  t.font = options.bold ? Font.boldSystemFont(size) : Font.systemFont(size);
  if (options.color) t.textColor = options.color;
  t.lineLimit = options.lines ?? 1;
  t.minimumScaleFactor = options.scale ?? 0.75;
  return t;
}

function sbBackground(widget, theme) {
  const [top, bottom] = SB_SKY[theme] ?? SB_SKY.clair;
  const gradient = new LinearGradient();
  gradient.colors = [new Color(top), new Color(bottom)];
  gradient.locations = [0, 1];
  gradient.startPoint = new Point(0, 0);
  gradient.endPoint = new Point(1, 1);
  widget.backgroundGradient = gradient;
}

function sbMessageWidget(family, message) {
  const w = new ListWidget();
  if (family.startsWith('accessory')) {
    sbText(w, 'Superbébé', 12, { bold: true });
    sbText(w, message, 11, { lines: 2, scale: 0.6 });
    return w;
  }
  sbBackground(w, 'nuageux');
  sbText(w, 'SUPERBÉBÉ', 10, { bold: true, color: new Color('#ffffff', 0.8) });
  w.addSpacer(6);
  sbText(w, message, 13, { color: Color.white(), lines: 5, scale: 0.7 });
  return w;
}

function sbDraw(family, lines, info) {
  const w = new ListWidget();
  w.refreshAfterDate = new Date(Date.now() + 30 * 60 * 1000);
  const label = (line) => (typeof line === 'string' ? line : line.label);
  if (family === 'accessoryInline') {
    w.addText(label(lines[0] ?? 'Superbébé'));
    return w;
  }
  if (family === 'accessoryCircular') {
    sbText(w, info.short, 14, { bold: true, scale: 0.5 });
    return w;
  }
  if (family === 'accessoryRectangular') {
    lines.slice(0, 3).forEach((line, k) => sbText(w, label(line), k === 0 ? 13 : 11, { bold: k === 0, scale: 0.6 }));
    return w;
  }
  const small = family === 'small';
  const white = Color.white();
  const soft = new Color('#ffffff', 0.82);
  sbBackground(w, info.theme);
  w.setPadding(14, 16, 12, 16);
  sbText(w, `${info.name || 'Superbébé'} · ${info.place}`.toUpperCase(), 9, { bold: true, color: soft });
  w.addSpacer(small ? 5 : 8);
  const shown = small ? lines.slice(0, 2) : lines;
  shown.forEach((line, k) => {
    if (typeof line !== 'string') sbDrawingsRow(w, line, small ? 20 : 24, small ? 4 : 8, white);
    else {
      sbText(w, line, k === 0 ? (small ? 14 : 17) : small ? 11 : 13, {
        bold: k === 0, color: k === 0 ? white : soft, lines: small ? 3 : 2, scale: 0.7,
      });
    }
    if (k < shown.length - 1) w.addSpacer(small ? 3 : 5);
  });
  w.addSpacer();
  sbText(w, small ? info.footerSmall : info.footer, 9, { color: new Color('#ffffff', 0.7) });
  return w;
}

// Rappel du soir, s'il a été activé dans l'app : une notification par jour au plus, à l'heure choisie, avec la tenue
// et le sac de demain de chaque enfant, et la nuit. Reprogrammée à chaque lancement avec les dernières prévisions ;
// sans réseau ni accord pour les notifications, rien ne se passe.
const SB_REMINDER_ID = 'superbebe-rappel';
async function sbScheduleReminder(state, cfg, forecast, date, time) {
  if (typeof Notification === 'undefined') return;
  try {
    if (!state.reminder?.on) {
      if (state.reminderScheduled) Notification.removePending([SB_REMINDER_ID]);
      state.reminderScheduled = false;
      return;
    }
    const at = state.reminder.at;
    const day = toMin(time) < toMin(at) ? date : addDays(date, 1);
    const children = configChildren(cfg);
    const lines = children.map((child, k) => {
      const profile = configToProfile(cfg, child.id);
      profile.room_temp_c = sbFreshRoom(state, child.id, k === 0);
      const view = widgetView({ forecast, profile, date: day, time: at, lat: cfg.la }, SB_RULES, { reminder: true });
      return view.reminder && `${children.length > 1 ? `${child.name || `Enfant ${k + 1}`} : ` : ''}${view.reminder}`;
    }).filter(Boolean);
    if (!lines.length) return;
    const notification = new Notification();
    notification.identifier = SB_REMINDER_ID;
    notification.threadIdentifier = 'superbebe';
    notification.title = render(SB_RULES.messages, 'evening.reminder', 'short');
    notification.body = lines.join('\n');
    notification.openURL = `scriptable:///run/${encodeURIComponent(Script.name())}?ouvrir=app`;
    const [y, m, d] = day.split('-').map(Number);
    notification.setTriggerDate(new Date(y, m - 1, d, Number(at.slice(0, 2)), Number(at.slice(3, 5))));
    await notification.schedule();
    state.reminderScheduled = true;
  } catch (e) {
    // Notifications indisponibles (widget, autorisation refusée) : le widget reste à jour sans rappel.
  }
}

async function sbFinish(widget, inWidget) {
  if (inWidget) Script.setWidget(widget);
  else await widget.presentMedium();
  Script.complete();
}

async function runSuperbebe() {
  const family = config.widgetFamily ?? 'medium';
  const inWidget = Boolean(config.runsInWidget || config.runsInAccessoryWidget);
  const files = sbFiles();
  const state = files.read('etat.json') ?? {};
  const query = args.queryParameters ?? {};
  const param = String(args.widgetParameter ?? '').trim();
  sbResolveConfig(state, param);
  if (!inWidget) sbApply(state, query);
  const cfg = decodeConfig(state.config ?? '', sbDecode);
  if (!cfg) {
    files.write('etat.json', state);
    const message = family.startsWith('accessory')
      ? "Recopiez le script depuis l'app Superbébé."
      : "Réglages manquants. Dans l'app Superbébé : Réglages, Ajouter le widget, puis copiez à nouveau le script dans Scriptable.";
    return sbFinish(sbMessageWidget(family, message), inWidget);
  }
  const wanted = sbValid(param) ? { home: false, ref: '' } : sbParam(param);
  const child = pickChild(cfg, query.enfant ?? wanted.ref);
  if (!inWidget && query.ouvrir === 'app') {
    await sbOpenApp(state, state.config, child.id, query.onglet === 'maison');
    files.write('etat.json', state);
    return Script.complete();
  }
  if (!inWidget && !query.config && !state.welcomed) {
    await sbWelcome();
    state.welcomed = true;
  }
  files.write('etat.json', state);

  let cache = files.read('meteo.json');
  let offline = false;
  try {
    const request = new Request(forecastUrl({ lat: cfg.la, lon: cfg.lo }));
    request.timeoutInterval = 20;
    const forecast = await request.loadJSON();
    if (!forecast || !forecast.hourly) throw new Error('Réponse météo incomplète');
    cache = { forecast, at: Date.now(), la: cfg.la, lo: cfg.lo };
    files.write('meteo.json', cache);
  } catch (e) {
    offline = true;
  }
  if (!cache || cache.la !== cfg.la || cache.lo !== cfg.lo) {
    return sbFinish(sbMessageWidget(family, 'Météo indisponible. Vérifiez la connexion, puis touchez le widget.'), inWidget);
  }

  const { date, time } = parisNow();
  const profile = configToProfile(cfg, child.id);
  profile.room_temp_c = sbFreshRoom(state, child.id, child.id === configChildren(cfg)[0].id);
  profile.day_room_temp_c = sbFreshRoom(state, child.id, false, true);
  // Le jour, la journée en couches ; le soir, la tenue et le sac de demain, à préparer, et la nuit.
  // Widget Maison : la journée chez vous ou la nuit dans sa chambre, le relevé et la tenue.
  const view = wanted.home
    ? homeWidgetView({ forecast: cache.forecast, profile, date, time, lat: cfg.la }, SB_RULES, { drawings: cfg.i !== 0 })
    : widgetView({ forecast: cache.forecast, profile, date, time, lat: cfg.la }, SB_RULES, { drawings: cfg.i !== 0 });
  await sbScheduleReminder(state, cfg, cache.forecast, date, time);
  files.write('etat.json', state);
  // Pied du widget : le geste pour vérifier qu'il n'a pas trop chaud, et l'heure de la météo.
  const updated = hourFr(parisNow(new Date(cache.at)).time);
  const offlineText = offline ? 'Hors ligne · ' : '';
  const info = {
    name: child.name,
    place: wanted.home ? (view.kind === 'nuit' ? 'Sa chambre' : 'Chez vous') : cfg.n || 'Superbébé',
    theme: view.theme,
    footer: `${offlineText}${view.check} · ${updated}`,
    footerSmall: `${offlineText}${view.check_tiny} · ${updated}`,
    short: view.short,
  };
  const widget = sbDraw(family, view.lines, info);
  widget.url = sbTapUrl(child.id, wanted.home);
  return sbFinish(widget, inWidget);
}
