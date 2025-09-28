const mongoose = require("mongoose");
const path = require("path");

// Load environment-specific configuration
const loadEnvironmentConfig = () => {
  const env = process.env.NODE_ENV || "development";

  // Clear any existing dotenv configuration
  delete require.cache[require.resolve("dotenv")];

  if (env === "production") {
    console.log("🚀 Loading PRODUCTION configuration...");
    const result = require("dotenv").config({ path: "./.env.production" });
    if (result.error) {
      console.error("❌ Error loading .env.production:", result.error);
      // Fallback to default .env
      require("dotenv").config();
    }
  } else {
    console.log("🌱 Loading DEVELOPMENT configuration...");
    require("dotenv").config();
  }

  console.log(`🌍 Environment: ${env}`);
  console.log(
    `🗄️ Database: ${
      process.env.MONGODB_URI?.replace(/:[^:@]*@/, ":***@") || "NOT SET"
    }`
  );
};

// Initialize environment first
loadEnvironmentConfig();

// Fund Request Schema (same as original)
const fundRequestSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    requester_name: { type: String, required: true, trim: true },
    requester_email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    approver_email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: {
      type: String,
      default: "NGN",
      enum: ["NGN", "USD", "EUR", "GBP", "CAD"],
    },
    purpose: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    department: { type: String, trim: true },
    category: { type: String, trim: true },
    urgent: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    approval_token: { type: String, required: true, unique: true, index: true },
    approved_by: { type: String, trim: true },
    approved_at: Date,
    comments: { type: String, trim: true },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

const FundRequest = mongoose.model("FundRequest", fundRequestSchema);

// Database connection
const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI not found in environment variables");
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });

    console.log(`📊 Connected to MongoDB: ${conn.connection.host}`);
    console.log(`📋 Database: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    throw error;
  }
};

// Database operations
const mongoDatabase = {
  init: async () => {
    return await connectDB();
  },

  getFundRequestById: async (id) => {
    try {
      const request = await FundRequest.findOne({ id });
      return request;
    } catch (error) {
      console.error("❌ Error fetching fund request:", error.message);
      throw error;
    }
  },

  getAllFundRequests: async () => {
    try {
      const requests = await FundRequest.find({}).sort({ created_at: -1 });
      return requests;
    } catch (error) {
      console.error("❌ Error fetching all fund requests:", error.message);
      throw error;
    }
  },

  createFundRequest: async (requestData) => {
    try {
      const newRequest = new FundRequest(requestData);
      const savedRequest = await newRequest.save();
      console.log(`✅ Fund request saved: ${savedRequest.id}`);
      return savedRequest;
    } catch (error) {
      console.error("❌ Error creating fund request:", error.message);
      throw error;
    }
  },
};

module.exports = mongoDatabase;
