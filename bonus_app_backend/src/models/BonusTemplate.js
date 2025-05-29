const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;
const Mixed = Schema.Types.Mixed;

const BonusTemplateSchema = new Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        match: /^[A-Z0-9_-]+$/,
        description: "Unique, human-readable code for the template (e.g., Q1_SALES_PERF)."
    },
    name: { type: String, required: true, description: "Display name of the bonus template." },
    description: { type: String, description: "Optional description of the bonus plan." },
    category: {
        type: String,
        enum: ["with_parts", "without_parts", "fixed_amount", "calculated"],
        required: true,
        description: "Categorization for organizational purposes."
    },
    periodicity: {
        type: String,
        enum: ["monthly", "quarterly", "semesterly", "yearly", "on_demand"],
        required: true,
        description: "Typical frequency of bonus generation using this template."
    },
    eligibilityRules: [{
        _id: false,
        field: { type: String, required: true, description: "Field in PersonnelSnapshot.data to check (e.g., 'status', 'data.position.rank')." },
        operator: {
            type: String,
            enum: ["equals", "not_equals", "contains", "greater_than", "less_than", "in", "not_in"],
            required: true,
            description: "Comparison operator."
        },
        value: { type: Mixed, required: true, description: "Value to compare against (can be string, number, array)." },
        description: { type: String, description: "Optional description of the rule." }
    }],
    calculationConfig: {
        formulaType: {
            type: String,
            enum: ["fixed", "percentage", "custom_formula", "parts_based"],
            required: true,
            description: "Determines how the bonus amount is calculated."
        },
        baseField: { type: String, description: "PersonnelSnapshot.data field used as base for percentage or variable in formula (e.g., 'salary')." },
        formula: { type: String, description: "Mathematical formula string (e.g., 'base * 0.03 * parts'). Variables should match fields in PersonnelSnapshot.data or partsConfig." },
        defaultShareAmount: { type: Number, description: "Fixed amount for 'fixed' type, or default base value if applicable." },
        partsConfig: {
            defaultParts: { type: Number, default: 1, description: "Default number of parts if no rules match." },
            partRules: [{
                _id: false,
                condition: { type: String, description: "JS-like condition string evaluated against PersonnelSnapshot.data (e.g., \"data.grade === 'A'\")." },
                parts: { type: Number, description: "Number of parts assigned if condition is true." }
            }]
        }
    },
    approvalWorkflow: {
        steps: [{
            _id: false,
            role: { type: String, required: true, description: "Role required for this approval step (maps to existing system roles)." },
            description: { type: String, description: "Optional description of the approval step." }
        }]
    },
    documentation: { type: String, description: "Link or reference to external documentation." },
    isActive: { type: Boolean, default: true, index: true },
    deactivatedAt: { type: Date },
    deactivatedBy: { type: ObjectId, ref: "User" }, // Assuming User model exists elsewhere or will be defined
    createdBy: { type: ObjectId, ref: "User" },
    lastUpdatedBy: { type: ObjectId, ref: "User" },
}, { timestamps: true });

BonusTemplateSchema.index({ name: 1 });
BonusTemplateSchema.index({ category: 1, periodicity: 1 });

module.exports = mongoose.model("BonusTemplate", BonusTemplateSchema);
