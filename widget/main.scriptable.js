// Partie propre au widget iPhone (Scriptable).
// tools/build-widget.js la concatène après engine/engine.js et engine/adapter.js, avec les règles embarquées.
/* global ListWidget, Color, Font, LinearGradient, Point, Request, FileManager, Data, Script, Safari, WebView, config, args,
   SB_BASE_URL, SB_CONFIG_LOADER, SB_RULES */

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
const sbFreshRoom = (state) => (state.room && Date.now() - state.room.at < SB_ROOM_TTL_MS ? state.room.value : null);

// Réglages : le dernier changement l'emporte, qu'il vienne du script copié depuis l'app (chargeur),
// du champ Parameter du widget, ou de l'app elle-même (voir sbApply).
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

// Réglages et relevé de la chambre envoyés par l'app : config=SB1.… et room=valeur@horodatage.
function sbApply(state, params) {
  const config = String(params.config ?? '');
  if (sbValid(config)) state.config = config;
  const [value, at] = String(params.room ?? '').split('@').map(Number);
  if (value >= 5 && value <= 40 && at > (state.room?.at ?? 0)) state.room = { value, at };
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
const sbTapUrl = () => `scriptable:///run/${encodeURIComponent(Script.name())}?ouvrir=app`;

// … qui ouvre l'app en plein écran. L'app y renvoie ses changements par des liens superbebe-sync:?…
async function sbOpenApp(state, configText) {
  const url = `${SB_APP_URL}?hote=scriptable#import=${configText}`;
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
  if (family === 'accessoryInline') {
    w.addText(lines[0] ?? 'Superbébé');
    return w;
  }
  if (family === 'accessoryCircular') {
    sbText(w, info.short, 14, { bold: true, scale: 0.5 });
    return w;
  }
  if (family === 'accessoryRectangular') {
    lines.slice(0, 3).forEach((line, k) => sbText(w, line, k === 0 ? 13 : 11, { bold: k === 0, scale: 0.6 }));
    return w;
  }
  const small = family === 'small';
  const white = Color.white();
  const soft = new Color('#ffffff', 0.82);
  sbBackground(w, info.theme);
  w.setPadding(14, 16, 12, 16);
  sbText(w, `SUPERBÉBÉ · ${info.place}`.toUpperCase(), 9, { bold: true, color: soft });
  w.addSpacer(small ? 5 : 8);
  const shown = small ? lines.slice(0, 2) : lines;
  shown.forEach((line, k) => {
    sbText(w, line, k === 0 ? (small ? 14 : 17) : small ? 11 : 13, {
      bold: k === 0, color: k === 0 ? white : soft, lines: small ? 3 : 2, scale: 0.7,
    });
    if (k < shown.length - 1) w.addSpacer(small ? 3 : 5);
  });
  w.addSpacer();
  sbText(w, info.footer, 9, { color: new Color('#ffffff', 0.7) });
  return w;
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
  sbResolveConfig(state, String(args.widgetParameter ?? '').trim());
  if (!inWidget) sbApply(state, query);
  const cfg = decodeConfig(state.config ?? '', sbDecode);
  if (!cfg) {
    files.write('etat.json', state);
    const message = family.startsWith('accessory')
      ? "Recopiez le script depuis l'app Superbébé."
      : "Réglages manquants. Dans l'app Superbébé : Réglages, Ajouter le widget, puis copiez à nouveau le script dans Scriptable.";
    return sbFinish(sbMessageWidget(family, message), inWidget);
  }
  if (!inWidget && query.ouvrir === 'app') {
    await sbOpenApp(state, state.config);
    files.write('etat.json', state);
    return Script.complete();
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
  const profile = configToProfile(cfg);
  profile.room_temp_c = sbFreshRoom(state);
  const input = buildInput({ forecast: cache.forecast, profile, date, now: time, lat: cfg.la });
  const result = evaluate(input, SB_RULES);
  const moment = momentOf(time);
  const lines = widgetLines(result, moment, SB_RULES.messages);
  const updated = parisNow(new Date(cache.at)).time.replace(':', ' h ');
  const window = result.outing.window;
  const info = {
    place: cfg.n || 'Superbébé',
    theme: skyTheme(result, moment),
    footer: `${offline ? 'Hors ligne · ' : ''}Mis à jour à ${updated} · Open-Meteo`,
    short: moment === 'jour'
      ? window ? hourFr(window.start) : '—'
      : result.night.tog ? `${result.night.tog}` : '—',
  };
  const widget = sbDraw(family, lines, info);
  widget.url = sbTapUrl();
  return sbFinish(widget, inWidget);
}
