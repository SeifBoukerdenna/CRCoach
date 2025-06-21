#!/bin/bash
# setup-production-nginx.sh - Configure existing Nginx for Royal Trainer

set -e

echo "🚀 Setting up production Nginx reverse proxy for Royal Trainer..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root: sudo ./setup-production-nginx.sh"
    exit 1
fi

# Check if Nginx is installed
if ! command -v nginx &> /dev/null; then
    echo "❌ Nginx is not installed. Installing..."
    apt update && apt install -y nginx
fi

# Check if Nginx is running
if ! systemctl is-active --quiet nginx; then
    echo "⚠️  Nginx is not running. Starting it..."
    systemctl start nginx
    systemctl enable nginx
fi

# Get domain name from user
echo ""
read -p "Enter your domain name (e.g., yourdomain.com): " DOMAIN_NAME

if [ -z "$DOMAIN_NAME" ]; then
    echo "❌ Domain name is required"
    exit 1
fi

# Check if SSL certificates exist
SSL_CERT="/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem"
SSL_KEY="/etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem"

if [ ! -f "$SSL_CERT" ] || [ ! -f "$SSL_KEY" ]; then
    echo "⚠️  SSL certificates not found for $DOMAIN_NAME"
    echo "   Expected: $SSL_CERT"
    echo "   Expected: $SSL_KEY"
    echo ""
    echo "🔧 To get SSL certificates with Let's Encrypt:"
    echo "   sudo apt install certbot python3-certbot-nginx"
    echo "   sudo certbot --nginx -d $DOMAIN_NAME"
    echo ""
    read -p "Continue without SSL? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
    USE_SSL=false
else
    echo "✅ Found SSL certificates for $DOMAIN_NAME"
    USE_SSL=true
fi

# Create Nginx config
CONFIG_FILE="/etc/nginx/sites-available/royal-trainer"

echo "📝 Creating Nginx configuration..."

if [ "$USE_SSL" = true ]; then
    # SSL configuration
    cat > "$CONFIG_FILE" << EOF
# Royal Trainer Production Configuration
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN_NAME www.$DOMAIN_NAME;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN_NAME www.$DOMAIN_NAME;

    ssl_certificate $SSL_CERT;
    ssl_certificate_key $SSL_KEY;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    location /ws/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
EOF
else
    # HTTP only configuration
    cat > "$CONFIG_FILE" << EOF
# Royal Trainer HTTP Configuration (No SSL)
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN_NAME www.$DOMAIN_NAME;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /ws/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
    }
}
EOF
fi

# Enable the site
echo "🔗 Enabling Royal Trainer site..."
ln -sf "$CONFIG_FILE" /etc/nginx/sites-enabled/royal-trainer

# Test Nginx configuration
echo "🧪 Testing Nginx configuration..."
if nginx -t; then
    echo "✅ Nginx configuration is valid"
else
    echo "❌ Nginx configuration test failed"
    exit 1
fi

# Reload Nginx
echo "🔄 Reloading Nginx..."
systemctl reload nginx

echo ""
echo "🎉 Production Nginx setup complete!"
echo ""
echo "📋 Summary:"
echo "   Domain: $DOMAIN_NAME"
echo "   SSL: $USE_SSL"
echo "   Proxy: https://$DOMAIN_NAME → http://127.0.0.1:8000"
echo ""
echo "🔧 Next steps:"
echo "   1. Update your .env file:"
if [ "$USE_SSL" = true ]; then
    echo "      DISCORD_REDIRECT_URI=https://$DOMAIN_NAME/auth/callback"
    echo "      FRONTEND_URL=https://$DOMAIN_NAME"
else
    echo "      DISCORD_REDIRECT_URI=http://$DOMAIN_NAME/auth/callback"
    echo "      FRONTEND_URL=http://$DOMAIN_NAME"
fi
echo "   2. Update Discord app redirect URI in Discord Developer Portal"
echo "   3. Restart your Docker containers:"
echo "      cd /home/malikmacbook/CRCoach/server && ./docker-start.sh"
echo ""
echo "🌐 Your app will be available at: $([ "$USE_SSL" = true ] && echo "https" || echo "http")://$DOMAIN_NAME"
