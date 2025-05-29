/**
 * Routes for reporting and export endpoints
 */

const express = require('express');
const router = express.Router();
const ReportingController = require('../controllers/ReportingController');
const { authenticate } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticate);

// Summary report endpoint
router.get('/summary', ReportingController.getSummaryReport);

// Detailed report endpoint
router.get('/detailed', ReportingController.getDetailedReport);

// Export endpoints
router.post('/export', ReportingController.createExport);
router.get('/export/:id', ReportingController.getExportStatus);
router.get('/export/:id/download', ReportingController.downloadExport);

// Dashboard metrics endpoint
router.get('/dashboard/metrics', ReportingController.getDashboardMetrics);

module.exports = router;
