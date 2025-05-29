const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;
const Mixed = Schema.Types.Mixed;

// Stores immutable personnel data relevant for bonus calculation at a specific point in time.
// Data is assembled by querying APIs from the main application (Personnel, Affectation, Structure, Sanction).
const PersonnelSnapshotSchema = new Schema({
    personnelId: { type: ObjectId, ref: "Personnel", required: true, index: true, description: "Reference to the main Personnel record." },
    snapshotDate: { type: Date, required: true, index: true, description: "The point in time this data represents." },
    data: {
        // Core fields (examples, adjust based on actual Personnel model)
        grade: { type: String },
        category: { type: String },
        rank: { type: String, description: "Derived from active Affectation." },
        index: { type: String }, // Assuming this is a personnel attribute
        status: { type: String }, // e.g., 'active', 'on_leave'
        salary: { type: Number },

        // Position/Structure details (derived from active Affectation -> Position -> Structure)
        position: {
            id: { type: ObjectId, description: "ID of the Position from Affectation." },
            code: { type: String, description: "Code of the Position." },
            structureId: { type: ObjectId, description: "ID of the associated Structure." },
            structureCode: { type: String, description: "Code of the associated Structure." },
            structureName: { type: String, description: "Name of the associated Structure." }
            // Add other relevant position/structure fields as needed
        },

        // Sanctions active at snapshotDate
        sanctions: [{
            _id: false,
            type: { type: String },
            nature: { type: String },
            startDate: { type: Date },
            endDate: { type: Date }
        }],

        // Add any other fields required by eligibility or calculation rules
        customAttributes: { type: Mixed, description: "Placeholder for other relevant attributes." }
    },
    // createdBy: { type: ObjectId, ref: 'User' }, // Optional: Track who triggered snapshot creation
}, { timestamps: { createdAt: true, updatedAt: false } }); // Only track creation time

PersonnelSnapshotSchema.index({ personnelId: 1, snapshotDate: -1 }); // Efficient lookup for latest snapshot

module.exports = mongoose.model("PersonnelSnapshot", PersonnelSnapshotSchema);
