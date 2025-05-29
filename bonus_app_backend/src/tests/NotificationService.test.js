/**
 * NotificationService.test.js
 * 
 * Unit tests for the NotificationService
 */

const NotificationService = require('../services/NotificationService');

// Mock console methods to prevent test output noise
console.log = jest.fn();
console.error = jest.fn();

describe('NotificationService', () => {
  // Store original environment variables
  const originalEnv = process.env;
  
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Set up test environment variables
    process.env = {
      ...originalEnv,
      NOTIFICATIONS_ENABLED: 'true',
      MAIN_APP_NOTIFICATION_API: 'http://test-api/notifications'
    };
  });
  
  afterAll(() => {
    // Restore original environment variables
    process.env = originalEnv;
  });
  
  describe('sendNotification', () => {
    it('should send a notification when enabled', async () => {
      const result = await NotificationService.sendNotification(
        'test_type',
        'Test message',
        { testData: 'value' },
        ['user1', 'user2']
      );
      
      expect(result.success).toBe(true);
      expect(result.status).toBe('sent');
      expect(console.log).toHaveBeenCalledWith('Sending notification: test_type - Test message');
    });
    
    it('should not send a notification when disabled', async () => {
      process.env.NOTIFICATIONS_ENABLED = 'false';
      
      const result = await NotificationService.sendNotification(
        'test_type',
        'Test message',
        { testData: 'value' },
        ['user1', 'user2']
      );
      
      expect(result.success).toBe(true);
      expect(result.status).toBe('disabled');
      expect(console.log).toHaveBeenCalledWith('Notification disabled: test_type - Test message');
    });
    
    it('should handle errors gracefully', async () => {
      // Mock implementation to throw an error
      jest.spyOn(console, 'log').mockImplementationOnce(() => {
        throw new Error('Test error');
      });
      
      const result = await NotificationService.sendNotification(
        'test_type',
        'Test message'
      );
      
      expect(result.success).toBe(false);
      expect(result.status).toBe('failed');
      expect(result.error).toBe('Test error');
      expect(console.error).toHaveBeenCalled();
    });
  });
  
  describe('notifyInstanceCreated', () => {
    it('should send a notification with correct data', async () => {
      const mockInstance = {
        _id: 'instance123',
        templateId: 'template456',
        templateName: 'Annual Bonus',
        referencePeriod: 'Q1 2025'
      };
      
      const sendNotificationSpy = jest.spyOn(NotificationService, 'sendNotification');
      const getManagerRecipientsSpy = jest.spyOn(NotificationService, '_getManagerRecipients')
        .mockResolvedValue(['manager1', 'manager2']);
      
      await NotificationService.notifyInstanceCreated(mockInstance, 'user123');
      
      expect(getManagerRecipientsSpy).toHaveBeenCalled();
      expect(sendNotificationSpy).toHaveBeenCalledWith(
        'bonus_instance_created',
        'New bonus instance created: Annual Bonus for Q1 2025',
        {
          instanceId: 'instance123',
          templateId: 'template456',
          referencePeriod: 'Q1 2025',
          createdBy: 'user123'
        },
        ['manager1', 'manager2']
      );
    });
  });
  
  describe('notifyAllocationsGenerated', () => {
    it('should send a notification with correct data', async () => {
      const mockInstance = {
        _id: 'instance123',
        templateId: 'template456',
        templateName: 'Annual Bonus',
        referencePeriod: 'Q1 2025'
      };
      
      const sendNotificationSpy = jest.spyOn(NotificationService, 'sendNotification');
      const getManagerRecipientsSpy = jest.spyOn(NotificationService, '_getManagerRecipients')
        .mockResolvedValue(['manager1', 'manager2']);
      
      await NotificationService.notifyAllocationsGenerated(mockInstance, 50, 'user123');
      
      expect(getManagerRecipientsSpy).toHaveBeenCalled();
      expect(sendNotificationSpy).toHaveBeenCalledWith(
        'bonus_allocations_generated',
        'Allocations generated for Annual Bonus (Q1 2025): 50 allocations',
        {
          instanceId: 'instance123',
          templateId: 'template456',
          referencePeriod: 'Q1 2025',
          allocationCount: 50,
          generatedBy: 'user123'
        },
        ['manager1', 'manager2']
      );
    });
  });
  
  describe('notifyStatusChanged', () => {
    it('should notify approvers when status changes to under_review', async () => {
      const mockInstance = {
        _id: 'instance123',
        templateId: 'template456',
        templateName: 'Annual Bonus',
        referencePeriod: 'Q1 2025'
      };
      
      const sendNotificationSpy = jest.spyOn(NotificationService, 'sendNotification');
      const getApproverRecipientsSpy = jest.spyOn(NotificationService, '_getApproverRecipients')
        .mockResolvedValue(['approver1', 'approver2']);
      
      await NotificationService.notifyStatusChanged(
        mockInstance,
        'generated',
        'under_review',
        'user123'
      );
      
      expect(getApproverRecipientsSpy).toHaveBeenCalled();
      expect(sendNotificationSpy).toHaveBeenCalledWith(
        'bonus_status_changed',
        'Bonus instance status changed: Annual Bonus (Q1 2025) from generated to under_review',
        {
          instanceId: 'instance123',
          templateId: 'template456',
          referencePeriod: 'Q1 2025',
          previousStatus: 'generated',
          newStatus: 'under_review',
          updatedBy: 'user123'
        },
        ['approver1', 'approver2']
      );
    });
    
    it('should notify creator and managers when approved from under_review', async () => {
      const mockInstance = {
        _id: 'instance123',
        templateId: 'template456',
        templateName: 'Annual Bonus',
        referencePeriod: 'Q1 2025',
        createdBy: 'creator123'
      };
      
      const sendNotificationSpy = jest.spyOn(NotificationService, 'sendNotification');
      const getCreatorAndManagerRecipientsSpy = jest.spyOn(NotificationService, '_getCreatorAndManagerRecipients')
        .mockResolvedValue(['creator123', 'manager1', 'manager2']);
      
      await NotificationService.notifyStatusChanged(
        mockInstance,
        'under_review',
        'approved',
        'approver1'
      );
      
      expect(getCreatorAndManagerRecipientsSpy).toHaveBeenCalledWith('creator123');
      expect(sendNotificationSpy).toHaveBeenCalledWith(
        'bonus_status_changed',
        'Bonus instance status changed: Annual Bonus (Q1 2025) from under_review to approved',
        {
          instanceId: 'instance123',
          templateId: 'template456',
          referencePeriod: 'Q1 2025',
          previousStatus: 'under_review',
          newStatus: 'approved',
          updatedBy: 'approver1'
        },
        ['creator123', 'manager1', 'manager2']
      );
    });
  });
  
  describe('notifyAllocationAdjusted', () => {
    it('should send a notification with correct data', async () => {
      const mockAllocation = {
        _id: 'allocation123',
        instanceId: 'instance456',
        personnelId: 'personnel789',
        personnelName: 'John Doe'
      };
      
      const sendNotificationSpy = jest.spyOn(NotificationService, 'sendNotification');
      const getPersonnelAndManagerRecipientsSpy = jest.spyOn(NotificationService, '_getPersonnelAndManagerRecipients')
        .mockResolvedValue(['user_personnel789', 'manager1']);
      
      await NotificationService.notifyAllocationAdjusted(
        mockAllocation,
        1000,
        1200,
        'Performance exceeded expectations',
        'manager1'
      );
      
      expect(getPersonnelAndManagerRecipientsSpy).toHaveBeenCalledWith('personnel789');
      expect(sendNotificationSpy).toHaveBeenCalledWith(
        'bonus_allocation_adjusted',
        'Bonus allocation adjusted for John Doe: 1000 → 1200',
        {
          allocationId: 'allocation123',
          instanceId: 'instance456',
          personnelId: 'personnel789',
          previousAmount: 1000,
          newAmount: 1200,
          reason: 'Performance exceeded expectations',
          adjustedBy: 'manager1'
        },
        ['user_personnel789', 'manager1']
      );
    });
  });
});
