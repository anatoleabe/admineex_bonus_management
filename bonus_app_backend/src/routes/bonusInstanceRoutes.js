const express = require("express");
const router = express.Router();
// Assume a BonusInstanceController exists
const BonusInstanceController = require("../controllers/BonusInstanceController"); 

// GET /api/bonus/instances
router.get("/", BonusInstanceController.getAllInstances);

// POST /api/bonus/instances
router.post("/", BonusInstanceController.createInstance);

// GET /api/bonus/instances/:id
router.get("/:id", BonusInstanceController.getInstanceById);

// PUT /api/bonus/instances/:id
router.put("/:id", BonusInstanceController.updateInstance);

// POST /api/bonus/instances/:id/generate
router.post("/:id/generate", BonusInstanceController.generateAllocationsForInstance);

// PATCH /api/bonus/instances/:id/status
router.patch("/:id/status", BonusInstanceController.updateInstanceStatus);

// DELETE /api/bonus/instances/:id (Cancel/Delete - implement logic in controller)
// router.delete("/:id", BonusInstanceController.cancelInstance);

module.exports = router;

