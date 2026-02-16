## first do:

nix-shell (if your not me figure it out lol)

npm run install:all

## run web version:

npm run dev:web

### test electron on web:

npm run dev:election

## flatpak:

npm run build:electron:flatpak

### flatpak is in: 

packages/electron/dist/

## android apk:

cd packages/android

npm run cap:add

cd ../..

npm run build:android

cd packages/android/android

./gradlew assembleDebug

### If it's not making a new apk:

./gradlew clean assembleDebug

### apk is in: 

packages/android/android/app/build/outputs/apk/debug/

## run sync server (port 3001):

npm run dev:server
