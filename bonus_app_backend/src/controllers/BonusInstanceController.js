/**
 * BonusInstanceController.js
 * 
 * Controller for managing bonus instances and triggering generation
 */

const BonusInstance = require('../models/BonusInstance');
const BonusTemplate = require('../models/BonusTemplate');
const BonusGenerationService = require('../services/BonusGenerationService');
const ApiError = require('../utils/ApiError');

class BonusInstanceController {
  /**
   * Get all bonus instances with optional filtering
   */
  async getInstances(req, res, next) {
    try {
      const { templateId, status } = req.query;
      
      // Build query based on filters
      const query = {};
      if (templateId) query.templateId = templateId;
      if (status) query.status = status;
      
      // Get instances with populated template details
      const instances = await BonusInstance.find(query)
        .populate('templateId', 'code name')
        .sort({ createdAt: -1 });
      
      // Transform for response
      const response = instances.map(instance => ({
        _id: instance._id,
        templateId: instance.templateId._id,
        template: {
          code: instance.templateId.code,
          name: instance.templateId.name
        },
        referencePeriod: instance.referencePeriod,
        status: instance.status,
        shareAmount: instance.shareAmount,
        generationDate: instance.generationDate,
        approvalDate: instance.approvalDate,
        paymentDate: instance.paymentDate,
        notes: instance.notes,
        createdAt: instance.createdAt,
        updatedAt: instance.updatedAt
      }));
      
      res.json(response);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get a single bonus instance by ID
   */
  async getInstance(req, res, next) {
    try {
      const { id } = req.params;
      
      const instance = await BonusInstance.findById(id)
        .populate('templateId', 'code name category periodicity calculationConfig');
      
      if (!instance) {
        return next(new ApiError(404, 'Bonus instance not found'));
      }
      
      // Transform for response
      const response = {
        _id: instance._id,
        templateId: instance.templateId._id,
        template: {
          code: instance.templateId.code,
          name: instance.templateId.name,
          category: instance.templateId.category,
          periodicity: instance.templateId.periodicity,
          calculationConfig: instance.templateId.calculationConfig
        },
        referencePeriod: instance.referencePeriod,
        status: instance.status,
        shareAmount: instance.shareAmount,
        generationDate: instance.generationDate,
        approvalDate: instance.approvalDate,
        paymentDate: instance.paymentDate,
        customOverrides: instance.customOverrides,
        notes: instance.notes,
        createdAt: instance.createdAt,
        updatedAt: instance.updatedAt,
        createdBy: instance.createdBy
      };
      
      res.json(response);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Create a new bonus instance
   */
  async createInstance(req, res, next) {
    try {
      const { templateId, referencePeriod, shareAmount, notes } = req.body;
      
      // Validate template exists
      const template = await BonusTemplate.findById(templateId);
      if (!template) {
        return next(new ApiError(404, 'Bonus template not found'));
      }
      
      // Create instance
      const instance = new BonusInstance({
        templateId,
        referencePeriod,
        shareAmount: shareAmount || template.calculationConfig.defaultShareAmount,
        notes,
        status: 'draft',
        createdBy: req.user ? req.user._id : undefined
      });
      
      await instance.save();
      
      res.status(201).json(instance);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Update a bonus instance
   */
  async updateInstance(req, res, next) {
    try {
      const { id } = req.params;
      const { referencePeriod, shareAmount, notes, customOverrides } = req.body;
      
      const instance = await BonusInstance.findById(id);
      if (!instance) {
        return next(new ApiError(404, 'Bonus instance not found'));
      }
      
      // Only allow updates in draft status
      if (instance.status !== 'draft') {
        return next(new ApiError(400, `Cannot update instance in ${instance.status} status`));
      }
      
      // Update fields
      if (referencePeriod) instance.referencePeriod = referencePeriod;
      if (shareAmount !== undefined) instance.shareAmount = shareAmount;
      if (notes !== undefined) instance.notes = notes;
      if (customOverrides) instance.customOverrides = customOverrides;
      
      await instance.save();
      
      res.json(instance);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Generate allocations for a bonus instance
   */
  async generateAllocations(req, res, next) {
    try {
      const { id } = req.params;
      
      // Generate allocations using the service
      const results = await BonusGenerationService.generateAllocations(id);
      
      res.json({
        message: 'Bonus allocations generated successfully',
        results: {
          total: results.total,
          eligible: results.eligible,
          excluded: results.excluded
        }
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Update instance status (workflow transitions)
   */
  async updateStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { action, reason } = req.body;
      
      const instance = await BonusInstance.findById(id);
      if (!instance) {
        return next(new ApiError(404, 'Bonus instance not found'));
      }
      
      // Define allowed transitions
      const transitions = {
        submit_review: {
          from: ['generated'],
          to: 'under_review'
        },
        approve: {
          from: ['under_review'],
          to: 'approved',
          setField: 'approvalDate',
          setValue: new Date()
        },
        reject: {
          from: ['under_review'],
          to: 'generated'
        },
        mark_paid: {
          from: ['approved'],
          to: 'paid',
          setField: 'paymentDate',
          setValue: new Date()
        },
        cancel: {
          from: ['draft', 'generated', 'under_review', 'approved'],
          to: 'cancelled'
        }
      };
      
      // Validate action
      if (!transitions[action]) {
        return next(new ApiError(400, `Invalid action: ${action}`));
      }
      
      // Validate current status allows this transition
      if (!transitions[action].from.includes(instance.status)) {
        return next(new ApiError(400, `Cannot ${action} instance in ${instance.status} status`));
      }
      
      // Update status
      instance.status = transitions[action].to;
      
      // Set additional fields if specified in the transition
      if (transitions[action].setField) {
        instance[transitions[action].setField] = transitions[action].setValue;
      }
      
      await instance.save();
      
      res.json({
        message: `Instance status updated to ${instance.status}`,
        instance
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new BonusInstanceController();
