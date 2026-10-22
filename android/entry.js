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

// Rendu d'un enfant. `state.rooms` : relevé de la chambre par enfant ({ identifiant: degrés }) ;
// `state.room` : relevé unique des versions à un seul enfant, pour le premier.
function sbRenderChild(forecast, cfg, child, state, date, time) {
  const profile = configToProfile(cfg, child.id);
  profile.outfit_offset = clamp(profile.outfit_offset ?? 0, -2, 2);
  const rooms = state.rooms ?? {};
  const room = typeof rooms[child.id] === 'number' ? rooms[child.id] : child.id === configChildren(cfg)[0].id ? state.room : null;
  profile.room_temp_c = typeof room === 'number' ? room : null;
  const input = buildInput({ forecast, profile, date, now: time, lat: cfg.la });
  const result = evaluate(input, SB_RULES);
  const moment = displayMoment(result, time);
  return {
    id: child.id,
    name: child.name,
    place: cfg.n || 'Superbébé',
    // Pied du widget : le geste pour vérifier qu'il n'a pas trop chaud (l'heure de la météo est ajoutée par l'app).
    check: result.widget.check,
    // Avec la tenue en dessins (réglage de l'app), certaines lignes sont des objets { drawings, text, label }.
    lines: widgetLines(result, moment, SB_RULES.messages, { drawings: cfg.i !== 0 }),
    moment,
    theme: skyTheme(result, moment),
  };
}

// Un enfant (le premier, ou celui désigné par `childRef` : identifiant, prénom ou numéro).
// eslint-disable-next-line no-unused-vars
function sbAndroid(forecast, configText, state, date, time, childRef) {
  const cfg = decodeConfig(configText, sbBase64ToAscii);
  if (!cfg) return JSON.stringify({ error: 'configuration' });
  return JSON.stringify(sbRenderChild(forecast, cfg, pickChild(cfg, childRef ?? ''), state, date, time));
}

// Tous les enfants d'un coup, pour les widgets posés (un par enfant) : { children: [rendu, …] }.
// eslint-disable-next-line no-unused-vars
function sbAndroidAll(forecast, configText, state, date, time) {
  const cfg = decodeConfig(configText, sbBase64ToAscii);
  if (!cfg) return JSON.stringify({ error: 'configuration' });
  return JSON.stringify({ children: configChildren(cfg).map((child) => sbRenderChild(forecast, cfg, child, state, date, time)) });
}
