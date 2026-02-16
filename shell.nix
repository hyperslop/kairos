# shell.nix — Drop into a dev shell with all dependencies for building
# both the Electron desktop app and the Capacitor Android app.
#
# Usage:  nix-shell           (from the repo root)
#    or:  nix develop         (if using flakes, see flake.nix below)
#
# This gives you: Node.js, npm, JDK 17, Android SDK, and Electron build deps.

{ pkgs ? import <nixpkgs> {
    config = {
      allowUnfree = true;       # Android SDK has a proprietary license
      android_sdk.accept_license = true;
    };
  }
}:

let
  androidComposition = pkgs.androidenv.composeAndroidPackages {
    # These are the Android SDK components needed to build a Capacitor app
    platformVersions = [ "34" ];
    buildToolsVersions = [ "34.0.0" ];
    includeEmulator = true;
    emulatorVersion = "35.2.10";
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
    # electron-builder needs these to package flatpak/deb
    dpkg
    fakeroot
    rpm
    flatpak
    flatpak-builder

    # NixOS-compatible Electron for dev mode
    # (the npm-installed electron binary is dynamically linked and won't run on NixOS)
    electron

    # Electron runtime dependencies on NixOS
    # (NixOS doesn't have /lib64/ld-linux so Electron needs these)
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
    jdk17
    androidSdk
    gradle
  ];

  # ─── Environment variables ─────────────────────────────────────
  ANDROID_HOME = "${androidSdk}/libexec/android-sdk";
  ANDROID_SDK_ROOT = "${androidSdk}/libexec/android-sdk";
  JAVA_HOME = "${pkgs.jdk17}";

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
    echo ""
    echo "╔══════════════════════════════════════════════╗"
    echo "║  Task Manager — Multiplatform Dev Shell      ║"
    echo "╠══════════════════════════════════════════════╣"
    echo "║  node:    $(node --version)                         ║"
    echo "║  npm:     $(npm --version)                          ║"
    echo "║  java:    $(java -version 2>&1 | head -1)  ║"
    echo "╠══════════════════════════════════════════════╣"
    echo "║  Quick start:                                ║"
    echo "║   npm run install:all     # install deps     ║"
    echo "║   npm run dev:web         # web dev server   ║"
    echo "║   npm run dev:electron    # electron dev     ║"
    echo "║   npm run build:electron:flatpak            ║"
    echo "║   npm run build:android                      ║"
    echo "╚══════════════════════════════════════════════╝"
    echo ""
  '';
}
