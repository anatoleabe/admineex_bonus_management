const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;
const Mixed = Schema.Types.Mixed;

// Represents the specific bonus calculation and status for a single employee within a BonusInstance.
const BonusAllocationSchema = new Schema({
    instanceId: { type: ObjectId, ref: "BonusInstance", required: true, index: true },
    personnelId: { type: ObjectId, ref: "Personnel", required: true, index: true }, // Refers to Personnel in the main app
    personnelSnapshotId: { type: ObjectId, ref: "PersonnelSnapshot", required: true, description: "Snapshot used for this calculation." },
    templateId: { type: ObjectId, ref: "BonusTemplate", required: true, index: true, description: "Template used for this calculation (redundant but useful for querying)." },

    // Calculation inputs (preserved from snapshot and rules for traceability)
    calculationInputs: {
        snapshotData: { type: Mixed, description: "Relevant subset of PersonnelSnapshot.data used." },
        ruleResults: { type: Mixed, description: "Results from applied BonusRules (e.g., eligibility status, adjustment factors)." },
        parts: { type: Number, description: "Calculated number of parts, if applicable." },
        // Add other key inputs used in calculation
    },

    // Calculation results
    calculatedAmount: { type: Number, description: "Amount calculated based on template formula/rules." },
    finalAmount: { type: Number, index: true, description: "Final amount after adjustments/overrides." },

    // Status and tracking
    status: {
        type: String,
        enum: ["eligible", "excluded_rule", "excluded_manual", "adjusted", "paid", "cancelled"],
        default: "eligible",
        index: true,
        description: "Status of the allocation for this specific person."
    },
    adjustmentReason: { type: String, description: "Reason for manual adjustment or exclusion." },

    // Historical tracking for adjustments
    version: { type: Number, default: 1 },
    previousVersion: { type: ObjectId, ref: "BonusAllocation", description: "Link to the previous version if this is an adjustment." },

    // Add createdBy/updatedBy if needed at this level
}, { timestamps: true });

BonusAllocationSchema.index({ instanceId: 1, personnelId: 1 });
BonusAllocationSchema.index({ status: 1 });

module.exports = mongoose.model("BonusAllocation", BonusAllocationSchema);
