require("dotenv").config();
const mongoose = require("mongoose");

class DatabaseConnection {
  constructor() {
    this.connection = null;
  }

  async connect() {
    try {
      if (this.connection) {
        return this.connection;
      }

      const mongoUri = process.env.MONGODB_URI;
      if (!mongoUri) {
        throw new Error("MONGODB_URI not found in environment variables");
      }

      console.log("🔌 Connecting to MongoDB...");

      this.connection = await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });

      console.log("✅ Successfully connected to MongoDB");
      console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);
      console.log(`🌐 Host: ${mongoose.connection.host}`);

      return this.connection;
    } catch (error) {
      console.error("❌ MongoDB connection error:", error.message);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.disconnect();
        this.connection = null;
        console.log("🔌 Disconnected from MongoDB");
      }
    } catch (error) {
      console.error("❌ Error disconnecting from MongoDB:", error.message);
      throw error;
    }
  }

  isConnected() {
    return mongoose.connection.readyState === 1;
  }

  getConnection() {
    return this.connection;
  }

  async getCollectionStats() {
    try {
      const db = mongoose.connection.db;
      const collections = await db.listCollections().toArray();

      const stats = {};
      for (const collection of collections) {
        const collectionStats = await db.collection(collection.name).stats();
        stats[collection.name] = {
          documentCount: collectionStats.count,
          size: collectionStats.size,
          avgObjSize: collectionStats.avgObjSize,
          indexes: collectionStats.nindexes,
        };
      }

      return stats;
    } catch (error) {
      console.error("❌ Error getting collection stats:", error.message);
      return {};
    }
  }
}

module.exports = new DatabaseConnection();
