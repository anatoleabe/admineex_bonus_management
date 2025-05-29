/**
 * Integration tests for Bonus Management System
 * 
 * Tests the interaction between services and controllers
 */

const mongoose = require('mongoose');
const BonusTemplate = require('../models/BonusTemplate');
const BonusInstance = require('../models/BonusInstance');
const BonusAllocation = require('../models/BonusAllocation');
const BonusRule = require('../models/BonusRule');
const BonusCalculationService = require('../services/BonusCalculationService');
const BonusRuleService = require('../services/BonusRuleService');
const BonusGenerationService = require('../services/BonusGenerationService');
const NotificationService = require('../services/NotificationService');
const WorkflowService = require('../services/WorkflowService');

// Mock dependencies
jest.mock('../services/NotificationService');

describe('Bonus Management System Integration Tests', () => {
  // Setup test database connection
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/bonus_test', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
  });

  // Clean up after tests
  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  // Clear collections before each test
  beforeEach(async () => {
    await BonusTemplate.deleteMany({});
    await BonusInstance.deleteMany({});
    await BonusAllocation.deleteMany({});
    await BonusRule.deleteMany({});
    
    // Reset notification service mocks
    jest.clearAllMocks();
  });

  describe('Bonus Generation Workflow', () => {
    it('should generate allocations based on template and rules', async () => {
      // Create a template
      const template = await BonusTemplate.create({
        name: 'Annual Performance Bonus',
        code: 'APB-2025',
        description: 'Annual performance-based bonus for 2025',
        calculationMethod: 'percentage',
        percentageValue: 10,
        status: 'active'
      });

      // Create rules
      const rules = await BonusRule.create([
        {
          name: 'High Performers',
          description: 'Additional bonus for high performers',
          condition: 'personnel.performance >= 4',
          action: 'adjust',
          adjustmentType: 'percentage',
          adjustmentValue: 5,
          priority: 1,
          status: 'active'
        },
        {
          name: 'Exclude Probation',
          description: 'Exclude personnel on probation',
          condition: 'personnel.status === "probation"',
          action: 'exclude',
          reason: 'Personnel on probation',
          priority: 2,
          status: 'active'
        }
      ]);

      // Create a bonus instance
      const instance = await BonusInstance.create({
        templateId: template._id,
        referencePeriod: 'Q1 2025',
        status: 'draft',
        notes: 'Q1 performance bonus'
      });

      // Mock personnel data
      const personnelData = [
        {
          id: 'p001',
          name: 'John Doe',
          department: 'Engineering',
          salary: 60000,
          performance: 4,
          status: 'active'
        },
        {
          id: 'p002',
          name: 'Jane Smith',
          department: 'Marketing',
          salary: 55000,
          performance: 3,
          status: 'active'
        },
        {
          id: 'p003',
          name: 'Bob Johnson',
          department: 'Engineering',
          salary: 50000,
          performance: 2,
          status: 'probation'
        }
      ];

      // Generate allocations
      const result = await BonusGenerationService.generateAllocations(
        instance._id,
        personnelData,
        'user123'
      );

      // Verify allocations were created
      const allocations = await BonusAllocation.find({ instanceId: instance._id });
      
      // Should have 2 allocations (Bob excluded due to probation)
      expect(allocations).toHaveLength(2);
      
      // Verify John's allocation (with high performer adjustment)
      const johnAllocation = allocations.find(a => a.personnelId === 'p001');
      expect(johnAllocation).toBeDefined();
      expect(johnAllocation.calculatedAmount).toBe(9000); // 60000 * 10% * (1 + 5%)
      expect(johnAllocation.finalAmount).toBe(9000);
      expect(johnAllocation.status).toBe('active');
      
      // Verify Jane's allocation (no adjustment)
      const janeAllocation = allocations.find(a => a.personnelId === 'p002');
      expect(janeAllocation).toBeDefined();
      expect(janeAllocation.calculatedAmount).toBe(5500); // 55000 * 10%
      expect(janeAllocation.finalAmount).toBe(5500);
      expect(janeAllocation.status).toBe('active');
      
      // Verify Bob was excluded
      const bobAllocation = allocations.find(a => a.personnelId === 'p003');
      expect(bobAllocation).toBeUndefined();
      
      // Verify instance was updated
      const updatedInstance = await BonusInstance.findById(instance._id);
      expect(updatedInstance.status).toBe('generated');
      expect(updatedInstance.allocationCount).toBe(2);
      expect(updatedInstance.totalAmount).toBe(14500); // 9000 + 5500
      expect(updatedInstance.generationDate).toBeDefined();
      
      // Verify notifications were sent
      expect(NotificationService.notifyAllocationsGenerated).toHaveBeenCalledWith(
        expect.objectContaining({ _id: instance._id.toString() }),
        2,
        'user123'
      );
    });
  });

  describe('Workflow State Transitions', () => {
    it('should transition instance through approval workflow with notifications', async () => {
      // Create a template
      const template = await BonusTemplate.create({
        name: 'Annual Performance Bonus',
        code: 'APB-2025',
        description: 'Annual performance-based bonus for 2025',
        calculationMethod: 'fixed',
        fixedAmount: 1000,
        status: 'active'
      });

      // Create a bonus instance
      const instance = await BonusInstance.create({
        templateId: template._id,
        referencePeriod: 'Q1 2025',
        status: 'generated',
        allocationCount: 2,
        totalAmount: 2000,
        notes: 'Q1 performance bonus',
        generationDate: new Date()
      });

      // Create allocations
      await BonusAllocation.create([
        {
          instanceId: instance._id,
          templateId: template._id,
          personnelId: 'p001',
          personnelName: 'John Doe',
          calculatedAmount: 1000,
          finalAmount: 1000,
          status: 'active'
        },
        {
          instanceId: instance._id,
          templateId: template._id,
          personnelId: 'p002',
          personnelName: 'Jane Smith',
          calculatedAmount: 1000,
          finalAmount: 1000,
          status: 'active'
        }
      ]);

      // Submit for review
      await WorkflowService.transitionInstance(
        instance._id,
        'under_review',
        'user123',
        'Submitted for Q1 review'
      );
      
      // Verify instance status updated
      let updatedInstance = await BonusInstance.findById(instance._id);
      expect(updatedInstance.status).toBe('under_review');
      expect(updatedInstance.workflowHistory).toHaveLength(1);
      expect(updatedInstance.workflowHistory[0].fromStatus).toBe('generated');
      expect(updatedInstance.workflowHistory[0].toStatus).toBe('under_review');
      
      // Verify notification sent
      expect(NotificationService.notifyStatusChanged).toHaveBeenCalledWith(
        expect.objectContaining({ _id: instance._id.toString() }),
        'generated',
        'under_review',
        'user123'
      );
      
      // Approve the instance
      await WorkflowService.transitionInstance(
        instance._id,
        'approved',
        'approver1',
        'Approved for Q1'
      );
      
      // Verify instance status updated
      updatedInstance = await BonusInstance.findById(instance._id);
      expect(updatedInstance.status).toBe('approved');
      expect(updatedInstance.workflowHistory).toHaveLength(2);
      expect(updatedInstance.workflowHistory[1].fromStatus).toBe('under_review');
      expect(updatedInstance.workflowHistory[1].toStatus).toBe('approved');
      expect(updatedInstance.approvalDate).toBeDefined();
      
      // Verify notification sent
      expect(NotificationService.notifyStatusChanged).toHaveBeenCalledWith(
        expect.objectContaining({ _id: instance._id.toString() }),
        'under_review',
        'approved',
        'approver1'
      );
      
      // Mark as paid
      await WorkflowService.transitionInstance(
        instance._id,
        'paid',
        'finance1',
        'Paid in May 2025 payroll'
      );
      
      // Verify instance status updated
      updatedInstance = await BonusInstance.findById(instance._id);
      expect(updatedInstance.status).toBe('paid');
      expect(updatedInstance.workflowHistory).toHaveLength(3);
      expect(updatedInstance.workflowHistory[2].fromStatus).toBe('approved');
      expect(updatedInstance.workflowHistory[2].toStatus).toBe('paid');
      expect(updatedInstance.paymentDate).toBeDefined();
      
      // Verify notification sent
      expect(NotificationService.notifyStatusChanged).toHaveBeenCalledWith(
        expect.objectContaining({ _id: instance._id.toString() }),
        'approved',
        'paid',
        'finance1'
      );
      
      // Verify invalid transitions are rejected
      await expect(
        WorkflowService.transitionInstance(
          instance._id,
          'draft',
          'user123',
          'Invalid transition'
        )
      ).rejects.toThrow('Invalid status transition');
    });
  });

  describe('Allocation Adjustments', () => {
    it('should adjust allocations and track history', async () => {
      // Create a template
      const template = await BonusTemplate.create({
        name: 'Annual Performance Bonus',
        code: 'APB-2025',
        description: 'Annual performance-based bonus for 2025',
        calculationMethod: 'fixed',
        fixedAmount: 1000,
        status: 'active'
      });

      // Create a bonus instance
      const instance = await BonusInstance.create({
        templateId: template._id,
        referencePeriod: 'Q1 2025',
        status: 'generated',
        allocationCount: 1,
        totalAmount: 1000,
        notes: 'Q1 performance bonus',
        generationDate: new Date()
      });

      // Create allocation
      const allocation = await BonusAllocation.create({
        instanceId: instance._id,
        templateId: template._id,
        personnelId: 'p001',
        personnelName: 'John Doe',
        calculatedAmount: 1000,
        finalAmount: 1000,
        status: 'active',
        version: 1
      });

      // Adjust allocation
      const adjustmentReason = 'Exceptional performance';
      const newAmount = 1200;
      
      const result = await BonusGenerationService.adjustAllocation(
        allocation._id,
        newAmount,
        adjustmentReason,
        'manager1'
      );
      
      // Verify original allocation is updated
      const updatedAllocation = await BonusAllocation.findById(allocation._id);
      expect(updatedAllocation.finalAmount).toBe(1200);
      expect(updatedAllocation.adjustmentReason).toBe(adjustmentReason);
      expect(updatedAllocation.status).toBe('adjusted');
      expect(updatedAllocation.version).toBe(2);
      expect(updatedAllocation.previousVersion).toBeDefined();
      
      // Verify instance total is updated
      const updatedInstance = await BonusInstance.findById(instance._id);
      expect(updatedInstance.totalAmount).toBe(1200);
      
      // Verify notification sent
      expect(NotificationService.notifyAllocationAdjusted).toHaveBeenCalledWith(
        expect.objectContaining({ _id: allocation._id.toString() }),
        1000,
        1200,
        adjustmentReason,
        'manager1'
      );
    });
  });
});
