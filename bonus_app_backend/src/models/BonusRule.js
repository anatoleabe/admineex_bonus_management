const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

// Defines reusable conditions and actions for eligibility, adjustments, etc.
const BonusRuleSchema = new Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String },
    condition: { type: String, required: true, description: "JS-like condition string evaluated against PersonnelSnapshot.data and potentially other context. Must return boolean." },
    action: { type: String, required: true, description: "JS-like action string evaluated if condition is true. Can modify context/results (e.g., set status to 'excluded', apply adjustment factor)." },
    priority: { type: Number, default: 1, index: true, description: "Execution order (lower number runs first)." },
    isActive: { type: Boolean, default: true, index: true },
    appliesToTemplates: [{ type: ObjectId, ref: "BonusTemplate", index: true, description: "Optional: Restrict rule to specific templates." }],
    createdBy: { type: ObjectId, ref: "User" }, // Assuming User model exists elsewhere or will be defined
    lastUpdatedBy: { type: ObjectId, ref: "User" },
}, { timestamps: true });

module.exports = mongoose.model("BonusRule", BonusRuleSchema);
