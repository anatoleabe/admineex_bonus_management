const express = require("express");
const router = express.Router();
const BonusRuleController = require("../controllers/BonusRuleController");

// GET /api/bonus/rules
router.get("/", BonusRuleController.getAllRules);

// POST /api/bonus/rules
router.post("/", BonusRuleController.createRule);

// GET /api/bonus/rules/:id
router.get("/:id", BonusRuleController.getRuleById);

// PUT /api/bonus/rules/:id
router.put("/:id", BonusRuleController.updateRule);

// DELETE /api/bonus/rules/:id (Deactivate)
router.delete("/:id", BonusRuleController.deleteRule);

module.exports = router;

