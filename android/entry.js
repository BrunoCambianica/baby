// Point d'entrée appelé par l'app Android via JavaScriptSandbox : ni réseau, ni Intl, ni atob.
// L'app native fournit la météo, la configuration, l'état local et l'heure de Paris.

function sbBase64ToAscii(b64) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  let buffer = 0;
  let bits = 0;
  for (const c of b64.replace(/=+$/, '')) {
    const v = alphabet.indexOf(c);
    if (v < 0) throw new Error('base64 invalide');
    buffer = ((buffer << 6) | v) & 0xffffff;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }
  return out;
}

// eslint-disable-next-line no-unused-vars
function sbAndroid(forecast, configText, state, date, time) {
  const cfg = decodeConfig(configText, sbBase64ToAscii);
  if (!cfg) return JSON.stringify({ error: 'configuration' });
  const profile = configToProfile(cfg);
  profile.outfit_offset = clamp(cfg.o ?? 0, -2, 2);
  profile.room_temp_c = typeof state.room === 'number' ? state.room : null;
  const input = buildInput({ forecast, profile, date, now: time, lat: cfg.la });
  const result = evaluate(input, SB_RULES);
  const moment = displayMoment(result, time);
  return JSON.stringify({
    place: cfg.n || 'Superbébé',
    // Avec la tenue en dessins (réglage de l'app), certaines lignes sont des objets { drawings, text, label }.
    lines: widgetLines(result, moment, SB_RULES.messages, { drawings: cfg.i !== 0 }),
    moment,
    theme: skyTheme(result, moment),
  });
}
