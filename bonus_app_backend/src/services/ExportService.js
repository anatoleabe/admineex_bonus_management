/**
 * ExportService.js
 * 
 * Service for exporting report data to various formats
 */

const fs = require('fs');
const path = require('path');
const { Parser } = require('json2csv');
const ExcelJS = require('exceljs');
const ApiError = require('../utils/ApiError');
const ReportingService = require('./ReportingService');

class ExportService {
  /**
   * Create an export job for report data
   * 
   * @param {String} reportType - Type of report ('summary' or 'detailed')
   * @param {Object} filters - Filtering criteria
   * @param {String} format - Export format ('csv' or 'excel')
   * @param {Object} options - Export options
   * @returns {Object} Export job information
   */
  async createExportJob(reportType, filters = {}, format = 'csv', options = {}) {
    try {
      // Generate a unique job ID
      const jobId = `export_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      
      // Create export directory if it doesn't exist
      const exportDir = path.join(__dirname, '../../exports');
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }
      
      // Store job information
      const job = {
        id: jobId,
        reportType,
        filters,
        format,
        options,
        status: 'pending',
        createdAt: new Date(),
        filePath: null,
        error: null
      };
      
      // In a real implementation, we would store this in a database
      // For now, we'll write it to a file
      fs.writeFileSync(
        path.join(exportDir, `${jobId}.json`),
        JSON.stringify(job)
      );
      
      // In a production environment, we would queue this job for background processing
      // For simplicity, we'll process it immediately
      this.processExportJob(jobId);
      
      return {
        jobId,
        status: 'pending'
      };
    } catch (error) {
      console.error('Error creating export job:', error);
      throw new ApiError(500, 'Error creating export job');
    }
  }
  
  /**
   * Process an export job
   * 
   * @param {String} jobId - ID of the export job
   * @returns {Object} Updated job information
   */
  async processExportJob(jobId) {
    try {
      // In a real implementation, this would be a background job
      // For now, we'll process it synchronously
      
      // Get job information
      const exportDir = path.join(__dirname, '../../exports');
      const jobFilePath = path.join(exportDir, `${jobId}.json`);
      
      if (!fs.existsSync(jobFilePath)) {
        throw new ApiError(404, 'Export job not found');
      }
      
      const job = JSON.parse(fs.readFileSync(jobFilePath, 'utf8'));
      
      // Update job status
      job.status = 'processing';
      job.processedAt = new Date();
      
      // Save updated job
      fs.writeFileSync(jobFilePath, JSON.stringify(job));
      
      // Generate report data
      let reportData;
      if (job.reportType === 'summary') {
        reportData = await ReportingService.generateSummaryReport(job.filters);
      } else {
        // For detailed reports, we need to get all pages
        // Set a high limit to get all data in one request
        const options = { ...job.options, limit: 10000, page: 1 };
        reportData = await ReportingService.generateDetailedReport(job.filters, options);
      }
      
      // Generate export file
      let filePath;
      if (job.format === 'csv') {
        filePath = await this.generateCSV(reportData, jobId);
      } else if (job.format === 'excel') {
        filePath = await this.generateExcel(reportData, jobId);
      } else {
        throw new ApiError(400, `Unsupported export format: ${job.format}`);
      }
      
      // Update job with file path
      job.status = 'completed';
      job.completedAt = new Date();
      job.filePath = filePath;
      
      // Save updated job
      fs.writeFileSync(jobFilePath, JSON.stringify(job));
      
      return job;
    } catch (error) {
      console.error('Error processing export job:', error);
      
      // Update job with error
      try {
        const exportDir = path.join(__dirname, '../../exports');
        const jobFilePath = path.join(exportDir, `${jobId}.json`);
        
        if (fs.existsSync(jobFilePath)) {
          const job = JSON.parse(fs.readFileSync(jobFilePath, 'utf8'));
          
          job.status = 'failed';
          job.error = error.message || 'Unknown error';
          job.completedAt = new Date();
          
          fs.writeFileSync(jobFilePath, JSON.stringify(job));
        }
      } catch (saveError) {
        console.error('Error saving job error:', saveError);
      }
      
      throw new ApiError(500, 'Error processing export job');
    }
  }
  
  /**
   * Generate CSV file from report data
   * 
   * @param {Object} reportData - Report data
   * @param {String} jobId - ID of the export job
   * @returns {String} Path to the generated file
   */
  async generateCSV(reportData, jobId) {
    try {
      const exportDir = path.join(__dirname, '../../exports');
      const filePath = path.join(exportDir, `${jobId}.csv`);
      
      // Prepare data for CSV
      let fields = [];
      let data = [];
      
      if (reportData.reportType === 'summary') {
        // For summary reports, use the group data
        fields = [
          { label: 'Group', value: 'groupLabel' },
          { label: 'Count', value: 'count' },
          { label: 'Total Amount', value: 'totalAmount' },
          { label: 'Average Amount', value: 'avgAmount' },
          { label: 'Minimum Amount', value: 'minAmount' },
          { label: 'Maximum Amount', value: 'maxAmount' }
        ];
        
        data = reportData.data;
      } else {
        // For detailed reports, use the appropriate fields based on report type
        switch (reportData.filters.reportType) {
          case 'instances':
            fields = [
              { label: 'Reference Period', value: 'referencePeriod' },
              { label: 'Template', value: 'templateName' },
              { label: 'Status', value: 'status' },
              { label: 'Total Amount', value: 'totalAmount' },
              { label: 'Allocation Count', value: 'allocationCount' },
              { label: 'Created Date', value: 'createdAt' },
              { label: 'Generation Date', value: 'generationDate' },
              { label: 'Approval Date', value: 'approvalDate' },
              { label: 'Payment Date', value: 'paymentDate' },
              { label: 'Notes', value: 'notes' }
            ];
            break;
            
          case 'allocations':
            fields = [
              { label: 'Reference Period', value: 'referencePeriod' },
              { label: 'Template', value: 'templateName' },
              { label: 'Personnel', value: 'personnelName' },
              { label: 'Status', value: 'status' },
              { label: 'Calculated Amount', value: 'calculatedAmount' },
              { label: 'Final Amount', value: 'finalAmount' },
              { label: 'Adjustment Reason', value: 'adjustmentReason' },
              { label: 'Version', value: 'version' },
              { label: 'Created Date', value: 'createdAt' }
            ];
            break;
            
          case 'adjustments':
            fields = [
              { label: 'Reference Period', value: 'referencePeriod' },
              { label: 'Template', value: 'templateName' },
              { label: 'Personnel', value: 'personnelName' },
              { label: 'Status', value: 'status' },
              { label: 'Previous Amount', value: 'previousAmount' },
              { label: 'New Amount', value: 'newAmount' },
              { label: 'Adjustment Amount', value: 'adjustmentAmount' },
              { label: 'Adjustment %', value: 'adjustmentPercentage' },
              { label: 'Adjustment Reason', value: 'adjustmentReason' },
              { label: 'Adjusted Date', value: 'adjustedAt' }
            ];
            break;
            
          case 'workflow':
            fields = [
              { label: 'Reference Period', value: 'referencePeriod' },
              { label: 'Template', value: 'templateName' },
              { label: 'Action', value: 'action' },
              { label: 'From Status', value: 'fromStatus' },
              { label: 'To Status', value: 'toStatus' },
              { label: 'User', value: 'userName' },
              { label: 'Timestamp', value: 'timestamp' },
              { label: 'Comments', value: 'comments' }
            ];
            break;
            
          default:
            fields = Object.keys(reportData.data[0] || {}).map(key => ({
              label: key,
              value: key
            }));
        }
        
        data = reportData.data;
      }
      
      // Generate CSV
      const json2csvParser = new Parser({ fields });
      const csv = json2csvParser.parse(data);
      
      // Write to file
      fs.writeFileSync(filePath, csv);
      
      return filePath;
    } catch (error) {
      console.error('Error generating CSV:', error);
      throw new ApiError(500, 'Error generating CSV');
    }
  }
  
  /**
   * Generate Excel file from report data
   * 
   * @param {Object} reportData - Report data
   * @param {String} jobId - ID of the export job
   * @returns {String} Path to the generated file
   */
  async generateExcel(reportData, jobId) {
    try {
      const exportDir = path.join(__dirname, '../../exports');
      const filePath = path.join(exportDir, `${jobId}.xlsx`);
      
      // Create a new workbook
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Bonus Management System';
      workbook.created = new Date();
      
      // Add a worksheet
      const worksheet = workbook.addWorksheet('Report');
      
      // Prepare headers and data
      let headers = [];
      let data = [];
      
      if (reportData.reportType === 'summary') {
        // For summary reports, use the group data
        headers = [
          'Group',
          'Count',
          'Total Amount',
          'Average Amount',
          'Minimum Amount',
          'Maximum Amount'
        ];
        
        data = reportData.data.map(item => [
          item.groupLabel,
          item.count,
          item.totalAmount,
          item.avgAmount,
          item.minAmount,
          item.maxAmount
        ]);
        
        // Add totals row
        data.push([
          'TOTAL',
          reportData.totals.count,
          reportData.totals.totalAmount,
          reportData.totals.avgAmount,
          '',
          ''
        ]);
      } else {
        // For detailed reports, use the appropriate fields based on report type
        switch (reportData.filters.reportType) {
          case 'instances':
            headers = [
              'Reference Period',
              'Template',
              'Status',
              'Total Amount',
              'Allocation Count',
              'Created Date',
              'Generation Date',
              'Approval Date',
              'Payment Date',
              'Notes'
            ];
            
            data = reportData.data.map(item => [
              item.referencePeriod,
              item.templateName,
              item.status,
              item.totalAmount,
              item.allocationCount,
              new Date(item.createdAt),
              item.generationDate ? new Date(item.generationDate) : '',
              item.approvalDate ? new Date(item.approvalDate) : '',
              item.paymentDate ? new Date(item.paymentDate) : '',
              item.notes
            ]);
            break;
            
          case 'allocations':
            headers = [
              'Reference Period',
              'Template',
              'Personnel',
              'Status',
              'Calculated Amount',
              'Final Amount',
              'Adjustment Reason',
              'Version',
              'Created Date'
            ];
            
            data = reportData.data.map(item => [
              item.referencePeriod,
              item.templateName,
              item.personnelName,
              item.status,
              item.calculatedAmount,
              item.finalAmount,
              item.adjustmentReason,
              item.version,
              new Date(item.createdAt)
            ]);
            break;
            
          case 'adjustments':
            headers = [
              'Reference Period',
              'Template',
              'Personnel',
              'Status',
              'Previous Amount',
              'New Amount',
              'Adjustment Amount',
              'Adjustment %',
              'Adjustment Reason',
              'Adjusted Date'
            ];
            
            data = reportData.data.map(item => [
              item.referencePeriod,
              item.templateName,
              item.personnelName,
              item.status,
              item.previousAmount,
              item.newAmount,
              item.adjustmentAmount,
              item.adjustmentPercentage,
              item.adjustmentReason,
              new Date(item.adjustedAt)
            ]);
            break;
            
          case 'workflow':
            headers = [
              'Reference Period',
              'Template',
              'Action',
              'From Status',
              'To Status',
              'User',
              'Timestamp',
              'Comments'
            ];
            
            data = reportData.data.map(item => [
              item.referencePeriod,
              item.templateName,
              item.action,
              item.fromStatus,
              item.toStatus,
              item.userName,
              new Date(item.timestamp),
              item.comments
            ]);
            break;
            
          default:
            // Use all keys as headers
            const firstItem = reportData.data[0] || {};
            headers = Object.keys(firstItem);
            data = reportData.data.map(item => Object.values(item));
        }
      }
      
      // Add headers
      worksheet.addRow(headers);
      
      // Format header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      
      // Add data rows
      data.forEach(row => {
        worksheet.addRow(row);
      });
      
      // Auto-fit columns
      worksheet.columns.forEach(column => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, cell => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = maxLength < 10 ? 10 : maxLength + 2;
      });
      
      // Write to file
      await workbook.xlsx.writeFile(filePath);
      
      return filePath;
    } catch (error) {
      console.error('Error generating Excel:', error);
      throw new ApiError(500, 'Error generating Excel');
    }
  }
  
  /**
   * Get export job status
   * 
   * @param {String} jobId - ID of the export job
   * @returns {Object} Job status information
   */
  async getExportStatus(jobId) {
    try {
      const exportDir = path.join(__dirname, '../../exports');
      const jobFilePath = path.join(exportDir, `${jobId}.json`);
      
      if (!fs.existsSync(jobFilePath)) {
        throw new ApiError(404, 'Export job not found');
      }
      
      const job = JSON.parse(fs.readFileSync(jobFilePath, 'utf8'));
      
      // Return status information
      return {
        jobId: job.id,
        status: job.status,
        createdAt: job.createdAt,
        processedAt: job.processedAt,
        completedAt: job.completedAt,
        format: job.format,
        error: job.error,
        downloadUrl: job.status === 'completed' ? `/api/reports/export/${jobId}/download` : null
      };
    } catch (error) {
      console.error('Error getting export status:', error);
      throw new ApiError(500, 'Error getting export status');
    }
  }
  
  /**
   * Get export file for download
   * 
   * @param {String} jobId - ID of the export job
   * @returns {Object} File information
   */
  async getExportFile(jobId) {
    try {
      const exportDir = path.join(__dirname, '../../exports');
      const jobFilePath = path.join(exportDir, `${jobId}.json`);
      
      if (!fs.existsSync(jobFilePath)) {
        throw new ApiError(404, 'Export job not found');
      }
      
      const job = JSON.parse(fs.readFileSync(jobFilePath, 'utf8'));
      
      if (job.status !== 'completed') {
        throw new ApiError(400, `Export job is not completed (status: ${job.status})`);
      }
      
      if (!job.filePath || !fs.existsSync(job.filePath)) {
        throw new ApiError(404, 'Export file not found');
      }
      
      // Return file information
      return {
        filePath: job.filePath,
        fileName: `bonus_report_${job.reportType}_${new Date().toISOString().slice(0, 10)}.${job.format}`,
        contentType: job.format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };
    } catch (error) {
      console.error('Error getting export file:', error);
      throw new ApiError(500, 'Error getting export file');
    }
  }
}

module.exports = new ExportService();
