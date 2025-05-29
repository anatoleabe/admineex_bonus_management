/**
 * BonusRuleService.test.js
 * 
 * Unit tests for the BonusRuleService
 */

const BonusRuleService = require('../services/BonusRuleService');

describe('BonusRuleService', () => {
  describe('evaluateRule', () => {
    it('should evaluate simple condition correctly', async () => {
      const rule = {
        condition: 'personnel.department === "Engineering"',
        action: 'include',
        priority: 1
      };
      
      const personnel = {
        id: 'personnel123',
        name: 'John Doe',
        department: 'Engineering',
        salary: 50000
      };
      
      const result = await BonusRuleService.evaluateRule(rule, personnel);
      
      expect(result.passed).toBe(true);
      expect(result.action).toBe('include');
      expect(result.priority).toBe(1);
    });
    
    it('should evaluate complex condition correctly', async () => {
      const rule = {
        condition: 'personnel.salary > 40000 && personnel.performance >= 4',
        action: 'adjust',
        adjustmentType: 'percentage',
        adjustmentValue: 10,
        priority: 2
      };
      
      const personnel = {
        id: 'personnel123',
        name: 'John Doe',
        department: 'Engineering',
        salary: 50000,
        performance: 4
      };
      
      const result = await BonusRuleService.evaluateRule(rule, personnel);
      
      expect(result.passed).toBe(true);
      expect(result.action).toBe('adjust');
      expect(result.adjustmentType).toBe('percentage');
      expect(result.adjustmentValue).toBe(10);
      expect(result.priority).toBe(2);
    });
    
    it('should return not passed for failing condition', async () => {
      const rule = {
        condition: 'personnel.department === "Finance"',
        action: 'include',
        priority: 1
      };
      
      const personnel = {
        id: 'personnel123',
        name: 'John Doe',
        department: 'Engineering',
        salary: 50000
      };
      
      const result = await BonusRuleService.evaluateRule(rule, personnel);
      
      expect(result.passed).toBe(false);
    });
    
    it('should handle errors in condition evaluation', async () => {
      const rule = {
        condition: 'personnel.department === "Engineering" && nonExistentFunction()',
        action: 'include',
        priority: 1
      };
      
      const personnel = {
        id: 'personnel123',
        name: 'John Doe',
        department: 'Engineering',
        salary: 50000
      };
      
      await expect(BonusRuleService.evaluateRule(rule, personnel))
        .rejects.toThrow('Error evaluating rule condition');
    });
  });
  
  describe('applyRules', () => {
    it('should apply multiple rules in priority order', async () => {
      const rules = [
        {
          id: 'rule1',
          condition: 'personnel.department === "Engineering"',
          action: 'include',
          priority: 2
        },
        {
          id: 'rule2',
          condition: 'personnel.salary > 60000',
          action: 'exclude',
          reason: 'Salary too high',
          priority: 1
        },
        {
          id: 'rule3',
          condition: 'personnel.performance >= 4',
          action: 'adjust',
          adjustmentType: 'percentage',
          adjustmentValue: 5,
          priority: 3
        }
      ];
      
      const personnel = {
        id: 'personnel123',
        name: 'John Doe',
        department: 'Engineering',
        salary: 70000,
        performance: 4
      };
      
      const result = await BonusRuleService.applyRules(rules, personnel);
      
      // Rule2 has highest priority and excludes the personnel
      expect(result.action).toBe('exclude');
      expect(result.reason).toBe('Salary too high');
      expect(result.appliedRules).toContain('rule2');
    });
    
    it('should apply adjustment rules correctly', async () => {
      const rules = [
        {
          id: 'rule1',
          condition: 'personnel.department === "Engineering"',
          action: 'adjust',
          adjustmentType: 'percentage',
          adjustmentValue: 10,
          priority: 1
        },
        {
          id: 'rule2',
          condition: 'personnel.performance >= 4',
          action: 'adjust',
          adjustmentType: 'fixed',
          adjustmentValue: 1000,
          priority: 2
        }
      ];
      
      const personnel = {
        id: 'personnel123',
        name: 'John Doe',
        department: 'Engineering',
        salary: 50000,
        performance: 4
      };
      
      const result = await BonusRuleService.applyRules(rules, personnel);
      
      expect(result.action).toBe('adjust');
      expect(result.adjustments).toHaveLength(2);
      expect(result.adjustments[0]).toHaveProperty('type', 'percentage');
      expect(result.adjustments[0]).toHaveProperty('value', 10);
      expect(result.adjustments[1]).toHaveProperty('type', 'fixed');
      expect(result.adjustments[1]).toHaveProperty('value', 1000);
      expect(result.appliedRules).toContain('rule1');
      expect(result.appliedRules).toContain('rule2');
    });
    
    it('should return default include action when no rules match', async () => {
      const rules = [
        {
          id: 'rule1',
          condition: 'personnel.department === "Finance"',
          action: 'include',
          priority: 1
        },
        {
          id: 'rule2',
          condition: 'personnel.salary > 80000',
          action: 'exclude',
          priority: 2
        }
      ];
      
      const personnel = {
        id: 'personnel123',
        name: 'John Doe',
        department: 'Engineering',
        salary: 50000
      };
      
      const result = await BonusRuleService.applyRules(rules, personnel);
      
      expect(result.action).toBe('include');
      expect(result.appliedRules).toHaveLength(0);
    });
  });
  
  describe('applyAdjustments', () => {
    it('should apply percentage adjustments correctly', () => {
      const baseAmount = 1000;
      const adjustments = [
        { type: 'percentage', value: 10 }
      ];
      
      const result = BonusRuleService.applyAdjustments(baseAmount, adjustments);
      
      expect(result).toBe(1100); // 1000 + 10%
    });
    
    it('should apply fixed adjustments correctly', () => {
      const baseAmount = 1000;
      const adjustments = [
        { type: 'fixed', value: 500 }
      ];
      
      const result = BonusRuleService.applyAdjustments(baseAmount, adjustments);
      
      expect(result).toBe(1500); // 1000 + 500
    });
    
    it('should apply multiple adjustments in sequence', () => {
      const baseAmount = 1000;
      const adjustments = [
        { type: 'percentage', value: 10 },
        { type: 'fixed', value: 200 },
        { type: 'percentage', value: 5 }
      ];
      
      const result = BonusRuleService.applyAdjustments(baseAmount, adjustments);
      
      // 1000 + 10% = 1100
      // 1100 + 200 = 1300
      // 1300 + 5% = 1365
      expect(result).toBe(1365);
    });
    
    it('should handle negative adjustments correctly', () => {
      const baseAmount = 1000;
      const adjustments = [
        { type: 'percentage', value: -10 },
        { type: 'fixed', value: -50 }
      ];
      
      const result = BonusRuleService.applyAdjustments(baseAmount, adjustments);
      
      // 1000 - 10% = 900
      // 900 - 50 = 850
      expect(result).toBe(850);
    });
    
    it('should return original amount when no adjustments provided', () => {
      const baseAmount = 1000;
      const adjustments = [];
      
      const result = BonusRuleService.applyAdjustments(baseAmount, adjustments);
      
      expect(result).toBe(1000);
    });
  });
});
