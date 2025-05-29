/**
 * NotificationService.js
 * 
 * Service for sending notifications about bonus management events
 * Integrates with the main application's notification system
 */

const ApiError = require('../utils/ApiError');

class NotificationService {
  /**
   * Initialize the notification service
   * In a real implementation, this would connect to the main application's notification system
   */
  constructor() {
    // Configuration would typically be loaded from environment variables
    this.enabled = process.env.NOTIFICATIONS_ENABLED === 'true';
    this.apiEndpoint = process.env.MAIN_APP_NOTIFICATION_API || 'http://main-app/api/notifications';
    
    console.log(`NotificationService initialized. Enabled: ${this.enabled}`);
  }
  
  /**
   * Send a notification
   * 
   * @param {String} type - Notification type
   * @param {String} message - Notification message
   * @param {Object} data - Additional data for the notification
   * @param {Array} recipients - List of recipient IDs
   * @returns {Promise<Object>} Notification result
   */
  async sendNotification(type, message, data = {}, recipients = []) {
    try {
      if (!this.enabled) {
        console.log(`Notification disabled: ${type} - ${message}`);
        return { success: true, status: 'disabled' };
      }
      
      // In a real implementation, this would make an API call to the main application
      console.log(`Sending notification: ${type} - ${message}`);
      
      // Mock API call to the main application's notification system
      const notificationData = {
        type,
        message,
        data,
        recipients,
        source: 'bonus-management',
        timestamp: new Date()
      };
      
      // Log the notification data that would be sent
      console.log('Notification data:', JSON.stringify(notificationData));
      
      // In a real implementation, this would be an actual API call
      // return await axios.post(this.apiEndpoint, notificationData);
      
      // For now, we'll just return a mock success response
      return {
        success: true,
        status: 'sent',
        notificationId: `mock-${Date.now()}`
      };
    } catch (error) {
      console.error('Error sending notification:', error);
      
      // Don't throw an error, just log it and return a failure response
      // This ensures that notification failures don't break the main application flow
      return {
        success: false,
        status: 'failed',
        error: error.message
      };
    }
  }
  
  /**
   * Send a notification when a bonus instance is created
   * 
   * @param {Object} instance - Bonus instance
   * @param {String} createdBy - User ID who created the instance
   * @returns {Promise<Object>} Notification result
   */
  async notifyInstanceCreated(instance, createdBy) {
    const templateName = instance.templateName || 'Unknown template';
    const message = `New bonus instance created: ${templateName} for ${instance.referencePeriod}`;
    
    // Determine recipients - typically managers and administrators
    const recipients = await this._getManagerRecipients();
    
    return this.sendNotification(
      'bonus_instance_created',
      message,
      {
        instanceId: instance._id,
        templateId: instance.templateId,
        referencePeriod: instance.referencePeriod,
        createdBy
      },
      recipients
    );
  }
  
  /**
   * Send a notification when allocations are generated
   * 
   * @param {Object} instance - Bonus instance
   * @param {Number} allocationCount - Number of allocations generated
   * @param {String} generatedBy - User ID who generated the allocations
   * @returns {Promise<Object>} Notification result
   */
  async notifyAllocationsGenerated(instance, allocationCount, generatedBy) {
    const templateName = instance.templateName || 'Unknown template';
    const message = `Allocations generated for ${templateName} (${instance.referencePeriod}): ${allocationCount} allocations`;
    
    // Determine recipients - typically managers and administrators
    const recipients = await this._getManagerRecipients();
    
    return this.sendNotification(
      'bonus_allocations_generated',
      message,
      {
        instanceId: instance._id,
        templateId: instance.templateId,
        referencePeriod: instance.referencePeriod,
        allocationCount,
        generatedBy
      },
      recipients
    );
  }
  
  /**
   * Send a notification when an instance status changes
   * 
   * @param {Object} instance - Bonus instance
   * @param {String} previousStatus - Previous status
   * @param {String} newStatus - New status
   * @param {String} updatedBy - User ID who updated the status
   * @returns {Promise<Object>} Notification result
   */
  async notifyStatusChanged(instance, previousStatus, newStatus, updatedBy) {
    const templateName = instance.templateName || 'Unknown template';
    const message = `Bonus instance status changed: ${templateName} (${instance.referencePeriod}) from ${previousStatus} to ${newStatus}`;
    
    // Determine recipients based on the status change
    let recipients = [];
    
    if (newStatus === 'under_review') {
      // Notify approvers when submitted for review
      recipients = await this._getApproverRecipients();
    } else if (previousStatus === 'under_review') {
      // Notify creator and managers when approved or rejected
      recipients = await this._getCreatorAndManagerRecipients(instance.createdBy);
    } else if (newStatus === 'paid') {
      // Notify all stakeholders when marked as paid
      recipients = await this._getAllStakeholders();
    }
    
    return this.sendNotification(
      'bonus_status_changed',
      message,
      {
        instanceId: instance._id,
        templateId: instance.templateId,
        referencePeriod: instance.referencePeriod,
        previousStatus,
        newStatus,
        updatedBy
      },
      recipients
    );
  }
  
  /**
   * Send a notification when an allocation is manually adjusted
   * 
   * @param {Object} allocation - Bonus allocation
   * @param {Number} previousAmount - Previous amount
   * @param {Number} newAmount - New amount
   * @param {String} reason - Adjustment reason
   * @param {String} adjustedBy - User ID who made the adjustment
   * @returns {Promise<Object>} Notification result
   */
  async notifyAllocationAdjusted(allocation, previousAmount, newAmount, reason, adjustedBy) {
    const personnelName = allocation.personnelName || 'Unknown personnel';
    const message = `Bonus allocation adjusted for ${personnelName}: ${previousAmount} → ${newAmount}`;
    
    // Notify the personnel whose allocation was adjusted and their manager
    const recipients = await this._getPersonnelAndManagerRecipients(allocation.personnelId);
    
    return this.sendNotification(
      'bonus_allocation_adjusted',
      message,
      {
        allocationId: allocation._id,
        instanceId: allocation.instanceId,
        personnelId: allocation.personnelId,
        previousAmount,
        newAmount,
        reason,
        adjustedBy
      },
      recipients
    );
  }
  
  /**
   * Get manager recipients
   * In a real implementation, this would query the main application's user system
   * 
   * @returns {Promise<Array>} List of manager user IDs
   */
  async _getManagerRecipients() {
    // Mock implementation - would be replaced with actual API call
    return ['manager1', 'manager2', 'admin1'];
  }
  
  /**
   * Get approver recipients
   * In a real implementation, this would query the main application's user system
   * 
   * @returns {Promise<Array>} List of approver user IDs
   */
  async _getApproverRecipients() {
    // Mock implementation - would be replaced with actual API call
    return ['approver1', 'approver2', 'admin1'];
  }
  
  /**
   * Get creator and manager recipients
   * In a real implementation, this would query the main application's user system
   * 
   * @param {String} creatorId - Creator user ID
   * @returns {Promise<Array>} List of user IDs
   */
  async _getCreatorAndManagerRecipients(creatorId) {
    // Mock implementation - would be replaced with actual API call
    return [creatorId, 'manager1', 'manager2'];
  }
  
  /**
   * Get personnel and their manager recipients
   * In a real implementation, this would query the main application's user system
   * 
   * @param {String} personnelId - Personnel ID
   * @returns {Promise<Array>} List of user IDs
   */
  async _getPersonnelAndManagerRecipients(personnelId) {
    // Mock implementation - would be replaced with actual API call
    // In a real system, we would look up the user ID associated with this personnel ID
    // and also find their manager
    return [`user_${personnelId}`, 'manager1'];
  }
  
  /**
   * Get all stakeholders
   * In a real implementation, this would query the main application's user system
   * 
   * @returns {Promise<Array>} List of all stakeholder user IDs
   */
  async _getAllStakeholders() {
    // Mock implementation - would be replaced with actual API call
    return ['manager1', 'manager2', 'approver1', 'approver2', 'admin1'];
  }
}

module.exports = new NotificationService();
