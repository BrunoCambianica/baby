// Superbébé 0.1.0, widget iPhone pour Scriptable.

// Fichier généré par tools/build-widget.js à partir de engine/ et widget/main.scriptable.js : ne pas modifier à la main.

const SB_VERSION = "0.1.0";

// Le chargeur fournit l'adresse réelle du site ; sinon, adresse par défaut (champ homepage de package.json).

const SB_BASE_URL = (typeof SB_BASE_FROM_LOADER === 'string' && SB_BASE_FROM_LOADER) || "https://brunocambianica.github.io/baby/";

const SB_RULES = {"rules":{"id":"baby-rules","version":"0.1.0","status":"brouillon, à relire avant toute diffusion","updated":"2026-10-21","locale":"fr-FR","policy":{"medical_advice":false,"official_message_levels":["A","A-etranger"],"kinds":{"officiel":"Repère officiel, cité avec sa source","pratique":"Suggestion pratique, sans portée sanitaire","fabricant":"Indication des fabricants ou d'une norme produit","meteo":"Donnée météo"},"out_of_scope":["fièvre, maladie, symptômes, médicaments","diagnostic, triage ou réassurance sur l'état de santé de l'enfant","promesse de sécurité ou de prévention de la mort inattendue du nourrisson","produits présentés comme protégeant la santé"]},"outing":{"default_window":{"from":"09:00","to":"18:00"},"default_duration_h":1,"vigilance":{"block_all_from_color":"rouge","block_all_if_orange_for":["vent-violent","orages","pluie-inondation","crues","neige-verglas","avalanches","vagues-submersion","grand-froid"],"source":"meteofrance-vigilance"},"heat":{"trigger_vigilance_canicule_from":"jaune","trigger_tmax_c_at_least":30,"blocked_hours":{"from":"11:00","to":"21:00"},"source":"spf-fortes-chaleurs-bebes"},"ozone_episode_blocked_hours":{"from":"12:00","to":"18:00","source":"santefr-pollution"},"slot_exclusions":{"feels_c_at_most":-5,"precip_prob_at_least":60,"precip_mm_at_least":0.5,"gust_kmh_at_least":60},"scoring":{"base":100,"rain_prob_free":20,"rain_prob_weight":1,"comfort_low_c":15,"comfort_low_weight":2,"comfort_high_c":24,"comfort_high_weight":3,"gust_free_kmh":30,"gust_weight":0.5,"uv_free":2,"uv_weight":10,"uv_weight_under_12m":20},"none_reason_priority":["canicule_heures_chaudes","ozone_apres_midi","froid_extreme","vent","pluie","duree"]},"outfit":{"bands":[{"id":"tres_chaud","min_feels_c":27,"items":["body_leger","tenue_ample_claire","chapeau"]},{"id":"chaud","min_feels_c":22,"items":["body_mc","tenue_legere","chapeau_si_soleil"]},{"id":"doux","min_feels_c":18,"items":["body_mc","pyjama_leger","gilet_fin"]},{"id":"frais","min_feels_c":14,"items":["body_ml","pyjama","gilet"]},{"id":"froid_modere","min_feels_c":9,"items":["body_ml","pyjama","gilet_chaud","combi_legere","bonnet_fin"]},{"id":"froid","min_feels_c":3,"items":["body_ml","pyjama_chaud","pull","combi_pilote","bonnet","chaussons"]},{"id":"tres_froid","min_feels_c":null,"items":["body_ml","pyjama_chaud","pull","combi_pilote_doublee","bonnet","moufles","chaussons","chanceliere"]}],"transport":{"poussette":{"band_shift":0,"remove_items":[],"notes":[]},"porte_bebe":{"band_shift":-1,"remove_items":["chanceliere"],"notes":["practical.carrier.body_heat"]},"voiture":{"band_shift":0,"remove_items":["chanceliere"],"notes":[]}},"overlays":{"rain_cover_prob_at_least":30,"rain_later_prob_at_least":50,"wind_gust_kmh_at_least":40}},"relay_triggers":{"cold_layers_bands":["froid","tres_froid"],"carrier_cold_feels_c_at_most":0,"car_coat_bands":["froid_modere","froid","tres_froid"],"uv_at_least":3,"uv_source":"oms-indice-uv","under_1y_months":12},"night":{"room_range_c":{"min":18,"max":20,"source":"carnet-1000-jours"},"always":["relay.sleep.basics","relay.sleep.room_range"],"when_room_known":["relay.sleep.season_thickness"],"heat_room_c_at_least":26,"tog_hint":{"source":"fabricants-tog","round_room_temp":true,"bins":[{"max_c":15,"tog":"3,5"},{"max_c":20,"tog":"2,5"},{"max_c":24,"tog":"1"},{"max_c":27,"tog":"0,5"},{"max_c":null,"tog":"0,2"}]}},"purchases":{"horizon_weeks":6,"lead_days":14,"size_lookahead_days":28,"max_suggestions":3,"size_systems":{"vetement":[{"code":"1m","label":"1 mois","max_age_m":2},{"code":"3m","label":"3 mois","max_age_m":4},{"code":"6m","label":"6 mois","max_age_m":7},{"code":"9m","label":"9 mois","max_age_m":10},{"code":"12m","label":"12 mois","max_age_m":13},{"code":"18m","label":"18 mois","max_age_m":19},{"code":"24m","label":"24 mois","max_age_m":25},{"code":"36m","label":"36 mois","max_age_m":37}],"gigoteuse":[{"code":"0-6m","label":"0-6 mois","max_age_m":6},{"code":"6-18m","label":"6-18 mois","max_age_m":18},{"code":"18-36m","label":"18-36 mois","max_age_m":36}],"accessoire":[{"code":"0-6m","label":"0-6 mois","max_age_m":6},{"code":"6-12m","label":"6-12 mois","max_age_m":12},{"code":"12-24m","label":"12-24 mois","max_age_m":24},{"code":"24-36m","label":"24-36 mois","max_age_m":36}],"unique":[{"code":"unique","label":"taille unique","max_age_m":999}]},"size_note":"Correspondance âge/taille indicative (convention des étiquettes) ; la taille réellement portée, saisie par le parent, prime.","categories":[{"id":"gigoteuse_hiver","size_system":"gigoteuse","priority":1,"need_if":{"week_tmean_below":15},"reason":"nuits_fraiches","relays":["relay.sleep.size_adapted","fabricant.sleepbag.norm"]},{"id":"gigoteuse_ete","size_system":"gigoteuse","priority":2,"need_if":{"week_tmax_at_least":27},"reason":"nuits_chaudes","relays":["relay.sleep.size_adapted","fabricant.sleepbag.norm"]},{"id":"combi_pilote","size_system":"vetement","priority":1,"need_if":{"week_band_in":["froid","tres_froid"]},"reason":"froid","relays":["relay.cold.layers"]},{"id":"accessoires_hiver","size_system":"accessoire","priority":2,"need_if":{"week_band_in":["froid_modere","froid","tres_froid"]},"reason":"froid","relays":["relay.cold.layers"]},{"id":"chanceliere","size_system":"unique","priority":3,"need_if":{"week_band_in":["froid","tres_froid"],"transport_in":["poussette"]},"reason":"froid","relays":[]},{"id":"habillage_pluie","size_system":"unique","priority":3,"need_if":{"week_rainy_days_at_least":3,"transport_in":["poussette"]},"reason":"pluie","relays":[]},{"id":"chapeau_soleil","size_system":"accessoire","priority":1,"need_if":{"week_uv_max_at_least":3},"reason":"soleil","relays":[],"relays_under_12m":["relay.sun.under_1y"],"relays_from_12m":["relay.sun.protect"]},{"id":"vetements_longs_legers","size_system":"vetement","priority":2,"need_if":{"week_uv_max_at_least":3,"week_tmax_at_least":22},"reason":"soleil","relays":[],"relays_under_12m":["relay.sun.under_1y"],"relays_from_12m":["relay.sun.protect"]},{"id":"lunettes_soleil","size_system":"accessoire","priority":3,"min_age_m":12,"under_min_age_relay":"relay.sun.under_1y","need_if":{"week_uv_max_at_least":3},"reason":"soleil","relays":["relay.sun.protect"]},{"id":"creme_solaire_enfant","size_system":"unique","priority":4,"min_age_m":12,"under_min_age_relay":"relay.sun.under_1y","need_if":{"week_uv_max_at_least":3},"reason":"soleil","relays":["relay.sun.protect"]}],"never_suggest":[{"id":"tour_de_lit","relay":"relay.sleep.basics"},{"id":"couverture_couette_oreiller","relay":"relay.sleep.basics"},{"id":"cale_bebe","relay":"relay.sleep.no_positioners"},{"id":"reducteur_de_lit","relay":"relay.sleep.no_positioners"}]},"relay_priority":["relay.vigilance.active","relay.cold.avoid_outings","relay.heat.outing_hours","relay.heat.protect","relay.heat.vehicle","relay.heat.stroller_sun","relay.sun.under_1y","relay.sun.hours","relay.sun.protect","relay.air.ozone","relay.air.particles","relay.cold.stroller_rather_than_carrier","relay.car.coat","relay.cold.layers","relay.heat.shutters","relay.heat.info_line","relay.sleep.basics","relay.sleep.room_range","relay.sleep.season_thickness","relay.sleep.size_adapted","relay.sleep.no_positioners","relay.emergency"]},"messages":{"locale":"fr-FR","version":"0.1.0","disclaimer":"Cette application relaie des recommandations publiques et propose des suggestions pratiques. Elle ne remplace pas l'avis d'un professionnel de santé. En cas d'urgence : 15 ou 112.","messages":{"relay.vigilance.active":{"kind":"officiel","verbatim":false,"sources":["meteofrance-vigilance"],"text":"Vigilance {color} ({phenomena}) : suivez les conseils de comportement des pouvoirs publics sur vigilance.meteofrance.fr.","short":"Vigilance {color} : consignes officielles"},"relay.heat.outing_hours":{"kind":"officiel","verbatim":true,"sources":["spf-fortes-chaleurs-bebes"],"text":"« Préférer les sorties le matin avant 11 heures ou le soir après 21 heures. »","short":"Chaleur : sortir avant 11 h ou après 21 h"},"relay.heat.protect":{"kind":"officiel","verbatim":true,"sources":["spf-canicule-precautions"],"text":"Nourrissons et jeunes enfants : « veillez à les protéger en permanence de la chaleur » et à « les faire boire et les hydrater régulièrement ».","short":"Protéger de la chaleur, hydrater régulièrement"},"relay.heat.vehicle":{"kind":"officiel","verbatim":true,"sources":["spf-canicule-precautions"],"text":"« Ne les laissez jamais dans une pièce mal ventilée ou un véhicule, même pendant une très courte durée. »","short":"Jamais seul dans un véhicule"},"relay.heat.stroller_sun":{"kind":"officiel","verbatim":true,"sources":["spf-fortes-chaleurs-bebes"],"text":"« Protéger les bébés dans les poussettes ou les porte-bébés dorsaux des rayons directs du soleil. »","short":"Poussette à l'abri du soleil direct"},"relay.heat.shutters":{"kind":"officiel","verbatim":true,"sources":["spf-canicule-precautions"],"text":"« Fermez fenêtres et volets la journée, ouvrez-les le soir et la nuit s'il fait plus frais. »","short":"Volets fermés le jour, aérer la nuit"},"relay.heat.info_line":{"kind":"officiel","verbatim":false,"sources":["spf-canicule-precautions"],"text":"Canicule Info Service : 0800 06 66 66 (appel gratuit depuis un poste fixe, du lundi au samedi de 9 h à 19 h).","short":"Canicule Info Service : 0800 06 66 66"},"relay.cold.avoid_outings":{"kind":"officiel","verbatim":true,"sources":["santefr-grand-froid"],"text":"« Il convient avant tout d'éviter de sortir avec un bébé quand les températures sont vraiment basses. »","short":"Grand froid : éviter de sortir avec bébé"},"relay.cold.layers":{"kind":"officiel","verbatim":false,"sources":["santefr-grand-froid"],"text":"Santé.fr (fiche grand froid) : « plusieurs vêtements superposés » et couvrir « tête, mains et pieds ».","short":"Couches superposées ; tête, mains, pieds couverts"},"relay.cold.stroller_rather_than_carrier":{"kind":"officiel","verbatim":false,"sources":["santefr-grand-froid"],"text":"Par grand froid, Santé.fr conseille le landau ou la poussette plutôt que le porte-bébé, qui « peut comprimer les membres inférieurs ».","short":"Grand froid : poussette plutôt que porte-bébé"},"relay.sun.under_1y":{"kind":"officiel","verbatim":true,"sources":["santefr-uv-enfants"],"text":"« Les enfants de moins d'un an ne doivent pas être exposés au soleil. »","short":"Pas de soleil direct avant 1 an"},"relay.sun.hours":{"kind":"officiel","verbatim":false,"sources":["santefr-uv-enfants","oms-indice-uv"],"text":"Indice UV de {uv} : rechercher l'ombre et éviter « les heures d'exposition aux UV les plus intenses (de midi à 16 heures) ».","short":"UV : ombre, éviter 12 h-16 h"},"relay.sun.protect":{"kind":"officiel","verbatim":false,"sources":["santefr-uv-enfants"],"text":"Pour les enfants : « des vêtements longs, un chapeau à larges bords », « des lunettes de soleil filtrant bien les UV et enveloppantes » et « une crème solaire adaptée aux enfants sur les parties découvertes du corps ».","short":"Vêtements longs, chapeau, lunettes, crème enfant"},"relay.air.particles":{"kind":"officiel","verbatim":false,"sources":["santefr-pollution"],"text":"Épisode de pollution : « Les sorties à l'extérieur des nourrissons peuvent être maintenues » ; il est recommandé de les limiter dans la durée à proximité des sources majeures de pollution.","short":"Pollution : sorties plus courtes près du trafic"},"relay.air.ozone":{"kind":"officiel","verbatim":false,"sources":["santefr-pollution"],"text":"Épisode d'ozone : limiter la durée des sorties des nourrissons « aux moments de la journée où le niveau de pollution est le plus élevé », souvent le milieu ou la fin d'après-midi.","short":"Ozone : pas de sortie l'après-midi"},"relay.car.coat":{"kind":"officiel","verbatim":false,"sources":["awsr-siege-auto","notices-sieges-auto"],"text":"Siège auto : enlever le manteau d'hiver avant d'attacher l'enfant, puis le couvrir par-dessus le harnais (Agence wallonne pour la sécurité routière, notices des sièges).","short":"Siège auto : manteau enlevé, couvrir par-dessus"},"relay.sleep.basics":{"kind":"officiel","verbatim":false,"sources":["carnet-1000-jours"],"text":"Pour dormir : sur le dos, à plat, dans son lit, dans une turbulette ou gigoteuse adaptée à sa taille, sur un matelas ferme ; ni couverture, ni couette, ni oreiller, ni tour de lit.","short":"Sur le dos, turbulette, ni couette ni tour de lit"},"relay.sleep.room_range":{"kind":"officiel","verbatim":false,"sources":["carnet-1000-jours"],"text":"Température de la chambre recommandée : entre 18 et 20 °C.","short":"Chambre entre 18 et 20 °C"},"relay.sleep.season_thickness":{"kind":"officiel","verbatim":false,"sources":["cd06-pmi-min"],"text":"Une gigoteuse ou une turbulette « dont l'épaisseur variera avec la saison ».","short":"Épaisseur de turbulette selon la saison"},"relay.sleep.size_adapted":{"kind":"officiel","verbatim":false,"sources":["carnet-1000-jours"],"text":"La turbulette ou gigoteuse doit être adaptée à la taille de bébé.","short":"Gigoteuse adaptée à sa taille"},"relay.sleep.no_positioners":{"kind":"officiel","verbatim":false,"sources":["has-contention-presse"],"text":"La HAS juge les dispositifs de contention, dont les réducteurs de lit, « inutiles, délétères et dangereux ».","short":"Ni cale-bébé ni réducteur de lit"},"relay.emergency":{"kind":"officiel","verbatim":false,"sources":["service-public-urgences"],"text":"En cas d'urgence : 15 (SAMU) ou 112.","short":"Urgence : 15 ou 112"},"practical.rain.cover":{"kind":"pratique","text":"Pluie possible pendant la sortie : habillage pluie ou capuche.","short":"Pluie possible : habillage pluie"},"practical.rain.later":{"kind":"pratique","text":"Pluie prévue vers {hour} : prévoyez l'habillage pluie pour le retour.","short":"Pluie vers {hour} : habillage pluie"},"practical.wind":{"kind":"pratique","text":"Vent soutenu : le ressenti est plus froid, protégez du vent.","short":"Vent : ressenti plus froid"},"practical.carrier.body_heat":{"kind":"pratique","text":"En porte-bébé, la chaleur du porteur réchauffe bébé : en général une couche de moins qu'en poussette.","short":"Porte-bébé : une couche de moins"},"fabricant.tog":{"kind":"fabricant","sources":["fabricants-tog"],"text":"Chambre à {room} °C : environ {tog} TOG selon les tableaux habituels des fabricants. L'étiquette de votre gigoteuse fait foi.","short":"Gigoteuse ≈ {tog} TOG (indicatif fabricants)"},"fabricant.sleepbag.norm":{"kind":"fabricant","sources":["norme-nf-en-16781"],"text":"Repère produit : gigoteuses conformes à la norme NF EN 16781.","short":"Norme NF EN 16781"},"outing.window":{"kind":"meteo","text":"Sortie conseillée : {start}–{end}, {feels} °C ressentis, pluie {rain} %.","short":"Sortie : {start}–{end} · {feels} °C ressentis"},"outing.none.vigilance":{"kind":"meteo","text":"Pas de créneau conseillé : vigilance en cours.","short":"Pas de sortie conseillée (vigilance)"},"outing.none.canicule_heures_chaudes":{"kind":"meteo","text":"Pas de créneau dans votre plage horaire : fortes chaleurs entre 11 h et 21 h.","short":"Pas de créneau : fortes chaleurs"},"outing.none.ozone_apres_midi":{"kind":"meteo","text":"Pas de créneau dans votre plage horaire : épisode d'ozone l'après-midi.","short":"Pas de créneau : ozone l'après-midi"},"outing.none.froid_extreme":{"kind":"meteo","text":"Pas de créneau conseillé : froid très vif.","short":"Pas de créneau : froid très vif"},"outing.none.vent":{"kind":"meteo","text":"Pas de créneau conseillé : rafales fortes.","short":"Pas de créneau : rafales"},"outing.none.pluie":{"kind":"meteo","text":"Pas de créneau sec dans votre plage horaire.","short":"Pas de créneau sec aujourd'hui"},"outing.none.duree":{"kind":"meteo","text":"Pas de créneau assez long dans votre plage horaire.","short":"Pas de créneau assez long"},"outing.none.hors_jour":{"kind":"meteo","text":"Pas de créneau de jour dans votre plage horaire.","short":"Pas de créneau de jour"},"night.room":{"kind":"meteo","text":"Nuit : chambre à {room} °C (repère officiel : 18-20 °C).","short":"Nuit : chambre {room} °C · repère 18-20 °C"},"night.room_unknown":{"kind":"meteo","text":"Nuit : repère officiel, chambre entre 18 et 20 °C.","short":"Nuit : chambre entre 18 et 20 °C"},"purchase.suggestion":{"kind":"pratique","text":"À prévoir avant le {order_by} : {label}{size}, utile à partir du {needed_from}.","short":"À prévoir : {label}{size}"}},"labels":{"items":{"body_leger":"body léger","body_mc":"body manches courtes","body_ml":"body manches longues","tenue_ample_claire":"vêtements légers, amples et clairs","tenue_legere":"tenue légère","pyjama_leger":"pyjama ou ensemble léger","pyjama":"pyjama ou ensemble","pyjama_chaud":"pyjama chaud","gilet_fin":"gilet fin à emporter","gilet":"gilet","gilet_chaud":"gilet chaud","pull":"pull","combi_legere":"combinaison légère ou manteau","combi_pilote":"combinaison pilote","combi_pilote_doublee":"combinaison pilote doublée","bonnet_fin":"bonnet fin","bonnet":"bonnet","moufles":"moufles","chaussons":"chaussons chauds","chapeau":"chapeau à larges bords","chapeau_si_soleil":"chapeau à larges bords si soleil","chanceliere":"chancelière"},"bands_short":{"tres_chaud":"Body léger, vêtements amples et clairs, chapeau","chaud":"Body MC + tenue légère, chapeau si soleil","doux":"Body MC + ensemble léger, gilet fin","frais":"Body ML + pyjama + gilet","froid_modere":"Body ML + pyjama + gilet chaud + combi légère, bonnet fin","froid":"Body ML + pyjama chaud + pull + combi pilote, bonnet","tres_froid":"Body ML + pyjama chaud + pull + combi doublée, bonnet, moufles"},"categories":{"gigoteuse_hiver":"gigoteuse chaude (≈ 2,5 TOG)","gigoteuse_ete":"gigoteuse légère (≈ 0,5-1 TOG)","combi_pilote":"combinaison pilote","accessoires_hiver":"bonnet, moufles et chaussons","chanceliere":"chancelière pour la poussette","habillage_pluie":"habillage pluie pour la poussette","chapeau_soleil":"chapeau à larges bords","vetements_longs_legers":"vêtements longs et légers","lunettes_soleil":"lunettes de soleil enveloppantes","creme_solaire_enfant":"crème solaire adaptée aux enfants"},"reasons":{"nuits_fraiches":"nuits fraîches","nuits_chaudes":"nuits chaudes","froid":"froid","pluie":"pluie fréquente","soleil":"soleil","taille":"changement de taille"},"vigilance_colors":{"jaune":"jaune","orange":"orange","rouge":"rouge"}}}};

// Moteur des règles v0 : fonctions pures, sans dépendance.
// Le même fichier tourne dans l'app web, dans le widget iPhone (Scriptable) et dans les tests Node.
// Il sert de spécification aux futurs portages Swift et Kotlin.

const VIGILANCE_COLORS = ['vert', 'jaune', 'orange', 'rouge'];
const colorRank = (color) => VIGILANCE_COLORS.indexOf(color);

const toMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const fmtMin = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const DAY_MS = 86_400_000;
const parseDay = (day) => Date.parse(`${day.length === 7 ? `${day}-15` : day.slice(0, 10)}T00:00:00Z`);
const addDays = (day, n) => new Date(parseDay(day) + n * DAY_MS).toISOString().slice(0, 10);
const laterDay = (a, b) => (a > b ? a : b);
const round1 = (x) => Math.round(x * 10) / 10;
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

const ageMonths = (birth, day) => (parseDay(day) - parseDay(birth)) / DAY_MS / 30.4375;

const bandIndex = (bands, feels) => bands.findIndex((b) => b.min_feels_c === null || feels >= b.min_feels_c);
const sizeFor = (system, age) => system.find((s) => age < s.max_age_m) ?? system.at(-1);

function sortByPriority(ids, priority) {
  const rank = (id) => {
    const i = priority.indexOf(id);
    return i === -1 ? priority.length : i;
  };
  return [...new Set(ids)].sort((a, b) => rank(a) - rank(b));
}

function heatActive(input, R) {
  const cfg = R.outing.heat;
  const canicule = (input.alerts?.vigilance ?? []).some(
    (v) => v.phenomenon === 'canicule' && colorRank(v.color) >= colorRank(cfg.trigger_vigilance_canicule_from),
  );
  const hourlyMax = Math.max(...input.forecast.hourly.map((h) => h.temp_c ?? h.feels_c));
  const tmax = input.forecast.daily?.tmax_c ?? hourlyMax;
  return canicule || tmax >= cfg.trigger_tmax_c_at_least;
}

function planOuting(input, R, age) {
  const cfg = R.outing;
  const s = cfg.scoring;
  const x = cfg.slot_exclusions;
  const plage = input.profile.outing_window ?? cfg.default_window;
  const duration = input.profile.outing_duration_h ?? cfg.default_duration_h;
  const vigilance = input.alerts?.vigilance ?? [];
  const blocking = vigilance.filter(
    (v) =>
      colorRank(v.color) >= colorRank(cfg.vigilance.block_all_from_color) ||
      (v.color === 'orange' && cfg.vigilance.block_all_if_orange_for.includes(v.phenomenon)),
  );
  const heat = heatActive(input, R);
  const ozone = Boolean(input.alerts?.air?.episode && input.alerts.air.pollutant === 'ozone');
  const { sunrise, sunset } = input.forecast.daylight;
  const within = (start, range) => start >= toMin(range.from) && start < toMin(range.to);
  const uvWeight = age < R.relay_triggers.under_1y_months ? s.uv_weight_under_12m : s.uv_weight;

  const slots = input.forecast.hourly.map((h) => {
    const start = toMin(h.time.slice(11, 16));
    const end = start + 60;
    const reasons = [];
    if (start < toMin(plage.from) || end > toMin(plage.to)) reasons.push('hors_plage');
    if (start < toMin(sunrise) || end > toMin(sunset)) reasons.push('hors_jour');
    if (heat && within(start, cfg.heat.blocked_hours)) reasons.push('canicule_heures_chaudes');
    if (ozone && within(start, cfg.ozone_episode_blocked_hours)) reasons.push('ozone_apres_midi');
    if (h.feels_c <= x.feels_c_at_most) reasons.push('froid_extreme');
    if (h.precip_prob >= x.precip_prob_at_least || h.precip_mm >= x.precip_mm_at_least) reasons.push('pluie');
    if (h.gust_kmh >= x.gust_kmh_at_least) reasons.push('vent');
    const score =
      s.base -
      Math.max(0, h.precip_prob - s.rain_prob_free) * s.rain_prob_weight -
      Math.max(0, s.comfort_low_c - h.feels_c) * s.comfort_low_weight -
      Math.max(0, h.feels_c - s.comfort_high_c) * s.comfort_high_weight -
      Math.max(0, h.gust_kmh - s.gust_free_kmh) * s.gust_weight -
      Math.max(0, h.uv - s.uv_free) * uvWeight;
    return { ...h, start, end, reasons, score: round1(score) };
  });

  const byStart = new Map(slots.map((sl) => [sl.start, sl]));
  let best = null;
  if (!blocking.length) {
    for (const first of slots) {
      const run = [];
      for (let k = 0; k < duration; k++) {
        const sl = byStart.get(first.start + k * 60);
        if (!sl || sl.reasons.length) break;
        run.push(sl);
      }
      if (run.length < duration) continue;
      const score = Math.min(...run.map((sl) => sl.score));
      if (!best || score > best.score) best = { run, score };
    }
  }

  const daySlots = slots.filter((sl) => !sl.reasons.includes('hors_plage') && !sl.reasons.includes('hors_jour'));
  let reason = null;
  if (!best) {
    if (blocking.length) reason = 'vigilance';
    else if (!daySlots.length) reason = 'hors_jour';
    else {
      const counts = {};
      for (const sl of daySlots) for (const r of sl.reasons) counts[r] = (counts[r] ?? 0) + 1;
      const ranked = cfg.none_reason_priority.filter((r) => counts[r]).sort((a, b) => counts[b] - counts[a]);
      reason = ranked[0] ?? 'duree';
    }
  }

  const window = best && {
    start: fmtMin(best.run[0].start),
    end: fmtMin(best.run.at(-1).end),
    score: best.score,
    feels_c: round1(mean(best.run.map((sl) => sl.feels_c))),
    precip_prob_max: Math.max(...best.run.map((sl) => sl.precip_prob)),
    uv_max: Math.max(...best.run.map((sl) => sl.uv)),
    gust_max: Math.max(...best.run.map((sl) => sl.gust_kmh)),
  };
  const inPlage = slots.filter((sl) => !sl.reasons.includes('hors_plage'));
  const refSlots = best ? best.run : inPlage.slice(0, 1);
  return { window, reason, blocking, heat, ozone, slots, inPlage, daySlots, refSlots, plage };
}

function chooseOutfit(feels, profile, R) {
  const { bands, transport } = R.outfit;
  const t = transport[profile.transport] ?? transport.poussette;
  const base = bandIndex(bands, feels);
  const idx = clamp(base + (profile.outfit_offset ?? 0) + t.band_shift, 0, bands.length - 1);
  return {
    band: bands[idx].id,
    base_band: bands[base].id,
    feels_c: feels,
    items: bands[idx].items.filter((item) => !t.remove_items.includes(item)),
    notes: [...t.notes],
  };
}

function addOverlays(outfit, plan, ref, R, params) {
  const ov = R.outfit.overlays;
  if (ref.some((sl) => sl.precip_prob >= ov.rain_cover_prob_at_least)) {
    outfit.notes.push('practical.rain.cover');
  } else if (ref.length) {
    const after = ref.at(-1).end;
    const later = plan.slots.find(
      (sl) => sl.start >= after && sl.start < toMin(plan.plage.to) && sl.precip_prob >= ov.rain_later_prob_at_least,
    );
    if (later) {
      outfit.notes.push('practical.rain.later');
      params.hour = fmtMin(later.start);
    }
  }
  if (ref.some((sl) => sl.gust_kmh >= ov.wind_gust_kmh_at_least)) outfit.notes.push('practical.wind');
}

function dayRelays(input, R, age, plan, outfit, params) {
  const rt = R.relay_triggers;
  const vigilance = input.alerts?.vigilance ?? [];
  const relays = [];
  const active = vigilance.filter((v) => colorRank(v.color) >= colorRank('orange'));
  if (active.length) {
    relays.push('relay.vigilance.active');
    params.color = active.map((v) => v.color).sort((a, b) => colorRank(b) - colorRank(a))[0];
    params.phenomena = active.map((v) => v.phenomenon).join(', ');
  }
  if (plan.heat) {
    relays.push(
      'relay.heat.outing_hours', 'relay.heat.protect', 'relay.heat.vehicle',
      'relay.heat.stroller_sun', 'relay.heat.shutters', 'relay.heat.info_line',
    );
  }
  const coldVigilance = active.some((v) => v.phenomenon === 'grand-froid');
  const extremeCold = plan.daySlots.some((sl) => sl.feels_c <= R.outing.slot_exclusions.feels_c_at_most);
  if (coldVigilance || extremeCold) relays.push('relay.cold.avoid_outings');
  if (outfit && (coldVigilance || rt.cold_layers_bands.includes(outfit.base_band))) relays.push('relay.cold.layers');
  if (outfit && input.profile.transport === 'porte_bebe' && (coldVigilance || outfit.feels_c <= rt.carrier_cold_feels_c_at_most)) {
    relays.push('relay.cold.stroller_rather_than_carrier');
  }
  if (outfit && input.profile.transport === 'voiture' && rt.car_coat_bands.includes(outfit.base_band)) relays.push('relay.car.coat');
  const uvDay = plan.daySlots.length ? Math.max(...plan.daySlots.map((sl) => sl.uv)) : 0;
  if (uvDay >= rt.uv_at_least) {
    params.uv = round1(uvDay);
    if (age < rt.under_1y_months) relays.push('relay.sun.under_1y', 'relay.sun.hours');
    else relays.push('relay.sun.hours', 'relay.sun.protect');
  }
  if (input.alerts?.air?.episode) relays.push(plan.ozone ? 'relay.air.ozone' : 'relay.air.particles');
  return sortByPriority(relays, R.relay_priority);
}

function planNight(input, R, heat) {
  const n = R.night;
  const room = input.profile.room_temp_c ?? null;
  const relays = [...n.always];
  let status = 'unknown';
  let tog = null;
  if (room !== null) {
    status = room < n.room_range_c.min ? 'below' : room > n.room_range_c.max ? 'above' : 'in_range';
    const t = n.tog_hint.round_room_temp ? Math.round(room) : room;
    tog = n.tog_hint.bins.find((b) => b.max_c === null || t <= b.max_c).tog;
    relays.push(...n.when_room_known);
  }
  if (heat || (room !== null && room >= n.heat_room_c_at_least)) relays.push('relay.heat.shutters');
  return { room_temp_c: room, room_status: status, tog, relays: sortByPriority(relays, R.relay_priority) };
}

function needMet(need, week, band, transport) {
  if (need.week_tmean_below != null && !(week.tmean < need.week_tmean_below)) return false;
  if (need.week_tmax_at_least != null && !(week.tmax_mean >= need.week_tmax_at_least)) return false;
  if (need.week_band_in && !need.week_band_in.includes(band)) return false;
  if (need.week_rainy_days_at_least != null && !(week.rainy_days >= need.week_rainy_days_at_least)) return false;
  if (need.week_uv_max_at_least != null && !(week.uv_max_mean >= need.week_uv_max_at_least)) return false;
  if (need.transport_in && !need.transport_in.includes(transport)) return false;
  return true;
}

function planPurchases(input, R) {
  const P = R.purchases;
  const { profile, date } = input;
  const under1y = R.relay_triggers.under_1y_months;
  const found = new Map();
  for (const week of (input.outlook ?? []).slice(0, P.horizon_weeks)) {
    const ageWeek = ageMonths(profile.birth, week.week_start);
    const band = R.outfit.bands[bandIndex(R.outfit.bands, week.tmax_mean)].id;
    for (const cat of P.categories) {
      if (found.has(cat.id)) continue;
      if (cat.min_age_m && ageWeek < cat.min_age_m) continue;
      if (!needMet(cat.need_if, week, band, profile.transport)) continue;
      const system = P.size_systems[cat.size_system];
      const owned = profile.inventory?.[cat.id] ?? [];
      if (owned.includes(sizeFor(system, ageWeek).code)) continue;
      // On achète la taille qui servira encore dans quelques semaines.
      const buy = sizeFor(system, ageMonths(profile.birth, addDays(week.week_start, P.size_lookahead_days)));
      if (owned.includes(buy.code)) continue;
      const reasons = [cat.reason];
      if (buy.code !== sizeFor(system, ageMonths(profile.birth, date)).code) reasons.push('taille');
      found.set(cat.id, {
        key: `${cat.id}:${buy.code}`,
        category: cat.id,
        size: buy.code,
        size_label: buy.label,
        needed_from: week.week_start,
        order_by: laterDay(addDays(week.week_start, -P.lead_days), date),
        priority: cat.priority,
        reasons,
        relays: [...cat.relays, ...((ageWeek < under1y ? cat.relays_under_12m : cat.relays_from_12m) ?? [])],
      });
    }
  }
  return [...found.values()]
    .sort((a, b) => a.needed_from.localeCompare(b.needed_from) || a.priority - b.priority)
    .slice(0, P.max_suggestions);
}

function checkProduct(id, age, R) {
  const banned = R.purchases.never_suggest.find((p) => p.id === id);
  if (banned) return { id, allowed: false, relay: banned.relay };
  const cat = R.purchases.categories.find((c) => c.id === id);
  if (cat?.min_age_m && age < cat.min_age_m) return { id, allowed: false, relay: cat.under_min_age_relay ?? null };
  return { id, allowed: true, relay: null };
}

function render(M, id, variant, params = {}) {
  const msg = M.messages[id];
  if (!msg) return null;
  return (msg[variant] ?? msg.text).replace(/\{(\w+)\}/g, (all, key) => (params[key] ?? all).toString());
}

const frNumber = (x) => String(x).replace('.', ',');

// Les trois lignes du widget pour le moment voulu : « jour » (créneau) ou « soir » (nuit et achats).
function widgetLines(result, moment, M) {
  const labels = M.labels;
  const lines = [];
  if (moment === 'jour') {
    const w = result.outing.window;
    lines.push(
      w
        ? render(M, 'outing.window', 'short', { start: w.start, end: w.end, feels: Math.round(w.feels_c) })
        : render(M, `outing.none.${result.outing.reason}`, 'short'),
    );
    if (result.outfit) lines.push(`Tenue : ${labels.bands_short[result.outfit.band]}`);
    const hint = result.relays[0] ?? result.outfit?.notes.find((n) => n.startsWith('practical.rain'));
    if (hint) lines.push(render(M, hint, 'short', result.params));
  } else {
    const n = result.night;
    lines.push(
      n.room_temp_c === null
        ? render(M, 'night.room_unknown', 'short')
        : render(M, 'night.room', 'short', { room: frNumber(n.room_temp_c) }),
    );
    if (n.tog) lines.push(render(M, 'fabricant.tog', 'short', { tog: n.tog }));
    const p = result.purchases[0];
    lines.push(
      p
        ? render(M, 'purchase.suggestion', 'short', {
          label: labels.categories[p.category],
          size: p.size === 'unique' ? '' : `, ${p.size_label}`,
        })
        : render(M, 'relay.sleep.basics', 'short'),
    );
  }
  return lines.filter(Boolean).slice(0, 3);
}

const momentOf = (now) => (toMin(now ?? '08:00') < toMin('18:00') ? 'jour' : 'soir');

function evaluate(input, bundle) {
  const R = bundle.rules;
  const age = ageMonths(input.profile.birth, input.date);
  const plan = planOuting(input, R, age);
  const params = {};
  const ref = plan.refSlots;
  const outfit = plan.reason === 'vigilance' || !ref.length
    ? null
    : chooseOutfit(round1(mean(ref.map((sl) => sl.feels_c))), input.profile, R);
  if (outfit) addOverlays(outfit, plan, ref, R, params);
  const result = {
    age_months: round1(age),
    outing: {
      window: plan.window,
      reason: plan.reason,
      slots: plan.inPlage.map((sl) => ({
        time: fmtMin(sl.start),
        feels_c: sl.feels_c,
        precip_prob: sl.precip_prob,
        uv: sl.uv,
        gust_kmh: sl.gust_kmh,
        reasons: sl.reasons.filter((r) => r !== 'hors_plage'),
        score: sl.score,
      })),
    },
    outfit,
    relays: dayRelays(input, R, age, plan, outfit, params),
    params,
    night: planNight(input, R, plan.heat),
    purchases: planPurchases(input, R),
  };
  result.widget = { lines: widgetLines(result, momentOf(input.now), bundle.messages) };
  if (input.check_product) result.product = checkProduct(input.check_product, age, R);
  return result;
}

// Tenue pour une heure précise (« et si on sort à 16 h ? »), avec les rappels pratiques de cette heure.
function outfitAt(input, bundle, hhmm) {
  const R = bundle.rules;
  const plan = planOuting(input, R, ageMonths(input.profile.birth, input.date));
  const slot = plan.slots.find((sl) => sl.start === toMin(hhmm));
  if (!slot) return null;
  const outfit = chooseOutfit(slot.feels_c, input.profile, R);
  const params = {};
  addOverlays(outfit, plan, [slot], R, params);
  return { ...outfit, params, reasons: slot.reasons.filter((r) => r !== 'hors_plage') };
}

// Contrôles de la charte : tout message officiel cite une source publique, toute référence existe.
function lint(bundle) {
  const { rules: R, messages: M, sources: S } = bundle;
  const errors = [];
  const sourceById = new Map(S.sources.map((src) => [src.id, src]));
  for (const [id, msg] of Object.entries(M.messages)) {
    for (const sid of msg.sources ?? []) if (!sourceById.has(sid)) errors.push(`${id} : source inconnue ${sid}`);
    const levels = (msg.sources ?? []).map((sid) => sourceById.get(sid)?.level);
    if (msg.kind === 'officiel' && !levels.some((l) => R.policy.official_message_levels.includes(l))) {
      errors.push(`${id} : message officiel sans source publique`);
    }
    if (msg.kind === 'fabricant' && !levels.includes('C')) errors.push(`${id} : indication fabricant sans source produit`);
  }
  const referenced = [
    ...R.relay_priority,
    ...R.night.always,
    ...R.night.when_room_known,
    ...Object.values(R.outfit.transport).flatMap((t) => t.notes),
    ...R.purchases.never_suggest.map((p) => p.relay),
    ...R.purchases.categories.flatMap((c) => [
      ...c.relays, ...(c.relays_under_12m ?? []), ...(c.relays_from_12m ?? []), ...(c.under_min_age_relay ? [c.under_min_age_relay] : []),
    ]),
  ];
  for (const id of new Set(referenced)) if (!M.messages[id]) errors.push(`message manquant : ${id}`);
  for (const band of R.outfit.bands) {
    if (!M.labels.bands_short[band.id]) errors.push(`libellé manquant : bande ${band.id}`);
    for (const item of band.items) if (!M.labels.items[item]) errors.push(`libellé manquant : ${item}`);
  }
  for (const cat of R.purchases.categories) if (!M.labels.categories[cat.id]) errors.push(`libellé manquant : ${cat.id}`);
  const toVerify = S.sources.filter((src) => src.verification !== 'lu').map((src) => `${src.id} (${src.verification})`);
  return { errors, toVerify };
}


// Adaptateur Open-Meteo → entrée du moteur. Fonctions pures, partagées par l'app web et le widget iPhone.
// N'utilise que du JavaScript standard (pas d'API du navigateur), pour tourner aussi dans Scriptable.

const PARIS_TZ = 'Europe/Paris';
const FORECAST_DAYS = 16;
const OUTLOOK_WEEKS = 6;
const CLIMATE_YEARS = 3;
const HOURLY = 'temperature_2m,apparent_temperature,precipitation_probability,precipitation,wind_gusts_10m,uv_index';
const DAILY = 'sunrise,sunset,temperature_2m_max,temperature_2m_mean,precipitation_sum,uv_index_max';
const CLIMATE_DAILY = 'temperature_2m_max,temperature_2m_mean,precipitation_sum';

// Indice UV maximal typique par mois (ciel peu nuageux), valeurs indicatives pour la métropole,
// utilisées seulement au-delà des 16 jours de prévision.
const UV_TYPICAL = {
  nord: [1, 1.5, 3, 4.5, 6, 7, 7, 6, 4, 2.5, 1.2, 0.8],
  sud: [1.5, 2.5, 4, 5.5, 7, 8, 8, 7, 5, 3, 1.5, 1],
};

const coord = (x) => Number(x).toFixed(4);

function forecastUrl({ lat, lon }) {
  return 'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${coord(lat)}&longitude=${coord(lon)}&hourly=${HOURLY}&daily=${DAILY}` +
    `&timezone=${encodeURIComponent(PARIS_TZ)}&forecast_days=${FORECAST_DAYS}`;
}

const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
function yearsBefore(day, n) {
  const y = Number(day.slice(0, 4)) - n;
  const rest = day.slice(4);
  return rest === '-02-29' && !isLeap(y) ? `${y}-02-28` : `${y}${rest}`;
}

// Normales récentes : mêmes semaines des trois dernières années (au-delà de 16 jours de prévision).
function climateUrls({ lat, lon }, date) {
  const start = addDays(date, 14);
  const end = addDays(date, OUTLOOK_WEEKS * 7 - 1);
  return Array.from({ length: CLIMATE_YEARS }, (_, k) =>
    'https://archive-api.open-meteo.com/v1/archive' +
    `?latitude=${coord(lat)}&longitude=${coord(lon)}` +
    `&start_date=${yearsBefore(start, k + 1)}&end_date=${yearsBefore(end, k + 1)}` +
    `&daily=${CLIMATE_DAILY}&timezone=${encodeURIComponent(PARIS_TZ)}`);
}

function parisNow(at = new Date()) {
  const parts = {};
  for (const p of new Intl.DateTimeFormat('en-GB', {
    timeZone: PARIS_TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(at)) parts[p.type] = p.value;
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

function hourlyForDate(forecast, date) {
  const h = forecast.hourly;
  const hours = [];
  h.time.forEach((time, i) => {
    if (!time.startsWith(date)) return;
    const temp = h.temperature_2m[i];
    const feels = h.apparent_temperature[i] ?? temp;
    if (feels == null) return;
    const mm = h.precipitation[i] ?? 0;
    hours.push({
      time,
      temp_c: temp ?? feels,
      feels_c: feels,
      precip_prob: h.precipitation_probability[i] ?? (mm > 0 ? 100 : 0),
      precip_mm: mm,
      gust_kmh: h.wind_gusts_10m[i] ?? 0,
      uv: h.uv_index[i] ?? 0,
    });
  });
  return hours;
}

function daylightForDate(forecast, date) {
  const i = forecast.daily.time.indexOf(date);
  if (i < 0 || !forecast.daily.sunrise[i]) return { sunrise: '07:00', sunset: '19:00' };
  return { sunrise: forecast.daily.sunrise[i].slice(11, 16), sunset: forecast.daily.sunset[i].slice(11, 16) };
}

function forecastDays(forecast) {
  return forecast.daily.time.filter((day, i) => forecast.daily.temperature_2m_max[i] != null);
}

// Six semaines à venir : prévisions sur 16 jours, puis moyenne des mêmes jours des années passées.
function weeklyOutlook({ forecast, climate = [], date, lat }) {
  const fd = forecast.daily;
  const past = new Map();
  for (const c of climate) {
    if (!c?.daily?.time) continue;
    c.daily.time.forEach((day, i) => {
      const key = day.slice(5);
      if (!past.has(key)) past.set(key, []);
      past.get(key).push({
        tmax: c.daily.temperature_2m_max[i],
        tmean: c.daily.temperature_2m_mean[i],
        rain: c.daily.precipitation_sum[i],
      });
    });
  }
  const uvTable = lat < 46 ? UV_TYPICAL.sud : UV_TYPICAL.nord;
  const uvOf = (day) => uvTable[Number(day.slice(5, 7)) - 1];
  const weeks = [];
  for (let w = 0; w < OUTLOOK_WEEKS; w++) {
    const days = [];
    for (let d = 0; d < 7; d++) {
      const day = addDays(date, w * 7 + d);
      const i = fd.time.indexOf(day);
      if (i >= 0 && fd.temperature_2m_max[i] != null) {
        days.push({
          tmax: fd.temperature_2m_max[i],
          tmean: fd.temperature_2m_mean[i] ?? fd.temperature_2m_max[i] - 4,
          rainy: (fd.precipitation_sum[i] ?? 0) >= 1 ? 1 : 0,
          uv: fd.uv_index_max[i] ?? uvOf(day),
          from: 'prevision',
        });
        continue;
      }
      const years = (past.get(day.slice(5)) ?? []).filter((p) => p.tmax != null);
      if (!years.length) continue;
      days.push({
        tmax: mean(years.map((p) => p.tmax)),
        tmean: mean(years.map((p) => p.tmean ?? p.tmax - 4)),
        rainy: years.filter((p) => (p.rain ?? 0) >= 1).length / years.length,
        uv: uvOf(day),
        from: 'normales',
      });
    }
    if (days.length < 4) break;
    weeks.push({
      week_start: addDays(date, w * 7),
      tmax_mean: round1(mean(days.map((d) => d.tmax))),
      tmean: round1(mean(days.map((d) => d.tmean))),
      rainy_days: round1((days.reduce((a, d) => a + d.rainy, 0) * 7) / days.length),
      uv_max_mean: round1(mean(days.map((d) => d.uv))),
      source: days.every((d) => d.from === 'prevision') ? 'prevision' : days.every((d) => d.from === 'normales') ? 'normales' : 'mixte',
    });
  }
  return weeks;
}

function buildInput({ forecast, climate = [], profile, date, now, lat }) {
  const i = forecast.daily.time.indexOf(date);
  return {
    date,
    now,
    profile,
    forecast: {
      daylight: daylightForDate(forecast, date),
      hourly: hourlyForDate(forecast, date),
      daily: { tmax_c: i >= 0 ? forecast.daily.temperature_2m_max[i] : null },
    },
    // La vigilance Météo-France et les épisodes de pollution ne sont pas encore branchés (v0.1).
    alerts: { vigilance: [], air: null },
    outlook: weeklyOutlook({ forecast, climate, date, lat: lat ?? forecast.latitude }),
  };
}

// Configuration partagée entre l'app web et le widget iPhone : JSON en ASCII, puis base64url.
const CONFIG_PREFIX = 'SB1.';

function encodeConfig(cfg, toBase64) {
  const ascii = JSON.stringify(cfg).replace(/[\u007f-￿]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
  return CONFIG_PREFIX + toBase64(ascii).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeConfig(text, fromBase64) {
  const raw = String(text ?? '').trim();
  if (!raw.startsWith(CONFIG_PREFIX)) return null;
  try {
    let b64 = raw.slice(CONFIG_PREFIX.length).replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const cfg = JSON.parse(fromBase64(b64));
    const valid = cfg && cfg.v === 1 && Number.isFinite(cfg.la) && Number.isFinite(cfg.lo) && /^\d{4}-\d{2}/.test(cfg.b ?? '');
    return valid ? cfg : null;
  } catch (e) {
    return null;
  }
}

function profileToConfig(profile) {
  return {
    v: 1,
    n: profile.commune.nom,
    la: profile.commune.lat,
    lo: profile.commune.lon,
    b: profile.birth,
    t: profile.transport,
    f: profile.outing_window.from,
    u: profile.outing_window.to,
    d: profile.outing_duration_h,
    o: profile.outfit_offset ?? 0,
  };
}

function configToProfile(cfg) {
  return {
    commune: { nom: cfg.n ?? '', lat: cfg.la, lon: cfg.lo },
    birth: cfg.b,
    transport: cfg.t ?? 'poussette',
    outing_window: { from: cfg.f ?? '09:00', to: cfg.u ?? '18:00' },
    outing_duration_h: cfg.d ?? 1,
    outfit_offset: cfg.o ?? 0,
    room_temp_c: null,
    inventory: {},
  };
}


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

