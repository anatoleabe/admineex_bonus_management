/**
 * ReportingService.js
 * 
 * Service for generating summary and detailed reports for the Bonus Management System
 */

const BonusInstance = require('../models/BonusInstance');
const BonusAllocation = require('../models/BonusAllocation');
const BonusTemplate = require('../models/BonusTemplate');
const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');

class ReportingService {
  /**
   * Generate a summary report based on filters
   * 
   * @param {Object} filters - Filtering criteria
   * @returns {Object} Summary report data
   */
  async generateSummaryReport(filters = {}) {
    try {
      // Apply filters to the base query
      const query = this._buildBaseQuery(filters);
      
      // Determine grouping dimensions
      const groupBy = filters.groupBy || 'template';
      
      // Define aggregation pipeline based on grouping dimension
      let pipeline = [];
      
      // Start with the match stage using our filters
      pipeline.push({ $match: query });
      
      // Add lookup stages to get related data
      pipeline.push({
        $lookup: {
          from: 'bonustemplates',
          localField: 'templateId',
          foreignField: '_id',
          as: 'template'
        }
      });
      
      // Unwind the template array (converts array to object)
      pipeline.push({
        $unwind: {
          path: '$template',
          preserveNullAndEmptyArrays: true
        }
      });
      
      // Define grouping based on selected dimension
      let groupStage = { $group: { _id: null } };
      
      switch (groupBy) {
        case 'template':
          groupStage.$group._id = '$templateId';
          groupStage.$group.templateName = { $first: '$template.name' };
          groupStage.$group.templateCode = { $first: '$template.code' };
          break;
        case 'status':
          groupStage.$group._id = '$status';
          break;
        case 'period':
          groupStage.$group._id = '$referencePeriod';
          break;
        case 'month':
          groupStage.$group._id = {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          };
          break;
        case 'department':
          // This would require department data in the instance or via lookup
          // For now, we'll use a placeholder
          groupStage.$group._id = '$departmentId';
          groupStage.$group.departmentName = { $first: '$department.name' };
          break;
        default:
          // Default to template grouping
          groupStage.$group._id = '$templateId';
          groupStage.$group.templateName = { $first: '$template.name' };
          groupStage.$group.templateCode = { $first: '$template.code' };
      }
      
      // Add common aggregation fields to the group stage
      groupStage.$group.count = { $sum: 1 };
      groupStage.$group.totalAmount = { $sum: '$totalAmount' };
      groupStage.$group.avgAmount = { $avg: '$totalAmount' };
      groupStage.$group.minAmount = { $min: '$totalAmount' };
      groupStage.$group.maxAmount = { $max: '$totalAmount' };
      groupStage.$group.statuses = { 
        $addToSet: '$status' 
      };
      
      pipeline.push(groupStage);
      
      // Add sorting
      pipeline.push({
        $sort: filters.sortBy ? 
          { [filters.sortBy]: filters.sortDirection === 'desc' ? -1 : 1 } : 
          { totalAmount: -1 }
      });
      
      // Execute the aggregation pipeline
      const results = await BonusInstance.aggregate(pipeline);
      
      // Format the results
      const formattedResults = results.map(result => {
        // Handle different group by formats
        let groupValue;
        let groupLabel;
        
        if (groupBy === 'month' && result._id) {
          groupValue = `${result._id.year}-${result._id.month.toString().padStart(2, '0')}`;
          groupLabel = new Date(result._id.year, result._id.month - 1, 1)
            .toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
        } else if (groupBy === 'template') {
          groupValue = result._id ? result._id.toString() : 'Unknown';
          groupLabel = result.templateName || 'Unknown Template';
        } else if (groupBy === 'status') {
          groupValue = result._id || 'Unknown';
          groupLabel = this._formatStatus(result._id) || 'Unknown Status';
        } else if (groupBy === 'department') {
          groupValue = result._id ? result._id.toString() : 'Unknown';
          groupLabel = result.departmentName || 'Unknown Department';
        } else {
          groupValue = result._id ? result._id.toString() : 'Unknown';
          groupLabel = result._id ? result._id.toString() : 'Unknown';
        }
        
        return {
          groupValue,
          groupLabel,
          count: result.count,
          totalAmount: result.totalAmount || 0,
          avgAmount: result.avgAmount || 0,
          minAmount: result.minAmount || 0,
          maxAmount: result.maxAmount || 0,
          statuses: result.statuses || []
        };
      });
      
      // Calculate overall totals
      const totals = {
        count: formattedResults.reduce((sum, item) => sum + item.count, 0),
        totalAmount: formattedResults.reduce((sum, item) => sum + item.totalAmount, 0),
        avgAmount: formattedResults.length > 0 ? 
          formattedResults.reduce((sum, item) => sum + item.totalAmount, 0) / 
          formattedResults.reduce((sum, item) => sum + item.count, 0) : 0
      };
      
      return {
        reportType: 'summary',
        groupBy,
        filters: this._formatFilters(filters),
        data: formattedResults,
        totals
      };
    } catch (error) {
      console.error('Error generating summary report:', error);
      throw new ApiError(500, 'Error generating summary report');
    }
  }
  
  /**
   * Generate a detailed report based on filters
   * 
   * @param {Object} filters - Filtering criteria
   * @param {Object} options - Report options (pagination, etc.)
   * @returns {Object} Detailed report data
   */
  async generateDetailedReport(filters = {}, options = {}) {
    try {
      // Apply filters to the base query
      const query = this._buildBaseQuery(filters);
      
      // Determine report type
      const reportType = filters.reportType || 'instances';
      
      // Set up pagination options
      const page = options.page || 1;
      const limit = options.limit || 50;
      const skip = (page - 1) * limit;
      
      // Define sort options
      const sortField = options.sortField || 'createdAt';
      const sortDirection = options.sortDirection === 'desc' ? -1 : 1;
      const sort = { [sortField]: sortDirection };
      
      let results;
      let totalCount;
      
      // Generate report based on type
      switch (reportType) {
        case 'instances':
          // Count total for pagination
          totalCount = await BonusInstance.countDocuments(query);
          
          // Get instances with populated template
          results = await BonusInstance.find(query)
            .populate('templateId', 'name code')
            .sort(sort)
            .skip(skip)
            .limit(limit);
          
          // Format the results
          results = results.map(instance => ({
            id: instance._id,
            templateName: instance.templateId ? instance.templateId.name : 'Unknown',
            templateCode: instance.templateId ? instance.templateId.code : 'Unknown',
            referencePeriod: instance.referencePeriod,
            status: instance.status,
            totalAmount: instance.totalAmount || 0,
            allocationCount: instance.allocationCount || 0,
            createdAt: instance.createdAt,
            generationDate: instance.generationDate,
            approvalDate: instance.approvalDate,
            paymentDate: instance.paymentDate,
            notes: instance.notes
          }));
          break;
          
        case 'allocations':
          // For allocations, we need to adjust the query
          const allocationQuery = {};
          
          // Map instance filters to allocation filters
          if (filters.templateId) allocationQuery.templateId = filters.templateId;
          if (filters.status) allocationQuery.status = filters.status;
          if (filters.startDate || filters.endDate) {
            allocationQuery.createdAt = {};
            if (filters.startDate) allocationQuery.createdAt.$gte = new Date(filters.startDate);
            if (filters.endDate) allocationQuery.createdAt.$lte = new Date(filters.endDate);
          }
          
          // Add allocation-specific filters
          if (filters.personnelId) allocationQuery.personnelId = filters.personnelId;
          if (filters.minAmount) allocationQuery.finalAmount = { $gte: filters.minAmount };
          if (filters.maxAmount) {
            if (allocationQuery.finalAmount) {
              allocationQuery.finalAmount.$lte = filters.maxAmount;
            } else {
              allocationQuery.finalAmount = { $lte: filters.maxAmount };
            }
          }
          
          // Count total for pagination
          totalCount = await BonusAllocation.countDocuments(allocationQuery);
          
          // Get allocations with populated fields
          results = await BonusAllocation.find(allocationQuery)
            .populate('instanceId', 'referencePeriod status')
            .populate('templateId', 'name code')
            .populate('personnelId', 'name')
            .sort(sort)
            .skip(skip)
            .limit(limit);
          
          // Format the results
          results = results.map(allocation => ({
            id: allocation._id,
            instanceId: allocation.instanceId ? allocation.instanceId._id : null,
            referencePeriod: allocation.instanceId ? allocation.instanceId.referencePeriod : 'Unknown',
            instanceStatus: allocation.instanceId ? allocation.instanceId.status : 'Unknown',
            templateName: allocation.templateId ? allocation.templateId.name : 'Unknown',
            personnelName: allocation.personnelId ? allocation.personnelId.name : 'Unknown',
            personnelId: allocation.personnelId ? allocation.personnelId._id : null,
            status: allocation.status,
            calculatedAmount: allocation.calculatedAmount || 0,
            finalAmount: allocation.finalAmount || 0,
            adjustmentReason: allocation.adjustmentReason || '',
            version: allocation.version || 1,
            createdAt: allocation.createdAt
          }));
          break;
          
        case 'adjustments':
          // For adjustments, we want allocations that have been adjusted
          const adjustmentQuery = {
            $or: [
              { status: 'adjusted' },
              { status: 'excluded_manual' }
            ]
          };
          
          // Add other filters
          if (filters.templateId) adjustmentQuery.templateId = filters.templateId;
          if (filters.startDate || filters.endDate) {
            adjustmentQuery.createdAt = {};
            if (filters.startDate) adjustmentQuery.createdAt.$gte = new Date(filters.startDate);
            if (filters.endDate) adjustmentQuery.createdAt.$lte = new Date(filters.endDate);
          }
          if (filters.personnelId) adjustmentQuery.personnelId = filters.personnelId;
          
          // Count total for pagination
          totalCount = await BonusAllocation.countDocuments(adjustmentQuery);
          
          // Get adjusted allocations with populated fields
          results = await BonusAllocation.find(adjustmentQuery)
            .populate('instanceId', 'referencePeriod status')
            .populate('templateId', 'name code')
            .populate('personnelId', 'name')
            .populate('previousVersion', 'calculatedAmount finalAmount')
            .sort(sort)
            .skip(skip)
            .limit(limit);
          
          // Format the results
          results = results.map(allocation => {
            const previousAmount = allocation.previousVersion ? 
              allocation.previousVersion.finalAmount : allocation.calculatedAmount;
            
            const adjustmentAmount = allocation.finalAmount - previousAmount;
            
            return {
              id: allocation._id,
              instanceId: allocation.instanceId ? allocation.instanceId._id : null,
              referencePeriod: allocation.instanceId ? allocation.instanceId.referencePeriod : 'Unknown',
              templateName: allocation.templateId ? allocation.templateId.name : 'Unknown',
              personnelName: allocation.personnelId ? allocation.personnelId.name : 'Unknown',
              personnelId: allocation.personnelId ? allocation.personnelId._id : null,
              status: allocation.status,
              previousAmount: previousAmount || 0,
              newAmount: allocation.finalAmount || 0,
              adjustmentAmount: adjustmentAmount || 0,
              adjustmentPercentage: previousAmount ? (adjustmentAmount / previousAmount) * 100 : 0,
              adjustmentReason: allocation.adjustmentReason || '',
              adjustedAt: allocation.createdAt
            };
          });
          break;
          
        case 'workflow':
          // For workflow history, we need instances with workflow history
          const workflowQuery = {
            ...query,
            workflowHistory: { $exists: true, $ne: [] }
          };
          
          // Count total for pagination
          totalCount = await BonusInstance.countDocuments(workflowQuery);
          
          // Get instances with workflow history
          const instances = await BonusInstance.find(workflowQuery)
            .populate('templateId', 'name code')
            .sort(sort)
            .skip(skip)
            .limit(limit);
          
          // Flatten workflow history entries
          results = [];
          instances.forEach(instance => {
            if (instance.workflowHistory && instance.workflowHistory.length > 0) {
              instance.workflowHistory.forEach(entry => {
                results.push({
                  instanceId: instance._id,
                  referencePeriod: instance.referencePeriod,
                  templateName: instance.templateId ? instance.templateId.name : 'Unknown',
                  action: entry.action,
                  fromStatus: entry.fromStatus,
                  toStatus: entry.toStatus,
                  timestamp: entry.timestamp,
                  userId: entry.userId,
                  userName: entry.userName,
                  comments: entry.comments
                });
              });
            }
          });
          
          // Sort by timestamp if needed
          if (sortField === 'timestamp') {
            results.sort((a, b) => {
              return sortDirection === 1 ? 
                a.timestamp - b.timestamp : 
                b.timestamp - a.timestamp;
            });
          }
          
          // Apply pagination to the flattened results
          results = results.slice(skip, skip + limit);
          break;
          
        default:
          throw new ApiError(400, `Invalid report type: ${reportType}`);
      }
      
      return {
        reportType,
        filters: this._formatFilters(filters),
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit)
        },
        sorting: {
          field: sortField,
          direction: options.sortDirection || 'asc'
        },
        data: results
      };
    } catch (error) {
      console.error('Error generating detailed report:', error);
      throw new ApiError(500, 'Error generating detailed report');
    }
  }
  
  /**
   * Build base query from filters
   * 
   * @param {Object} filters - Filtering criteria
   * @returns {Object} MongoDB query object
   */
  _buildBaseQuery(filters = {}) {
    const query = {};
    
    // Apply template filter
    if (filters.templateId) {
      query.templateId = mongoose.Types.ObjectId.isValid(filters.templateId) ? 
        new mongoose.Types.ObjectId(filters.templateId) : filters.templateId;
    }
    
    // Apply status filter
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query.status = { $in: filters.status };
      } else {
        query.status = filters.status;
      }
    }
    
    // Apply date range filters
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }
    
    // Apply reference period filter
    if (filters.referencePeriod) {
      query.referencePeriod = filters.referencePeriod;
    }
    
    return query;
  }
  
  /**
   * Format filters for inclusion in report output
   * 
   * @param {Object} filters - Filtering criteria
   * @returns {Object} Formatted filters
   */
  _formatFilters(filters = {}) {
    const formattedFilters = {};
    
    // Format template filter
    if (filters.templateId) {
      formattedFilters.template = {
        id: filters.templateId
      };
      
      // Optionally, we could look up the template name here
    }
    
    // Format status filter
    if (filters.status) {
      formattedFilters.status = Array.isArray(filters.status) ? 
        filters.status.map(s => this._formatStatus(s)) : 
        this._formatStatus(filters.status);
    }
    
    // Format date range filters
    if (filters.startDate || filters.endDate) {
      formattedFilters.dateRange = {};
      if (filters.startDate) formattedFilters.dateRange.start = filters.startDate;
      if (filters.endDate) formattedFilters.dateRange.end = filters.endDate;
    }
    
    // Format reference period filter
    if (filters.referencePeriod) {
      formattedFilters.referencePeriod = filters.referencePeriod;
    }
    
    // Format grouping
    if (filters.groupBy) {
      formattedFilters.groupBy = filters.groupBy;
    }
    
    return formattedFilters;
  }
  
  /**
   * Format status for display
   * 
   * @param {String} status - Status code
   * @returns {String} Formatted status
   */
  _formatStatus(status) {
    const statusMap = {
      'draft': 'Draft',
      'pending_generation': 'Pending Generation',
      'generated': 'Generated',
      'under_review': 'Under Review',
      'approved': 'Approved',
      'paid': 'Paid',
      'cancelled': 'Cancelled'
    };
    
    return statusMap[status] || status;
  }
}

module.exports = new ReportingService();
