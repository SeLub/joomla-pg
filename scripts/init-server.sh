#!/bin/bash
# scripts/init-server.sh — запускать вручную при первом развёртывании

set -e

SERVER_IP="91.99.58.149"
PROJECT_DIR="/opt/joomla-pg"

echo "🔐 Generating secure passwords..."
POSTGRES_PASS=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 48)
JOOMLA_PASS=$(openssl rand -base64 24)

echo "📁 Creating project directory on $SERVER_IP..."
ssh root@$SERVER_IP "mkdir -p $PROJECT_DIR"

echo "📝 Creating .env file..."
ssh root@$SERVER_IP "cat > $PROJECT_DIR/.env << EOF
POSTGRES_USER=appuser
POSTGRES_PASSWORD=$POSTGRES_PASS
POSTGRES_DB=appdb
DATABASE_URL=postgres://appuser:$POSTGRES_PASS@joomla-pg:5432/appdb
REDIS_HOST=joomla-redis
NODE_ENV=production
PORT=3000
JWT_SHARED_SECRET=$JWT_SECRET
JOOMLA_DB_PASSWORD=$JOOMLA_PASS
EOF
chmod 600 $PROJECT_DIR/.env"

echo "✅ .env created. Save these credentials securely:"
echo "PostgreSQL password: $POSTGRES_PASS"
echo "JWT secret: $JWT_SECRET"
echo "Joomla DB password: $JOOMLA_PASS"