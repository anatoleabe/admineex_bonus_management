// Placeholder for ApprovalController.js
const BonusInstance = require("../models/BonusInstance"); // Assuming approvals relate to BonusInstances

exports.getApprovalQueue = async (req, res, next) => {
  try {
    // TODO: Implement logic to fetch items awaiting approval for the current user.
    // This requires knowing the user's role/ID (from auth middleware)
    // and querying based on the approval workflow defined in BonusTemplate
    // and the current status of BonusInstance.

    // Placeholder: Fetch all instances currently "under_review"
    console.warn("getApprovalQueue: Placeholder logic fetching all instances 'under_review'. Implement proper user/role-based filtering.");
    const items = await BonusInstance.find({ status: "under_review" })
                                     .populate("templateId", "code name")
                                     // .populate("createdBy", "name") // Populate submitter if needed
                                     .sort({ createdAt: 1 }); // Or sort by submission date

    // Map to a generic ApprovalItem structure for the frontend
    const approvalQueue = items.map(instance => ({
        _id: instance._id,
        type: "BonusInstance",
        referencePeriod: instance.referencePeriod,
        status: instance.status,
        // submittedBy: instance.createdBy?.name, // Example
        submittedAt: instance.updatedAt, // Assuming last update time is submission time
        details: {
            templateId: instance.templateId?._id,
            template: instance.templateId ? { code: instance.templateId.code, name: instance.templateId.name } : undefined
            // Add other relevant details
        }
    }));

    res.status(200).json(approvalQueue);
  } catch (error) {
    next(error);
  }
};

exports.submitDecision = async (req, res, next) => {
  const itemId = req.params.itemId;
  const { decision, comments } = req.body; // decision = "approve" or "reject"

  try {
    // TODO: Implement logic to process the approval decision.
    // - Find the item (e.g., BonusInstance)
    // - Verify the item is in the correct status (e.g., "under_review")
    // - Verify the current user has permission to approve/reject (requires auth middleware & role check)
    // - Update the item's status based on the decision
    // - Record the decision maker, timestamp, and comments
    // - Potentially trigger next workflow step or notifications

    console.log(`Placeholder: Processing decision '${decision}' for item ${itemId} with comments: ${comments}`);

    // Placeholder: Directly call the updateInstanceStatus logic (which also has placeholder logic)
    const instance = await BonusInstance.findById(itemId);
    if (!instance) {
        return res.status(404).json({ message: "Item not found" });
    }
    if (instance.status !== "under_review") {
        return res.status(400).json({ message: `Cannot ${decision} item in status: ${instance.status}` });
    }

    let newStatus = instance.status;
    if (decision === "approve") {
        newStatus = "approved";
        instance.approvalDate = new Date();
        // instance.approvedBy = req.user.id; // Requires auth
    } else if (decision === "reject") {
        newStatus = "draft"; // Or a specific "rejected" status
        // instance.rejectionReason = comments;
        // instance.rejectedBy = req.user.id; // Requires auth
    } else {
        return res.status(400).json({ message: "Invalid decision" });
    }

    instance.status = newStatus;
    await instance.save();
    console.log(`Item ${itemId} status updated to ${newStatus}`);

    res.status(200).json({ message: `Decision '${decision}' processed successfully for item ${itemId}` });

  } catch (error) {
    next(error);
  }
};

