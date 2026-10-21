// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-blue; icon-glyph: baby;
// Superbébé, widget iPhone. Ce chargeur récupère la dernière version du widget (au plus toutes les 6 heures)
// et la garde sur le téléphone pour fonctionner hors ligne.
const SB_BASE = "__SB_BASE_URL__";
const sbFm = FileManager.local();
const sbFile = sbFm.joinPath(sbFm.documentsDirectory(), "superbebe-widget.js");
const sbFresh = sbFm.fileExists(sbFile) && Date.now() - sbFm.modificationDate(sbFile).getTime() < 6 * 3600 * 1000;
let sbCode = null;
if (!sbFresh) {
  try {
    const sbRequest = new Request(`${SB_BASE}widget/superbebe.js`);
    sbRequest.timeoutInterval = 20;
    sbCode = await sbRequest.loadString();
    if (sbCode.includes("runSuperbebe")) sbFm.writeString(sbFile, sbCode);
    else sbCode = null;
  } catch (e) {
    sbCode = null;
  }
}
if (!sbCode && sbFm.fileExists(sbFile)) sbCode = sbFm.readString(sbFile);
if (!sbCode) throw new Error("Superbébé : connexion internet nécessaire au premier lancement.");
await new Function("SB_BASE_FROM_LOADER", `${sbCode}\nreturn runSuperbebe;`)(SB_BASE)();
