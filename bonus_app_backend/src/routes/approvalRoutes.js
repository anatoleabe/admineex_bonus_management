const express = require("express");
const router = express.Router();
// Assume an ApprovalController exists
const ApprovalController = require("../controllers/ApprovalController");

// GET /api/bonus/approvals (Get items for the current user's queue)
router.get("/", ApprovalController.getApprovalQueue);

// POST /api/bonus/approvals/:itemId/decision (Submit approve/reject decision)
router.post("/:itemId/decision", ApprovalController.submitDecision);

module.exports = router;

