#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="${DEPLOY_HOST:-bevel-vps}"
SSH="ssh -i $HOME/.ssh/bevel_hosting_key -o IdentitiesOnly=yes"
SCP="scp -i $HOME/.ssh/bevel_hosting_key -o IdentitiesOnly=yes"

DOMAIN="${DOMAIN:-bevel.sa}"
WWW_DOMAIN="${WWW_DOMAIN:-www.bevel.sa}"
CERT_EMAIL="${CERT_EMAIL:-e.alswaileh@gmail.com}"

echo "→ Checking DNS for $DOMAIN"
IP="$(dig +short "$DOMAIN" A | tail -1)"
if [ -z "$IP" ]; then
  echo "ERROR: No A record found for $DOMAIN"
  exit 1
fi
echo "  $DOMAIN → $IP"

echo "→ Installing certbot on server (if needed)"
$SSH "$HOST" "\
  export DEBIAN_FRONTEND=noninteractive && \
  apt-get update -qq && \
  apt-get install -y -qq certbot python3-certbot-nginx && \
  mkdir -p /var/www/certbot"

echo "→ Applying temporary HTTP nginx config"
$SCP "$ROOT/deploy/nginx/bevel-http.conf" "$HOST:/etc/nginx/sites-available/bevel"
$SSH "$HOST" "\
  ln -sf /etc/nginx/sites-available/bevel /etc/nginx/sites-enabled/bevel && \
  rm -f /etc/nginx/sites-enabled/default && \
  nginx -t && \
  systemctl reload nginx"

echo "→ Requesting Let's Encrypt certificate"
$SSH "$HOST" "\
  certbot certonly --webroot \
    -w /var/www/certbot \
    -d '$DOMAIN' \
    -d '$WWW_DOMAIN' \
    --email '$CERT_EMAIL' \
    --agree-tos \
    --non-interactive \
    --keep-until-expiring && \
  cp /usr/lib/python3/dist-packages/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf /etc/letsencrypt/ && \
  cp /usr/lib/python3/dist-packages/certbot/ssl-dhparams.pem /etc/letsencrypt/"

echo "→ Applying HTTPS nginx config"
$SCP "$ROOT/deploy/nginx/bevel.conf" "$HOST:/etc/nginx/sites-available/bevel"
$SSH "$HOST" "\
  nginx -t && \
  systemctl reload nginx && \
  systemctl enable certbot.timer 2>/dev/null || true && \
  systemctl start certbot.timer 2>/dev/null || true"

echo "→ Enabling secure cookies for HTTPS admin login"
$SSH "$HOST" "\
  cd /var/www/bevel && \
  if grep -q '^COOKIE_SECURE=' .env.local 2>/dev/null; then \
    sed -i 's/^COOKIE_SECURE=.*/COOKIE_SECURE=true/' .env.local; \
  else \
    echo 'COOKIE_SECURE=true' >> .env.local; \
  fi && \
  systemctl restart bevel"

echo "✓ Domain setup complete"
echo "  Site:  https://$DOMAIN/"
echo "  Site:  https://$WWW_DOMAIN/"
echo "  Admin: https://$DOMAIN/bevel-admin"
