/**
 * WorkflowController.js
 * 
 * Controller for managing workflow transitions and retrieving allowed actions
 */

const BonusInstance = require('../models/BonusInstance');
const WorkflowService = require('../services/WorkflowService');
const ApiError = require('../utils/ApiError');

class WorkflowController {
  /**
   * Get allowed actions for a bonus instance
   */
  async getAllowedActions(req, res, next) {
    try {
      const { id } = req.params;
      
      // Get the instance
      const instance = await BonusInstance.findById(id);
      if (!instance) {
        return next(new ApiError(404, 'Bonus instance not found'));
      }
      
      // Get user roles from authenticated user
      const userRoles = req.user ? req.user.roles || [] : [];
      
      // Get allowed actions from workflow service
      const allowedActions = await WorkflowService.getAllowedActions(instance, userRoles);
      
      res.json(allowedActions);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Perform a workflow transition
   */
  async performTransition(req, res, next) {
    try {
      const { id } = req.params;
      const { action, comments } = req.body;
      
      // Get user data from authenticated user
      const userData = {
        userId: req.user ? req.user._id : null,
        userName: req.user ? req.user.name : 'Unknown',
        roles: req.user ? req.user.roles || [] : []
      };
      
      // Additional data for the transition
      const additionalData = {
        comments
      };
      
      // Perform the transition
      const result = await WorkflowService.performTransition(id, action, userData, additionalData);
      
      res.json({
        message: result.result.message,
        instance: result.instance
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get workflow history for an instance
   */
  async getWorkflowHistory(req, res, next) {
    try {
      const { id } = req.params;
      
      // Get workflow history from service
      const history = await WorkflowService.getWorkflowHistory(id);
      
      res.json(history);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new WorkflowController();
