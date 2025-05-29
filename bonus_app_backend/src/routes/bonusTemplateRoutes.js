const express = require("express");
const router = express.Router();
const BonusTemplateController = require("../controllers/BonusTemplateController");

// GET /api/bonus/templates
router.get("/", BonusTemplateController.getAllTemplates);

// POST /api/bonus/templates
router.post("/", BonusTemplateController.createTemplate);

// GET /api/bonus/templates/:id
router.get("/:id", BonusTemplateController.getTemplateById);

// PUT /api/bonus/templates/:id
router.put("/:id", BonusTemplateController.updateTemplate);

// DELETE /api/bonus/templates/:id (Deactivate)
router.delete("/:id", BonusTemplateController.deleteTemplate);

module.exports = router;

