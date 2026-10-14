#!/usr/bin/env bash
# Live checks against the production site: DNS, TLS, redirects, security
# headers and key pages. Run by .github/workflows/site-check.yml.
# FAIL lines make the job red; WARN lines are informational.
set -uo pipefail
DOMAIN="${1:-workswithwhat.com}"
BASE="https://$DOMAIN"
fails=0
ok()   { echo "  OK    $*"; }
warn() { echo "  WARN  $*"; }
fail() { echo "  FAIL  $*"; fails=$((fails + 1)); }
# Explain a non-2xx answer: Cloudflare marks bot challenges with cf-mitigated.
why() {
  curl -sSI --max-time 20 "$1" | tr -d '\r' | grep -iE '^(HTTP/|server:|cf-mitigated:|cf-ray:)' | sed 's/^/          /'
}

echo "== DNS"
a=$(dig +short A "$DOMAIN" @1.1.1.1 | sort | tr '\n' ' ')
[ -n "$a" ] && ok "A: $a" || fail "no A records"
aaaa=$(dig +short AAAA "$DOMAIN" @1.1.1.1 | sort | tr '\n' ' ')
[ -n "$aaaa" ] && ok "AAAA: $aaaa" || warn "no AAAA records"
www=$(dig +short "www.$DOMAIN" @1.1.1.1 | tr '\n' ' ')
[ -n "$www" ] && ok "www resolves: $www" || fail "www does not resolve"
spf=$(dig +short TXT "$DOMAIN" @1.1.1.1 | grep -i 'v=spf1')
[ -n "$spf" ] && ok "SPF: $spf" || warn "no SPF record"
dmarc=$(dig +short TXT "_dmarc.$DOMAIN" @1.1.1.1)
[ -n "$dmarc" ] && ok "DMARC: $dmarc" || warn "no DMARC record"
if dig +dnssec "$DOMAIN" @1.1.1.1 | grep -q 'flags:.* ad'; then ok "DNSSEC validated"; else warn "DNSSEC not validated (not enabled yet?)"; fi

echo "== TLS"
if echo | openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" -tls1_2 >/dev/null 2>&1; then ok "TLS 1.2 accepted"; else fail "TLS 1.2 handshake failed"; fi
if echo | openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" -tls1_1 >/dev/null 2>&1; then warn "TLS 1.1 still accepted"; else ok "TLS 1.1 rejected"; fi
cert=$(echo | openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" 2>/dev/null | openssl x509 -noout -issuer -enddate 2>/dev/null | tr '\n' ' ')
[ -n "$cert" ] && ok "certificate: $cert" || fail "could not read certificate"

echo "== Redirects"
for u in "http://$DOMAIN/" "http://www.$DOMAIN/" "https://www.$DOMAIN/"; do
  final=$(curl -sSL -o /dev/null -w '%{url_effective} %{http_code}' --max-time 20 "$u")
  [ "$final" = "$BASE/ 200" ] && ok "$u -> $final" || fail "$u -> $final (expected $BASE/ 200)"
done

echo "== Security headers ($BASE/)"
headers=$(curl -sSI --max-time 20 "$BASE/")
echo "$headers" | grep -qi '^server: cloudflare' && ok "served through Cloudflare proxy" || warn "not proxied by Cloudflare"
for h in x-content-type-options x-frame-options referrer-policy permissions-policy; do
  v=$(echo "$headers" | grep -i "^$h:" | head -1 | tr -d '\r')
  [ -n "$v" ] && ok "$v" || fail "missing header $h"
done
cookies=$(echo "$headers" | grep -i '^set-cookie:' | cut -d= -f1 | tr -d '\r' | tr '\n' ' ')
[ -z "$cookies" ] && ok "no cookies set (privacy policy says none)" || warn "cookies set: $cookies (check the privacy policy still matches)"
hsts=$(echo "$headers" | grep -i '^strict-transport-security:' | tr -d '\r')
[ -n "$hsts" ] && ok "$hsts" || warn "no HSTS header yet"
curl -sS --max-time 20 "$BASE/" | grep -q 'http-equiv="Content-Security-Policy"' && ok "CSP meta tag present" || fail "CSP meta tag missing"

echo "== Caching (Cloudflare edge)"
# Second request of each URL, so a cacheable file shows HIT. Informational:
# the cache rules live in the Cloudflare dashboard (docs/cloudflare-cache.md).
cache_status() {
  curl -sS -o /dev/null --max-time 20 "$1"
  curl -sSI --max-time 20 "$1" | tr -d '\r' | grep -iE '^(cf-cache-status|cache-control|age):' | tr '\n' ' '
}
css=$(curl -sS --max-time 20 "$BASE/" | grep -o '/_astro/[^"]*\.css' | head -1)
if [ -n "$css" ]; then
  # A cached home page must never point at CSS a newer deploy removed
  code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 20 "$BASE$css")
  [ "$code" = 200 ] && ok "stylesheet linked from / -> $code" || fail "stylesheet $css linked from / -> $code (stale cached HTML? purge the cache)"
fi
for u in / /smart-plugs/ /api/devices.json /llms.txt ${css:+$css}; do
  v=$(cache_status "$BASE$u")
  case "$v" in
    *[Hh][Ii][Tt]*) ok "$u $v" ;;
    *) warn "$u ${v:-no cache headers} (not cached at the edge)" ;;
  esac
done

echo "== Pages"
check() {
  code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 20 "$BASE$1")
  if [ "$code" = "$2" ]; then ok "$1 -> $code"; else fail "$1 -> $code (expected $2)"; why "$BASE$1"; fi
}
check / 200
check /smart-plugs/ 200
check /smart-plugs/eve-energy-matter-us/ 200
check /works-with/apple-home/ 200
check /methodology/ 200
check /es/ 200
check /es/enchufes-inteligentes/ 200
check /es/eu/enchufes-inteligentes/ 200
check /sitemap-index.xml 200
check /robots.txt 200
check /.well-known/security.txt 200
check /llms.txt 200
check /llms-full.txt 200
check /api/smart-plugs.json 200
check /og.png 200
check /this-page-does-not-exist/ 404

echo "== AI and search crawlers"
robots=$(curl -sS --max-time 20 "$BASE/robots.txt")
echo "$robots" | grep -q 'llms.txt' && ok "robots.txt is ours" || warn "robots.txt differs from the repo (Cloudflare managed robots.txt?)"
echo "$robots" | grep -iE '^(user-agent|disallow):' | grep -iB1 '^disallow: /$' | sed 's/^/          /'
for ua in "OAI-SearchBot" "ClaudeBot" "PerplexityBot" "Googlebot" "bingbot"; do
  code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 20 -A "Mozilla/5.0 (compatible; $ua)" "$BASE/smart-plugs/")
  [ "$code" = 200 ] && ok "$ua user agent -> $code" || warn "$ua user agent -> $code (blocked at the edge?)"
done
count=$(curl -sS --max-time 20 "$BASE/api/smart-plugs.json" | jq '.count' 2>/dev/null)
[ -n "$count" ] && [ "$count" -gt 0 ] && ok "JSON API lists $count devices" || fail "JSON API unreadable or empty"

echo
if [ "$fails" -gt 0 ]; then echo "$fails check(s) failed"; exit 1; fi
echo "All required checks passed"
