/**
 * BonusGenerationService.js - Optimized version
 * 
 * Service for generating bonus allocations with performance optimizations
 * for handling large personnel datasets
 */

const BonusInstance = require('../models/BonusInstance');
const BonusAllocation = require('../models/BonusAllocation');
const BonusTemplate = require('../models/BonusTemplate');
const BonusRule = require('../models/BonusRule');
const BonusCalculationService = require('./BonusCalculationService');
const BonusRuleService = require('./BonusRuleService');
const NotificationService = require('./NotificationService');
const ApiError = require('../utils/ApiError');

class BonusGenerationService {
  /**
   * Generate allocations for a bonus instance
   * 
   * @param {String} instanceId - Bonus instance ID
   * @param {Array} personnelData - Array of personnel data
   * @param {String} userId - User ID generating the allocations
   * @returns {Promise<Object>} Generation result
   */
  async generateAllocations(instanceId, personnelData, userId) {
    try {
      // Validate instance exists and is in draft status
      const instance = await BonusInstance.findById(instanceId);
      if (!instance) {
        throw new ApiError(404, 'Bonus instance not found');
      }
      
      if (instance.status !== 'draft' && instance.status !== 'pending_generation') {
        throw new ApiError(400, 'Allocations can only be generated for instances in draft or pending_generation status');
      }
      
      // Update instance status to pending_generation
      await BonusInstance.findByIdAndUpdate(instanceId, {
        status: 'pending_generation',
        generationStartTime: new Date()
      });
      
      // Get template
      const template = await BonusTemplate.findById(instance.templateId);
      if (!template) {
        throw new ApiError(404, 'Bonus template not found');
      }
      
      // Get active rules
      const rules = await BonusRule.find({ status: 'active' });
      
      // Process personnel in batches to optimize memory usage
      const BATCH_SIZE = 100; // Process 100 personnel at a time
      const totalPersonnel = personnelData.length;
      let processedCount = 0;
      let includedCount = 0;
      let totalAmount = 0;
      let allocations = [];
      
      // Process personnel in batches
      for (let i = 0; i < totalPersonnel; i += BATCH_SIZE) {
        const batch = personnelData.slice(i, i + BATCH_SIZE);
        
        // Process each personnel in the batch
        const batchResults = await Promise.all(batch.map(async (personnel) => {
          try {
            // Apply rules to determine eligibility and adjustments
            const ruleResult = await BonusRuleService.applyRules(rules, personnel);
            
            // If excluded by rules, skip this personnel
            if (ruleResult.action === 'exclude') {
              return {
                included: false,
                personnel,
                reason: ruleResult.reason
              };
            }
            
            // Calculate bonus amount
            const calculationResult = await BonusCalculationService.calculateBonus(template, personnel);
            
            // Apply rule-based adjustments if any
            let finalAmount = calculationResult.calculatedAmount;
            let adjustmentReason = null;
            
            if (ruleResult.action === 'adjust' && ruleResult.adjustments && ruleResult.adjustments.length > 0) {
              finalAmount = BonusRuleService.applyAdjustments(finalAmount, ruleResult.adjustments);
              adjustmentReason = `Automatic adjustments based on rules: ${ruleResult.appliedRules.join(', ')}`;
            }
            
            // Create allocation object
            const allocation = {
              instanceId,
              templateId: template._id,
              personnelId: personnel.id,
              personnelName: personnel.name,
              department: personnel.department,
              calculatedAmount: calculationResult.calculatedAmount,
              finalAmount,
              calculationInputs: calculationResult.calculationInputs,
              adjustmentReason,
              status: 'active',
              version: 1,
              createdBy: userId,
              createdAt: new Date()
            };
            
            return {
              included: true,
              allocation,
              amount: finalAmount
            };
          } catch (error) {
            console.error(`Error processing personnel ${personnel.id}:`, error);
            return {
              included: false,
              personnel,
              reason: `Error: ${error.message}`
            };
          }
        }));
        
        // Extract allocations from batch results
        const batchAllocations = batchResults
          .filter(result => result.included)
          .map(result => result.allocation);
        
        // Save batch allocations to database
        if (batchAllocations.length > 0) {
          await BonusAllocation.insertMany(batchAllocations);
          
          // Update counters
          includedCount += batchAllocations.length;
          totalAmount += batchAllocations.reduce((sum, allocation) => sum + allocation.finalAmount, 0);
          allocations = allocations.concat(batchAllocations);
        }
        
        processedCount += batch.length;
        
        // Update instance with progress
        await BonusInstance.findByIdAndUpdate(instanceId, {
          generationProgress: {
            processed: processedCount,
            total: totalPersonnel,
            percentage: Math.round((processedCount / totalPersonnel) * 100)
          }
        });
      }
      
      // Update instance with final results
      const updatedInstance = await BonusInstance.findByIdAndUpdate(
        instanceId,
        {
          status: 'generated',
          allocationCount: includedCount,
          totalAmount,
          generationDate: new Date(),
          generationProgress: {
            processed: totalPersonnel,
            total: totalPersonnel,
            percentage: 100
          }
        },
        { new: true }
      );
      
      // Send notification
      await NotificationService.notifyAllocationsGenerated(
        updatedInstance,
        includedCount,
        userId
      );
      
      return {
        success: true,
        instanceId,
        processedCount: totalPersonnel,
        includedCount,
        totalAmount,
        allocations
      };
    } catch (error) {
      // If an error occurs, update instance status back to draft
      await BonusInstance.findByIdAndUpdate(instanceId, {
        status: 'draft',
        generationError: error.message
      });
      
      throw error;
    }
  }
  
  /**
   * Adjust a bonus allocation
   * 
   * @param {String} allocationId - Allocation ID
   * @param {Number} newAmount - New final amount
   * @param {String} reason - Adjustment reason
   * @param {String} userId - User ID making the adjustment
   * @returns {Promise<Object>} Adjustment result
   */
  async adjustAllocation(allocationId, newAmount, reason, userId) {
    try {
      // Validate allocation exists
      const allocation = await BonusAllocation.findById(allocationId);
      if (!allocation) {
        throw new ApiError(404, 'Bonus allocation not found');
      }
      
      // Validate instance is in a state that allows adjustments
      const instance = await BonusInstance.findById(allocation.instanceId);
      if (!instance) {
        throw new ApiError(404, 'Bonus instance not found');
      }
      
      if (!['generated', 'under_review'].includes(instance.status)) {
        throw new ApiError(400, 'Allocations can only be adjusted for instances in generated or under_review status');
      }
      
      // Store previous version data
      const previousVersion = {
        finalAmount: allocation.finalAmount,
        adjustmentReason: allocation.adjustmentReason,
        version: allocation.version,
        updatedAt: allocation.updatedAt || allocation.createdAt
      };
      
      // Update allocation
      const updatedAllocation = await BonusAllocation.findByIdAndUpdate(
        allocationId,
        {
          finalAmount: newAmount,
          adjustmentReason: reason,
          status: 'adjusted',
          version: allocation.version + 1,
          previousVersion,
          updatedBy: userId,
          updatedAt: new Date()
        },
        { new: true }
      );
      
      // Update instance total amount
      const allAllocations = await BonusAllocation.find({ 
        instanceId: allocation.instanceId,
        status: { $ne: 'excluded' }
      });
      
      const newTotalAmount = allAllocations.reduce((sum, alloc) => sum + alloc.finalAmount, 0);
      
      await BonusInstance.findByIdAndUpdate(
        allocation.instanceId,
        { totalAmount: newTotalAmount }
      );
      
      // Send notification
      await NotificationService.notifyAllocationAdjusted(
        updatedAllocation,
        allocation.finalAmount,
        newAmount,
        reason,
        userId
      );
      
      return {
        success: true,
        allocation: updatedAllocation,
        previousAmount: allocation.finalAmount,
        newAmount,
        difference: newAmount - allocation.finalAmount
      };
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Exclude a bonus allocation
   * 
   * @param {String} allocationId - Allocation ID
   * @param {String} reason - Exclusion reason
   * @param {String} userId - User ID making the exclusion
   * @returns {Promise<Object>} Exclusion result
   */
  async excludeAllocation(allocationId, reason, userId) {
    try {
      // Validate allocation exists
      const allocation = await BonusAllocation.findById(allocationId);
      if (!allocation) {
        throw new ApiError(404, 'Bonus allocation not found');
      }
      
      // Validate instance is in a state that allows exclusions
      const instance = await BonusInstance.findById(allocation.instanceId);
      if (!instance) {
        throw new ApiError(404, 'Bonus instance not found');
      }
      
      if (!['generated', 'under_review'].includes(instance.status)) {
        throw new ApiError(400, 'Allocations can only be excluded for instances in generated or under_review status');
      }
      
      // Store previous version data
      const previousVersion = {
        status: allocation.status,
        finalAmount: allocation.finalAmount,
        version: allocation.version,
        updatedAt: allocation.updatedAt || allocation.createdAt
      };
      
      // Update allocation
      const updatedAllocation = await BonusAllocation.findByIdAndUpdate(
        allocationId,
        {
          status: 'excluded',
          exclusionReason: reason,
          version: allocation.version + 1,
          previousVersion,
          updatedBy: userId,
          updatedAt: new Date()
        },
        { new: true }
      );
      
      // Update instance total amount and count
      const activeAllocations = await BonusAllocation.find({ 
        instanceId: allocation.instanceId,
        status: { $ne: 'excluded' }
      });
      
      const newTotalAmount = activeAllocations.reduce((sum, alloc) => sum + alloc.finalAmount, 0);
      
      await BonusInstance.findByIdAndUpdate(
        allocation.instanceId,
        { 
          totalAmount: newTotalAmount,
          allocationCount: activeAllocations.length
        }
      );
      
      return {
        success: true,
        allocation: updatedAllocation,
        previousStatus: allocation.status,
        previousAmount: allocation.finalAmount
      };
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Get allocation history
   * 
   * @param {String} allocationId - Allocation ID
   * @returns {Promise<Array>} Allocation history
   */
  async getAllocationHistory(allocationId) {
    try {
      // Get current allocation
      const allocation = await BonusAllocation.findById(allocationId);
      if (!allocation) {
        throw new ApiError(404, 'Bonus allocation not found');
      }
      
      // Start with current version
      const history = [{
        version: allocation.version,
        finalAmount: allocation.finalAmount,
        status: allocation.status,
        adjustmentReason: allocation.adjustmentReason,
        exclusionReason: allocation.exclusionReason,
        updatedBy: allocation.updatedBy || allocation.createdBy,
        timestamp: allocation.updatedAt || allocation.createdAt
      }];
      
      // Recursively get previous versions
      let currentVersion = allocation;
      while (currentVersion.previousVersion) {
        const prevVersion = currentVersion.previousVersion;
        
        history.push({
          version: prevVersion.version,
          finalAmount: prevVersion.finalAmount,
          status: prevVersion.status || 'active',
          adjustmentReason: prevVersion.adjustmentReason,
          exclusionReason: prevVersion.exclusionReason,
          updatedBy: prevVersion.updatedBy || allocation.createdBy,
          timestamp: prevVersion.updatedAt
        });
        
        // Move to previous version
        currentVersion = { previousVersion: prevVersion.previousVersion };
      }
      
      // Sort by version (descending)
      return history.sort((a, b) => b.version - a.version);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new BonusGenerationService();
