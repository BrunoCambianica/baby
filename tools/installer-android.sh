#!/usr/bin/env bash
# Installe la chaîne de compilation Android hors du dépôt, sans droits administrateur :
# JDK 17 (Temurin), outils du SDK, plateforme 36 et build-tools. Gradle est téléchargé par android/gradlew.
# Usage : tools/installer-android.sh   puis   tools/compiler-apk.sh
set -euo pipefail
DIR="${SB_TOOLCHAIN:-$HOME/.local/share/superbebe/android}"
mkdir -p "$DIR"
cd "$DIR"

if [ ! -x jdk/bin/java ]; then
  echo "JDK 17…"
  curl -fsSL -o jdk.tar.gz "https://api.adoptium.net/v3/binary/latest/17/ga/linux/x64/jdk/hotspot/normal/eclipse"
  mkdir -p jdk && tar -xzf jdk.tar.gz -C jdk --strip-components=1 && rm jdk.tar.gz
fi
export JAVA_HOME="$DIR/jdk"

if [ ! -x sdk/cmdline-tools/latest/bin/sdkmanager ]; then
  echo "Outils du SDK Android…"
  curl -fsSL -o tools.zip "https://dl.google.com/android/repository/commandlinetools-linux-13114758_latest.zip"
  rm -rf sdk/cmdline-tools && mkdir -p sdk/cmdline-tools
  (cd sdk/cmdline-tools && unzip -q ../../tools.zip && mv cmdline-tools latest) && rm tools.zip
fi
yes | sdk/cmdline-tools/latest/bin/sdkmanager --sdk_root="$DIR/sdk" --licenses > /dev/null || true
sdk/cmdline-tools/latest/bin/sdkmanager --sdk_root="$DIR/sdk" "platforms;android-36" "build-tools;35.0.0" "platform-tools" > /dev/null


echo "Chaîne Android prête dans $DIR"
