const mongoose = require("mongoose");

// Fund Request Schema - matches your existing backend schema
const fundRequestSchema = new mongoose.Schema(
  {
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
      default: "NGN",
      enum: ["NGN", "USD", "EUR", "CAD"],
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
    approval_token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    department: {
      type: String,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      trim: true,
      index: true,
    },
    urgent: {
      type: Boolean,
      default: false,
      index: true,
    },
    approved_date: {
      type: Date,
    },
    approver_name: {
      type: String,
      trim: true,
    },
    approval_comments: {
      type: String,
      trim: true,
    },
    rejection_reason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// Add indexes for better query performance
fundRequestSchema.index({ created_at: -1 });
fundRequestSchema.index({ status: 1, created_at: -1 });
fundRequestSchema.index({ department: 1, status: 1 });
fundRequestSchema.index({ requester_email: 1 });
fundRequestSchema.index({ amount: 1 });
fundRequestSchema.index({ urgent: 1, status: 1 });

// Virtual for formatted amount with currency
fundRequestSchema.virtual("formattedAmount").get(function () {
  const currencySymbols = {
    NGN: "₦",
    USD: "$",
    EUR: "€",
    CAD: "C$",
  };

  const symbol = currencySymbols[this.currency] || this.currency;
  return `${symbol}${this.amount.toLocaleString()}`;
});

// Virtual for age in days
fundRequestSchema.virtual("ageInDays").get(function () {
  const now = new Date();
  const created = new Date(this.created_at);
  const diffTime = Math.abs(now - created);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Instance method to check if request is overdue (pending for more than 7 days)
fundRequestSchema.methods.isOverdue = function () {
  if (this.status !== "pending") return false;
  return this.ageInDays > 7;
};

// Static method to find requests by filters
fundRequestSchema.statics.findByFilters = function (filters = {}) {
  const query = {};

  // Status filter
  if (filters.status) {
    query.status = filters.status;
  }

  // Department filter
  if (filters.department) {
    query.department = new RegExp(filters.department, "i");
  }

  // Amount range filter
  if (filters.minAmount) {
    query.amount = { ...query.amount, $gte: filters.minAmount };
  }
  if (filters.maxAmount) {
    query.amount = { ...query.amount, $lte: filters.maxAmount };
  }

  // Date range filter
  if (filters.startDate || filters.endDate) {
    query.created_at = {};
    if (filters.startDate) {
      query.created_at.$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999); // End of day
      query.created_at.$lte = endDate;
    }
  }

  // Currency filter
  if (filters.currency) {
    query.currency = filters.currency;
  }

  // Urgent filter
  if (filters.urgent !== undefined) {
    query.urgent = filters.urgent;
  }

  // Requester email filter
  if (filters.requesterEmail) {
    query.requester_email = new RegExp(filters.requesterEmail, "i");
  }

  // Approver email filter
  if (filters.approverEmail) {
    query.approver_email = new RegExp(filters.approverEmail, "i");
  }

  // Text search (purpose or description)
  if (filters.search) {
    query.$or = [
      { purpose: new RegExp(filters.search, "i") },
      { description: new RegExp(filters.search, "i") },
      { requester_name: new RegExp(filters.search, "i") },
    ];
  }

  return this.find(query);
};

// Static method to get analytics
fundRequestSchema.statics.getAnalytics = async function (filters = {}) {
  const pipeline = [];

  // Apply filters
  if (Object.keys(filters).length > 0) {
    const matchStage = {};

    if (filters.startDate || filters.endDate) {
      matchStage.created_at = {};
      if (filters.startDate)
        matchStage.created_at.$gte = new Date(filters.startDate);
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        matchStage.created_at.$lte = endDate;
      }
    }

    if (filters.department)
      matchStage.department = new RegExp(filters.department, "i");
    if (filters.status) matchStage.status = filters.status;

    pipeline.push({ $match: matchStage });
  }

  pipeline.push({
    $group: {
      _id: null,
      totalRequests: { $sum: 1 },
      totalAmount: { $sum: "$amount" },
      avgAmount: { $avg: "$amount" },
      pendingCount: {
        $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
      },
      approvedCount: {
        $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] },
      },
      rejectedCount: {
        $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] },
      },
      urgentCount: {
        $sum: { $cond: ["$urgent", 1, 0] },
      },
      totalApprovedAmount: {
        $sum: {
          $cond: [{ $eq: ["$status", "approved"] }, "$amount", 0],
        },
      },
    },
  });

  const result = await this.aggregate(pipeline);
  return result[0] || {};
};

const FundRequest = mongoose.model("FundRequest", fundRequestSchema);

module.exports = FundRequest;
