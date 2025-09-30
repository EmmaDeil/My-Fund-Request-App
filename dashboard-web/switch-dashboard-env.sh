#!/bin/bash

# Dashboard Environment Switcher
# Usage: ./switch-dashboard-env.sh [dev|prod]

ENV=$1

if [ -z "$ENV" ]; then
    echo "❌ Please specify environment: dev or prod"
    echo "Usage: ./switch-dashboard-env.sh [dev|prod]"
    exit 1
fi

case $ENV in
    "dev"|"development")
        echo "🔄 Switching dashboard to DEVELOPMENT environment..."
        cp .env.example .env
        sed -i 's|mongodb://localhost:27017/fundRequestDB|mongodb+srv://fundrequest:fundrequest223@requests.wbonoix.mongodb.net/fundrequest_dev?retryWrites=true&w=majority&appName=Requests|g' .env
        sed -i 's|NODE_ENV=production|NODE_ENV=development|g' .env
        sed -i 's|your-email@gmail.com|eclefzy@gmail.com|g' .env
        sed -i 's|your-app-password|crmn cgos dfwb fvcs|g' .env
        echo "✅ Dashboard configured for DEVELOPMENT environment"
        echo "📊 Database: fundrequest_dev"
        ;;
    "prod"|"production")
        echo "🔄 Switching dashboard to PRODUCTION environment..."
        cp .env.production .env
        echo "✅ Dashboard configured for PRODUCTION environment"
        echo "📊 Database: fundrequest_prod"
        ;;
    *)
        echo "❌ Invalid environment: $ENV"
        echo "Valid options: dev, prod"
        exit 1
        ;;
esac

echo ""
echo "🔍 Current Configuration:"
node -e "
require('dotenv').config();
const dbUri = process.env.MONGODB_URI;
const dbName = dbUri ? dbUri.split('/').pop()?.split('?')[0] : 'unknown';
console.log('📊 Database:', dbName);
console.log('🌍 Environment:', process.env.NODE_ENV);
console.log('📍 Port:', process.env.PORT);
"