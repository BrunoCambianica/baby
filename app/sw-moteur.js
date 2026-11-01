// Superbébé 0.21.0, moteur pour le service worker de l'app. Fichier généré par tools/build-widget.js.

const SB_RULES = {"rules":{"id":"baby-rules","version":"0.1.0","status":"brouillon, à relire avant toute diffusion","updated":"2026-11-01","locale":"fr-FR","policy":{"medical_advice":false,"official_message_levels":["A","A-etranger"],"kinds":{"officiel":"Repère officiel, cité avec sa source","pratique":"Suggestion pratique, sans portée sanitaire","fabricant":"Indication des fabricants ou d'une norme produit","meteo":"Donnée météo"},"out_of_scope":["fièvre, maladie, symptômes, médicaments","diagnostic, triage ou réassurance sur l'état de santé de l'enfant","promesse de sécurité ou de prévention de la mort inattendue du nourrisson","produits présentés comme protégeant la santé"]},"outing":{"default_window":{"from":"09:00","to":"18:00"},"default_duration_h":1,"vigilance":{"block_all_from_color":"rouge","block_all_if_orange_for":["vent-violent","orages","pluie-inondation","crues","neige-verglas","avalanches","vagues-submersion","grand-froid"],"source":"meteofrance-vigilance"},"heat":{"trigger_vigilance_canicule_from":"jaune","trigger_tmax_c_at_least":30,"blocked_hours":{"from":"11:00","to":"21:00"},"source":"spf-fortes-chaleurs-bebes"},"ozone_episode_blocked_hours":{"from":"12:00","to":"18:00","source":"santefr-pollution"},"slot_exclusions":{"feels_c_at_most":-5,"precip_prob_at_least":60,"precip_mm_at_least":0.5,"gust_kmh_at_least":60},"scoring":{"base":100,"rain_prob_free":20,"rain_prob_weight":1,"comfort_low_c":15,"comfort_low_weight":2,"comfort_high_c":24,"comfort_high_weight":3,"gust_free_kmh":30,"gust_weight":0.5,"uv_free":2,"uv_weight":10,"uv_weight_under_12m":20},"none_reason_priority":["canicule_heures_chaudes","ozone_apres_midi","froid_extreme","vent","pluie","duree"],"why":{"min_gain":5,"max_reasons":2}},"outfit":{"bands":[{"id":"tres_chaud","min_feels_c":27,"items":["body_leger","tenue_ample_claire","chapeau"]},{"id":"chaud","min_feels_c":22,"items":["body_mc","tenue_legere","chapeau_si_soleil"]},{"id":"doux","min_feels_c":18,"items":["body_mc","pyjama_leger","gilet_fin"]},{"id":"frais","min_feels_c":14,"items":["body_ml","pyjama","gilet"]},{"id":"froid_modere","min_feels_c":9,"items":["body_ml","pyjama","gilet_chaud","combi_legere","bonnet_fin"]},{"id":"froid","min_feels_c":3,"items":["body_ml","pyjama_chaud","pull","combi_pilote","bonnet","moufles","chaussons"]},{"id":"tres_froid","min_feels_c":null,"items":["body_ml","pyjama_chaud","pull","combi_pilote_doublee","bonnet","moufles","chaussons","chanceliere"]}],"transport":{"poussette":{"band_shift":0,"remove_items":[],"notes":[],"rain_gear":"habillage_pluie"},"poussette_chanceliere":{"base":"poussette","max_age_m":24,"band_shift":0,"remove_items":["chaussons"],"replace_items":{"combi_legere":["chanceliere"],"combi_pilote":["chanceliere"],"combi_pilote_doublee":["veste","chanceliere"]},"carry_reason":"hors_poussette","notes":["practical.stroller_muff"],"option_note":"practical.stroller_muff_option","rain_gear":"habillage_pluie"},"porte_bebe":{"band_shift":-1,"remove_items":["chanceliere"],"replace_items":{"pyjama_leger":["tshirt","pantalon_leger","chaussettes"],"pyjama":["haut_ml","pantalon","chaussettes"],"pyjama_chaud":["haut_ml","pantalon_chaud","chaussettes_chaudes"],"combi_legere":["couverture_portage"],"combi_pilote":["manteau_portage"],"combi_pilote_doublee":["manteau_portage"]},"notes":["practical.carrier.body_heat","practical.carrier.no_footed"],"rain_gear":"cape_pluie","safety":{"note":"Repères de sécurité du portage, dans la carte Dehors : la couverture ou le manteau de portage jamais sur son visage (dès qu'il est dans la tenue) ; par forte chaleur avant heat_under_months mois, nez et bouche dégagés ; verglas ou neige annoncés dans la suite de la plage (codes météo WMO d'Open-Meteo : bruine ou pluie verglaçante, neige), pas de porte-bébé sur sol glissant. Puis les cinq principes de position (principles), dépliés d'office avant guide_open_under_months mois.","cover_items":["couverture_portage","manteau_portage"],"cover_relay":"relay.carrier.cover_face","heat_under_months":4,"heat_relay":"relay.carrier.airway_heat","slippery_weather_codes":[56,57,66,67,71,73,75,77,85,86],"slippery_relay":"relay.carrier.slippery","principles":["relay.carrier.chin","relay.carrier.face","relay.carrier.back","relay.carrier.kiss","relay.carrier.fit"],"guide_open_under_months":4}},"a_pied":{"band_shift":-1,"min_age_m":24,"remove_items":["chanceliere"],"notes":["practical.walk.body_heat"],"rain_gear":"impermeable"},"voiture":{"band_shift":0,"remove_items":["chanceliere"],"replace_items":{"combi_legere":["couverture_harnais"],"combi_pilote":["couverture_harnais"],"combi_pilote_doublee":["couverture_harnais"],"veste":["couverture_harnais"],"manteau_chaud":["couverture_harnais"],"combi_ski":["couverture_harnais"]},"notes":[],"rain_gear":"capuche"}},"age_variants":[{"id":"enfant","from_months":24,"base_max_drop":0,"bands":{"tres_chaud":["tenue_ample_claire","chapeau"],"chaud":["tenue_legere","chapeau_si_soleil"],"doux":["tshirt","pantalon_leger","gilet_fin"],"frais":["haut_ml","pantalon","gilet"],"froid_modere":["haut_ml","pantalon","gilet_chaud","veste","bonnet_fin"],"froid":["haut_ml","pantalon_chaud","pull","manteau_chaud","bonnet","moufles","chaussettes_chaudes"],"tres_froid":["haut_ml","pantalon_chaud","pull","combi_ski","bonnet","moufles","chaussettes_chaudes"]}}],"default_day_style":"sans_pyjama","day_styles":{"sans_pyjama":{"replace_items":{"pyjama_leger":["tshirt","pantalon_leger"],"pyjama":["haut_ml","pantalon","chaussettes"],"pyjama_chaud":["haut_ml","pantalon_chaud","chaussettes_chaudes"]}}},"alternatives":{"note":"Pièces au choix, en touchant une pièce de la tenue : à sa place, un équivalent du même rôle (journee.slots), qui couvre autant (coverage) et tient aussi chaud à max_warmth_gap près (journee.warmth), contrôlé par lint. Le choix vaut pour un jour ou toujours, et le moteur le revérifie chaque jour : il ne s'applique pas si le mode de sortie retire ou remplace l'équivalent. Le reste ne se remplace pas, avec sa raison (locked_slots, locked_items).","max_warmth_gap":0.5,"coverage":{"gilet_fin":"haut_du_corps","gilet":"haut_du_corps","gilet_chaud":"haut_du_corps","pull":"haut_du_corps","combi_legere":"corps_entier","veste":"haut_du_corps","combi_pilote":"corps_entier","manteau_chaud":"haut_du_corps","combi_pilote_doublee":"corps_entier","combi_ski":"corps_entier"},"pairs":[["gilet_fin","gilet"],["gilet","gilet_chaud"],["gilet_chaud","pull"],["combi_pilote_doublee","combi_ski"]],"wardrobe_note":"Garde-robe réelle : une pièce conseillée qu'il n'a pas dans sa taille devient l'équivalent qu'il a (une des paires ci-dessus), le plus léger d'abord ; seulement quand le parent a noté au moins une pièce de ces catégories (wardrobe_only, sans suggestion d'achat).","wardrobe":{"gilet_fin":"gilets_fins","gilet":"gilets","gilet_chaud":"gilets_chauds","pull":"pulls"},"locked_slots":{"peau":"swap.locked.base","corps":"swap.locked.base","tete":"swap.locked.extremity","mains":"swap.locked.extremity","pieds":"swap.locked.extremity","poussette":"swap.locked.muff"},"locked_items":{"couverture_harnais":"relay.car.coat","couverture_portage":"swap.locked.carrier","manteau_portage":"swap.locked.carrier"}},"overlays":{"rain_cover_prob_at_least":30,"rain_cover_warm_feels_c_at_least":22,"rain_later_prob_at_least":50,"wind_gust_kmh_at_least":40}},"journee":{"min_hold_h":2,"max_changes":2,"base_max_drop":1,"base_max_drop_under_dessus":2,"over_weight":1.5,"under_weight":1,"change_cost":1,"slots":{"peau":["body_leger","body_mc","body_ml","tshirt","haut_ml"],"corps":["tenue_ample_claire","tenue_legere","pyjama_leger","pyjama","pyjama_chaud","pantalon_leger","pantalon","pantalon_chaud","chaussettes","chaussettes_chaudes"],"dessus":["combi_legere","veste","couverture_portage","couverture_harnais","combi_pilote","manteau_chaud","manteau_portage","combi_pilote_doublee","combi_ski"],"haut":["gilet_fin","gilet","gilet_chaud","pull"],"tete":["chapeau_si_soleil","chapeau","bonnet_fin","bonnet"],"mains":["moufles"],"pieds":["chaussons"],"poussette":["chanceliere"]},"fixed_slots":["peau","corps"],"sun_hats":["chapeau","chapeau_si_soleil"],"remove_order":["dessus","mains","poussette","tete","pieds","haut"],"extremities":["tete","mains","pieds","poussette"],"add_order":["dessus","tete","mains","pieds","poussette","haut"],"warmth_over_tolerance":0.5,"warmth_under_tolerance":1.5,"swap_cost":1,"warmth":{"couche":0,"body_leger":0.5,"body_mc":1,"body_ml":1.5,"tshirt":1,"haut_ml":1.5,"tenue_ample_claire":0.5,"tenue_legere":1,"pyjama_leger":1.5,"pyjama":2,"pyjama_chaud":3,"pantalon_leger":1,"pantalon":1.5,"pantalon_chaud":2.5,"chaussettes":0.3,"chaussettes_chaudes":0.5,"gilet_fin":1,"gilet":1.5,"gilet_chaud":2,"pull":2.5,"combi_legere":2.5,"veste":2.5,"couverture_portage":2,"couverture_harnais":2,"combi_pilote":4,"manteau_chaud":4,"manteau_portage":3,"combi_pilote_doublee":5,"combi_ski":5,"chapeau_si_soleil":0,"chapeau":0,"bonnet_fin":0.5,"bonnet":1,"moufles":0.5,"chaussons":0.5,"chanceliere":1.5},"carry_dessus_for":["a_pied","voiture","poussette_chanceliere"],"bag":{"max_items":3,"pocket_slots":["tete","mains","pieds"],"rain_prob_at_least":50,"sun_feels_c_at_least":22},"check":"relay.check_neck","widget_urgent_relays":["relay.vigilance.active","relay.cold.avoid_outings","relay.heat.outing_hours","relay.cold.stroller_rather_than_carrier"]},"relay_triggers":{"cold_layers_bands":["froid","tres_froid"],"carrier_cold_feels_c_at_most":0,"car_coat_bands":["froid_modere","froid","tres_froid"],"uv_at_least":3,"uv_source":"oms-indice-uv","under_1y_months":12},"indoor":{"comfort_range_c":{"min":20,"max":22,"source":"inspq-chaleur-froid"},"round_room_temp":true,"bins":[{"max_c":16,"wear":["body_ml","pyjama_chaud","gilet"]},{"max_c":19,"wear":["body_ml","pyjama","gilet_fin"]},{"max_c":22,"wear":["body_ml","pyjama"]},{"max_c":25,"wear":["body_mc","pyjama_leger"]},{"max_c":null,"wear":["body_leger"]}],"age_variants":[{"id":"enfant","from_months":24,"bins":[{"max_c":16,"wear":["haut_ml","pantalon_chaud","pull"]},{"max_c":19,"wear":["haut_ml","pantalon","gilet"]},{"max_c":22,"wear":["haut_ml","pantalon"]},{"max_c":25,"wear":["tshirt","pantalon_leger"]},{"max_c":null,"wear":["tenue_legere"]}]}],"always":["relay.indoor.dress_like_you","relay.indoor.no_overwrap","relay.indoor.temperature","relay.check_neck"],"heat_room_c_at_least":26,"when_hot":["relay.heat.protect","relay.heat.shutters"]},"night":{"room_range_c":{"min":18,"max":20,"source":"ameli-coucher-bebe"},"always":["relay.sleep.basics","relay.sleep.room_range","relay.sleep.check_temp"],"baby_only":["relay.sleep.basics"],"baby_until_months":24,"by_age":[{"relay":"relay.sleep.duvet_age","from_months":24,"until_months":36}],"when_room_known":["relay.sleep.season_thickness"],"heat_room_c_at_least":26,"tog_hint":{"source":"fabricants-tog","round_room_temp":true,"bins":[{"id":"n15","max_c":15,"tog":"3,5","wear":["body_leger","pyjama_chaud"],"sources":["ergopouch-what-to-wear"],"alternatives":[{"id":"body-pyjama","tog":"3,5","wear":["body_ml","pyjama"],"sources":["tommee-tippee-what-to-wear"]}]},{"id":"n17","max_c":17,"tog":"2,5","wear":["body_leger","pyjama"],"sources":["ergopouch-what-to-wear","tommee-tippee-what-to-wear"],"alternatives":[{"id":"pyjama-seul","tog":"2,5","wear":["pyjama"],"sources":["tommee-tippee-what-to-wear"]},{"id":"tog-3-5","tog":"3,5","wear":["body_leger","pyjama_leger"],"sources":["ergopouch-what-to-wear"]}]},{"id":"n20","max_c":20,"tog":"2","wear":["body_ml","pyjama"],"sources":["petites-billes-tog"],"alternatives":[{"id":"tog-2-5","tog":"2,5","wear":["body_ml"],"sources":["tommee-tippee-what-to-wear"]},{"id":"tog-2-5-pyjama","tog":"2,5","wear":["pyjama"],"sources":["ergopouch-what-to-wear"]},{"id":"tog-3-5-leger","tog":"3,5","wear":["pyjama_leger"],"sources":["ergopouch-what-to-wear"]}]},{"id":"n24","max_c":24,"tog":"1","wear":["pyjama_leger"],"sources":["ergopouch-what-to-wear"],"alternatives":[{"id":"body-mc","tog":"1","wear":["body_mc"],"sources":["tommee-tippee-what-to-wear"]}]},{"id":"n27","max_c":27,"tog":"0,5","wear":["body_mc"],"sources":["fabricants-tog"]},{"id":"chaud","max_c":null,"tog":"0,2","wear":["body_leger"],"sources":["ergopouch-what-to-wear"],"alternatives":[{"id":"couche","tog":"0,2","wear":["couche"],"sources":["tommee-tippee-what-to-wear"]}]}]}},"purchases":{"horizon_weeks":6,"lead_days":14,"size_lookahead_days":28,"max_suggestions":3,"quantities":{"wash_days_default":3,"wash_days_choices":[2,3,4,7],"spare":1,"note":"Suggestion pratique : de quoi tenir entre deux lessives, plus une pièce de rechange (per_day × jours entre deux lessives + spare), ou un nombre fixe (quantity : deux gigoteuses, une portée et une au lavage). suggest_once_noted : proposé seulement quand le parent en a noté dans sa garde-robe."},"sleepbags":{"inventory":"gigoteuse","togs":["0,2","0,5","1","2","2,5","3,5"],"legacy":{"gigoteuse_hiver":"2,5","gigoteuse_ete":"1"},"note":"Gigoteuses notées par TOG et par taille (« 6-18m|2,5 »). Chaque saison a ses TOG, pris dans le tableau de nuit des fabricants (night.tog_hint) : une gigoteuse compte pour chaque saison où son TOG sert. Celles notées avant la 0.16 comptent comme 2,5 TOG (chaude) ou 1 TOG (légère)."},"size_systems":{"vetement":[{"code":"1m","label":"1 mois","max_age_m":2},{"code":"3m","label":"3 mois","max_age_m":4},{"code":"6m","label":"6 mois","max_age_m":7},{"code":"9m","label":"9 mois","max_age_m":10},{"code":"12m","label":"12 mois","max_age_m":13},{"code":"18m","label":"18 mois","max_age_m":19},{"code":"24m","label":"24 mois","max_age_m":25},{"code":"36m","label":"3 ans","max_age_m":37},{"code":"4a","label":"4 ans","max_age_m":49},{"code":"5a","label":"5 ans","max_age_m":61},{"code":"6a","label":"6 ans","max_age_m":73}],"gigoteuse":[{"code":"0-6m","label":"0-6 mois","max_age_m":6},{"code":"6-18m","label":"6-18 mois","max_age_m":18},{"code":"18-36m","label":"18-36 mois","max_age_m":36}],"accessoire":[{"code":"0-6m","label":"0-6 mois","max_age_m":6},{"code":"6-12m","label":"6-12 mois","max_age_m":12},{"code":"12-24m","label":"12-24 mois","max_age_m":24},{"code":"24-36m","label":"2-3 ans","max_age_m":36},{"code":"3-6a","label":"3-6 ans","max_age_m":72}],"unique":[{"code":"unique","label":"taille unique","max_age_m":999}]},"size_note":"Correspondance âge/taille indicative (convention des étiquettes) ; la taille réellement portée, saisie par le parent, prime.","categories":[{"id":"gigoteuse_hiver","size_system":"gigoteuse","priority":1,"max_age_m":36,"quantity":2,"togs":["2","2,5","3,5"],"need_if":{"week_tmean_below":15},"reason":"nuits_fraiches","relays":["relay.sleep.size_adapted","fabricant.sleepbag.norm"]},{"id":"gigoteuse_mi_saison","size_system":"gigoteuse","priority":2,"max_age_m":36,"quantity":2,"togs":["1","2"],"need_if":{"week_tmean_at_least":15,"week_tmax_below":27},"reason":"nuits_douces","relays":["relay.sleep.size_adapted","fabricant.sleepbag.norm"]},{"id":"gigoteuse_ete","size_system":"gigoteuse","priority":2,"max_age_m":36,"quantity":2,"togs":["0,2","0,5","1"],"need_if":{"week_tmax_at_least":27},"reason":"nuits_chaudes","relays":["relay.sleep.size_adapted","fabricant.sleepbag.norm"]},{"id":"combi_pilote","size_system":"vetement","priority":1,"max_age_m":24,"need_if":{"week_band_in":["froid","tres_froid"]},"reason":"froid","relays":["relay.cold.layers"]},{"id":"manteau_hiver","size_system":"vetement","priority":1,"min_age_m":24,"need_if":{"week_band_in":["froid","tres_froid"]},"reason":"froid","relays":["relay.cold.layers"]},{"id":"accessoires_hiver","size_system":"accessoire","priority":2,"need_if":{"week_band_in":["froid_modere","froid","tres_froid"]},"reason":"froid","relays":["relay.cold.layers"]},{"id":"chanceliere","size_system":"unique","priority":3,"max_age_m":24,"need_if":{"week_band_in":["froid","tres_froid"],"transport_in":["poussette"]},"reason":"froid","relays":["practical.stroller_muff_option"]},{"id":"habillage_pluie","size_system":"unique","priority":3,"need_if":{"week_rainy_days_at_least":3,"transport_in":["poussette"]},"reason":"pluie","relays":[]},{"id":"chapeau_soleil","size_system":"accessoire","priority":1,"need_if":{"week_uv_max_at_least":3,"week_tmax_at_least":18},"reason":"soleil","relays":[],"relays_under_12m":["relay.sun.under_1y"],"relays_from_12m":["relay.sun.protect"]},{"id":"vetements_longs_legers","size_system":"vetement","priority":2,"per_day":1,"need_if":{"week_uv_max_at_least":3,"week_tmax_at_least":22},"reason":"soleil","relays":[],"relays_under_12m":["relay.sun.under_1y"],"relays_from_12m":["relay.sun.protect"]},{"id":"lunettes_soleil","size_system":"accessoire","priority":3,"min_age_m":12,"under_min_age_relay":"relay.sun.under_1y","need_if":{"week_uv_max_at_least":3,"week_tmax_at_least":18},"reason":"soleil","relays":["relay.sun.protect"]},{"id":"creme_solaire_enfant","size_system":"unique","priority":4,"min_age_m":12,"under_min_age_relay":"relay.sun.under_1y","need_if":{"week_uv_max_at_least":3,"week_tmax_at_least":18},"reason":"soleil","relays":["relay.sun.protect"]},{"id":"bodies","size_system":"vetement","priority":3,"max_age_m":24,"per_day":2,"suggest_once_noted":true,"need_if":{},"reason":"lessive","relays":[]},{"id":"hauts","size_system":"vetement","priority":3,"per_day":1,"suggest_once_noted":true,"need_if":{},"reason":"lessive","relays":[]},{"id":"pantalons","size_system":"vetement","priority":3,"per_day":1,"suggest_once_noted":true,"need_if":{},"reason":"lessive","relays":[]},{"id":"pyjamas","size_system":"vetement","priority":3,"per_day":1,"per_day_by_style":{"pyjama":2},"suggest_once_noted":true,"need_if":{},"reason":"lessive","relays":[]},{"id":"chaussettes","size_system":"accessoire","priority":3,"per_day":1,"suggest_once_noted":true,"need_if":{},"reason":"lessive","relays":[]},{"id":"gilets_fins","size_system":"vetement","priority":3,"wardrobe_only":true,"need_if":{},"reason":"tenue","relays":[]},{"id":"gilets","size_system":"vetement","priority":3,"wardrobe_only":true,"need_if":{},"reason":"tenue","relays":[]},{"id":"gilets_chauds","size_system":"vetement","priority":3,"wardrobe_only":true,"need_if":{},"reason":"tenue","relays":[]},{"id":"pulls","size_system":"vetement","priority":3,"wardrobe_only":true,"need_if":{},"reason":"tenue","relays":[]}],"never_suggest":[{"id":"tour_de_lit","relay":"relay.sleep.basics"},{"id":"couverture_couette_oreiller","relay":"relay.sleep.basics"},{"id":"cale_bebe","relay":"relay.sleep.no_positioners"},{"id":"reducteur_de_lit","relay":"relay.sleep.no_positioners"}]},"relay_priority":["relay.vigilance.active","relay.cold.avoid_outings","relay.heat.outing_hours","relay.heat.protect","relay.heat.vehicle","relay.heat.stroller_sun","relay.sun.under_1y","relay.sun.hours","relay.sun.protect","relay.air.ozone","relay.air.particles","relay.cold.stroller_rather_than_carrier","relay.car.coat","relay.cold.layers","relay.heat.shutters","relay.heat.info_line","relay.indoor.dress_like_you","relay.indoor.no_overwrap","relay.indoor.temperature","relay.check_neck","relay.sleep.basics","relay.sleep.duvet_age","relay.sleep.room_range","relay.sleep.check_temp","relay.sleep.season_thickness","relay.sleep.size_adapted","relay.sleep.no_positioners","relay.emergency"]},"messages":{"locale":"fr-FR","version":"0.1.0","disclaimer":"Cette application relaie des recommandations publiques et propose des suggestions pratiques. Elle ne remplace pas l'avis d'un professionnel de santé. En cas d'urgence : 15 ou 112.","messages":{"relay.vigilance.active":{"kind":"officiel","verbatim":false,"sources":["meteofrance-vigilance"],"text":"Vigilance {color} ({phenomena}) : suivez les conseils de comportement des pouvoirs publics sur vigilance.meteofrance.fr.","short":"Vigilance {color} : consignes officielles"},"relay.carrier.cover_face":{"kind":"officiel","verbatim":false,"sources":["santecanada-porte-bebes","inspq-porte-bebes"],"text":"La couverture ou le manteau de portage se met par-dessus vous deux, son visage toujours dégagé : selon Santé Canada, « même les extensions de manteaux ou les manteaux de portage sont dangereux lorsqu'ils recouvrent le bébé ».","short":"Couverture de portage : jamais sur son visage"},"relay.carrier.airway_heat":{"kind":"officiel","verbatim":true,"sources":["spf-fortes-chaleurs-bebes"],"text":"« Pour les bébés en porte-bébés éviter l'enfouissement des voies aériennes supérieures (nourrissons de moins de 4 mois). »","short":"Chaleur : nez et bouche toujours dégagés"},"relay.carrier.slippery":{"kind":"officiel","verbatim":false,"sources":["inspq-porte-bebes"],"text":"Verglas ou neige annoncés : l'INSPQ conseille de « ne pas utiliser un porte-bébé dans des environnements où les risques de chutes sont élevés (ex. : un trottoir glacé) ».","short":"Verglas ou neige : pas de porte-bébé sur sol glissant"},"relay.carrier.chin":{"kind":"officiel","verbatim":true,"sources":["santecanada-porte-bebes"],"text":"« Placez le bébé de façon à ce que son menton ne repose pas sur sa poitrine. »","short":"Menton relevé"},"relay.carrier.face":{"kind":"officiel","verbatim":true,"sources":["santecanada-porte-bebes"],"text":"« Assurez-vous de pouvoir toujours voir le visage de votre bébé et vérifiez souvent sa respiration. »","short":"Visage visible en tout temps"},"relay.carrier.back":{"kind":"officiel","verbatim":true,"sources":["santecanada-porte-bebes"],"text":"« Placez votre bébé de façon à ce que sa poitrine et son ventre soient contre vous. »","short":"Dos bien soutenu"},"relay.carrier.kiss":{"kind":"officiel","verbatim":true,"sources":["santecanada-porte-bebes"],"text":"« Placez votre bébé suffisamment haut dans le porte-bébé pour que vous puissiez embrasser le sommet de sa tête. »","short":"Assez haut pour l'embrasser"},"relay.carrier.fit":{"kind":"officiel","verbatim":true,"sources":["santecanada-porte-bebes"],"text":"« Placez votre bébé en position verticale dans le porte-bébé et serrez-le suffisamment pour soutenir son dos. »","short":"Bien ajusté"},"relay.heat.outing_hours":{"kind":"officiel","verbatim":true,"sources":["spf-fortes-chaleurs-bebes"],"text":"« Préférer les sorties le matin avant 11 heures ou le soir après 21 heures. »","short":"Chaleur : sortir avant 11 h ou après 21 h"},"relay.heat.protect":{"kind":"officiel","verbatim":true,"sources":["spf-canicule-precautions"],"text":"Nourrissons et jeunes enfants : « veillez à les protéger en permanence de la chaleur » et à « les faire boire et les hydrater régulièrement ».","short":"Protéger de la chaleur, hydrater régulièrement"},"relay.heat.vehicle":{"kind":"officiel","verbatim":true,"sources":["spf-canicule-precautions"],"text":"« Ne les laissez jamais dans une pièce mal ventilée ou un véhicule, même pendant une très courte durée. »","short":"Jamais seul dans un véhicule"},"relay.heat.stroller_sun":{"kind":"officiel","verbatim":true,"sources":["spf-fortes-chaleurs-bebes"],"text":"« Protéger les bébés dans les poussettes ou les porte-bébés dorsaux des rayons directs du soleil. »","short":"Poussette à l'abri du soleil direct"},"relay.heat.shutters":{"kind":"officiel","verbatim":true,"sources":["spf-canicule-precautions"],"text":"« Fermez fenêtres et volets la journée, ouvrez-les le soir et la nuit s'il fait plus frais. »","short":"Volets fermés le jour, aérer la nuit"},"relay.heat.info_line":{"kind":"officiel","verbatim":false,"sources":["spf-canicule-precautions"],"text":"Canicule Info Service : 0800 06 66 66 (appel gratuit depuis un poste fixe, du lundi au samedi de 9 h à 19 h).","short":"Canicule Info Service : 0800 06 66 66"},"relay.cold.avoid_outings":{"kind":"officiel","verbatim":true,"sources":["santefr-grand-froid"],"text":"« Il convient avant tout d'éviter de sortir avec un bébé quand les températures sont vraiment basses. »","short":"Grand froid : éviter de sortir avec bébé"},"relay.cold.layers":{"kind":"officiel","verbatim":false,"sources":["santefr-grand-froid"],"text":"Santé.fr (fiche grand froid) : « plusieurs vêtements superposés » et couvrir « tête, mains et pieds ».","short":"Couches superposées ; tête, mains, pieds couverts"},"relay.cold.stroller_rather_than_carrier":{"kind":"officiel","verbatim":false,"sources":["santefr-grand-froid"],"text":"Par grand froid, Santé.fr conseille le landau ou la poussette plutôt que le porte-bébé, qui « peut comprimer les membres inférieurs ».","short":"Grand froid : poussette plutôt que porte-bébé"},"relay.sun.under_1y":{"kind":"officiel","verbatim":true,"sources":["santefr-uv-enfants"],"text":"« Les enfants de moins d'un an ne doivent pas être exposés au soleil. »","short":"Pas de soleil direct avant 1 an"},"relay.sun.hours":{"kind":"officiel","verbatim":false,"sources":["santefr-uv-enfants","oms-indice-uv"],"text":"Indice UV de {uv} : rechercher l'ombre et éviter « les heures d'exposition aux UV les plus intenses (de midi à 16 heures) ».","short":"UV : ombre, éviter 12 h-16 h"},"relay.sun.protect":{"kind":"officiel","verbatim":false,"sources":["santefr-uv-enfants"],"text":"Pour les enfants : « des vêtements longs, un chapeau à larges bords », « des lunettes de soleil filtrant bien les UV et enveloppantes » et « une crème solaire adaptée aux enfants sur les parties découvertes du corps ».","short":"Vêtements longs, chapeau, lunettes, crème enfant"},"relay.air.particles":{"kind":"officiel","verbatim":false,"sources":["santefr-pollution"],"text":"Épisode de pollution : « Les sorties à l'extérieur des nourrissons peuvent être maintenues » ; il est recommandé de les limiter dans la durée à proximité des sources majeures de pollution.","short":"Pollution : sorties plus courtes près du trafic"},"relay.air.ozone":{"kind":"officiel","verbatim":false,"sources":["santefr-pollution"],"text":"Épisode d'ozone : limiter la durée des sorties des nourrissons « aux moments de la journée où le niveau de pollution est le plus élevé », souvent le milieu ou la fin d'après-midi.","short":"Ozone : pas de sortie l'après-midi"},"relay.car.coat":{"kind":"officiel","verbatim":false,"sources":["santefr-sieges-auto","awsr-siege-auto"],"text":"Au siège auto, Santé.fr conseille : « Doudoune ou combinaison empêchent le harnais de jouer son rôle, mieux vaut les enlever pour l'attacher, et les replacer sur votre enfant pour qu'il n'ait pas froid. »","short":"Siège auto : manteau enlevé, couvrir par-dessus"},"relay.indoor.hat_off":{"kind":"officiel","verbatim":false,"sources":["nhs-sids"],"text":"En rentrant à l'intérieur, ou en montant en voiture, en bus ou en train, enlevez son bonnet et les vêtements en trop, même s'il faut le réveiller (NHS, Royaume-Uni).","short":"À l'intérieur : bonnet et couches en trop enlevés"},"relay.sleep.few_layers":{"kind":"officiel","verbatim":true,"sources":["ameli-coucher-bebe"],"text":"« Évitez de multiplier les couches de vêtements, pour que votre enfant n'ait pas trop chaud. »","short":"Pas trop de couches pour dormir"},"relay.sleep.duvet_age":{"kind":"officiel","verbatim":true,"sources":["ameli-coucher-bebe"],"text":"« Ne couvrez pas votre bébé avec un drap ou une couette (utilisable seulement à partir de 3 ans). »","short":"Ni drap ni couette avant 3 ans"},"relay.sleep.basics":{"kind":"officiel","verbatim":false,"sources":["ameli-coucher-bebe"],"text":"Pour dormir : sur le dos, à plat, dans son lit, dans une turbulette ou gigoteuse adaptée à sa taille, sur un matelas ferme ; ni couverture, ni couette, ni oreiller, ni tour de lit.","short":"Sur le dos, turbulette, ni couette ni tour de lit","list":["Sur le dos, à plat, dans son lit","Dans une turbulette ou gigoteuse adaptée à sa taille","Sur un matelas ferme","Ni couverture, ni couette, ni oreiller, ni tour de lit"]},"relay.sleep.room_range":{"kind":"officiel","verbatim":false,"sources":["ameli-coucher-bebe"],"text":"Température de la chambre recommandée : entre 18 et 20 °C.","short":"Chambre entre 18 et 20 °C"},"relay.sleep.check_temp":{"kind":"officiel","verbatim":false,"sources":["nhs-sids"],"text":"Pour savoir s'il a trop chaud, touchez sa poitrine ou sa nuque : des mains ou des pieds frais, c'est normal. Peau chaude ou moite : retirez une couche.","short":"Touchez sa nuque, pas ses mains : moite, une couche de moins"},"relay.check_neck":{"kind":"officiel","verbatim":false,"sources":["ameli-coucher-bebe","nhs-sids"],"text":"Pour vérifier s'il a trop chaud, « placez votre main sur sa nuque : vous ne devez pas sentir de sueur sous vos doigts » (Assurance Maladie). Des mains ou des pieds frais, c'est normal (NHS).","short":"Touchez sa nuque, pas ses mains","tiny":"Touchez sa nuque","card":"Touchez sa nuque, pas ses mains : nuque moite, une couche de moins (Assurance Maladie ; NHS)."},"relay.indoor.temperature":{"kind":"officiel","verbatim":true,"sources":["inspq-chaleur-froid"],"text":"« Si la température de la pièce vous convient, elle convient aussi à votre bébé. Une température entre 20 et 22 °C est adéquate. »","short":"Pièce entre 20 et 22 °C"},"relay.indoor.dress_like_you":{"kind":"officiel","verbatim":true,"sources":["manitoba-bebe-chaud"],"text":"« Habillez votre bébé comme vous vous habillez. Si vous êtes à l'aise en portant un pantalon et un chandail léger, votre bébé le sera aussi. »","short":"Habillez-le comme vous"},"relay.indoor.no_overwrap":{"kind":"officiel","verbatim":true,"sources":["inspq-chaleur-froid"],"text":"« N'enveloppez pas trop votre bébé. » Au-delà de 25 °C, à l'intérieur comme à l'extérieur, « un vêtement court et léger et une couche suffisent ».","short":"Ne l'enveloppez pas trop"},"relay.sleep.season_thickness":{"kind":"officiel","verbatim":false,"sources":["cd06-pmi-min"],"text":"Une gigoteuse ou une turbulette « dont l'épaisseur variera avec la saison ».","short":"Épaisseur de turbulette selon la saison"},"relay.sleep.size_adapted":{"kind":"officiel","verbatim":false,"sources":["ameli-coucher-bebe"],"text":"La turbulette ou gigoteuse doit être adaptée à la taille de bébé.","short":"Gigoteuse adaptée à sa taille"},"relay.sleep.no_positioners":{"kind":"officiel","verbatim":true,"sources":["ameli-coucher-bebe"],"text":"« N'utilisez pas de dispositifs pour maintenir votre bébé sur le dos (ex. : serviette roulée, coussin, cale-bébé, cale-tête, réducteur de lit). »","short":"Ni cale-bébé ni réducteur de lit"},"relay.emergency":{"kind":"officiel","verbatim":false,"sources":["service-public-urgences"],"text":"En cas d'urgence : 15 (SAMU) ou 112.","short":"Urgence : 15 ou 112"},"practical.rain.cover":{"kind":"pratique","text":"Pluie possible pendant la sortie : prévoyez {gear}.","short":"Pluie possible : {gear_short}"},"practical.rain.cover_warm":{"kind":"pratique","text":"Averse possible : l'habillage pluie seulement pendant l'averse, il retient la chaleur.","short":"Averse : habillage pluie le temps de l'averse"},"practical.rain.later":{"kind":"pratique","text":"Pluie prévue vers {hour} : prévoyez {gear} pour le retour.","short":"Pluie vers {hour} : {gear_short}"},"practical.wind":{"kind":"pratique","text":"Vent soutenu : le ressenti est plus froid, protégez du vent.","short":"Vent : ressenti plus froid"},"practical.carrier.body_heat":{"kind":"pratique","text":"En porte-bébé, votre chaleur réchauffe bébé : une couche de moins qu'en poussette.","short":"Porte-bébé : une couche de moins"},"practical.walk.body_heat":{"kind":"pratique","text":"À pied, il se réchauffe en marchant : une couche de moins qu'en poussette, à remettre s'il s'arrête ou remonte dans la poussette.","short":"À pied : une couche de moins"},"swap.locked.base":{"kind":"pratique","text":"Le dessous (body, pyjama, ou haut, pantalon et chaussettes) suit le ressenti. Avant 2 ans, « Tenue de la journée », dans la carte Dedans, le choisit avec ou sans pyjama.","short":"Le dessous se choisit dans Dedans"},"swap.locked.extremity":{"kind":"pratique","text":"Tête, mains et pieds : ce que le ressenti demande reste tant qu'il le demande, sans équivalent plus léger.","short":"Demandé par le ressenti"},"swap.locked.muff":{"kind":"pratique","text":"La chancelière vient de votre garde-robe (onglet Achats) : notée, elle remplace la combinaison dans la poussette ; retirée, la combinaison revient.","short":"Se règle dans la garde-robe"},"swap.locked.carrier":{"kind":"pratique","text":"En porte-bébé, la couverture ou le manteau de portage se met par-dessus vous deux : pas de combinaison, elle tire sur ses jambes repliées.","short":"Porte-bébé : par-dessus vous deux"},"swap.none":{"kind":"pratique","text":"Pas d'équivalent aussi chaud, qui couvre autant, dans nos repères.","short":"Pas d'équivalent"},"practical.stroller_muff_option":{"kind":"pratique","text":"Une chancelière ? Elle se met à la place de la combinaison dans la poussette, jamais en plus : deux couches, ce serait trop chaud. Notée dans la garde-robe (onglet Achats), la tenue s'adapte.","short":"Chancelière : à la place de la combinaison"},"practical.stroller_muff":{"kind":"pratique","text":"Avec la chancelière de votre garde-robe : dans la poussette, elle remplace la combinaison, pieds dedans. La combinaison va dans le sac, pour quand il en sort.","short":"Chancelière à la place de la combinaison"},"practical.carrier.no_footed":{"kind":"pratique","text":"Pas de pyjama à pieds en porte-bébé : il tire sur les pieds quand les jambes sont repliées.","short":"Porte-bébé : pas de pyjama à pieds"},"fabricant.tog":{"kind":"fabricant","sources":["fabricants-tog"],"text":"Chambre à {room} °C : environ {tog} TOG selon les tableaux habituels des fabricants. L'étiquette de votre gigoteuse fait foi.","short":"Gigoteuse ≈ {tog} TOG (indicatif fabricants)"},"fabricant.night_wear":{"kind":"fabricant","sources":["ergopouch-what-to-wear","tommee-tippee-what-to-wear","fabricants-tog"],"text":"Sous la gigoteuse : {wear}. Repère des fabricants, à adapter à bébé ; l'étiquette de la gigoteuse fait foi.","short":"{wear} + gigoteuse ≈ {tog} TOG"},"fabricant.night.compensation":{"kind":"fabricant","sources":["henriette-tog","ergopouch-what-to-wear"],"text":"Ce qu'on met sous la gigoteuse s'additionne à son TOG : une gigoteuse plus légère demande une couche de plus dessous, une plus chaude une couche de moins.","short":"Gigoteuse plus légère : une couche de plus dessous ; plus chaude : une de moins"},"fabricant.sleepbag.norm":{"kind":"fabricant","sources":["norme-nf-en-16781"],"text":"Repère produit : gigoteuses conformes à la norme NF EN 16781.","short":"Norme NF EN 16781"},"outing.window":{"kind":"meteo","text":"Sortie idéale de {start} à {end}, {feels} °C ressentis.","short":"Sortie idéale {start} – {end} · {feels}°"},"outing.none.journee_terminee":{"kind":"meteo","text":"Plus de créneau aujourd'hui dans votre plage horaire : préparez plutôt la tenue de demain.","short":"Pas de sortie conseillée ce soir"},"outing.none.vigilance":{"kind":"meteo","text":"Pas de créneau conseillé : vigilance en cours.","short":"Pas de sortie conseillée (vigilance)"},"outing.none.canicule_heures_chaudes":{"kind":"meteo","text":"Pas de créneau dans votre plage horaire : fortes chaleurs entre 11 h et 21 h.","short":"Pas de créneau : fortes chaleurs"},"outing.none.ozone_apres_midi":{"kind":"meteo","text":"Pas de créneau dans votre plage horaire : épisode d'ozone l'après-midi.","short":"Pas de créneau : ozone l'après-midi"},"outing.none.froid_extreme":{"kind":"meteo","text":"Pas de créneau conseillé : froid très vif.","short":"Pas de créneau : froid très vif"},"outing.none.vent":{"kind":"meteo","text":"Pas de créneau conseillé : rafales fortes.","short":"Pas de créneau : rafales"},"outing.none.pluie":{"kind":"meteo","text":"Pas de créneau sec dans votre plage horaire.","short":"Pas de créneau sec aujourd'hui"},"outing.none.duree":{"kind":"meteo","text":"Pas de créneau assez long dans votre plage horaire.","short":"Pas de créneau assez long"},"outing.none.hors_jour":{"kind":"meteo","text":"Pas de créneau de jour dans votre plage horaire.","short":"Pas de créneau de jour"},"outing.why.text":{"kind":"meteo","short":"{why} · {feels}° ressentis"},"outing.why.pluie.avant":{"kind":"meteo","short":"au sec avant la pluie de {hour}"},"outing.why.pluie.apres":{"kind":"meteo","short":"au sec après la pluie"},"outing.why.pluie.entre":{"kind":"meteo","short":"au sec entre deux averses"},"outing.why.pluie.moins":{"kind":"meteo","short":"moins de risque d'averse qu'à {hour}"},"outing.why.froid.doux":{"kind":"meteo","short":"doux"},"outing.why.froid.max":{"kind":"meteo","short":"le plus doux"},"outing.why.froid.moins":{"kind":"meteo","short":"plus doux qu'à {hour}"},"outing.why.chaleur.avant":{"kind":"meteo","short":"avant les fortes chaleurs"},"outing.why.chaleur.apres":{"kind":"meteo","short":"après les fortes chaleurs"},"outing.why.chaleur.max":{"kind":"meteo","short":"le plus frais"},"outing.why.chaleur.moins":{"kind":"meteo","short":"plus frais qu'à {hour}"},"outing.why.vent.avant":{"kind":"meteo","short":"avant les rafales de {hour}"},"outing.why.vent.apres":{"kind":"meteo","short":"après les rafales"},"outing.why.vent.moins":{"kind":"meteo","short":"moins de vent qu'à {hour}"},"outing.why.uv.moins":{"kind":"meteo","short":"soleil moins fort qu'à {hour}"},"outing.why.ozone":{"kind":"meteo","short":"hors du pic d'ozone"},"outing.why.egal":{"kind":"meteo","short":"même temps toute la journée"},"outing.why.seul":{"kind":"meteo","short":"seul créneau possible"},"journee.range":{"kind":"meteo","text":"{when}, de {first} à {extreme} °C ressentis.","short":"{when} {first}° → {extreme}°"},"journee.stable":{"kind":"meteo","text":"{when}, autour de {first} °C ressentis.","short":"{when} {first}°"},"journee.bag":{"kind":"pratique","text":"Dans le sac : {items}.","short":"sac : {items}"},"evening.tomorrow":{"kind":"meteo","text":"Demain, à préparer ce soir : de {first} à {extreme} °C ressentis{rain}.","short":"Demain {range}{rain}"},"evening.night":{"kind":"fabricant","sources":["ergopouch-what-to-wear","tommee-tippee-what-to-wear","fabricants-tog"],"text":"Cette nuit : {wear} sous une gigoteuse d'environ {tog} TOG (repère des fabricants).","short":"nuit{room} : {wear} + {tog} TOG"},"evening.reminder":{"kind":"pratique","text":"{outfit}{bag} · {night}","short":"Demain, à préparer ce soir"},"indoor.room":{"kind":"meteo","text":"Chez vous, {room} °C.","short":"Chez vous {room}°"},"night.room":{"kind":"meteo","text":"Chambre à {room} °C ce soir (repère officiel : 18 à 20 °C).","short":"Chambre {room}° · repère 18 à 20°"},"night.room_unknown":{"kind":"meteo","text":"Repère officiel : chambre entre 18 et 20 °C.","short":"Chambre : repère 18 à 20 °C"},"maison.jour.title":{"kind":"meteo","text":"Chez vous, {room} °C.","short":"Chez vous {room}°"},"maison.jour.title_unknown":{"kind":"meteo","text":"Température chez vous à noter dans l'app.","short":"Chez vous : température à noter"},"maison.nuit.title":{"kind":"meteo","text":"Sa chambre, {room} °C.","short":"Chambre {room}°"},"maison.nuit.title_unknown":{"kind":"meteo","text":"Température de sa chambre à noter dans l'app.","short":"Chambre : température à noter"},"maison.jour.in_range":{"kind":"pratique","text":"Pièce entre {min} et {max} °C : bien pour la journée.","short":"Bien pour la journée ({min} à {max} °C)"},"maison.jour.above":{"kind":"pratique","text":"Pièce au-dessus de {max} °C : habillez-le léger.","short":"Au-dessus de {max} °C : habillez-le léger"},"maison.jour.below":{"kind":"pratique","text":"Pièce sous {min} °C : une couche de plus.","short":"Sous {min} °C : une couche de plus"},"maison.jour.unknown":{"kind":"pratique","text":"Sans relevé, la tenue pour {min} à {max} °C, le repère de jour.","short":"Tenue pour {min} à {max} °C, le repère de jour"},"maison.nuit.in_range":{"kind":"pratique","text":"Chambre dans la plage recommandée pour dormir ({min} à {max} °C).","short":"Dans la plage recommandée pour dormir"},"maison.nuit.above":{"kind":"pratique","text":"Chambre au-dessus de {max} °C : un peu chaud pour dormir.","short":"Un peu chaud pour dormir : au-dessus de {max} °C"},"maison.nuit.below":{"kind":"pratique","text":"Chambre sous {min} °C : un peu frais pour dormir.","short":"Un peu frais pour dormir : sous {min} °C"},"maison.nuit.unknown":{"kind":"pratique","text":"Sans relevé, la tenue pour une chambre à {min}-{max} °C, le repère officiel.","short":"Tenue pour {min} à {max} °C, le repère officiel"},"maison.widget.confirm":{"kind":"pratique","text":"Touchez la température pour la noter : − et + la changent d'un demi-degré.","short":"Touchez la température pour la noter"},"purchase.quantity_rule":{"kind":"pratique","text":"Quantités conseillées : de quoi tenir entre deux lessives, plus une pièce de rechange ; deux gigoteuses par saison, une portée et une au lavage.","short":"De quoi tenir entre deux lessives, plus une de rechange"},"purchase.suggestion":{"kind":"pratique","text":"À prévoir avant le {order_by} : {label}{size}, utile à partir du {needed_from}.","short":"À prévoir : {label}{size}"}},"labels":{"items":{"couche":"couche seule","body_leger":"body léger","body_mc":"body manches courtes","body_ml":"body manches longues","tenue_ample_claire":"vêtements légers, amples et clairs","tenue_legere":"tenue légère","pyjama_leger":"pyjama ou ensemble léger","pyjama":"pyjama ou ensemble","pyjama_chaud":"pyjama épais","gilet_fin":"gilet fin à emporter","gilet":"gilet","gilet_chaud":"gilet chaud","pull":"pull","combi_legere":"combinaison légère ou manteau","combi_pilote":"combinaison pilote","combi_pilote_doublee":"combinaison pilote doublée","bonnet_fin":"bonnet fin","bonnet":"bonnet","moufles":"moufles","chaussons":"chaussons chauds","chapeau":"chapeau à larges bords","chapeau_si_soleil":"chapeau à larges bords si soleil","chanceliere":"chancelière","pantalon_leger":"pantalon léger sans pieds","pantalon":"pantalon souple sans pieds","pantalon_chaud":"pantalon chaud sans pieds","chaussettes":"chaussettes","chaussettes_chaudes":"chaussettes chaudes","couverture_portage":"couverture de portage par-dessus","manteau_portage":"manteau ou couverture de portage par-dessus","couverture_harnais":"couverture par-dessus le harnais","tshirt":"t-shirt","haut_ml":"haut à manches longues","veste":"veste ou manteau léger","manteau_chaud":"manteau chaud","combi_ski":"combinaison de ski","habillage_pluie":"habillage pluie","cape_pluie":"cape de pluie","impermeable":"imperméable à capuche","capuche":"capuche ou parapluie"},"items_short":{"couche":"couche seule","body_leger":"body léger","body_mc":"body MC","body_ml":"body ML","tenue_ample_claire":"habits amples et clairs","tenue_legere":"tenue légère","pyjama_leger":"pyjama léger","pyjama":"pyjama","pyjama_chaud":"pyjama épais","gilet_fin":"gilet fin","gilet":"gilet","gilet_chaud":"gilet chaud","pull":"pull","combi_legere":"combi légère","combi_pilote":"combi pilote","combi_pilote_doublee":"combi doublée","bonnet_fin":"bonnet fin","bonnet":"bonnet","moufles":"moufles","chaussons":"chaussons","chapeau":"chapeau","chapeau_si_soleil":"chapeau si soleil","chanceliere":"chancelière","pantalon_leger":"pantalon léger","pantalon":"pantalon","pantalon_chaud":"pantalon chaud","chaussettes":"chaussettes","chaussettes_chaudes":"chaussettes chaudes","couverture_portage":"couverture de portage","manteau_portage":"manteau de portage","couverture_harnais":"couverture","tshirt":"t-shirt","haut_ml":"haut ML","veste":"veste","manteau_chaud":"manteau chaud","combi_ski":"combi de ski","habillage_pluie":"habillage pluie","cape_pluie":"cape de pluie","impermeable":"imperméable","capuche":"capuche"},"item_layers":{"couche":"peau","body_leger":"peau","body_mc":"peau","body_ml":"peau","tenue_ample_claire":"milieu","tenue_legere":"milieu","pyjama_leger":"milieu","pyjama":"milieu","pyjama_chaud":"milieu","pantalon_leger":"milieu","pantalon":"milieu","pantalon_chaud":"milieu","gilet_fin":"milieu","gilet":"milieu","gilet_chaud":"milieu","pull":"milieu","combi_legere":"dessus","combi_pilote":"dessus","combi_pilote_doublee":"dessus","couverture_portage":"dessus","manteau_portage":"dessus","couverture_harnais":"dessus","tshirt":"peau","haut_ml":"peau","veste":"dessus","manteau_chaud":"dessus","combi_ski":"dessus","habillage_pluie":"accessoire","cape_pluie":"accessoire","impermeable":"accessoire","capuche":"accessoire","bonnet_fin":"accessoire","bonnet":"accessoire","moufles":"accessoire","chaussons":"accessoire","chaussettes":"accessoire","chaussettes_chaudes":"accessoire","chapeau":"accessoire","chapeau_si_soleil":"accessoire","chanceliere":"accessoire"},"rain_gear":{"habillage_pluie":"l'habillage pluie","cape_pluie":"une cape de pluie","impermeable":"un imperméable à capuche","capuche":"une capuche ou un parapluie"},"item_hints":{"gilet_fin":"à emporter","chapeau_si_soleil":"si soleil","couverture_harnais":"par-dessus le harnais"},"bands":{"tres_chaud":"Très chaud","chaud":"Chaud","doux":"Doux","frais":"Frais","froid_modere":"Plutôt froid","froid":"Froid","tres_froid":"Très froid"},"slot_roles":{"peau":"La première couche, contre la peau","corps":"Bras, jambes et pieds, sous les couches chaudes","haut":"La couche chaude du haut, facile à enlever","dessus":"Par-dessus, contre le froid et le vent","tete":"Pour la tête","mains":"Pour les mains","pieds":"Pour les pieds","poussette":"Dans la poussette, jambes et pieds au chaud"},"swap_gaps":{"lighter":"un peu moins de chaleur","same":"même chaleur","warmer":"un peu plus de chaleur"},"swap_near":{"less":"même chaleur, mais ne couvre pas les jambes","more":"couvre aussi les jambes : plus de chaleur que conseillé"},"layers":{"peau":"Contre la peau","milieu":"Ensuite","dessus":"Par-dessus","accessoire":"Et aussi"},"categories":{"gigoteuse_hiver":"gigoteuse d'hiver (2 à 3,5 TOG)","gigoteuse_mi_saison":"gigoteuse de mi-saison (1 à 2 TOG)","gigoteuse_ete":"gigoteuse d'été (0,2 à 1 TOG)","combi_pilote":"combinaison pilote","manteau_hiver":"manteau chaud","accessoires_hiver":"bonnet, moufles et chaussons","chanceliere":"chancelière pour la poussette","habillage_pluie":"habillage pluie pour la poussette","chapeau_soleil":"chapeau à larges bords","vetements_longs_legers":"vêtements longs et légers","lunettes_soleil":"lunettes de soleil enveloppantes","creme_solaire_enfant":"crème solaire adaptée aux enfants","bodies":"bodies","hauts":"hauts","pantalons":"pantalons","pyjamas":"pyjamas","chaussettes":"paires de chaussettes","gilets_fins":"gilets fins","gilets":"gilets","gilets_chauds":"gilets chauds","pulls":"pulls"},"sleepbag_seasons":{"gigoteuse_hiver":"hiver","gigoteuse_mi_saison":"mi-saison","gigoteuse_ete":"été"},"reasons":{"nuits_fraiches":"nuits fraîches","nuits_chaudes":"nuits chaudes","nuits_douces":"nuits douces","froid":"froid","pluie":"pluie fréquente","soleil":"soleil","taille":"changement de taille","lessive":"pour tenir entre deux lessives","tenue":"pour ses tenues"},"vigilance_colors":{"jaune":"jaune","orange":"orange","rouge":"rouge"}}}};

// Dessins des vêtements, pour voir la tenue d'un coup d'œil. Une seule définition sert à l'app (SVG),
// au widget iPhone (Scriptable, DrawContext) et au widget Android (vector drawables générés par tools/make-drawings.js).
// Grille de 24 × 24, trait de DRAWING_STROKE. Chaque dessin est une liste de tracés :
// { d } contour, { d, fill: true } forme pleine, { c: [cx, cy, r] } cercle (plein si fill).
// Tracés en commandes absolues M, L, Q, C, Z seulement : le widget iPhone les relit lui-même.

const DRAWING_STROKE = 1.6;

const num = (v) => String(Math.round(v * 100) / 100);

function parsePath(d) {
  const tokens = d.match(/[MLQCZ]|-?\d*\.?\d+/g) ?? [];
  const segments = [];
  let i = 0;
  while (i < tokens.length) {
    const cmd = tokens[i++];
    const count = { M: 1, L: 1, Q: 2, C: 3, Z: 0 }[cmd];
    const pts = [];
    for (let k = 0; k < count; k++) {
      pts.push([Number(tokens[i]), Number(tokens[i + 1])]);
      i += 2;
    }
    segments.push({ cmd, pts });
  }
  return segments;
}

// Silhouette symétrique : demi-contour droit, du milieu haut au milieu bas, complété par son reflet.
function sym(half) {
  const segments = parsePath(half);
  const ends = segments.map((s) => s.pts.at(-1));
  const mirror = ([x, y]) => `${num(24 - x)} ${num(y)}`;
  let back = '';
  for (let k = segments.length - 1; k >= 1; k--) {
    const { cmd, pts } = segments[k];
    const to = mirror(ends[k - 1]);
    if (cmd === 'L') back += ` L${to}`;
    else if (cmd === 'Q') back += ` Q${mirror(pts[0])} ${to}`;
    else if (cmd === 'C') back += ` C${mirror(pts[1])} ${mirror(pts[0])} ${to}`;
  }
  return `${half}${back} Z`;
}

// Un détail et son reflet (piqûres de doudoune, boutons…).
const flip = (d) => d.replace(/(-?\d*\.?\d+) (-?\d*\.?\d+)/g, (all, x, y) => `${num(24 - Number(x))} ${y}`);
const pair = (d) => [{ d }, { d: flip(d) }];
const dot = (cx, cy, r = 0.6) => ({ c: [cx, cy, r], fill: true });
const dots = (cx, cy, r) => [dot(cx, cy, r), dot(24 - cx, cy, r)];

// Bas des bodies : ouvertures des jambes et entrejambe pressionné.
const BODY_BOTTOM = 'L17.2 14.6 C16.4 16.8 14.4 17.4 13.9 20.4 L12 20.4';
const SNAPS = dots(10.9, 19.2, 0.5);

const BODY_MC = [{ d: sym(`M12 5 Q13.7 5 14.6 3.6 L17.2 4.6 L20.6 7.7 L19 9.7 L17.2 8.5 ${BODY_BOTTOM}`) }, ...SNAPS];
const BODY_ML = [{ d: sym(`M12 5 Q13.7 5 14.6 3.6 L17.2 4.6 Q19.8 5.9 20.8 12.6 L19 13.1 L17.2 8.9 ${BODY_BOTTOM}`) }, ...SNAPS];
const BODY_SANS_MANCHES = [{ d: sym(`M12 6.6 Q14.3 6.6 14.6 3.6 L16.6 3.6 Q16.5 7.4 17.4 8.8 L17.4 14.6 C16.6 16.8 14.4 17.4 13.9 20.4 L12 20.4`) }, ...SNAPS];

// Couche seule (nuits très chaudes) : la ceinture et ses deux attaches.
const COUCHE = [{ d: sym('M12 6.2 L19.8 6.2 L19.8 8.6 C19.8 13 17.4 16.8 14.2 18.2 L12 18.2') }, { d: 'M4.2 8.6 L19.8 8.6' }, ...dots(17.8, 7.4, 0.5)];

const PYJAMA_OUTLINE = sym('M12 4.2 Q13.5 4.2 14.2 2.8 L16.7 3.6 Q19.4 4.9 20.4 11.1 L18.6 11.6 L16.9 7.8 L16.9 18.4 '
  + 'C18.3 18.6 19 19.4 18.8 20.3 C18.6 21.1 17.8 21.4 16.7 21.4 L13.6 21.4 C13.1 21.4 12.8 21.1 12.8 20.6 '
  + 'L12.8 15 C12.8 14.4 12.5 14.1 12 14.1');
const PYJAMA = [{ d: PYJAMA_OUTLINE }, { d: 'M12 4.2 L12 12.6' }];
const PYJAMA_CHAUD = [...PYJAMA, ...pair('M8.8 8.8 L10.7 8.8'), ...pair('M8.8 11.4 L10.7 11.4'), ...pair('M8.6 16.6 L10.4 16.6')];

const PANTALON = [
  { d: sym('M12 3.4 L16.8 3.4 L17.8 20.4 L13.6 20.6 L12 9.6') },
  { d: 'M7.1 5.8 L16.9 5.8' },
];
const PANTALON_CHAUD = [...PANTALON, ...pair('M7.9 12 L10.5 12'), ...pair('M7.7 16 L10.2 16')];

const CHAUSSETTE = [
  { d: 'M9.4 3 L14.6 3 L14.6 12.8 C14.6 14 15.2 14.9 16.2 15.7 L18.8 17.8 C20.3 19 19.9 20.8 18.8 21.4 C17.8 22 16.8 21.6 16 21 L10.6 16.6 C9.8 15.9 9.4 15 9.4 13.8 Z' },
  { d: 'M9.4 5.8 L14.6 5.8' },
];
const CHAUSSETTE_CHAUDE = [...CHAUSSETTE, { d: 'M10.9 9.2 L13.1 9.2' }, { d: 'M10.9 12 L13.1 12' }];

const GILET_OUTLINE = sym('M12 10.4 L14.4 3.6 L17 4.6 Q19.6 5.9 20.6 12.6 L18.8 13.1 L17 8.9 L17 20.4 L12 20.4');
const GILET = [{ d: GILET_OUTLINE }, { d: 'M12 10.4 L12 20.4' }, dot(13.4, 13), dot(13.4, 16.6)];
const GILET_CHAUD = [{ d: GILET_OUTLINE }, { d: 'M12 10.4 L12 20.4' }, ...pair('M8.3 13 L10.6 13'), ...pair('M8.3 16.6 L10.6 16.6')];

const PULL = [
  { d: sym('M12 5.2 Q13.7 5.2 14.6 3.6 L17 4.6 Q19.6 5.9 20.6 12.6 L18.8 13.1 L17.2 9 L17.2 18.8 Q17.2 20.4 15.6 20.4 L12 20.4') },
  { d: 'M6.8 17.6 L17.2 17.6' },
  ...pair('M18.5 11.6 L20.4 11.1'),
];

const HAUT_ML = [{ d: sym('M12 4.8 Q13.5 4.8 14.3 3.3 L16.9 4.2 Q19.6 5.6 20.6 12.6 L18.8 13.1 L17 8.8 L17 20.2 L12 20.2') }];
const TSHIRT = [{ d: sym('M12 4.8 Q13.5 4.8 14.3 3.3 L16.9 4.2 L20.4 7.7 L18.8 9.7 L17 8.5 L17 20.2 L12 20.2') }];
const TUNIQUE = [{ d: sym('M12 4.6 Q13.5 4.6 14.3 3.2 L17.2 4.2 L20.6 8.6 L18.7 10.3 L17 8.9 L19.2 20.2 L12 20.2') }];
const TENUE_LEGERE = [
  { d: sym('M12 4.3 Q13.4 4.3 14.2 3 L16.8 3.9 L19.4 6.6 L17.9 8.2 L16.6 7.2 L16.6 11 L12 11') },
  { d: sym('M12 12.8 L16.6 12.8 L17.3 20.2 L13.4 20.6 L12 16.6') },
];

const COMBI_OUTLINE = sym('M12 2.4 C14.7 2.4 16.3 4.1 16.3 7.2 L16.8 8 Q19.8 9.3 20.6 15.6 L18.8 16.1 L17.1 12.4 L17.1 20.6 '
  + 'C17.1 21.1 16.8 21.4 16.3 21.4 L13.5 21.4 C13 21.4 12.8 21.1 12.8 20.6 L12.8 17.2 C12.8 16.6 12.5 16.3 12 16.3');
const VISAGE = 'M12 4.4 C13.5 4.4 14.3 5.3 14.3 6.7 C14.3 8.1 13.5 8.9 12 8.9 C10.5 8.9 9.7 8.1 9.7 6.7 C9.7 5.3 10.5 4.4 12 4.4 Z';
const COMBI = [{ d: COMBI_OUTLINE }, { d: VISAGE }, { d: 'M12 8.9 L12 15.2' }];
const COMBI_CHAUDE = [...COMBI, ...pair('M8.5 11.4 L10.6 11.4'), ...pair('M8.5 14 L10.6 14'), ...pair('M8.6 18.8 L10.5 18.8')];
// Doublée : un flocon en plus, pour le grand froid.
const FLOCON = [{ d: 'M19.8 1.6 L19.8 5.6' }, { d: 'M18.07 2.6 L21.53 4.6' }, { d: 'M18.07 4.6 L21.53 2.6' }];
const COMBI_DOUBLEE = [...COMBI_CHAUDE, ...FLOCON];

const MANTEAU_FORME = [
  { d: sym('M12 2.6 C14.6 2.6 16 4.2 16 7 L17.4 7.8 Q20 9.1 20.8 15.6 L19 16.1 L17.5 12.4 L18 21 L12 21') },
  { d: 'M9.6 7.6 C9.6 5.4 10.6 4.4 12 4.4 C13.4 4.4 14.4 5.4 14.4 7.6' },
  { d: 'M12 7.6 L12 21' },
];
const MANTEAU = [...MANTEAU_FORME, dot(13.4, 12.2), dot(13.4, 16.2)];
// Gouttes de pluie, en haut à droite.
const GOUTTES = [{ d: 'M20.6 1.6 L20 3.2' }, { d: 'M22.6 4.6 L22 6.2' }];
const IMPERMEABLE = [...MANTEAU, ...GOUTTES];
const CAPE_PLUIE = [
  { d: sym('M12 2.6 C14.5 2.6 15.8 4.2 15.8 6.6 L20.2 18.4 Q20.6 20.4 18.6 20.4 L12 20.4') },
  { d: 'M12 4.4 C13.3 4.4 14 5.3 14 6.6 C14 7.9 13.3 8.6 12 8.6 C10.7 8.6 10 7.9 10 6.6 C10 5.3 10.7 4.4 12 4.4 Z' },
  ...GOUTTES,
];
const MANTEAU_CHAUD = [...MANTEAU_FORME, ...pair('M8.4 11.4 L10.6 11.4'), ...pair('M8.2 14.8 L10.6 14.8'), ...pair('M8 18.2 L10.6 18.2')];

const COUVERTURE = [
  { d: 'M6 4 L18 4 Q20 4 20 6 L20 18 Q20 20 18 20 L6 20 Q4 20 4 18 L4 6 Q4 4 6 4 Z' },
  { d: 'M4 9.4 L20 9.4' },
  { d: 'M4 14.6 L20 14.6' },
  { d: 'M9.4 4 L9.4 20' },
  { d: 'M14.6 4 L14.6 20' },
];

const BONNET_FORME = sym('M12 6.6 C15.6 6.6 17.8 9.5 17.8 14 L18.4 14 Q19 14 19 14.6 L19 17.8 Q19 18.4 18.4 18.4 L12 18.4');
const BONNET_FIN = [{ d: BONNET_FORME }, { d: 'M5 14 L19 14' }];
const BONNET = [...BONNET_FIN, { c: [12, 4.6, 2] }, { d: 'M9 15.4 L9 17' }, { d: 'M12 15.4 L12 17' }, { d: 'M15 15.4 L15 17' }];

const MOUFLES = [
  { d: 'M9 21 L9 15.4 C7.4 14.6 5.6 13.2 5.3 11.6 C5 10 6.5 9.4 7.6 10.5 L9 11.9 L9 8.2 C9 5 11 3.4 13.2 3.4 '
    + 'C15.4 3.4 17.4 5 17.4 8.2 L17.4 21 Z' },
  { d: 'M9 18 L17.4 18' },
];

const CHAUSSONS = [
  { d: 'M6 4.6 L13.4 4.6 L13.4 11.4 C13.4 12.6 14.1 13.2 15.2 13.4 L17.4 13.8 C19.6 14.2 20.6 15.7 20.6 17.5 '
    + 'C20.6 19.5 19.4 20.6 17.4 20.6 L7.4 20.6 C6.6 20.6 6 20 6 19.2 Z' },
  { d: 'M6 7.6 L13.4 7.6' },
];

const CHAPEAU = [
  { d: 'M7.4 13.2 C7.4 7.8 9.4 5.6 12 5.6 C14.6 5.6 16.6 7.8 16.6 13.2' },
  { d: 'M2.6 14.4 Q12 10.2 21.4 14.4 Q12 18.6 2.6 14.4 Z' },
  { d: 'M7.6 10.6 Q12 11.8 16.4 10.6' },
];
const CHAPEAU_SOLEIL = [
  ...CHAPEAU,
  { c: [19.4, 4.4, 1.5] },
  { d: 'M19.4 1.4 L19.4 1.9' }, { d: 'M22.4 4.4 L21.9 4.4' }, { d: 'M16.4 4.4 L16.9 4.4' }, { d: 'M19.4 7.4 L19.4 6.9' },
];

const POUSSETTE = [
  { d: 'M4 10.6 L20 10.6 C20 14.4 17.6 16.6 14 16.6 L10 16.6 C6.4 16.6 4 14.4 4 10.6 Z' },
  { d: 'M4.4 10.6 C4.4 6.2 7.6 3.6 12 3.6 L12 10.6' },
  { d: 'M20 10.6 L20.8 5.6 L22 5.6' },
  { c: [7.6, 19.4, 1.6] },
  { c: [16.4, 19.4, 1.6] },
];
const CHANCELIERE = [...POUSSETTE, { d: 'M7 13.2 L17 13.2' }];
const HABILLAGE_PLUIE = [...POUSSETTE, { d: 'M15 3.2 L14.4 4.8' }, { d: 'M18 3.2 L17.4 4.8' }, { d: 'M16.5 6 L15.9 7.6' }];

const GIGOTEUSE_OUTLINE = sym('M12 5.2 Q13.5 5.2 14.2 3.6 L15.8 3.6 Q16 6.4 17.8 7.6 Q18.7 13.4 18.4 18.2 Q18.2 21.2 15.4 21.2 L12 21.2');
const GIGOTEUSE = [{ d: GIGOTEUSE_OUTLINE }, { d: 'M12 5.2 L12 18.4' }];
const GIGOTEUSE_CHAUDE = [...GIGOTEUSE, ...pair('M8.4 10.6 L10.6 10.6'), ...pair('M8 14 L10.6 14'), ...pair('M8.2 17.4 L10.6 17.4')];

const LUNETTES = [
  ...pair('M3.4 9.4 L10.4 9.4 L10 13.4 C9.7 15.4 8.6 16 7 16 C5.4 16 4.1 15.4 3.8 13.4 Z').map((p) => ({ ...p, fill: true })),
  { d: 'M10.4 10.2 Q12 9 13.6 10.2' },
  ...pair('M3.4 9.4 L2.2 8.4'),
];

const CREME = [
  { d: 'M8 3.4 L16 3.4 L15 15.4 L13.8 15.4 L13.8 17.6 L14.6 17.6 L14.6 20.6 L9.4 20.6 L9.4 17.6 L10.2 17.6 L10.2 15.4 L9 15.4 Z' },
  { c: [12, 8.4, 1.8] },
];

const DRAWINGS = {
  body_mc: BODY_MC,
  body_ml: BODY_ML,
  body_sans_manches: BODY_SANS_MANCHES,
  couche: COUCHE,
  tunique: TUNIQUE,
  tenue_legere: TENUE_LEGERE,
  haut_ml: HAUT_ML,
  tshirt: TSHIRT,
  pyjama: PYJAMA,
  pyjama_chaud: PYJAMA_CHAUD,
  pantalon: PANTALON,
  pantalon_chaud: PANTALON_CHAUD,
  chaussettes: CHAUSSETTE,
  chaussettes_chaudes: CHAUSSETTE_CHAUDE,
  gilet: GILET,
  gilet_chaud: GILET_CHAUD,
  pull: PULL,
  combi: COMBI,
  combi_chaude: COMBI_CHAUDE,
  combi_doublee: COMBI_DOUBLEE,
  manteau: MANTEAU,
  manteau_chaud: MANTEAU_CHAUD,
  impermeable: IMPERMEABLE,
  cape_pluie: CAPE_PLUIE,
  couverture: COUVERTURE,
  bonnet_fin: BONNET_FIN,
  bonnet: BONNET,
  moufles: MOUFLES,
  chaussons: CHAUSSONS,
  chapeau: CHAPEAU,
  chapeau_soleil: CHAPEAU_SOLEIL,
  chanceliere: CHANCELIERE,
  habillage_pluie: HABILLAGE_PLUIE,
  gigoteuse: GIGOTEUSE,
  gigoteuse_chaude: GIGOTEUSE_CHAUDE,
  lunettes: LUNETTES,
  creme: CREME,
};

// Vêtement de la tenue → dessin. Les variantes chaudes portent des piqûres de doudoune.
const ITEM_DRAWINGS = {
  couche: 'couche',
  body_leger: 'body_sans_manches',
  body_mc: 'body_mc',
  body_ml: 'body_ml',
  tenue_ample_claire: 'tunique',
  tenue_legere: 'tenue_legere',
  pyjama_leger: 'pyjama',
  pyjama: 'pyjama',
  pyjama_chaud: 'pyjama_chaud',
  pantalon_leger: 'pantalon',
  pantalon: 'pantalon',
  pantalon_chaud: 'pantalon_chaud',
  chaussettes: 'chaussettes',
  chaussettes_chaudes: 'chaussettes_chaudes',
  gilet_fin: 'gilet',
  gilet: 'gilet',
  gilet_chaud: 'gilet_chaud',
  pull: 'pull',
  combi_legere: 'combi',
  combi_pilote: 'combi_chaude',
  combi_pilote_doublee: 'combi_doublee',
  couverture_portage: 'couverture',
  manteau_portage: 'manteau',
  couverture_harnais: 'couverture',
  // Enfants de 2 ans et plus.
  tshirt: 'tshirt',
  haut_ml: 'haut_ml',
  veste: 'manteau',
  manteau_chaud: 'manteau_chaud',
  combi_ski: 'combi_doublee',
  // Protection contre la pluie, selon le mode de sortie.
  habillage_pluie: 'habillage_pluie',
  cape_pluie: 'cape_pluie',
  impermeable: 'impermeable',
  capuche: 'impermeable',
  bonnet_fin: 'bonnet_fin',
  bonnet: 'bonnet',
  moufles: 'moufles',
  chaussons: 'chaussons',
  chapeau: 'chapeau',
  chapeau_si_soleil: 'chapeau_soleil',
  chanceliere: 'chanceliere',
};

// Achat à prévoir → dessin.
const CATEGORY_DRAWINGS = {
  gigoteuse_hiver: 'gigoteuse_chaude',
  gigoteuse_mi_saison: 'gigoteuse',
  gigoteuse_ete: 'gigoteuse',
  combi_pilote: 'combi_chaude',
  manteau_hiver: 'manteau_chaud',
  accessoires_hiver: 'bonnet',
  chanceliere: 'chanceliere',
  habillage_pluie: 'habillage_pluie',
  chapeau_soleil: 'chapeau',
  vetements_longs_legers: 'haut_ml',
  lunettes_soleil: 'lunettes',
  creme_solaire_enfant: 'creme',
  bodies: 'body_ml',
  hauts: 'haut_ml',
  pantalons: 'pantalon',
  pyjamas: 'pyjama',
  chaussettes: 'chaussettes',
  gilets_fins: 'gilet',
  gilets: 'gilet',
  gilets_chauds: 'gilet_chaud',
  pulls: 'pull',
};

// Dessin au format SVG (app web).
function drawingSvg(id, { size = 32, label = '' } = {}) {
  const parts = DRAWINGS[id];
  if (!parts) return '';
  const body = parts.map((p) => (p.c
    ? `<circle cx="${p.c[0]}" cy="${p.c[1]}" r="${p.c[2]}"${p.fill ? ' fill="currentColor" stroke="none"' : ''}/>`
    : `<path d="${p.d}"${p.fill ? ' fill="currentColor"' : ''}/>`)).join('');
  const a11y = label ? ` role="img" aria-label="${label.replace(/"/g, '&quot;')}"` : ' aria-hidden="true"';
  return `<svg class="drawing" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" `
    + `stroke-width="${DRAWING_STROKE}" stroke-linecap="round" stroke-linejoin="round"${a11y}>${body}</svg>`;
}


// Moteur des règles v0 : fonctions pures, sans dépendance extérieure.
// Le même fichier tourne dans l'app web, dans le widget iPhone (Scriptable) et dans les tests Node.
// Il sert de spécification aux futurs portages Swift et Kotlin.

const VIGILANCE_COLORS = ['vert', 'jaune', 'orange', 'rouge'];
const colorRank = (color) => VIGILANCE_COLORS.indexOf(color);

const toMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const fmtMin = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
// « 10:00 » devient « 10 h », « 10:30 » devient « 10 h 30 ».
const hourFr = (hhmm) => (hhmm.endsWith(':00') ? `${Number(hhmm.slice(0, 2))} h` : `${Number(hhmm.slice(0, 2))} h ${hhmm.slice(3, 5)}`);
const capitalize = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
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

// Pourquoi le meilleur créneau : ce qui le place devant les autres heures de jour qui restent, cause par cause,
// les plus nettes d'abord (outing.why.max_reasons). Une heure écartée compte pour sa seule cause (pluie, rafales…) ;
// sinon, seuls les écarts d'au moins min_gain points, et le soleil à partir de l'indice UV des repères (3).
// Sans écart, le temps est le même : le plus tôt l'emporte. Les mots qui qualifient le créneau (« doux ») passent devant.
// Chaque raison : { id du message, hour } (l'heure de comparaison, ou celle où commence la pluie qu'on évite).
const EXCLUDED_CAUSE = { pluie: 'pluie', vent: 'vent', froid_extreme: 'froid', canicule_heures_chaudes: 'chaleur', ozone_apres_midi: 'ozone' };
const WHY_ORDER = ['pluie', 'froid', 'chaleur', 'vent', 'uv', 'ozone'];
const WHY_FIRST = ['outing.why.froid.doux', 'outing.why.froid.max', 'outing.why.chaleur.max'];
function bestWhy(run, others, R) {
  if (!others.length) return [{ id: 'outing.why.seul' }];
  const cfg = R.outing;
  const W = cfg.why;
  const own = Object.fromEntries(Object.keys(run[0].penalty).map((c) => [c, Math.max(...run.map((sl) => sl.penalty[c]))]));
  const causes = new Map();
  for (const sl of others) {
    const excluded = [...new Set(sl.reasons.map((r) => EXCLUDED_CAUSE[r]).filter(Boolean))];
    const gains = excluded.length
      ? excluded.map((c) => [c, cfg.scoring.base])
      : Object.entries(sl.penalty).map(([c, p]) => [c, p - own[c]])
        .filter(([c, g]) => g >= W.min_gain && (c !== 'uv' || sl.uv >= R.relay_triggers.uv_at_least));
    for (const [c, g] of gains) {
      if (!causes.has(c)) causes.set(c, { cause: c, gain: 0, gap: 0, worst: null, excluded: [] });
      const k = causes.get(c);
      k.gain += g;
      if (g > k.gap) Object.assign(k, { gap: g, worst: sl });
      if (excluded.includes(c)) k.excluded.push(sl);
    }
  }
  const top = [...causes.values()]
    .sort((a, b) => b.gain - a.gain || WHY_ORDER.indexOf(a.cause) - WHY_ORDER.indexOf(b.cause))
    .slice(0, W.max_reasons);
  if (!top.length) return [{ id: 'outing.why.egal' }];
  const start = run[0].start;
  const feels = mean(run.map((sl) => sl.feels_c));
  return top.map((k) => {
    const before = k.excluded.filter((sl) => sl.start < start);
    const after = k.excluded.filter((sl) => sl.start > start);
    const worst = { hour: fmtMin(k.worst.start) };
    // Pluie, rafales ou fortes chaleurs écartées : avant, après, ou entre deux ; sinon, moins qu'à l'heure la plus touchée.
    const around = (id, between) => {
      if (after.length && !before.length) return { id: `outing.why.${id}.avant`, hour: fmtMin(after[0].start) };
      if (before.length && !after.length) return { id: `outing.why.${id}.apres` };
      return before.length && between ? { id: `outing.why.${id}.entre` } : { id: `outing.why.${id}.moins`, ...worst };
    };
    if (k.cause === 'pluie') return around('pluie', true);
    if (k.cause === 'vent') return around('vent', false);
    if (k.cause === 'chaleur') {
      if (k.excluded.length) return around('chaleur', false);
      return feels <= Math.min(...others.map((sl) => sl.feels_c)) + 0.5 ? { id: 'outing.why.chaleur.max' } : { id: 'outing.why.chaleur.moins', ...worst };
    }
    if (k.cause === 'froid') {
      if (own.froid === 0) return { id: 'outing.why.froid.doux' };
      return feels >= Math.max(...others.map((sl) => sl.feels_c)) - 0.5 ? { id: 'outing.why.froid.max' } : { id: 'outing.why.froid.moins', ...worst };
    }
    if (k.cause === 'uv') return { id: 'outing.why.uv.moins', ...worst };
    return { id: 'outing.why.ozone' };
  }).sort((a, b) => WHY_FIRST.includes(b.id) - WHY_FIRST.includes(a.id));
}

function planOuting(input, R, age) {
  const cfg = R.outing;
  const s = cfg.scoring;
  const x = cfg.slot_exclusions;
  const window0 = input.profile.outing_window ?? cfg.default_window;
  const duration = input.profile.outing_duration_h ?? cfg.default_duration_h;
  // On ne propose que des heures à venir : la plage commence au plus tôt à l'heure pleine suivante.
  const nextHour = input.now ? Math.ceil(toMin(input.now) / 60) * 60 : 0;
  const plage = { from: fmtMin(Math.max(toMin(window0.from), Math.min(nextHour, 24 * 60 - 60))), to: window0.to };
  const dayOver = toMin(plage.from) + duration * 60 > toMin(plage.to);
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
  // Ce que chaque cause retire au score d'une heure : la pluie, le froid, la chaleur, le vent, le soleil (UV).
  const penalties = (h) => ({
    pluie: Math.max(0, h.precip_prob - s.rain_prob_free) * s.rain_prob_weight,
    froid: Math.max(0, s.comfort_low_c - h.feels_c) * s.comfort_low_weight,
    chaleur: Math.max(0, h.feels_c - s.comfort_high_c) * s.comfort_high_weight,
    vent: Math.max(0, h.gust_kmh - s.gust_free_kmh) * s.gust_weight,
    uv: Math.max(0, h.uv - s.uv_free) * uvWeight,
  });

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
    const penalty = penalties(h);
    const score = s.base - penalty.pluie - penalty.froid - penalty.chaleur - penalty.vent - penalty.uv;
    return { ...h, start, end, reasons, penalty, score: round1(score) };
  });

  const byStart = new Map(slots.map((sl) => [sl.start, sl]));
  const runs = [];
  if (!blocking.length) {
    for (const first of slots) {
      const run = [];
      for (let k = 0; k < duration; k++) {
        const sl = byStart.get(first.start + k * 60);
        if (!sl || sl.reasons.length) break;
        run.push(sl);
      }
      if (run.length === duration) runs.push({ run, score: Math.min(...run.map((sl) => sl.score)) });
    }
  }
  // Le meilleur créneau (le premier à score égal), puis jusqu'à deux autres, séparés d'au moins une heure, par ordre chronologique.
  const picked = [];
  for (const r of [...runs].sort((a, b) => b.score - a.score)) {
    if (picked.length === 3) break;
    const start = r.run[0].start;
    const end = r.run.at(-1).end;
    if (picked.every((p) => end + 60 <= p.run[0].start || start >= p.run.at(-1).end + 60)) picked.push(r);
  }
  const best = picked[0] ?? null;

  const daySlots = slots.filter((sl) => !sl.reasons.includes('hors_plage') && !sl.reasons.includes('hors_jour'));
  let reason = null;
  if (!best) {
    if (blocking.length) reason = 'vigilance';
    else if (dayOver) reason = 'journee_terminee';
    else if (!daySlots.length) reason = 'hors_jour';
    else {
      const counts = {};
      for (const sl of daySlots) for (const r of sl.reasons) counts[r] = (counts[r] ?? 0) + 1;
      const ranked = cfg.none_reason_priority.filter((r) => counts[r]).sort((a, b) => counts[b] - counts[a]);
      reason = ranked[0] ?? 'duree';
    }
  }

  const describe = (r) => ({
    start: fmtMin(r.run[0].start),
    end: fmtMin(r.run.at(-1).end),
    score: r.score,
    feels_c: round1(mean(r.run.map((sl) => sl.feels_c))),
    precip_prob_max: Math.max(...r.run.map((sl) => sl.precip_prob)),
    uv_max: Math.max(...r.run.map((sl) => sl.uv)),
    gust_max: Math.max(...r.run.map((sl) => sl.gust_kmh)),
  });
  const why = best && bestWhy(best.run, daySlots.filter((sl) => !best.run.includes(sl)), R);
  const window = best && { ...describe(best), why };
  const windows = picked.map((r) => ({ ...describe(r), best: r === best, ...(r === best ? { why } : {}) })).sort((a, b) => toMin(a.start) - toMin(b.start));
  const inPlage = slots.filter((sl) => !sl.reasons.includes('hors_plage'));
  const refSlots = best ? best.run : inPlage.slice(0, 1);
  return { window, windows, reason, blocking, heat, ozone, slots, inPlage, daySlots, refSlots, plage };
}

// Mode de sortie retenu : un mode réservé aux plus grands (à pied) redevient la poussette avant l'âge prévu.
// En poussette, avec une chancelière notée dans la garde-robe (ou signalée par la configuration d'un widget,
// stroller_muff) : la chancelière remplace la combinaison, avant 2 ans (outfit.transport.poussette_chanceliere).
function transportFor(profile, age, R) {
  const t = R.outfit.transport[profile.transport];
  const mode = t && !(t.min_age_m && age < t.min_age_m) && !t.base ? profile.transport : 'poussette';
  const muff = R.outfit.transport.poussette_chanceliere;
  const hasMuff = profile.stroller_muff ?? (profile.inventory?.chanceliere ?? []).length > 0;
  return mode === 'poussette' && muff && hasMuff && !(muff.max_age_m && age >= muff.max_age_m) ? 'poussette_chanceliere' : mode;
}
// Le mode choisi par le parent, sans ses variantes (« poussette » pour la poussette avec chancelière).
const baseTransport = (mode, R) => R.outfit.transport[mode]?.base ?? mode;

// Tenues propres à un âge (à partir de 2 ans : haut et pantalon plutôt que body et pyjama, manteau plutôt que combinaison).
const ageVariant = (R, age) => (R.outfit.age_variants ?? []).filter((v) => age >= v.from_months).at(-1) ?? null;

// Style de la journée choisi pour l'enfant (« sans pyjama » : l'équivalent du pyjama en vêtements de jour, un haut,
// un pantalon et des chaussettes, dehors comme à la maison). Il couvre autant que le pyjama (contrôlé par lint) ;
// la nuit n'est pas concernée.
// Sans choix fait, le style par défaut des règles (« sans pyjama ») ; « pyjama » garde la tenue d'origine.
const dayStyleId = (R, profile) => profile.day_style ?? R.outfit.default_day_style ?? null;
const dayStyle = (R, profile) => R.outfit.day_styles?.[dayStyleId(R, profile)] ?? null;
const styled = (items, style) => (style ? [...new Set(items.flatMap((item) => style.replace_items[item] ?? [item]))] : items);

// Vêtements d'une tranche, pour un âge et un mode de sortie. Certains modes remplacent des vêtements
// (porte-bébé : pas de pyjama à pieds ni de combinaison ; voiture : couverture par-dessus le harnais).
function bandItems(idx, mode, variant, R, style = null) {
  const band = R.outfit.bands[idx];
  const t = R.outfit.transport[mode];
  const items = (variant?.bands[band.id] ?? band.items).flatMap((item) => t.replace_items?.[item] ?? [item]);
  return styled([...new Set(items)].filter((item) => !t.remove_items.includes(item)), style);
}

// Tranche portée pour un ressenti : celle du ressenti, décalée par la tendance et par le mode de sortie.
function wornBand(feels, profile, R, mode) {
  const bands = R.outfit.bands;
  const base = bandIndex(bands, feels);
  const idx = clamp(base + (profile.outfit_offset ?? 0) + R.outfit.transport[mode].band_shift, 0, bands.length - 1);
  return { base, idx };
}

function chooseOutfit(feels, profile, R, age) {
  const mode = transportFor(profile, age, R);
  const { base, idx } = wornBand(feels, profile, R, mode);
  return {
    band: R.outfit.bands[idx].id,
    base_band: R.outfit.bands[base].id,
    feels_c: feels,
    transport: mode,
    items: bandItems(idx, mode, ageVariant(R, age), R, dayStyle(R, profile)),
    notes: [...R.outfit.transport[mode].notes],
  };
}

// Rappels de pluie et de vent. La protection contre la pluie suit le mode de sortie (habillage, cape, imperméable) ;
// l'habillage de la poussette retient la chaleur : par temps chaud, seulement le temps de l'averse.
function addOverlays(outfit, plan, ref, R, params, labels) {
  const ov = R.outfit.overlays;
  const gear = R.outfit.transport[outfit.transport].rain_gear;
  const setGear = () => {
    params.gear = labels.rain_gear[gear];
    params.gear_short = labels.items_short[gear];
  };
  if (ref.some((sl) => sl.precip_prob >= ov.rain_cover_prob_at_least)) {
    const warm = gear === 'habillage_pluie' && outfit.feels_c >= ov.rain_cover_warm_feels_c_at_least;
    outfit.notes.push(warm ? 'practical.rain.cover_warm' : 'practical.rain.cover');
    setGear();
  } else if (ref.length) {
    const after = ref.at(-1).end;
    const later = plan.slots.find(
      (sl) => sl.start >= after && sl.start < toMin(plan.plage.to) && sl.precip_prob >= ov.rain_later_prob_at_least,
    );
    if (later) {
      outfit.notes.push('practical.rain.later');
      params.hour = fmtMin(later.start);
      setGear();
    }
  }
  if (ref.some((sl) => sl.gust_kmh >= ov.wind_gust_kmh_at_least)) outfit.notes.push('practical.wind');
}

function dayRelays(input, R, age, plan, outfit, params) {
  const rt = R.relay_triggers;
  const mode = transportFor(input.profile, age, R);
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
  if (outfit && mode === 'porte_bebe' && (coldVigilance || outfit.feels_c <= rt.carrier_cold_feels_c_at_most)) {
    relays.push('relay.cold.stroller_rather_than_carrier');
  }
  if (outfit && mode === 'voiture' && rt.car_coat_bands.includes(outfit.base_band)) relays.push('relay.car.coat');
  const uvDay = plan.daySlots.length ? Math.max(...plan.daySlots.map((sl) => sl.uv)) : 0;
  if (uvDay >= rt.uv_at_least) {
    params.uv = round1(uvDay);
    if (age < rt.under_1y_months) relays.push('relay.sun.under_1y', 'relay.sun.hours');
    else relays.push('relay.sun.hours', 'relay.sun.protect');
  }
  if (input.alerts?.air?.episode) relays.push(plan.ozone ? 'relay.air.ozone' : 'relay.air.particles');
  return sortByPriority(relays, R.relay_priority);
}

// ——— La journée en couches ———
// Habillé une fois le matin pour la journée dehors : au plus deux changements (« − » on enlève, « + » on remet),
// seulement quand la tranche de ressenti change pour au moins deux heures, et un sac de trois objets au plus.

const slotOf = (J, item) => Object.keys(J.slots).find((slot) => J.slots[slot].includes(item)) ?? null;

// Découpe la journée en au plus trois périodes d'au moins min_hold_h heures, chacune avec sa tranche :
// une heure trop couverte pèse plus qu'une heure pas assez couverte (une couche de moins, et elle est dans le sac),
// chaque changement coûte, et à coût égal on garde le moins de changements. Au départ du matin, jamais trop peu couvert.
function segmentDay(needs, J) {
  const n = needs.length;
  const segment = (from, to) => {
    const part = needs.slice(from, to);
    let best = null;
    for (let band = from === 0 ? part[0] : Math.min(...part); band <= Math.max(...part); band++) {
      const cost = part.reduce((sum, need) => sum + (band > need ? J.over_weight * (band - need) : J.under_weight * (need - band)), 0);
      if (!best || cost < best.cost - 1e-9) best = { from, to, band, cost };
    }
    return best;
  };
  const hold = J.min_hold_h;
  const cuts = [[]];
  for (let k1 = hold; k1 <= n - hold; k1++) cuts.push([k1]);
  if (J.max_changes >= 2) {
    for (let k1 = hold; k1 <= n - hold; k1++) for (let k2 = k1 + hold; k2 <= n - hold; k2++) cuts.push([k1, k2]);
  }
  let best = null;
  for (const cut of cuts) {
    const bounds = [0, ...cut, n];
    const segs = cut.concat(n).map((to, i) => segment(bounds[i], to));
    if (segs.some((sg, i) => i > 0 && sg.band === segs[i - 1].band)) continue;
    const total = segs.reduce((sum, sg) => sum + sg.cost, 0) + J.change_cost * cut.length;
    if (!best || total < best.total - 1e-9) best = { segs, total };
  }
  return best.segs;
}

function planJournee(input, R, age, plan) {
  const J = R.journee;
  const { profile } = input;
  const bands = R.outfit.bands;
  const mode = transportFor(profile, age, R);
  const t = R.outfit.transport[mode];
  const variant = ageVariant(R, age);
  const style = dayStyle(R, profile);
  const win = profile.outing_window ?? R.outing.default_window;
  const hours = plan.slots.filter((sl) => sl.start >= toMin(win.from) && sl.end <= toMin(win.to));
  if (!hours.length) return null;
  const needs = hours.map((sl) => wornBand(sl.feels_c, profile, R, mode).idx);
  const segs = segmentDay(needs, J);
  const b0 = segs[0].band;
  const isFixed = (item) => J.fixed_slots.includes(slotOf(J, item));
  const layers = (idx) => new Map(bandItems(idx, mode, variant, R, style).filter((i) => !isFixed(i)).map((i) => [slotOf(J, i), i]));

  // Body et pyjama (ou haut et pantalon) ne changent pas dans la journée : ceux de la période la plus douce,
  // au plus base_max_drop tranche sous ceux du matin (deux sous une combinaison, qui couvre tout).
  // La chaleur du matin vient des couches qu'on enlève. Après 2 ans, le pantalon du matin reste : le manteau ne couvre pas les jambes.
  const worn = layers(b0);
  const drop = variant?.base_max_drop ?? (worn.has('dessus') ? J.base_max_drop_under_dessus : J.base_max_drop);
  const baseIdx = Math.max(Math.min(...segs.map((sg) => sg.band)), b0 - drop);
  const base = bandItems(baseIdx, mode, variant, R, style).filter(isFixed);
  const morning = [...base, ...worn.values()];

  // Changements. Tête, mains et pieds suivent la tranche : bonnet, moufles, chaussons et chancelière restent tant
  // qu'elle les demande (au soleil, le bonnet devient un chapeau). Combinaison, pull et gilet suivent la chaleur
  // des vêtements (journee.warmth), avec le même équilibre que le découpage : trop couvert pèse plus que pas assez.
  // En se réchauffant, on enlève la combinaison, puis le pull (ou il devient un gilet), sans trop découvrir ;
  // en se refroidissant, on remet des couches, d'abord celles enlevées plus tôt, qu'on a sous la main.
  const warmthOf = (items) => items.reduce((sum, item) => sum + (J.warmth[item] ?? 0), 0);
  const w = (item) => J.warmth[item] ?? 0;
  const sun = (item) => J.sun_hats.includes(item);
  const removed = new Map();
  const states = [new Map(worn)];
  const changes = segs.slice(1).map((sg, i) => {
    const warmer = sg.band < segs[i].band;
    const target = layers(sg.band);
    const goal = warmthOf(bandItems(sg.band, mode, variant, R, style));
    const cost = (heat) => (heat > goal ? J.over_weight * (heat - goal) : J.under_weight * (goal - heat));
    const allowed = (heat) => heat >= goal - J.warmth_under_tolerance;
    let heat = warmthOf([...base, ...worn.values()]);
    const remove = [];
    const add = [];
    const take = (slot) => {
      const c = worn.get(slot);
      remove.push(c);
      removed.set(slot, c);
      worn.delete(slot);
      heat -= w(c);
    };
    const put = (slot, item) => {
      add.push(item);
      worn.set(slot, item);
      heat += w(item);
    };
    if (warmer) {
      for (const slot of J.remove_order) {
        const c = worn.get(slot);
        const want = target.get(slot);
        if (slot === 'tete' && want && sun(want) && !(c && sun(c))) {
          if (c) take(slot);
          put(slot, want);
          continue;
        }
        if (!c || sun(c)) continue;
        if (J.extremities.includes(slot)) {
          if (!want) take(slot);
          continue;
        }
        // Garder, enlever, ou échanger le pull contre un gilet plus léger (qui doit alors être dans le sac : swap_cost).
        const options = [{ heat, cost: cost(heat) }, { heat: heat - w(c), cost: cost(heat - w(c)), take: true }];
        if (slot === 'haut' && want && w(want) < w(c)) {
          options.push({ heat: heat - w(c) + w(want), cost: cost(heat - w(c) + w(want)) + J.swap_cost, take: true, swap: true });
        }
        const best = options.filter((o) => !o.take || allowed(o.heat)).reduce((a, b) => (b.cost < a.cost - 1e-9 ? b : a));
        if (!best.take) continue;
        take(slot);
        if (best.swap) put(slot, want);
      }
    } else {
      for (const slot of J.add_order) {
        const want = target.get(slot);
        if (!want || worn.has(slot)) continue;
        const earlier = removed.get(slot);
        const item = earlier && sun(earlier) === sun(want) ? earlier : want;
        if (J.extremities.includes(slot) || cost(heat + w(item)) < cost(heat) - 1e-9) put(slot, item);
      }
    }
    states.push(new Map(worn));
    return { time: fmtMin(hours[sg.from].start), from: sg.from, band: bands[sg.band].id, remove, add };
  });
  const wornAt = (k) => states[segs.findLastIndex((sg) => sg.from <= k)];

  // Le sac, trois objets au plus : la couche à remettre plus tard (la plus chaude d'abord) ; à pied ou en voiture,
  // la couche qu'il porterait en poussette ; la protection contre la pluie ; un chapeau au soleil ;
  // puis les autres couches à remettre, et celles qui manqueraient aux heures plus fraîches.
  // Le sac ne parle que de ce qui vient, à partir de `from` (l'heure qu'il est) : à 11 h, ni la pluie de 9 h ni la
  // couche remise à 10 h ; la pluie ou le soleil de l'heure en cours comptent encore.
  const slots = Object.keys(J.slots);
  const start = new Set(morning);
  const pack = (from) => {
    const ahead = (k) => hours[k].end > from;
    const later = changes.filter((ch) => toMin(ch.time) > from)
      .flatMap((ch) => ch.add.map((item) => ({ item, reason: 'plus_tard', time: ch.time })))
      .filter((x) => !start.has(x.item))
      .sort((x, y) => slots.indexOf(slotOf(J, x.item)) - slots.indexOf(slotOf(J, y.item)));
    const bag = [];
    if (later[0]) bag.push(later[0]);
    if (J.carry_dessus_for.includes(mode)) {
      const plain = bandItems(clamp(b0 - t.band_shift, 0, bands.length - 1), 'poussette', variant, R).find((i) => slotOf(J, i) === 'dessus');
      if (plain && !start.has(plain)) bag.push({ item: plain, reason: t.carry_reason ?? (mode === 'voiture' ? 'voiture' : 'pause') });
    }
    const rainy = hours.find((sl, k) => ahead(k) && sl.precip_prob >= J.bag.rain_prob_at_least);
    if (rainy) bag.push({ item: t.rain_gear, reason: 'pluie', time: fmtMin(rainy.start) });
    const sunny = hours.findIndex((sl, k) => ahead(k) && sl.uv >= R.relay_triggers.uv_at_least && sl.feels_c >= J.bag.sun_feels_c_at_least
      && ![...wornAt(k).values()].some(sun));
    if (sunny >= 0) bag.push({ item: 'chapeau', reason: 'soleil', time: fmtMin(hours[sunny].start) });
    bag.push(...later.slice(1));
    // Ce qui manquerait à une heure plus fraîche que prévu : le bonnet, les moufles ou les chaussons que la tranche
    // demande, et une couche du dessus si la chaleur manque au-delà de la tolérance ; sauf ce qui a été enlevé plus tôt.
    needs.forEach((need, k) => {
      if (!ahead(k)) return;
      const now = wornAt(k);
      const target = layers(need);
      const handy = (sl) => changes.some((ch) => ch.from <= k && ch.remove.some((r) => slotOf(J, r) === sl));
      const missing = (sl) => target.has(sl) && !now.has(sl) && !sun(target.get(sl)) && !handy(sl);
      const short = warmthOf([...base, ...now.values()]) < warmthOf(bandItems(need, mode, variant, R, style)) - J.warmth_under_tolerance;
      const torso = short ? J.add_order.find((sl) => !J.extremities.includes(sl) && missing(sl)) : null;
      for (const sl of [torso, ...J.extremities.filter(missing)].filter(Boolean)) {
        bag.push({ item: target.get(sl), reason: 'si_frais', time: fmtMin(hours[k].start) });
      }
    });
    // Bonnet, moufles et chaussons tiennent dans une poche : ils ne comptent pas dans les objets du sac.
    const pocket = (x) => J.bag.pocket_slots.includes(slotOf(J, x.item));
    const unique = bag.filter((x, i) => bag.findIndex((y) => y.item === x.item) === i);
    return unique.filter((x) => pocket(x) || unique.filter((y) => !pocket(y)).indexOf(x) < J.bag.max_items);
  };
  const packed = pack(input.now ? toMin(input.now) : 0);

  // On ne remet que ce qu'on a sous la main : porté le matin, ou dans le sac de la journée (même si l'heure est passée).
  const handy = new Set([...morning, ...pack(0).map((x) => x.item)]);
  const kept = changes
    .map((ch) => ({ ...ch, add: ch.add.filter((item) => handy.has(item)) }))
    .filter((ch) => ch.remove.length || ch.add.length);
  const feels = hours.map((sl) => sl.feels_c);
  const first = feels[0];
  const extreme = Math.max(...feels) - first >= first - Math.min(...feels) ? Math.max(...feels) : Math.min(...feels);
  return {
    from: fmtMin(hours[0].start),
    to: fmtMin(hours.at(-1).end),
    feels: { first: Math.round(first), extreme: Math.round(extreme) },
    band: bands[b0].id,
    base_band: bands[baseIdx].id,
    transport: mode,
    morning,
    changes: kept.map(({ from, ...ch }) => ch),
    bag: packed,
    hours: hours.map((sl) => ({ time: fmtMin(sl.start), feels_c: sl.feels_c, precip_prob: sl.precip_prob, uv: sl.uv })),
    notes: [...t.notes],
    check: J.check,
  };
}

// En poussette sans chancelière notée, avant l'âge où elle ne sert plus : la chancelière est une alternative à la combinaison,
// jamais en plus (trop de couches). Seulement quand la tenue a une combinaison qu'elle remplacerait.
function muffOptionNotes(mode, items, age, R) {
  const muff = R.outfit.transport.poussette_chanceliere;
  if (mode !== 'poussette' || !muff?.option_note || (muff.max_age_m && age >= muff.max_age_m)) return [];
  return items.some((item) => item in muff.replace_items) ? [muff.option_note] : [];
}

// Repères de sécurité du portage (outfit.transport.<mode>.safety), placés en tête des conseils de la carte Dehors :
// la couverture ou le manteau de portage jamais sur son visage, dès qu'il est dans la tenue ; par forte chaleur, avant
// heat_under_months mois, nez et bouche dégagés ; verglas ou neige annoncés dans la suite de la plage, sol glissant.
function carrierNotes(mode, items, age, plan, R) {
  const S = R.outfit.transport[mode]?.safety;
  if (!S) return [];
  const notes = [];
  if (items.some((item) => S.cover_items.includes(item))) notes.push(S.cover_relay);
  if (plan.heat && age < S.heat_under_months) notes.push(S.heat_relay);
  if (plan.inPlage.some((sl) => S.slippery_weather_codes.includes(sl.weather_code))) notes.push(S.slippery_relay);
  return notes;
}

// Tenue portée à une heure donnée du plan de la journée : celle du matin, avec les changements déjà passés.
function journeeAt(journee, hhmm) {
  const items = [...journee.morning];
  let next = null;
  for (const ch of journee.changes) {
    if (toMin(ch.time) > toMin(hhmm)) {
      next = ch;
      break;
    }
    for (const item of ch.remove) items.splice(items.indexOf(item), 1);
    items.push(...ch.add.filter((item) => !items.includes(item)));
  }
  return { items, next };
}

// À la maison, en journée : la tenue selon la température de la pièce où il passe la journée, relevée à part
// de la chambre (day_room_temp_c) ; sans relevé, pour le milieu de la plage de 20 à 22 °C (Mieux vivre, Québec), en le disant.
function planIndoor(input, R, age) {
  const I = R.indoor;
  const room = input.profile.day_room_temp_c ?? null;
  const ref = room ?? (I.comfort_range_c.min + I.comfort_range_c.max) / 2;
  const t = I.round_room_temp ? Math.round(ref) : ref;
  const variant = (I.age_variants ?? []).filter((v) => age >= v.from_months).at(-1);
  const bin = (variant?.bins ?? I.bins).find((b) => b.max_c === null || t <= b.max_c);
  const hot = room !== null && room >= I.heat_room_c_at_least;
  // Tenues au choix : la tenue de la tranche, puis chaque style qui la change (sans pyjama…) ; celui de l'enfant, sinon la première.
  const styles = ['pyjama', ...Object.keys(R.outfit.day_styles ?? {})]
    .map((id) => ({ id, wear: styled(bin.wear, R.outfit.day_styles?.[id] ?? null) }))
    .filter((st, k, all) => k === 0 || st.wear.join() !== all[0].wear.join());
  const current = styles.find((st) => st.id === dayStyleId(R, input.profile)) ?? styles[0];
  return {
    room_temp_c: room,
    room_assumed: room === null,
    room_status: room === null ? 'unknown' : room < I.comfort_range_c.min ? 'below' : room > I.comfort_range_c.max ? 'above' : 'in_range',
    wear: [...current.wear],
    day_style: current.id,
    styles,
    relays: sortByPriority([...(hot ? I.when_hot : []), ...I.always], R.relay_priority),
  };
}

// Gigoteuse (TOG) et tenue dessous selon la chambre ; sans relevé, pour le repère officiel (milieu de 18-20 °C), en le disant.
// Chaque tranche a sa tenue principale et, parfois, d'autres publiées par les fabricants, jamais plus chaudes (lint) :
// le choix fait pour une tranche (night_options : { tranche: tenue }) vaut pour elle seule.
// Les repères du couchage du nourrisson ne s'affichent plus à partir de 2 ans.
function planNight(input, R, heat, age) {
  const n = R.night;
  const room = input.profile.room_temp_c ?? null;
  const relays = n.always.filter((id) => age < n.baby_until_months || !n.baby_only.includes(id));
  // Repères bornés par l'âge (night.by_age) : de 2 à 3 ans, ni drap ni couette (Assurance Maladie).
  for (const r of n.by_age ?? []) if (age >= (r.from_months ?? 0) && age < r.until_months) relays.push(r.relay);
  let status = 'unknown';
  if (room !== null) {
    status = room < n.room_range_c.min ? 'below' : room > n.room_range_c.max ? 'above' : 'in_range';
    relays.push(...n.when_room_known);
  }
  const ref = room ?? (n.room_range_c.min + n.room_range_c.max) / 2;
  const t = n.tog_hint.round_room_temp ? Math.round(ref) : ref;
  const bin = n.tog_hint.bins.find((b) => b.max_c === null || t <= b.max_c);
  if (heat || (room !== null && room >= n.heat_room_c_at_least)) relays.push('relay.heat.shutters');
  const options = [{ id: 'principal', tog: bin.tog, wear: bin.wear ?? [], sources: bin.sources ?? [] }, ...(bin.alternatives ?? [])]
    .map((o) => ({ id: o.id, tog: o.tog, wear: [...o.wear], sources: [...(o.sources ?? [])] }));
  const chosen = options.find((o) => o.id === input.profile.night_options?.[bin.id]) ?? options[0];
  return {
    room_temp_c: room,
    room_status: status,
    room_assumed: room === null,
    tog: chosen.tog,
    wear: [...chosen.wear],
    bin: bin.id ?? null,
    option: chosen.id,
    options,
    relays: sortByPriority(relays, R.relay_priority),
  };
}

function needMet(need, week, band, transport) {
  if (need.week_tmean_below != null && !(week.tmean < need.week_tmean_below)) return false;
  if (need.week_tmax_at_least != null && !(week.tmax_mean >= need.week_tmax_at_least)) return false;
  if (need.week_tmean_at_least != null && !(week.tmean >= need.week_tmean_at_least)) return false;
  if (need.week_tmax_below != null && !(week.tmax_mean < need.week_tmax_below)) return false;
  if (need.week_band_in && !need.week_band_in.includes(band)) return false;
  if (need.week_rainy_days_at_least != null && !(week.rainy_days >= need.week_rainy_days_at_least)) return false;
  if (need.week_uv_max_at_least != null && !(week.uv_max_mean >= need.week_uv_max_at_least)) return false;
  if (need.transport_in && !need.transport_in.includes(transport)) return false;
  return true;
}

// Quantité conseillée d'une catégorie (suggestion pratique) : pour les vêtements de tous les jours, de quoi tenir entre
// deux lessives plus une pièce de rechange (le rythme de lessive se règle : wash_days) ; sinon un nombre fixe, deux
// gigoteuses (une portée, une au lavage), une combinaison. Les pyjamas comptent double portés aussi la journée.
function quantityFor(cat, profile, R) {
  const Q = R.purchases.quantities;
  if (!cat.per_day) return cat.quantity ?? 1;
  const perDay = cat.per_day_by_style?.[dayStyleId(R, profile)] ?? cat.per_day;
  return Math.ceil(perDay * (profile.wash_days ?? Q.wash_days_default)) + Q.spare;
}

// Combien on en a dans une taille : la garde-robe note une taille par pièce (« 6m » trois fois : trois). Les versions
// précédentes, qui ne notaient qu'une fois chaque taille, lisent toujours la même liste.
const ownedCount = (inventory, catId, size) => (inventory?.[catId] ?? []).filter((code) => code === size).length;

// Gigoteuses d'une taille dont le TOG est dans la liste : notées par TOG (« 6-18m|2,5 »), et celles notées avant la
// 0.16 sans TOG, comptées comme chaude (2,5 TOG) ou légère (1 TOG).
function sleepbagCount(inventory, size, togs, R) {
  const S = R.purchases.sleepbags;
  const noted = (inventory?.[S.inventory] ?? []).filter((entry) => {
    const [code, tog] = entry.split('|');
    return code === size && togs.includes(tog);
  }).length;
  return noted + Object.entries(S.legacy).filter(([, tog]) => togs.includes(tog)).reduce((n, [id]) => n + ownedCount(inventory, id, size), 0);
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
      if (cat.max_age_m && ageWeek >= cat.max_age_m) continue;
      // Les catégories de la garde-robe réelle (gilets, pulls) servent aux tenues, pas aux achats.
      if (cat.wardrobe_only || !needMet(cat.need_if, week, band, baseTransport(transportFor(profile, ageWeek, R), R))) continue;
      const system = P.size_systems[cat.size_system];
      // Les vêtements de tous les jours ne sont proposés qu'une fois notés dans la garde-robe : sans rien noté, on ne
      // sait pas ce qu'il a déjà.
      if (cat.suggest_once_noted && !(profile.inventory?.[cat.id] ?? []).length) continue;
      const need = quantityFor(cat, profile, R);
      const owned = (code) => (cat.togs ? sleepbagCount(profile.inventory, code, cat.togs, R) : ownedCount(profile.inventory, cat.id, code));
      if (owned(sizeFor(system, ageWeek).code) >= need) continue;
      // On achète la taille qui servira encore dans quelques semaines.
      const buy = sizeFor(system, ageMonths(profile.birth, addDays(week.week_start, P.size_lookahead_days)));
      if (owned(buy.code) >= need) continue;
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
        quantity: need,
        owned: owned(buy.code),
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

const shortList = (items, labels) => items.map((i) => labels.items_short[i] ?? i).join(', ');

// Un changement en quelques mots : « 12 h : − combi pilote… + gilet » (le premier vêtement de chaque sens).
function changeLine(ch, labels, { full = false } = {}) {
  const part = (sign, items) => {
    if (!items.length) return '';
    return `${sign} ${full ? shortList(items, labels) : `${labels.items_short[items[0]] ?? items[0]}${items.length > 1 ? '…' : ''}`}`;
  };
  return `${hourFr(ch.time)} : ${[part('−', ch.remove), part('+', ch.add)].filter(Boolean).join(' ')}`;
}

// Ressenti du reste de la journée, depuis l'heure qu'il est : le premier, et le plus éloigné (« 6° → 17° »).
function journeeRange(journee, now) {
  const rest = journee.hours.filter((h) => toMin(h.time) + 60 > toMin(now));
  const hours = rest.length ? rest : journee.hours;
  const first = Math.round(hours[0].feels_c);
  const feels = hours.map((h) => Math.round(h.feels_c));
  const up = Math.max(...feels);
  const down = Math.min(...feels);
  const extreme = up - first >= first - down ? up : down;
  return { when: toMin(now) < toMin('12:00') ? 'Ce matin' : 'Cet après-midi', first, extreme, stable: Math.abs(extreme - first) < 2 };
}

// « Ce matin 6° → 17° », « Cet après-midi 15° → 11° », « Ce matin 6° ».
function journeeFeels(journee, now, M) {
  const range = journeeRange(journee, now);
  return render(M, range.stable ? 'journee.stable' : 'journee.range', 'short', range);
}

// Pourquoi le créneau idéal, en une ligne : « Au sec avant la pluie de 12 h et plus doux qu'à 9 h · 9° ressentis ».
function windowWhy(window, M) {
  if (!window?.why) return null;
  const parts = window.why.map((w) => render(M, w.id, 'short', { hour: w.hour ? hourFr(w.hour) : '' }));
  return render(M, 'outing.why.text', 'short', { why: capitalize(parts.join(' et ')), feels: Math.round(window.feels_c) });
}

// Ce qui suit dans la journée : le prochain changement, le sac, puis le changement d'après.
function journeePlanLine(journee, now, M) {
  const labels = M.labels;
  const next = journee.changes.filter((ch) => toMin(ch.time) > toMin(now));
  const bag = journee.bag.length ? render(M, 'journee.bag', 'short', { items: shortList(journee.bag.map((b) => b.item), labels) }) : '';
  const parts = [next[0] && changeLine(next[0], labels), bag, next[1] && changeLine(next[1], labels)].filter(Boolean);
  return parts.length ? capitalize(parts.join(' · ')) : null;
}

// La veille au soir : « Demain 3° → 12° · pluie vers 15 h ».
function eveningTitle(tomorrow, M) {
  const j = tomorrow.journee;
  const range = journeeRange(j, j.from);
  const rain = j.bag.find((b) => b.reason === 'pluie');
  return render(M, 'evening.tomorrow', 'short', {
    range: range.stable ? `${range.first}°` : `${range.first}° → ${range.extreme}°`,
    rain: rain ? ` · pluie vers ${hourFr(rain.time)}` : '',
  });
}

// La nuit en quelques mots : « nuit : body ML + 2,5 TOG », « nuit 21,5° : pyjama léger + 1 TOG » avec un relevé.
const eveningNight = (night, M) => render(M, 'evening.night', 'short', {
  wear: night.wear.map((i) => M.labels.items_short[i] ?? i).join(' + '),
  tog: night.tog,
  room: night.room_temp_c === null ? '' : ` ${frNumber(night.room_temp_c)}°`,
});

// Le rappel du soir : la tenue de demain matin, le sac, la nuit.
function reminderText(today, tomorrow, M) {
  const j = tomorrow.journee;
  const labels = M.labels;
  return render(M, 'evening.reminder', 'text', {
    outfit: capitalize(j.morning.map((i) => labels.items_short[i] ?? i).join(', ')),
    bag: j.bag.length ? ` · ${render(M, 'journee.bag', 'short', { items: shortList(j.bag.map((b) => b.item), labels) })}` : '',
    night: eveningNight(today.night, M),
  });
}

// Les trois lignes du widget pour le moment voulu : « jour » (la journée en couches) ou « soir » : avec `tomorrow`
// (résultat du lendemain), la tenue et le sac de demain à préparer, et la nuit ; sinon la nuit et les achats.
// Avec `drawings`, la tenue (le jour) et la gigoteuse (le soir) deviennent des dessins :
// { drawings: [identifiants de engine/drawings.js], text, label }, `label` gardant le texte pour les petits formats.
function widgetLines(result, moment, M, { drawings = false, tomorrow = null } = {}) {
  const labels = M.labels;
  const lines = [];
  const j = result.journee;
  if (moment === 'soir' && tomorrow?.journee) {
    const next = tomorrow.journee;
    lines.push(eveningTitle(tomorrow, M));
    const label = capitalize(next.morning.map((i) => labels.items_short[i] ?? i).join(' · '));
    lines.push(drawings ? { drawings: next.morning.map((i) => ITEM_DRAWINGS[i]).filter(Boolean), text: '', label } : label);
    const bag = next.bag.length ? render(M, 'journee.bag', 'short', { items: shortList(next.bag.map((b) => b.item), labels) }) : '';
    lines.push(capitalize([bag, result.night.tog ? eveningNight(result.night, M) : ''].filter(Boolean).join(' · ')));
  } else if (moment === 'jour' && j) {
    // Le jour : le ressenti, la tenue du moment, puis le prochain changement et le sac (une alerte officielle passe avant).
    const now = result.now ?? '08:00';
    const vigilance = result.outing.reason === 'vigilance';
    lines.push(vigilance ? render(M, 'outing.none.vigilance', 'short') : journeeFeels(j, now, M));
    const { items } = journeeAt(j, now);
    const label = capitalize(items.map((i) => labels.items_short[i] ?? i).join(' · '));
    lines.push(drawings ? { drawings: items.map((i) => ITEM_DRAWINGS[i]).filter(Boolean), text: '', label } : label);
    lines.push(j.alert ? render(M, j.alert, 'short', result.params) : journeePlanLine(j, now, M) ?? render(M, result.relays[0] ?? j.check, 'short', result.params));
  } else if (moment === 'jour') {
    const w = result.outing.window;
    lines.push(
      w
        ? render(M, 'outing.window', 'short', { start: hourFr(w.start), end: hourFr(w.end), feels: Math.round(w.feels_c) })
        : render(M, `outing.none.${result.outing.reason}`, 'short'),
    );
    if (result.outfit) {
      const label = capitalize(result.outfit.items.map((i) => labels.items_short[i] ?? i).join(' · '));
      lines.push(drawings ? { drawings: result.outfit.items.map((i) => ITEM_DRAWINGS[i]).filter(Boolean), text: '', label } : label);
    }
    const hint = result.relays[0] ?? result.outfit?.notes.find((n) => n.startsWith('practical.rain'));
    if (hint) lines.push(render(M, hint, 'short', result.params));
  } else {
    const n = result.night;
    lines.push(
      n.room_temp_c === null
        ? render(M, 'night.room_unknown', 'short')
        : render(M, 'night.room', 'short', { room: frNumber(n.room_temp_c) }),
    );
    // Tenue de nuit : ce qu'on met sous la gigoteuse, puis la gigoteuse et son TOG.
    if (n.tog) {
      const label = render(M, 'fabricant.night_wear', 'short', { wear: capitalize(n.wear.map((i) => labels.items_short[i] ?? i).join(' + ')), tog: n.tog });
      lines.push(drawings ? { drawings: [...n.wear.map((i) => ITEM_DRAWINGS[i]).filter(Boolean), 'gigoteuse'], text: `≈ ${n.tog} TOG`, label } : label);
    }
    const p = result.purchases[0];
    lines.push(
      p
        ? render(M, 'purchase.suggestion', 'short', {
          label: labels.categories[p.category],
          size: p.size === 'unique' ? '' : `, ${p.size_label}`,
        })
        : render(M, n.relays.includes('relay.sleep.basics') ? 'relay.sleep.basics' : 'relay.sleep.check_temp', 'short'),
    );
  }
  return lines.filter(Boolean).slice(0, 3);
}

// Onglet et widget Maison : le relevé comparé à son repère (le jour 20 à 22 °C, la nuit la chambre à 18-20 °C).
function homeRange(kind, R) {
  const range = kind === 'nuit' ? R.night.room_range_c : R.indoor.comfort_range_c;
  return { min: range.min, max: range.max };
}
const homeStatus = (plan, kind, R, M) => render(M, `maison.${kind}.${plan.room_temp_c === null ? 'unknown' : plan.room_status}`, 'short', homeRange(kind, R));

// La tenue de la maison sur une ligne de widget : dessins (et la gigoteuse la nuit) ou texte.
function homeOutfit(plan, kind, M, drawings) {
  const names = plan.wear.map((i) => M.labels.items_short[i] ?? i);
  const label = kind === 'nuit'
    ? render(M, 'fabricant.night_wear', 'short', { wear: capitalize(names.join(' + ')), tog: plan.tog })
    : capitalize(names.join(' · '));
  if (!drawings) return label;
  const ids = plan.wear.map((i) => ITEM_DRAWINGS[i]).filter(Boolean);
  return kind === 'nuit' ? { drawings: [...ids, 'gigoteuse'], text: `≈ ${plan.tog} TOG`, label } : { drawings: ids, text: '', label };
}

// Les trois lignes du widget Maison (iPhone) : le relevé, la tenue, l'état par rapport au repère.
function homeLines(result, kind, bundle, { drawings = false } = {}) {
  const M = bundle.messages;
  const plan = kind === 'nuit' ? result.night : result.indoor;
  const title = plan.room_temp_c === null
    ? render(M, `maison.${kind}.title_unknown`, 'short')
    : render(M, `maison.${kind}.title`, 'short', { room: frNumber(plan.room_temp_c) });
  return [title, homeOutfit(plan, kind, M, drawings), homeStatus(plan, kind, bundle.rules, M)];
}

// Widget Maison d'Android : pour chaque relevé possible (10 à 35 °C, au demi-degré), la tenue et l'état, le jour et la nuit,
// calculés d'avance pour que − et + répondent tout de suite, sans réseau ni moteur. `unknown` : sans relevé récent.
function homeTable(input, bundle, { drawings = true } = {}) {
  const R = bundle.rules;
  const M = bundle.messages;
  const age = ageMonths(input.profile.birth, input.date);
  const entry = (kind, room) => {
    const profile = { ...input.profile, room_temp_c: kind === 'nuit' ? room : null, day_room_temp_c: kind === 'jour' ? room : null };
    const plan = kind === 'nuit' ? planNight({ ...input, profile }, R, false, age) : planIndoor({ ...input, profile }, R, age);
    return { outfit: homeOutfit(plan, kind, M, drawings), status: homeStatus(plan, kind, R, M) };
  };
  const temps = Array.from({ length: 51 }, (_, k) => 10 + k / 2);
  const table = { confirm: render(M, 'maison.widget.confirm', 'short') };
  for (const kind of ['jour', 'nuit']) {
    table[kind] = { unknown: entry(kind, null), by: Object.fromEntries(temps.map((t) => [t.toFixed(1), entry(kind, t)])) };
  }
  return table;
}

// Le plus court (widget rond de l'écran verrouillé) : l'heure du prochain changement, le ressenti, ou le TOG le soir.
function widgetShort(result, moment) {
  if (moment === 'soir') return result.night.tog ?? '—';
  const j = result.journee;
  if (!j) return result.outing.window ? hourFr(result.outing.window.start) : '—';
  const next = j.changes.find((ch) => toMin(ch.time) > toMin(result.now ?? '08:00'));
  return next ? hourFr(next.time) : `${j.feels.first}°`;
}

const momentOf = (now) => (toMin(now ?? '08:00') < toMin('18:00') ? 'jour' : 'soir');
// Onglet et widget Maison : la journée de 6 h à 18 h, la nuit (sa chambre) le reste du temps.
const homeMoment = (now) => {
  const m = toMin(now ?? '08:00');
  return m >= toMin('06:00') && m < toMin('18:00') ? 'jour' : 'nuit';
};
// Ce qu'affichent l'app et les widgets : le soir dès 18 h, ou dès que la dernière sortie possible de la journée est passée.
const displayMoment = (result, now) => (momentOf(now) === 'soir' || result.outing.reason === 'journee_terminee' ? 'soir' : 'jour');

// Ambiance du ciel (app et widgets) : le soir, la nuit ; en journée, le temps qu'il fera au créneau conseillé.
function skyTheme(result, moment) {
  if (moment === 'soir') return 'nuit';
  const { window: w, reason, slots } = result.outing;
  if (reason === 'journee_terminee') return 'nuageux';
  if (reason === 'hors_jour') return 'nuit';
  if (result.relays.includes('relay.heat.outing_hours')) return 'chaleur';
  const s = (w && slots.find((x) => x.time === w.start)) ?? slots[0];
  if (!s) return 'nuageux';
  if ((s.weather_code ?? 0) >= 51 || s.precip_prob >= 50) return 'pluie';
  if ([2, 3, 45, 48].includes(s.weather_code)) return 'nuageux';
  if (s.feels_c <= 3) return 'froid';
  return 'clair';
}

// ——— Pièces au choix ———
// En touchant une pièce de la tenue, un équivalent à sa place (outfit.alternatives) : même rôle (journee.slots), même
// couverture, aussi chaud à max_warmth_gap près. Le choix vaut pour un jour ou toujours (profile.swaps) et se revérifie
// chaque jour ; les plans gardent leur calcul, seules les pièces changent de nom.

// Ce qui peut remplacer une pièce dans un mode de sortie (null : à la maison) : `options` ({ item, gap }), sauf ce que
// le mode retire ou remplace ; sinon `reason`, le message qui dit pourquoi. `near` : presque équivalentes (même chaleur,
// pas la même couverture), pour l'expliquer ; `slot` : son rôle.
function pieceChoices(item, R, mode = null) {
  const A = R.outfit.alternatives;
  const J = R.journee;
  const slot = slotOf(J, item);
  const locked = A.locked_items[item] ?? A.locked_slots[slot];
  if (locked) return { slot, options: [], near: [], reason: locked };
  const t = mode ? R.outfit.transport[mode] : null;
  const allowed = (x) => !t || (!t.remove_items.includes(x) && !(x in (t.replace_items ?? {})));
  const gap = (x) => round1(J.warmth[x] - J.warmth[item]);
  const options = A.pairs.filter((p) => p.includes(item)).map((p) => p.find((x) => x !== item)).filter(allowed)
    .map((x) => ({ item: x, gap: gap(x) }));
  const near = (J.slots[slot] ?? [])
    .filter((x) => x !== item && A.coverage[x] && A.coverage[item] && A.coverage[x] !== A.coverage[item]
      && Math.abs(gap(x)) <= A.max_warmth_gap && allowed(x) && !A.locked_items[x])
    .map((x) => ({ item: x, coverage: A.coverage[x] }));
  return { slot, options, near, reason: options.length ? null : 'swap.none' };
}

// Pièces remplacées ce jour-là ({ pièce: équivalent }) : profile.swaps ({ pièce: { to, day } }, sans day : toujours),
// tant que l'équivalent vaut encore dans ce mode de sortie.
function activeSwaps(input, R, mode) {
  const out = {};
  for (const [from, s] of Object.entries(input.profile.swaps ?? {})) {
    if (!s?.to || (s.day && s.day !== input.date)) continue;
    if (pieceChoices(from, R, mode).options.some((o) => o.item === s.to)) out[from] = s.to;
  }
  return out;
}

// Garde-robe réelle : une pièce conseillée qu'il n'a pas dans sa taille devient l'équivalent qu'il a (une paire de
// outfit.alternatives.pairs, permise dans ce mode de sortie), le plus léger d'abord : trop couvert pèse plus que pas
// assez. Seulement les pièces qui ont leur catégorie (outfit.alternatives.wardrobe), et seulement quand le parent en a
// noté au moins une : sans rien noté, on ne sait pas ce qu'il a. { swaps : { pièce conseillée : pièce qu'il a },
// missing : les pièces qu'il n'a pas, sans équivalent qu'il ait }.
function wardrobeSwaps(input, R, mode, age) {
  const cats = R.outfit.alternatives.wardrobe ?? {};
  const inv = input.profile.inventory ?? {};
  const out = { swaps: {}, missing: [] };
  if (!Object.values(cats).some((cat) => (inv[cat] ?? []).length)) return out;
  const sizeOf = (cat) => sizeFor(R.purchases.size_systems[R.purchases.categories.find((c) => c.id === cat).size_system], age).code;
  const has = (item) => ownedCount(inv, cats[item], sizeOf(cats[item])) > 0;
  for (const item of Object.keys(cats)) {
    if (has(item)) continue;
    const owned = pieceChoices(item, R, mode).options.filter((o) => cats[o.item] && has(o.item)).sort((a, b) => a.gap - b.gap);
    if (owned.length) out.swaps[item] = owned[0].item;
    else out.missing.push(item);
  }
  return out;
}

// Pièces remplacées ce jour-là : celles de la garde-robe, puis celles choisies par le parent, qui passent devant.
// `wardrobe` garde les seules remplacées par la garde-robe, pour les dire autrement (« c'est celui qu'il a ») ;
// `missing`, les pièces conseillées qu'il n'a pas.
function daySwaps(input, R, mode, age) {
  const chosen = activeSwaps(input, R, mode);
  const own = wardrobeSwaps(input, R, mode, age);
  const wardrobe = Object.fromEntries(Object.entries(own.swaps).filter(([from]) => !chosen[from]));
  return { swaps: { ...wardrobe, ...chosen }, wardrobe, missing: own.missing.filter((item) => !chosen[item]) };
}
// Parmi les pièces remplacées d'un plan ({ pièce portée : pièce conseillée }), celles qui viennent de la garde-robe.
const fromWardrobe = (swapped, wardrobe) => Object.fromEntries(Object.entries(swapped).filter(([to, from]) => wardrobe[from] === to));
// Les pièces d'une tenue qu'il n'a pas dans sa garde-robe.
const notOwned = (items, missing) => [...new Set(items)].filter((item) => missing.includes(item));

// Une liste de pièces, l'équivalent à la place ; `swapped` retient la pièce conseillée de chaque pièce remplacée.
function swapItems(items, swaps, swapped) {
  return [...new Set(items.map((item) => {
    const to = swaps[item];
    if (!to) return item;
    // La première pièce remplacée reste celle qu'on dit : le pull du matin, pas le gilet de midi devenu le même.
    if (!swapped[to]) swapped[to] = item;
    return to;
  }))];
}

// Le plan de la journée avec les pièces remplacées : un changement qui enlèverait et remettrait la même pièce disparaît.
function swapJournee(j, swaps) {
  const swapped = {};
  j.morning = swapItems(j.morning, swaps, swapped);
  j.changes = j.changes.map((ch) => {
    const remove = swapItems(ch.remove, swaps, swapped);
    const add = swapItems(ch.add, swaps, swapped);
    return { ...ch, remove: remove.filter((i) => !add.includes(i)), add: add.filter((i) => !remove.includes(i)) };
  }).filter((ch) => ch.remove.length || ch.add.length);
  // Une couche « pour plus tard » qu'aucun changement ne remet plus (il la porte déjà) quitte le sac.
  const added = new Set(j.changes.flatMap((ch) => ch.add));
  const bag = j.bag.map((b) => ({ ...b, item: swapItems([b.item], swaps, swapped)[0] }))
    .filter((b) => b.reason !== 'plus_tard' || added.has(b.item));
  j.bag = bag.filter((b, i) => bag.findIndex((x) => x.item === b.item) === i);
  j.swapped = swapped;
}

function evaluate(input, bundle) {
  const R = bundle.rules;
  const age = ageMonths(input.profile.birth, input.date);
  const plan = planOuting(input, R, age);
  const params = {};
  const ref = plan.refSlots;
  const outfit = plan.reason === 'vigilance' || !ref.length
    ? null
    : chooseOutfit(round1(mean(ref.map((sl) => sl.feels_c))), input.profile, R, age);
  if (outfit) addOverlays(outfit, plan, ref, R, params, bundle.messages.labels);
  const result = {
    date: input.date,
    now: input.now ?? null,
    age_months: round1(age),
    transport: transportFor(input.profile, age, R),
    outing: {
      window: plan.window,
      windows: plan.windows,
      why: windowWhy(plan.window, bundle.messages),
      reason: plan.reason,
      slots: plan.inPlage.map((sl) => ({
        time: fmtMin(sl.start),
        feels_c: sl.feels_c,
        precip_prob: sl.precip_prob,
        uv: sl.uv,
        gust_kmh: sl.gust_kmh,
        weather_code: sl.weather_code ?? null,
        reasons: sl.reasons.filter((r) => r !== 'hors_plage'),
        score: sl.score,
      })),
    },
    outfit,
    relays: dayRelays(input, R, age, plan, outfit, params),
    params,
    journee: planJournee(input, R, age, plan),
    indoor: planIndoor(input, R, age),
    night: planNight(input, R, plan.heat, age),
    purchases: planPurchases(input, R),
  };
  // Pièces au choix et garde-robe : dehors selon le mode de sortie, à la maison sans.
  const outdoor = daySwaps(input, R, result.transport, age);
  if (outfit) {
    outfit.swapped = {};
    outfit.items = swapItems(outfit.items, outdoor.swaps, outfit.swapped);
    outfit.wardrobe = fromWardrobe(outfit.swapped, outdoor.wardrobe);
    outfit.missing = notOwned(outfit.items, outdoor.missing);
  }
  if (result.journee) {
    const j = result.journee;
    swapJournee(j, outdoor.swaps);
    j.wardrobe = fromWardrobe(j.swapped, outdoor.wardrobe);
    j.missing = notOwned([...j.morning, ...j.changes.flatMap((ch) => ch.add)], outdoor.missing);
  }
  const indoor = daySwaps(input, R, null, age);
  result.indoor.swapped = {};
  result.indoor.wear = swapItems(result.indoor.wear, indoor.swaps, result.indoor.swapped);
  result.indoor.wardrobe = fromWardrobe(result.indoor.swapped, indoor.wardrobe);
  result.indoor.missing = notOwned(result.indoor.wear, indoor.missing);
  // Repères du portage, en tête des conseils (ils ne dépendent pas des pièces remplacées : celles du portage sont verrouillées).
  if (outfit) {
    outfit.notes.unshift(...carrierNotes(result.transport, outfit.items, age, plan, R));
    outfit.notes.push(...muffOptionNotes(result.transport, outfit.items, age, R));
  }
  if (result.journee) {
    const j = result.journee;
    const worn = [...j.morning, ...j.changes.flatMap((ch) => ch.add)];
    j.notes.unshift(...carrierNotes(result.transport, worn, age, plan, R));
    j.notes.push(...muffOptionNotes(result.transport, worn, age, R));
  }
  // Alerte officielle qui passe avant le plan de la journée dans le widget (vigilance, grand froid, chaleur…).
  if (result.journee) result.journee.alert = result.relays.find((id) => R.journee.widget_urgent_relays.includes(id)) ?? null;
  const moment = displayMoment(result, input.now);
  result.widget = {
    lines: widgetLines(result, moment, bundle.messages),
    check: render(bundle.messages, R.journee.check, 'short'),
    check_tiny: render(bundle.messages, R.journee.check, 'tiny'),
    short: widgetShort(result, moment),
  };
  if (input.check_product) result.product = checkProduct(input.check_product, age, R);
  return result;
}

// Tenue pour une heure précise (« et si on sort à 16 h ? »), avec les rappels pratiques de cette heure.
function outfitAt(input, bundle, hhmm) {
  const R = bundle.rules;
  const age = ageMonths(input.profile.birth, input.date);
  const plan = planOuting(input, R, age);
  const slot = plan.slots.find((sl) => sl.start === toMin(hhmm));
  if (!slot) return null;
  const outfit = chooseOutfit(slot.feels_c, input.profile, R, age);
  const params = {};
  addOverlays(outfit, plan, [slot], R, params, bundle.messages.labels);
  const swaps = daySwaps(input, R, outfit.transport, age);
  outfit.swapped = {};
  outfit.items = swapItems(outfit.items, swaps.swaps, outfit.swapped);
  outfit.wardrobe = fromWardrobe(outfit.swapped, swaps.wardrobe);
  outfit.missing = notOwned(outfit.items, swaps.missing);
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
    R.journee.check,
    ...R.indoor.always,
    ...R.indoor.when_hot,
    ...R.journee.widget_urgent_relays,
    ...R.relay_priority,
    ...R.night.always,
    ...R.night.when_room_known,
    ...(R.night.by_age ?? []).map((r) => r.relay),
    ...Object.values(R.outfit.transport).flatMap((t) => [...t.notes, ...(t.option_note ? [t.option_note] : [])]),
    ...Object.values(R.outfit.transport).flatMap((t) => (t.safety ? [t.safety.cover_relay, t.safety.heat_relay, t.safety.slippery_relay, ...t.safety.principles] : [])),
    ...R.purchases.never_suggest.map((p) => p.relay),
    ...R.purchases.categories.flatMap((c) => [
      ...c.relays, ...(c.relays_under_12m ?? []), ...(c.relays_from_12m ?? []), ...(c.under_min_age_relay ? [c.under_min_age_relay] : []),
    ]),
  ];
  for (const id of new Set(referenced)) if (!M.messages[id]) errors.push(`message manquant : ${id}`);
  const items = new Set(R.outfit.bands.flatMap((band) => band.items));
  for (const variant of R.outfit.age_variants ?? []) {
    for (const [band, list] of Object.entries(variant.bands)) {
      if (!R.outfit.bands.some((b) => b.id === band)) errors.push(`tranche inconnue dans ${variant.id} : ${band}`);
      list.forEach((item) => items.add(item));
    }
  }
  for (const t of Object.values(R.outfit.transport)) {
    for (const replacement of Object.values(t.replace_items ?? {})) replacement.forEach((item) => items.add(item));
    items.add(t.rain_gear);
    if (!M.labels.rain_gear[t.rain_gear]) errors.push(`protection de pluie sans libellé : ${t.rain_gear}`);
  }
  for (const item of items) {
    const slot = slotOf(R.journee, item);
    if (!slot && !Object.values(R.outfit.transport).some((t) => t.rain_gear === item)) errors.push(`vêtement sans emplacement (journee.slots) : ${item}`);
    if (slot && R.journee.warmth[item] === undefined) errors.push(`vêtement sans chaleur (journee.warmth) : ${item}`);
    if (!M.labels.items[item]) errors.push(`libellé manquant : ${item}`);
    if (!M.labels.items_short[item]) errors.push(`libellé court manquant : ${item}`);
    if (!M.labels.layers[M.labels.item_layers[item]]) errors.push(`couche inconnue pour : ${item}`);
    if (!DRAWINGS[ITEM_DRAWINGS[item]]) errors.push(`dessin manquant : ${item}`);
  }
  const nightWear = R.night.tog_hint.bins.flatMap((b) => [b, ...(b.alternatives ?? [])]);
  for (const item of [...nightWear, ...R.indoor.bins, ...R.indoor.age_variants.flatMap((v) => v.bins)].flatMap((b) => b.wear ?? [])) {
    if (!M.labels.items_short[item]) errors.push(`libellé court manquant : ${item}`);
    if (!DRAWINGS[ITEM_DRAWINGS[item]]) errors.push(`dessin manquant : ${item}`);
  }
  // Tenues au choix. Le jour, l'équivalent du pyjama remplacé, pas une couche de moins : un haut (journee.slots.peau),
  // un bas (corps), et des chaussettes si le pyjama remplacé couvre les pieds ; le porte-bébé de même. La nuit, ce qu'on
  // met dessous s'additionne au TOG : une gigoteuse plus légère va avec des vêtements plus chauds, une plus chaude avec
  // des vêtements plus légers, et à gigoteuse égale, une couche fine d'écart au plus ; chaque tenue cite son fabricant.
  const heat = (list) => list.reduce((sum, item) => sum + (R.journee.warmth[item] ?? Number.NaN), 0);
  const togOf = (tog) => Number(String(tog).replace(',', '.'));
  const footed = ['pyjama', 'pyjama_chaud'];
  const swaps = [...Object.entries(R.outfit.day_styles ?? {}).map(([id, style]) => [`style ${id}`, style.replace_items]),
    ['porte-bébé', R.outfit.transport.porte_bebe?.replace_items ?? {}]];
  for (const [who, replace] of swaps) {
    for (const [item, replacement] of Object.entries(replace)) {
      if (!item.startsWith('pyjama')) continue;
      const has = (slot) => replacement.some((r) => R.journee.slots[slot].includes(r));
      const socks = replacement.some((r) => r.startsWith('chaussettes'));
      if (!has('peau') || !replacement.some((r) => r.startsWith('pantalon')) || (footed.includes(item) && !socks)) {
        errors.push(`${who} : ${replacement.join(' + ')} n'équivaut pas à ${item} (un haut, un pantalon${footed.includes(item) ? ' et des chaussettes' : ''})`);
      }
      for (const r of replacement) if (!M.labels.items_short[r] || !DRAWINGS[ITEM_DRAWINGS[r]]) errors.push(`${who} : ${r} sans libellé ou dessin`);
    }
  }
  // Pièces au choix : chaque paire du même rôle, de même couverture, aussi chaude à max_warmth_gap près, hors des
  // emplacements et des pièces verrouillés ; chaque raison a son message, chaque rôle son libellé.
  const A = R.outfit.alternatives;
  for (const [a, b] of A.pairs) {
    const where = `pièces au choix ${a} / ${b}`;
    if (!items.has(a) || !items.has(b)) errors.push(`${where} : pièce inconnue`);
    if (slotOf(R.journee, a) !== slotOf(R.journee, b)) errors.push(`${where} : pas le même rôle`);
    if (!A.coverage[a] || A.coverage[a] !== A.coverage[b]) errors.push(`${where} : pas la même couverture`);
    if (!(Math.abs(heat([b]) - heat([a])) <= A.max_warmth_gap)) errors.push(`${where} : écart de chaleur ${round1(heat([b]) - heat([a]))}`);
    if ([a, b].some((x) => A.locked_items[x] || A.locked_slots[slotOf(R.journee, x)])) errors.push(`${where} : pièce verrouillée`);
  }
  for (const id of [...Object.values(A.locked_slots), ...Object.values(A.locked_items), 'swap.none']) {
    if (!M.messages[id]) errors.push(`message manquant : ${id}`);
  }
  for (const slot of Object.keys(R.journee.slots)) if (!M.labels.slot_roles?.[slot]) errors.push(`rôle sans libellé : ${slot}`);
  // Garde-robe réelle : chaque pièce a sa catégorie de garde-robe, sans suggestion d'achat, et au moins un équivalent
  // parmi les paires (seules les paires contrôlées ci-dessus remplacent une pièce).
  for (const [item, catId] of Object.entries(A.wardrobe ?? {})) {
    const cat = R.purchases.categories.find((c) => c.id === catId);
    if (!cat?.wardrobe_only) errors.push(`garde-robe ${item} : catégorie ${catId} absente ou suggérée à l'achat`);
    if (!A.pairs.some((p) => p.includes(item))) errors.push(`garde-robe ${item} : aucun équivalent`);
  }
  const binIds = new Set();
  for (const bin of R.night.tog_hint.bins) {
    if (!bin.id || binIds.has(bin.id)) errors.push(`tranche de nuit sans identifiant unique : ${bin.max_c}`);
    binIds.add(bin.id);
    for (const option of [bin, ...(bin.alternatives ?? [])]) {
      if (!option.sources?.length || option.sources.some((sid) => sourceById.get(sid)?.level !== 'C')) errors.push(`nuit ${bin.id} : ${option.id ?? 'principale'} sans fabricant cité`);
    }
    for (const alt of bin.alternatives ?? []) {
      if (alt.id === 'principal') errors.push(`nuit ${bin.id} : identifiant réservé`);
      const dt = togOf(alt.tog) - togOf(bin.tog);
      const dw = heat(alt.wear) - heat(bin.wear);
      const compensated = dt < 0 ? dw > 0 : dt > 0 ? dw < 0 : Math.abs(dw) <= 0.5;
      if (!compensated) errors.push(`nuit ${bin.id} : ${alt.id} non compensée (gigoteuse ${alt.tog} TOG au lieu de ${bin.tog}, vêtements ${dw >= 0 ? '+' : ''}${dw})`);
    }
  }
  // Les TOG des gigoteuses par saison sont ceux du tableau de nuit des fabricants.
  const nightTogs = new Set(R.night.tog_hint.bins.flatMap((b) => [b.tog, ...(b.alternatives ?? []).map((a) => a.tog)]));
  for (const tog of R.purchases.sleepbags.togs) if (!nightTogs.has(tog)) errors.push(`gigoteuse ${tog} TOG absente du tableau de nuit`);
  for (const cat of R.purchases.categories) {
    for (const tog of cat.togs ?? []) if (!R.purchases.sleepbags.togs.includes(tog)) errors.push(`${cat.id} : ${tog} TOG inconnu`);
    if (!M.labels.categories[cat.id]) errors.push(`libellé manquant : ${cat.id}`);
    if (!DRAWINGS[CATEGORY_DRAWINGS[cat.id]]) errors.push(`dessin manquant : ${cat.id}`);
  }
  const toVerify = S.sources.filter((src) => src.verification !== 'lu').map((src) => `${src.id} (${src.verification})`);
  return { errors, toVerify };
}


// Adaptateur Open-Meteo → entrée du moteur. Fonctions pures, partagées par l'app web et le widget iPhone.
// N'utilise que du JavaScript standard (pas d'API du navigateur), pour tourner aussi dans Scriptable.

const PARIS_TZ = 'Europe/Paris';
const FORECAST_DAYS = 16;
const OUTLOOK_WEEKS = 6;
const CLIMATE_YEARS = 3;
const HOURLY = 'temperature_2m,apparent_temperature,precipitation_probability,precipitation,wind_gusts_10m,uv_index,weather_code';
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
      weather_code: h.weather_code?.[i] ?? null,
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

// Ce qu'affiche un widget pour un enfant, à une heure donnée. Le jour : la journée en couches. Le soir : la tenue
// et le sac de demain, à préparer, avec la nuit. `reminder` : calcule aussi le rappel du soir (tenue de demain).
function widgetView({ forecast, profile, date, time, lat }, bundle, { drawings = true, reminder = false } = {}) {
  const today = evaluate(buildInput({ forecast, profile, date, now: time, lat }), bundle);
  const moment = displayMoment(today, time);
  const tomorrow = moment === 'soir' || reminder
    ? evaluate(buildInput({ forecast, profile: { ...profile, room_temp_c: null }, date: addDays(date, 1), now: '07:00', lat }), bundle)
    : null;
  return {
    today,
    tomorrow,
    moment,
    lines: widgetLines(today, moment, bundle.messages, { drawings, tomorrow: moment === 'soir' ? tomorrow : null }),
    theme: skyTheme(today, moment),
    short: widgetShort(today, moment),
    check: today.widget.check,
    check_tiny: today.widget.check_tiny,
    reminder: tomorrow?.journee ? reminderText(today, tomorrow, bundle.messages) : null,
  };
}

// Ce qu'affiche le widget Maison pour un enfant : de 6 h à 18 h la journée chez vous, ensuite la nuit dans sa chambre.
// Le relevé du moment, la tenue, l'état par rapport au repère ; `short` pour le widget rond de l'écran verrouillé.
function homeWidgetView({ forecast, profile, date, time, lat }, bundle, { drawings = true } = {}) {
  const today = evaluate(buildInput({ forecast, profile, date, now: time, lat }), bundle);
  const kind = homeMoment(time);
  const plan = kind === 'nuit' ? today.night : today.indoor;
  return {
    today,
    kind,
    lines: homeLines(today, kind, bundle, { drawings }),
    theme: kind === 'nuit' ? 'nuit' : 'maison',
    short: plan.room_temp_c === null ? (kind === 'nuit' ? `${today.night.tog}` : '—') : `${frNumber(plan.room_temp_c)}°`,
    check: today.widget.check,
    check_tiny: today.widget.check_tiny,
  };
}

// Les tenues de la maison pour chaque relevé possible (widget Maison d'Android, voir homeTable).
const homeWidgetTable = ({ profile, date }, bundle, options) => homeTable({ date, profile }, bundle, options);

// Configuration partagée entre l'app web et les widgets : JSON en ASCII, puis base64url.
// v1 : un seul enfant (b, t, o à la racine) ; v2 : la commune, les horaires et les enfants (k).
const CONFIG_PREFIX = 'SB1.';
const validChild = (c) => Boolean(c) && /^\d{4}-\d{2}/.test(c.b ?? '');

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
    const place = Boolean(cfg) && Number.isFinite(cfg.la) && Number.isFinite(cfg.lo);
    const children = cfg?.v === 2 ? Array.isArray(cfg.k) && cfg.k.length > 0 && cfg.k.every(validChild) : cfg?.v === 1 && validChild(cfg);
    return place && children ? cfg : null;
  } catch (e) {
    return null;
  }
}

// Les clés c (code Insee), dp (département) et i (tenue en dessins : 1, en texte : 0) sont facultatives :
// les anciennes configurations restent valables et affichent les dessins.
function profileToConfig(profile) {
  return {
    v: 1,
    n: profile.commune.nom,
    c: profile.commune.code,
    dp: profile.commune.dep,
    la: profile.commune.lat,
    lo: profile.commune.lon,
    b: profile.birth,
    t: profile.transport,
    f: profile.outing_window.from,
    u: profile.outing_window.to,
    d: profile.outing_duration_h,
    o: profile.outfit_offset ?? 0,
    i: profile.outfit_view === 'texte' ? 0 : 1,
  };
}

// Configuration v2 : commune et horaires communs, un enfant par entrée de k (identifiant, prénom, naissance, mode, tendance,
// et s'il y a lieu s, style de la journée, g, tenues de nuit choisies par tranche, w, pièces au choix, et cm, une
// chancelière dans sa garde-robe, que les widgets n'ont pas) et m, date du dernier changement :
// la plus récente l'emporte entre l'app et les widgets.
// Catégories de la garde-robe qui changent la tenue (règles : outfit.alternatives.wardrobe) : passées aux widgets
// pour qu'ils proposent, comme l'app, le pull qu'il a plutôt que le gilet chaud qu'il n'a pas.
const WARDROBE_CATEGORIES = ['gilets_fins', 'gilets', 'gilets_chauds', 'pulls'];
const wardrobeOf = (inventory) => Object.fromEntries(WARDROBE_CATEGORIES
  .map((cat) => [cat, Array.isArray(inventory?.[cat]) ? inventory[cat].filter((size) => typeof size === 'string') : []])
  .filter(([, sizes]) => sizes.length));

function householdToConfig(household) {
  return {
    v: 2,
    n: household.commune.nom,
    c: household.commune.code,
    dp: household.commune.dep,
    la: household.commune.lat,
    lo: household.commune.lon,
    f: household.outing_window.from,
    u: household.outing_window.to,
    d: household.outing_duration_h,
    i: household.outfit_view === 'texte' ? 0 : 1,
    k: household.children.map((c) => ({
      id: c.id, p: c.name ?? '', b: c.birth, t: c.transport, o: c.outfit_offset ?? 0,
      ...(c.day_style ? { s: c.day_style } : {}),
      ...(Object.keys(c.night_options ?? {}).length ? { g: c.night_options } : {}),
      ...(Object.keys(c.swaps ?? {}).length ? { w: c.swaps } : {}),
      ...((c.inventory?.chanceliere ?? []).length ? { cm: 1 } : {}),
      ...(Object.keys(wardrobeOf(c.inventory)).length ? { gr: wardrobeOf(c.inventory) } : {}),
    })),
    m: household.updated ?? 0,
  };
}

// Enfants d'une configuration, dans l'ordre de l'app ; une configuration v1 n'en a qu'un, sans prénom.
function configChildren(cfg) {
  const list = cfg.v === 2 ? cfg.k : [{ id: '', p: '', b: cfg.b, t: cfg.t, o: cfg.o }];
  return list.map((c) => ({
    id: String(c.id ?? ''), name: String(c.p ?? ''), birth: c.b, transport: c.t ?? 'poussette', outfit_offset: c.o ?? 0,
    day_style: typeof c.s === 'string' ? c.s : null,
    night_options: c.g && typeof c.g === 'object' && !Array.isArray(c.g) ? { ...c.g } : {},
    swaps: c.w && typeof c.w === 'object' && !Array.isArray(c.w) ? { ...c.w } : {},
    stroller_muff: c.cm === 1,
    wardrobe: c.gr && typeof c.gr === 'object' && !Array.isArray(c.gr) ? wardrobeOf(c.gr) : {},
  }));
}

// Prénom comparé sans majuscules ni accents (sans Intl : le bac à sable d'Android n'en a pas).
const ACCENTS = {
  à: 'a', â: 'a', ä: 'a', á: 'a', ç: 'c', é: 'e', è: 'e', ê: 'e', ë: 'e', î: 'i', ï: 'i', í: 'i',
  ñ: 'n', ô: 'o', ö: 'o', ó: 'o', ù: 'u', û: 'u', ü: 'u', ú: 'u', ÿ: 'y', œ: 'oe', æ: 'ae',
};
const plainName = (s) => String(s ?? '').trim().toLowerCase().replace(/[^\x00-\x7f]/g, (c) => ACCENTS[c] ?? c);

// Enfant demandé par un widget : numéro (1, 2…), identifiant ou prénom ; le premier sinon.
function pickChild(cfg, ref = '') {
  const children = configChildren(cfg);
  const key = String(ref ?? '').trim();
  if (/^\d+$/.test(key) && children[Number(key) - 1]) return children[Number(key) - 1];
  return children.find((c) => c.id && c.id === key)
    ?? children.find((c) => key && c.name && plainName(c.name) === plainName(key))
    ?? children[0];
}

// Profil du moteur pour un enfant de la configuration (le premier par défaut).
function configToProfile(cfg, ref = '') {
  const child = pickChild(cfg, ref);
  return {
    commune: { nom: cfg.n ?? '', code: cfg.c ?? '', dep: cfg.dp ?? '', lat: cfg.la, lon: cfg.lo },
    child_id: child.id,
    name: child.name,
    birth: child.birth,
    transport: child.transport,
    outing_window: { from: cfg.f ?? '09:00', to: cfg.u ?? '18:00' },
    outing_duration_h: cfg.d ?? 1,
    outfit_offset: child.outfit_offset,
    day_style: child.day_style,
    night_options: child.night_options,
    swaps: child.swaps,
    stroller_muff: child.stroller_muff,
    outfit_view: cfg.i === 0 ? 'texte' : 'dessins',
    room_temp_c: null,
    day_room_temp_c: null,
    inventory: { ...child.wardrobe },
  };
}

