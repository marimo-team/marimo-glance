#!/usr/bin/env bash
#
# Pack and sign the built Chrome extension into a .crx for Chrome Web Store
# "Verified CRX Uploads". The Web Store rejects any package not signed with the
# private key whose public half you registered on the dashboard, then re-signs
# the verified package with Google's own key before publishing.
#
# Two signers are supported:
#   crx3   (default) pure-Node signer run via npx — no browser needed.
#   chrome           Chrome's built-in --pack-extension — used when you pass
#                    --chrome or set CHROME_BIN.
#
# Docs:
#   Verified uploads overview: https://developer.chrome.com/blog/verified-uploads-cws
#   Sign & upload a package:   https://developer.chrome.com/docs/webstore/update
#
# Usage:
#   scripts/pack-crx.sh --key <privatekey.pem> [--chrome <chrome-binary>] [--out <file.crx>]

set -euo pipefail

DOCS_VERIFIED="https://developer.chrome.com/blog/verified-uploads-cws"
DOCS_UPDATE="https://developer.chrome.com/docs/webstore/update"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="$REPO_ROOT/apps/extension/output/chrome-mv3"
OUT_CRX="$REPO_ROOT/apps/extension/output/marimo-glance.crx"
CHROME_BIN="${CHROME_BIN:-}"
KEY="${CRX_KEY:-}"

usage() {
	cat <<EOF
Pack and sign the Chrome extension into a signed .crx.

Usage:
  scripts/pack-crx.sh --key <privatekey.pem> [options]

Options:
  -k, --key <path>      Verified-upload private key (.pem). Env: CRX_KEY
  -c, --chrome <path>   Sign with this Chrome/Chromium binary instead of the
                        default npx crx3 signer. Env: CHROME_BIN
  -d, --dir <path>      Built extension directory to pack.
                        Default: apps/extension/output/chrome-mv3
  -o, --out <path>      Output .crx path.
                        Default: apps/extension/output/marimo-glance.crx
  -h, --help            Show this help.

By default the extension is signed with the pure-Node 'crx3' signer via npx,
so no browser is required. Pass --chrome (or set CHROME_BIN) to sign with
Chrome's --pack-extension instead.

The private key is the one you registered under Verified CRX Uploads:
  $DOCS_VERIFIED
Every Web Store update must be signed with the same key:
  $DOCS_UPDATE
EOF
}

die() {
	echo "error: $1" >&2
	if [ -n "${2:-}" ]; then
		echo "       see: $2" >&2
	fi
	exit 1
}

while [ $# -gt 0 ]; do
	case "$1" in
	-k | --key)
		KEY="${2:-}"
		shift 2
		;;
	-c | --chrome)
		CHROME_BIN="${2:-}"
		shift 2
		;;
	-d | --dir)
		BUILD_DIR="${2:-}"
		shift 2
		;;
	-o | --out)
		OUT_CRX="${2:-}"
		shift 2
		;;
	-h | --help)
		usage
		exit 0
		;;
	*)
		die "unknown argument: $1" ""
		;;
	esac
done

if [ -z "$KEY" ]; then
	die "no signing key. Pass --key <privatekey.pem> or set CRX_KEY." "$DOCS_VERIFIED"
fi
if [ ! -f "$KEY" ]; then
	die "signing key not found: '$KEY'." "$DOCS_VERIFIED"
fi

# Guard against committing the key: warn if it lives inside the repo.
case "$(cd "$(dirname "$KEY")" && pwd)" in
"$REPO_ROOT"*)
	echo "warning: signing key is inside the repo tree — keep it out of version control." >&2
	;;
esac

if [ ! -d "$BUILD_DIR" ]; then
	die "build directory not found: '$BUILD_DIR'. Build first: pnpm --filter @marimo/extension build" "$DOCS_UPDATE"
fi
if [ ! -f "$BUILD_DIR/manifest.json" ]; then
	die "'$BUILD_DIR' has no manifest.json — is it a built extension? Build first: pnpm --filter @marimo/extension build" "$DOCS_UPDATE"
fi

rm -f "$OUT_CRX"

if [ -n "$CHROME_BIN" ]; then
	# --- Chrome signer -------------------------------------------------------
	if [ ! -x "$CHROME_BIN" ]; then
		die "Chrome binary not found or not executable: '$CHROME_BIN'." "$DOCS_UPDATE"
	fi
	echo "Packing with Chrome: $CHROME_BIN"
	echo "  key: $KEY"
	# Chrome writes the .crx as a sibling of the packed dir, named after it,
	# and ignores any custom output path — so pack, then move to --out.
	CHROME_OUT="$(dirname "$BUILD_DIR")/$(basename "$BUILD_DIR").crx"
	rm -f "$CHROME_OUT"
	"$CHROME_BIN" \
		--pack-extension="$BUILD_DIR" \
		--pack-extension-key="$KEY" \
		--no-message-box >/dev/null 2>&1 ||
		die "Chrome failed to pack the extension. Check the key and build directory." "$DOCS_UPDATE"
	[ -f "$CHROME_OUT" ] || die "Chrome exited without producing a .crx. Verify the key matches the one registered on the dashboard." "$DOCS_VERIFIED"
	mv "$CHROME_OUT" "$OUT_CRX"
else
	# --- crx3 signer (default, no browser) -----------------------------------
	command -v npx >/dev/null 2>&1 || die "npx not found — install Node.js, or pass --chrome to sign with Chrome instead." "$DOCS_UPDATE"
	echo "Packing with crx3 (npx, no browser)"
	echo "  key: $KEY"
	# crx3 reuses an existing key file rather than generating one, and always
	# overwrites the .crx. Requires Node.js 22+.
	npx --yes crx3@2 "$BUILD_DIR" --key "$KEY" --crx "$OUT_CRX" ||
		die "crx3 failed to pack the extension. Ensure Node.js is 22+ and the key is a valid RSA private key." "$DOCS_VERIFIED"
fi

[ -f "$OUT_CRX" ] || die "no .crx was produced at '$OUT_CRX'." "$DOCS_VERIFIED"

echo "Signed CRX ready: $OUT_CRX"
echo "Upload it via 'Upload New Package' on the dashboard, or the Web Store API."
echo "  $DOCS_UPDATE"
