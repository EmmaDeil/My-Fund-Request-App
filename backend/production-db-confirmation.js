const path = require('path');

// Detailed environment analysis
console.log("🔍 PRODUCTION DATABASE CONFIRMATION");
console.log("===================================\n");

// Function to load and analyze environment files
function analyzeEnvironment(envName, envPath) {
  console.log(`📊 ${envName.toUpperCase()} ENVIRONMENT:`);
  console.log("=".repeat(envName.length + 14));
  
  try {
    // Clear require cache
    delete require.cache[require.resolve('dotenv')];
    
    // Load specific environment
    const result = require('dotenv').config({ path: envPath });
    
    if (result.error) {
      console.log(`❌ Failed to load ${envPath}: ${result.error.message}`);
      return;
    }
    
    console.log(`✅ Loaded: ${envPath}`);
    console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
    
    // Database analysis
    const mongoUri = process.env.MONGODB_URI;
    if (mongoUri) {
      console.log(`🗄️  Full MongoDB URI: ${mongoUri}`);
      
      // Extract database name from URI
      const dbMatch = mongoUri.match(/\/([^?]+)/);
      const dbName = dbMatch ? dbMatch[1] : 'unknown';
      console.log(`📋 Database Name: ${dbName}`);
      
      // Check if it's dev or prod database
      if (dbName.includes('_dev')) {
        console.log(`🌱 Database Type: DEVELOPMENT`);
      } else if (dbName.includes('_prod')) {
        console.log(`🚀 Database Type: PRODUCTION`);
      } else {
        console.log(`❓ Database Type: UNKNOWN/CUSTOM`);
      }
    } else {
      console.log(`❌ MONGODB_URI not set`);
    }
    
    // Other important configs
    console.log(`📧 Email Host: ${process.env.EMAIL_HOST || 'not set'}`);
    console.log(`📧 Email User: ${process.env.EMAIL_USER || 'not set'}`);
    console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'not set'}`);
    console.log(`🔑 JWT Secret: ${process.env.JWT_SECRET ? 'SET' : 'NOT SET'}`);
    
  } catch (error) {
    console.log(`❌ Error analyzing ${envName}: ${error.message}`);
  }
  
  console.log("");
}

// Analyze both environments
analyzeEnvironment("development", "./.env");
analyzeEnvironment("production", "./.env.production");

// Check what the production deployment might be using
console.log("🚀 PRODUCTION DEPLOYMENT ANALYSIS:");
console.log("==================================");

console.log("💡 Potential Production Database Locations:");
console.log("1. Local .env.production file points to: fundrequest_prod");
console.log("2. Render deployment might use different environment variables");
console.log("3. Render might override MONGODB_URI with its own configuration");

console.log("\n🔍 To verify actual production database:");
console.log("1. Check Render dashboard environment variables");
console.log("2. Check Render deployment logs for database connection messages");
console.log("3. Submit a test request through production frontend");
console.log("4. Monitor both fundrequest_dev and fundrequest_prod databases");

console.log("\n📊 Current Database Status Check:");
console.log("=================================");

// Test connection to both databases
async function testDatabases() {
  const mongoose = require('mongoose');
  
  const databases = [
    { name: 'fundrequest_dev', label: 'Development' },
    { name: 'fundrequest_prod', label: 'Production' }
  ];
  
  for (const db of databases) {
    try {
      console.log(`🔗 Testing ${db.label} database (${db.name})...`);
      
      const uri = `mongodb+srv://fundrequest:fundrequest223@requests.wbonoix.mongodb.net/${db.name}?retryWrites=true&w=majority&appName=Requests`;
      const connection = mongoose.createConnection(uri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000
      });
      
      // Define schema for this connection
      const fundRequestSchema = new mongoose.Schema({
        id: String,
        purpose: String,
        amount: Number,
        currency: String,
        status: String,
        created_at: Date
      });
      
      const FundRequest = connection.model('FundRequest', fundRequestSchema);
      
      // Get count and recent requests
      const count = await FundRequest.countDocuments();
      const recent = await FundRequest.find({}).sort({ created_at: -1 }).limit(3);
      
      console.log(`✅ Connected to ${db.name}`);
      console.log(`📊 Total requests: ${count}`);
      
      if (recent.length > 0) {
        console.log(`📋 Most recent request: ${recent[0].id} - ${recent[0].purpose} (${new Date(recent[0].created_at).toLocaleString()})`);
      } else {
        console.log(`📋 No requests found`);
      }
      
      await connection.close();
      
    } catch (error) {
      console.log(`❌ Failed to connect to ${db.name}: ${error.message}`);
    }
    console.log("");
  }
}

// Run the database test
testDatabases().then(() => {
  console.log("🎯 RECOMMENDATION:");
  console.log("==================");
  console.log("1. Submit a NEW test request through your production frontend");
  console.log("2. Immediately run: node diagnostic.js list both");
  console.log("3. Check which database receives the new request");
  console.log("4. This will confirm where production is actually saving data");
}).catch(console.error);