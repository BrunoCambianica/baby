#!/usr/bin/env bash
# Compile l'APK de test (clé de débogage de ~/.android) et le copie dans dist/.
# Prérequis : tools/installer-android.sh, puis npm run build (moteur embarqué à jour).
set -euo pipefail
DIR="${SB_TOOLCHAIN:-$HOME/.local/share/superbebe/android}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export JAVA_HOME="$DIR/jdk"
export ANDROID_HOME="$DIR/sdk"
echo "sdk.dir=$ANDROID_HOME" > "$ROOT/android/local.properties"
cd "$ROOT/android"
./gradlew --quiet assembleDebug
cp app/build/outputs/apk/debug/app-debug.apk "$ROOT/dist/superbebe-android.apk"
ls -l "$ROOT/dist/superbebe-android.apk"
