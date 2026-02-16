# shell.nix — Drop into a dev shell with all dependencies for building
# both the Electron desktop app and the Capacitor Android app.
#
# Usage:  nix-shell           (from the repo root)
#
# This gives you: Node.js, npm, JDK 21, Android SDK, and Electron build deps.
#
# NixOS aapt2 fix: Gradle downloads a dynamically linked aapt2 from Maven
# which can't run on NixOS. We fix this two ways:
#   1. GRADLE_OPTS tells AGP to use the Nix-patched aapt2 from our SDK
#   2. shellHook auto-patches any aapt2 binaries Gradle has already cached

{ pkgs ? import <nixpkgs> {
    config = {
      allowUnfree = true;       # Android SDK has a proprietary license
      android_sdk.accept_license = true;
    };
  }
}:

let
  # ─── Android SDK configuration ────────────────────────────────
  # IMPORTANT: buildToolsVersion here must match the path in GRADLE_OPTS below
  buildToolsVersion = "35.0.0";

  androidComposition = pkgs.androidenv.composeAndroidPackages {
    platformVersions = [ "35" "34" ];
    buildToolsVersions = [ "35.0.0" "34.0.0" ];
    includeEmulator = true;
    emulatorVersion = "35.3.12";
    includeSystemImages = true;
    systemImageTypes = [ "google_apis" ];
    abiVersions = [ "x86_64" ];
    includeNDK = false;
    includeSources = false;
  };
  androidSdk = androidComposition.androidsdk;
in
pkgs.mkShell {
  buildInputs = with pkgs; [
    # ─── Core JS toolchain ────────────────────────────────────────
    nodejs_20
    nodePackages.npm

    # ─── Electron build dependencies (Linux) ─────────────────────
    dpkg
    fakeroot
    rpm
    flatpak
    flatpak-builder

    # NixOS-compatible Electron for dev mode
    electron

    # Electron runtime dependencies on NixOS
    nss
    xorg.libXcomposite
    xorg.libXdamage
    xorg.libXrandr
    xorg.libXcursor
    xorg.libXi
    xorg.libXext
    xorg.libXfixes
    xorg.libXrender
    xorg.libXtst
    xorg.libxcb
    xorg.libX11
    mesa
    libGL
    alsa-lib
    atk
    at-spi2-atk
    cups
    dbus
    expat
    glib
    gtk3
    pango
    cairo
    libdrm
    libxkbcommon
    nspr
    udev

    # ─── Android build dependencies ──────────────────────────────
    jdk21
    androidSdk
    gradle

    # ─── NixOS dynamic-linking fix tools ─────────────────────────
    # patchelf is used to patch Gradle-downloaded aapt2 binaries
    patchelf
  ];

  # ─── Environment variables ─────────────────────────────────────
  ANDROID_HOME = "${androidSdk}/libexec/android-sdk";
  ANDROID_SDK_ROOT = "${androidSdk}/libexec/android-sdk";
  JAVA_HOME = "${pkgs.jdk21}";

  # ─── FIX: Tell Android Gradle Plugin to use Nix-patched aapt2 ──
  # This is the primary fix. It tells AGP to skip downloading aapt2
  # from Maven and instead use the one from our Nix-provided SDK,
  # which is already patched to run on NixOS.
  GRADLE_OPTS = "-Dandroid.aapt2FromMavenOverride=${androidSdk}/libexec/android-sdk/build-tools/${buildToolsVersion}/aapt2";

  # Use NixOS-packaged Electron for dev mode instead of the npm binary
  ELECTRON_OVERRIDE_DIST_PATH = "${pkgs.electron}/lib/electron";

  # Fix Electron on NixOS — it can't find system libs without this
  LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath [
    pkgs.nss
    pkgs.xorg.libXcomposite
    pkgs.xorg.libXdamage
    pkgs.xorg.libXrandr
    pkgs.xorg.libXcursor
    pkgs.xorg.libXi
    pkgs.xorg.libXext
    pkgs.xorg.libXfixes
    pkgs.xorg.libXrender
    pkgs.xorg.libXtst
    pkgs.xorg.libxcb
    pkgs.xorg.libX11
    pkgs.mesa
    pkgs.libGL
    pkgs.alsa-lib
    pkgs.atk
    pkgs.at-spi2-atk
    pkgs.cups
    pkgs.dbus
    pkgs.expat
    pkgs.glib
    pkgs.gtk3
    pkgs.pango
    pkgs.cairo
    pkgs.libdrm
    pkgs.libxkbcommon
    pkgs.nspr
    pkgs.udev
  ];

  shellHook = ''
    # ─── Fallback fix: patch any already-cached aapt2 binaries ───
    # If Gradle has previously downloaded aapt2 to its cache, those
    # binaries are dynamically linked and broken on NixOS. This finds
    # and patches them with patchelf so they can run.
    echo "Checking for unpatched aapt2 binaries in Gradle cache..."
    for aapt2_bin in $(find ~/.gradle/caches -name "aapt2" -type f 2>/dev/null); do
      if file "$aapt2_bin" | grep -q "dynamically linked"; then
        if ! patchelf --print-interpreter "$aapt2_bin" 2>/dev/null | grep -q "/nix/store"; then
          echo "  Patching: $aapt2_bin"
          patchelf --set-interpreter "$(cat ${pkgs.stdenv.cc}/nix-support/dynamic-linker)" "$aapt2_bin" 2>/dev/null || true
          patchelf --set-rpath "${pkgs.lib.makeLibraryPath [ pkgs.stdenv.cc.cc.lib pkgs.zlib ]}" "$aapt2_bin" 2>/dev/null || true
        fi
      fi
    done

    echo ""
    echo "╔══════════════════════════════════════════════════════╗"
    echo "║  Task Manager — Multiplatform Dev Shell              ║"
    echo "╠══════════════════════════════════════════════════════╣"
    echo "║  node:    $(node --version)                                 ║"
    echo "║  npm:     $(npm --version)                                  ║"
    echo "║  java:    $(java -version 2>&1 | head -1)          ║"
    echo "║  aapt2:   using Nix SDK override                     ║"
    echo "╠══════════════════════════════════════════════════════╣"
    echo "║  Quick start:                                        ║"
    echo "║   npm run install:all     # install deps             ║"
    echo "║   npm run dev:web         # web dev server           ║"
    echo "║   npm run dev:electron    # electron dev             ║"
    echo "║   npm run build:electron:flatpak                    ║"
    echo "║   npm run build:android                              ║"
    echo "╚══════════════════════════════════════════════════════╝"
    echo ""
  '';
}
