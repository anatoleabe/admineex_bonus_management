/**
 * ReportingController.js
 * 
 * Controller for reporting and export endpoints
 */

const ReportingService = require('../services/ReportingService');
const ExportService = require('../services/ExportService');
const ApiError = require('../utils/ApiError');
const fs = require('fs');

class ReportingController {
  /**
   * Generate a summary report
   */
  async getSummaryReport(req, res, next) {
    try {
      // Extract filters from query parameters
      const filters = {
        templateId: req.query.templateId,
        status: req.query.status,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        referencePeriod: req.query.referencePeriod,
        groupBy: req.query.groupBy || 'template'
      };
      
      // Generate report
      const report = await ReportingService.generateSummaryReport(filters);
      
      res.json(report);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Generate a detailed report
   */
  async getDetailedReport(req, res, next) {
    try {
      // Extract filters from query parameters
      const filters = {
        reportType: req.query.reportType || 'instances',
        templateId: req.query.templateId,
        status: req.query.status,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        referencePeriod: req.query.referencePeriod,
        personnelId: req.query.personnelId,
        minAmount: req.query.minAmount ? parseFloat(req.query.minAmount) : null,
        maxAmount: req.query.maxAmount ? parseFloat(req.query.maxAmount) : null
      };
      
      // Extract pagination and sorting options
      const options = {
        page: req.query.page ? parseInt(req.query.page) : 1,
        limit: req.query.limit ? parseInt(req.query.limit) : 50,
        sortField: req.query.sortField || 'createdAt',
        sortDirection: req.query.sortDirection || 'desc'
      };
      
      // Generate report
      const report = await ReportingService.generateDetailedReport(filters, options);
      
      res.json(report);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Create an export job
   */
  async createExport(req, res, next) {
    try {
      const { reportType, filters, format, options } = req.body;
      
      // Validate required parameters
      if (!reportType) {
        return next(new ApiError(400, 'Report type is required'));
      }
      
      // Create export job
      const result = await ExportService.createExportJob(
        reportType,
        filters || {},
        format || 'csv',
        options || {}
      );
      
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get export job status
   */
  async getExportStatus(req, res, next) {
    try {
      const { id } = req.params;
      
      // Get export status
      const status = await ExportService.getExportStatus(id);
      
      res.json(status);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Download export file
   */
  async downloadExport(req, res, next) {
    try {
      const { id } = req.params;
      
      // Get export file information
      const fileInfo = await ExportService.getExportFile(id);
      
      // Set content disposition header for download
      res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.fileName}"`);
      res.setHeader('Content-Type', fileInfo.contentType);
      
      // Stream the file
      const fileStream = fs.createReadStream(fileInfo.filePath);
      fileStream.pipe(res);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get dashboard metrics
   */
  async getDashboardMetrics(req, res, next) {
    try {
      // Extract filters from query parameters
      const filters = {
        templateId: req.query.templateId,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };
      
      // For now, we'll use the summary report to generate metrics
      // In a real implementation, we would have a dedicated dashboard service
      const summaryReport = await ReportingService.generateSummaryReport({
        ...filters,
        groupBy: 'status'
      });
      
      // Extract metrics from the summary report
      const metrics = {
        totalInstances: summaryReport.totals.count,
        totalAmount: summaryReport.totals.totalAmount,
        averageAmount: summaryReport.totals.avgAmount,
        statusDistribution: summaryReport.data.map(item => ({
          status: item.groupValue,
          statusLabel: item.groupLabel,
          count: item.count,
          amount: item.totalAmount
        }))
      };
      
      res.json(metrics);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ReportingController();
