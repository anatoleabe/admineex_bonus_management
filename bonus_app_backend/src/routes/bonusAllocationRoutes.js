const express = require("express");
const router = express.Router();
// Assume a BonusAllocationController exists
const BonusAllocationController = require("../controllers/BonusAllocationController");

// GET /api/bonus/allocations (likely filtered by instanceId via query param)
router.get("/", BonusAllocationController.getAllocations);

// GET /api/bonus/allocations/:id
router.get("/:id", BonusAllocationController.getAllocation);

// PUT /api/bonus/allocations/:id (for adjustments)
router.put("/:id", BonusAllocationController.updateAllocation);

module.exports = router;

