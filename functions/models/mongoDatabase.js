const mongoose = require("mongoose");
require("dotenv").config();

// MongoDB connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`📊 Connected to MongoDB: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    process.exit(1);
  }
};

// Fund Request Schema
const fundRequestSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    requester_name: {
      type: String,
      required: true,
      trim: true,
    },
    requester_email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "USD",
      uppercase: true,
    },
    purpose: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    approver_email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "denied"],
      default: "pending",
    },
    approval_token: {
      type: String,
      unique: true,
      sparse: true, // Allows null values while maintaining uniqueness for non-null values
    },
    approved_at: {
      type: Date,
    },
    approved_by: {
      type: String,
      trim: true,
    },
    approval_notes: {
      type: String,
      trim: true,
    },
    department: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
    },
    urgent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    versionKey: false, // Disable __v field
  }
);

// Indexes for better performance
fundRequestSchema.index({ requester_email: 1, created_at: -1 });
fundRequestSchema.index({ approver_email: 1, status: 1 });
fundRequestSchema.index({ status: 1, created_at: -1 });
fundRequestSchema.index({ approval_token: 1 }, { sparse: true });

// Pre-save middleware to ensure updated_at is always current
fundRequestSchema.pre("save", function (next) {
  this.updated_at = new Date();
  next();
});

// Create the model
const FundRequest = mongoose.model("FundRequest", fundRequestSchema);

// Database class with MongoDB operations
class Database {
  constructor() {
    this.connected = false;
  }

  async init() {
    try {
      await connectDB();
      this.connected = true;
      return true;
    } catch (error) {
      console.error("Failed to initialize database:", error);
      throw error;
    }
  }

  // Fund Request operations
  async createFundRequest(requestData) {
    try {
      const fundRequest = new FundRequest(requestData);
      const saved = await fundRequest.save();
      console.log(`✅ Fund request created with ID: ${saved.id}`);
      return saved;
    } catch (error) {
      console.error("❌ Error creating fund request:", error.message);
      throw error;
    }
  }

  async getFundRequestById(id) {
    try {
      const request = await FundRequest.findOne({ id }).lean();
      return request;
    } catch (error) {
      console.error("❌ Error fetching fund request:", error.message);
      throw error;
    }
  }

  async getFundRequestByToken(token) {
    try {
      const request = await FundRequest.findOne({
        approval_token: token,
      }).lean();
      return request;
    } catch (error) {
      console.error("❌ Error fetching fund request by token:", error.message);
      throw error;
    }
  }

  async updateFundRequestStatus(id, status, approvedBy = null, notes = null) {
    try {
      const updateData = {
        status,
        updated_at: new Date(),
      };

      if (status === "approved" || status === "denied") {
        updateData.approved_at = new Date();
        updateData.approved_by = approvedBy;
        updateData.approval_notes = notes;
      }

      const updated = await FundRequest.findOneAndUpdate({ id }, updateData, {
        new: true,
        runValidators: true,
      }).lean();

      if (!updated) {
        throw new Error("Fund request not found");
      }

      console.log(`✅ Fund request ${id} status updated to: ${status}`);
      return updated;
    } catch (error) {
      console.error("❌ Error updating fund request status:", error.message);
      throw error;
    }
  }

  async getAllFundRequests(filters = {}) {
    try {
      const query = {};

      // Apply filters
      if (filters.status) {
        query.status = filters.status;
      }
      if (filters.requester_email) {
        query.requester_email = filters.requester_email;
      }
      if (filters.approver_email) {
        query.approver_email = filters.approver_email;
      }
      if (filters.urgent !== undefined) {
        query.urgent = filters.urgent;
      }

      const requests = await FundRequest.find(query)
        .sort({ created_at: -1 })
        .limit(filters.limit || 100)
        .lean();

      return requests;
    } catch (error) {
      console.error("❌ Error fetching fund requests:", error.message);
      throw error;
    }
  }

  async getFundRequestsByRequester(requesterEmail, limit = 50) {
    try {
      const requests = await FundRequest.find({
        requester_email: requesterEmail,
      })
        .sort({ created_at: -1 })
        .limit(limit)
        .lean();

      return requests;
    } catch (error) {
      console.error("❌ Error fetching requests by requester:", error.message);
      throw error;
    }
  }

  async getFundRequestsByApprover(approverEmail, status = null, limit = 50) {
    try {
      const query = { approver_email: approverEmail };
      if (status) {
        query.status = status;
      }

      const requests = await FundRequest.find(query)
        .sort({ created_at: -1 })
        .limit(limit)
        .lean();

      return requests;
    } catch (error) {
      console.error("❌ Error fetching requests by approver:", error.message);
      throw error;
    }
  }

  async deleteFundRequest(id) {
    try {
      const deleted = await FundRequest.findOneAndDelete({ id });
      if (!deleted) {
        throw new Error("Fund request not found");
      }
      console.log(`✅ Fund request ${id} deleted`);
      return true;
    } catch (error) {
      console.error("❌ Error deleting fund request:", error.message);
      throw error;
    }
  }

  async getStatistics() {
    try {
      const stats = await FundRequest.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            totalAmount: { $sum: "$amount" },
          },
        },
      ]);

      const totalRequests = await FundRequest.countDocuments();
      const urgentRequests = await FundRequest.countDocuments({ urgent: true });

      return {
        totalRequests,
        urgentRequests,
        byStatus: stats.reduce((acc, stat) => {
          acc[stat._id] = {
            count: stat.count,
            totalAmount: stat.totalAmount,
          };
          return acc;
        }, {}),
      };
    } catch (error) {
      console.error("❌ Error fetching statistics:", error.message);
      throw error;
    }
  }

  // Close database connection
  async close() {
    try {
      await mongoose.connection.close();
      console.log("📊 MongoDB connection closed");
    } catch (error) {
      console.error("❌ Error closing database connection:", error.message);
    }
  }
}

// Export the database instance and model
const database = new Database();

module.exports = database;
module.exports.FundRequest = FundRequest;
