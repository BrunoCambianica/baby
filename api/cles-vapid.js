// Crée la paire de clés VAPID des notifications, à mettre dans le fichier .env du serveur (une fois pour toutes :
// changer de clés oblige chaque téléphone à se réabonner).
import { newVapidKeys } from './push.js';

const { publique, privee } = newVapidKeys();
console.log(`VAPID_PUBLIQUE=${publique}\nVAPID_PRIVEE=${privee}`);
