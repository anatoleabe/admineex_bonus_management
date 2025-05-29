const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;
const Mixed = Schema.Types.Mixed;

// Represents a single bonus generation event or period for a specific template.
const BonusInstanceSchema = new Schema({
    templateId: { type: ObjectId, ref: "BonusTemplate", required: true, index: true },
    referencePeriod: { type: String, required: true, index: true, description: "Identifier for the bonus period (e.g., '2024-Q1', 'FY2024')." },
    status: {
        type: String,
        enum: ["draft", "pending_generation", "generated", "under_review", "approved", "paid", "cancelled"],
        default: "draft",
        index: true,
        description: "Overall status of the bonus instance/event."
    },
    shareAmount: { type: Number, description: "Default or base share amount for this instance, potentially overriding template default." },
    generationDate: { type: Date, description: "Timestamp when allocations were generated." },
    approvalDate: { type: Date, description: "Timestamp when the instance was fully approved." },
    paymentDate: { type: Date, description: "Timestamp when payment processing was initiated/completed." },
    customOverrides: { type: Mixed, description: "Instance-level overrides (use with caution)." },
    notes: { type: String, description: "General notes about this bonus instance." },
    createdBy: { type: ObjectId, ref: "User" }, // Assuming User model exists elsewhere or will be defined
    // Add lastUpdatedBy if needed
}, { timestamps: true });

BonusInstanceSchema.index({ templateId: 1, referencePeriod: 1 }, { unique: true }); // Prevent duplicate instances for the same template/period

module.exports = mongoose.model("BonusInstance", BonusInstanceSchema);
