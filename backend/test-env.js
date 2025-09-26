// Test script to check environment variables
console.log("🔍 Environment Variables Check:");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("EMAIL_HOST:", process.env.EMAIL_HOST);
console.log("EMAIL_PORT:", process.env.EMAIL_PORT);
console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("EMAIL_PASS:", process.env.EMAIL_PASS ? "***HIDDEN***" : "NOT SET");
console.log("FRONTEND_URL:", process.env.FRONTEND_URL);
console.log("MONGODB_URI:", process.env.MONGODB_URI ? "***HIDDEN***" : "NOT SET");