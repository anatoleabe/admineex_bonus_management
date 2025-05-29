/**
 * WorkflowService.js
 * 
 * Service for managing workflow state transitions and role-based access control
 */

const BonusInstance = require('../models/BonusInstance');
const BonusTemplate = require('../models/BonusTemplate');
const ApiError = require('../utils/ApiError');

class WorkflowService {
  /**
   * Get allowed actions for a bonus instance based on current status and user roles
   * 
   * @param {Object} instance - The BonusInstance document
   * @param {Array} userRoles - Array of user role strings
   * @returns {Object} Object with allowed actions and their metadata
   */
  async getAllowedActions(instance, userRoles) {
    // Define all possible transitions and their role requirements
    const transitions = {
      submit_review: {
        from: ['generated'],
        to: 'under_review',
        requiredRoles: ['manager', 'admin'],
        label: 'Submit for Review',
        description: 'Submit this bonus instance for approval review'
      },
      approve: {
        from: ['under_review'],
        to: 'approved',
        requiredRoles: ['approver', 'admin'],
        label: 'Approve',
        description: 'Approve this bonus instance for payment'
      },
      reject: {
        from: ['under_review'],
        to: 'generated',
        requiredRoles: ['approver', 'admin'],
        label: 'Reject',
        description: 'Reject this bonus instance and return it to generated status'
      },
      mark_paid: {
        from: ['approved'],
        to: 'paid',
        requiredRoles: ['finance', 'admin'],
        label: 'Mark as Paid',
        description: 'Mark this bonus instance as paid'
      },
      cancel: {
        from: ['draft', 'generated', 'under_review', 'approved'],
        to: 'cancelled',
        requiredRoles: ['manager', 'admin'],
        label: 'Cancel',
        description: 'Cancel this bonus instance'
      }
    };
    
    // Get the template to check for custom approval workflow
    const template = await BonusTemplate.findById(instance.templateId);
    
    // If template has custom approval workflow, override the default role requirements
    if (template && template.approvalWorkflow && template.approvalWorkflow.steps) {
      // This is a simplified example - in a real implementation, you would need to
      // track the current step in the workflow and determine which roles can perform
      // which actions at each step
      
      // For now, we'll just use the first step's role for submit_review
      // and the second step's role for approve/reject if they exist
      if (template.approvalWorkflow.steps.length > 0) {
        const firstStep = template.approvalWorkflow.steps[0];
        if (firstStep && firstStep.role) {
          transitions.submit_review.requiredRoles = [firstStep.role];
        }
        
        if (template.approvalWorkflow.steps.length > 1) {
          const secondStep = template.approvalWorkflow.steps[1];
          if (secondStep && secondStep.role) {
            transitions.approve.requiredRoles = [secondStep.role];
            transitions.reject.requiredRoles = [secondStep.role];
          }
        }
      }
    }
    
    // Filter transitions based on current status and user roles
    const allowedActions = {};
    
    Object.entries(transitions).forEach(([action, config]) => {
      // Check if current status allows this transition
      const statusAllows = config.from.includes(instance.status);
      
      // Check if user has required role
      const hasRequiredRole = this._userHasRequiredRole(userRoles, config.requiredRoles);
      
      // If both conditions are met, add to allowed actions
      if (statusAllows && hasRequiredRole) {
        allowedActions[action] = {
          to: config.to,
          label: config.label,
          description: config.description
        };
      }
    });
    
    return allowedActions;
  }
  
  /**
   * Check if user has any of the required roles
   * 
   * @param {Array} userRoles - Array of user role strings
   * @param {Array} requiredRoles - Array of required role strings
   * @returns {Boolean} Whether user has any required role
   */
  _userHasRequiredRole(userRoles, requiredRoles) {
    // If user has admin role, they can perform any action
    if (userRoles.includes('admin')) {
      return true;
    }
    
    // Check if user has any of the required roles
    return requiredRoles.some(role => userRoles.includes(role));
  }
  
  /**
   * Perform a workflow transition
   * 
   * @param {String} instanceId - ID of the BonusInstance
   * @param {String} action - Action to perform (e.g., 'submit_review', 'approve')
   * @param {Object} userData - User data including roles
   * @param {Object} additionalData - Additional data for the transition (e.g., comments)
   * @returns {Object} Updated instance and transition result
   */
  async performTransition(instanceId, action, userData, additionalData = {}) {
    // Get the instance
    const instance = await BonusInstance.findById(instanceId);
    if (!instance) {
      throw new ApiError(404, 'Bonus instance not found');
    }
    
    // Get allowed actions for this user
    const allowedActions = await this.getAllowedActions(instance, userData.roles || []);
    
    // Check if action is allowed
    if (!allowedActions[action]) {
      throw new ApiError(403, `You are not authorized to perform the action: ${action}`);
    }
    
    // Define transition logic
    const transitions = {
      submit_review: async (instance) => {
        instance.status = 'under_review';
        // Add any additional logic for submit_review
        return { message: 'Instance submitted for review' };
      },
      approve: async (instance) => {
        instance.status = 'approved';
        instance.approvalDate = new Date();
        // Add any additional logic for approve
        return { message: 'Instance approved' };
      },
      reject: async (instance) => {
        instance.status = 'generated';
        // Add any additional logic for reject
        return { message: 'Instance rejected' };
      },
      mark_paid: async (instance) => {
        instance.status = 'paid';
        instance.paymentDate = new Date();
        // Add any additional logic for mark_paid
        return { message: 'Instance marked as paid' };
      },
      cancel: async (instance) => {
        instance.status = 'cancelled';
        // Add any additional logic for cancel
        return { message: 'Instance cancelled' };
      }
    };
    
    // Perform the transition
    const result = await transitions[action](instance);
    
    // Add audit trail entry
    if (!instance.workflowHistory) {
      instance.workflowHistory = [];
    }
    
    instance.workflowHistory.push({
      action,
      fromStatus: instance.status,
      toStatus: allowedActions[action].to,
      timestamp: new Date(),
      userId: userData.userId,
      userName: userData.userName,
      comments: additionalData.comments || ''
    });
    
    // Save the instance
    await instance.save();
    
    return {
      instance,
      result
    };
  }
  
  /**
   * Get workflow history for an instance
   * 
   * @param {String} instanceId - ID of the BonusInstance
   * @returns {Array} Workflow history entries
   */
  async getWorkflowHistory(instanceId) {
    const instance = await BonusInstance.findById(instanceId);
    if (!instance) {
      throw new ApiError(404, 'Bonus instance not found');
    }
    
    return instance.workflowHistory || [];
  }
}

module.exports = new WorkflowService();
