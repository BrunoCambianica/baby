// Partie propre au widget iPhone (Scriptable).
// tools/build-widget.js la concatène après engine/engine.js et engine/adapter.js, avec les règles embarquées.
/* global ListWidget, Color, Font, Request, FileManager, Data, Alert, Script, Safari, config, args,
   SB_BASE_URL, SB_RULES */

const SB_APP_URL = `${SB_BASE_URL}app/`;
const SB_ROOM_TTL_MS = 16 * 3600 * 1000;

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
const sbColor = (light, dark) =>
  typeof Color.dynamic === 'function' ? Color.dynamic(new Color(light), new Color(dark)) : new Color(light);
const sbFreshRoom = (state) => (state.room && Date.now() - state.room.at < SB_ROOM_TTL_MS ? state.room.value : null);

// Toucher le widget ouvre ce menu dans Scriptable.
async function sbMenu(state) {
  const sheet = new Alert();
  sheet.title = 'Superbébé';
  sheet.message = 'Un retour sur la tenue, ou la température de la chambre ?';
  sheet.addAction('Température de la chambre');
  sheet.addAction('Tenue : trop chaud');
  sheet.addAction('Tenue : bien');
  sheet.addAction('Tenue : trop froid');
  sheet.addAction("Ouvrir l'app complète");
  sheet.addCancelAction('Voir le widget');
  const choice = await sheet.presentSheet();
  if (choice === 0) {
    const ask = new Alert();
    ask.title = 'Chambre de bébé';
    ask.message = 'Température indiquée par votre thermomètre, en °C.';
    const field = ask.addTextField('19,5', state.room ? frNumber(state.room.value) : '');
    if (field && typeof field.setDecimalPadKeyboard === 'function') field.setDecimalPadKeyboard();
    ask.addAction('Enregistrer');
    ask.addCancelAction('Annuler');
    if ((await ask.presentAlert()) === 0) {
      const value = parseFloat(String(ask.textFieldValue(0)).replace(',', '.'));
      if (value >= 5 && value <= 40) state.room = { value: Math.round(value * 2) / 2, at: Date.now() };
    }
  } else if (choice >= 1 && choice <= 3) {
    const delta = [-1, 0, 1][choice - 1];
    state.offset = clamp((state.offset ?? 0) + delta, -2, 2);
    state.feedback = [...(state.feedback ?? []), { at: Date.now(), v: delta }].slice(-60);
  } else if (choice === 4) {
    Safari.open(SB_APP_URL);
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

function sbMessageWidget(family, message) {
  const w = new ListWidget();
  if (family.startsWith('accessory')) {
    sbText(w, 'Superbébé', 12, { bold: true });
    sbText(w, message, 11, { lines: 2, scale: 0.6 });
    return w;
  }
  w.backgroundColor = sbColor('#e8f1f5', '#16222c');
  const ink = sbColor('#16212b', '#eef3f6');
  sbText(w, 'SUPERBÉBÉ', 10, { bold: true, color: sbColor('#556472', '#9aa8b4') });
  w.addSpacer(6);
  sbText(w, message, 13, { color: ink, lines: 5, scale: 0.7 });
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
  const ink = sbColor('#16212b', '#eef3f6');
  const muted = sbColor('#556472', '#9aa8b4');
  w.backgroundColor = sbColor('#e8f1f5', '#16222c');
  w.setPadding(12, 14, 10, 14);
  sbText(w, `SUPERBÉBÉ · ${info.place}`.toUpperCase(), 9, { bold: true, color: muted });
  w.addSpacer(small ? 4 : 6);
  const shown = small ? lines.slice(0, 2) : lines;
  shown.forEach((line, k) => {
    sbText(w, line, k === 0 ? (small ? 13 : 15) : small ? 11 : 13, { bold: k === 0, color: ink, lines: small ? 3 : 2, scale: 0.7 });
    if (k < shown.length - 1) w.addSpacer(small ? 3 : 4);
  });
  w.addSpacer();
  sbText(w, info.footer, 9, { color: muted });
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
  const param = String(args.widgetParameter ?? '').trim();
  if (param && decodeConfig(param, sbDecode)) state.config = param;
  const cfg = decodeConfig(state.config ?? '', sbDecode);
  if (!cfg) {
    files.write('etat.json', state);
    const message = family.startsWith('accessory')
      ? 'Collez la configuration dans le paramètre du widget.'
      : "Configuration manquante. Dans l'app web, ouvrez « Widget et installation », copiez votre configuration, puis collez-la dans le champ Paramètre de ce widget.";
    return sbFinish(sbMessageWidget(family, message), inWidget);
  }
  if (!inWidget) await sbMenu(state);
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
  profile.outfit_offset = clamp((cfg.o ?? 0) + (state.offset ?? 0), -2, 2);
  profile.room_temp_c = sbFreshRoom(state);
  const input = buildInput({ forecast: cache.forecast, profile, date, now: time, lat: cfg.la });
  const result = evaluate(input, SB_RULES);
  const moment = momentOf(time);
  const lines = widgetLines(result, moment, SB_RULES.messages);
  const updated = parisNow(new Date(cache.at)).time.replace(':', ' h ');
  const window = result.outing.window;
  const info = {
    place: cfg.n || 'Superbébé',
    footer: `${offline ? 'Hors ligne · ' : ''}Mis à jour à ${updated} · Open-Meteo`,
    short: moment === 'jour'
      ? window ? `${Number(window.start.slice(0, 2))} h` : '—'
      : result.night.tog ? `${result.night.tog}` : '—',
  };
  return sbFinish(sbDraw(family, lines, info), inWidget);
}
