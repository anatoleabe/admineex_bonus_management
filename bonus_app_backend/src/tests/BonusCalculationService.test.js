/**
 * BonusCalculationService.test.js
 * 
 * Unit tests for the BonusCalculationService
 */

const BonusCalculationService = require('../services/BonusCalculationService');

describe('BonusCalculationService', () => {
  describe('calculateBonus', () => {
    it('should calculate fixed amount bonus correctly', async () => {
      const template = {
        calculationMethod: 'fixed',
        fixedAmount: 1000
      };
      
      const personnel = {
        id: 'personnel123',
        name: 'John Doe',
        salary: 50000,
        department: 'Engineering'
      };
      
      const result = await BonusCalculationService.calculateBonus(template, personnel);
      
      expect(result.calculatedAmount).toBe(1000);
      expect(result.calculationInputs).toHaveProperty('method', 'fixed');
      expect(result.calculationInputs).toHaveProperty('fixedAmount', 1000);
    });
    
    it('should calculate percentage-based bonus correctly', async () => {
      const template = {
        calculationMethod: 'percentage',
        percentageValue: 10
      };
      
      const personnel = {
        id: 'personnel123',
        name: 'John Doe',
        salary: 50000,
        department: 'Engineering'
      };
      
      const result = await BonusCalculationService.calculateBonus(template, personnel);
      
      expect(result.calculatedAmount).toBe(5000); // 10% of 50000
      expect(result.calculationInputs).toHaveProperty('method', 'percentage');
      expect(result.calculationInputs).toHaveProperty('percentageValue', 10);
      expect(result.calculationInputs).toHaveProperty('baseSalary', 50000);
    });
    
    it('should calculate parts-based bonus correctly', async () => {
      const template = {
        calculationMethod: 'parts_based',
        partsConfig: [
          { name: 'Base', type: 'fixed', value: 1000 },
          { name: 'Performance', type: 'percentage', value: 5, baseField: 'salary' },
          { name: 'Tenure', type: 'formula', formula: 'tenure * 100' }
        ]
      };
      
      const personnel = {
        id: 'personnel123',
        name: 'John Doe',
        salary: 50000,
        department: 'Engineering',
        tenure: 3
      };
      
      const result = await BonusCalculationService.calculateBonus(template, personnel);
      
      // Expected: 1000 (base) + 2500 (5% of 50000) + 300 (3 * 100) = 3800
      expect(result.calculatedAmount).toBe(3800);
      expect(result.calculationInputs).toHaveProperty('method', 'parts_based');
      expect(result.calculationInputs).toHaveProperty('parts');
      expect(result.calculationInputs.parts).toHaveLength(3);
      expect(result.calculationInputs.parts[0]).toHaveProperty('name', 'Base');
      expect(result.calculationInputs.parts[0]).toHaveProperty('amount', 1000);
      expect(result.calculationInputs.parts[1]).toHaveProperty('name', 'Performance');
      expect(result.calculationInputs.parts[1]).toHaveProperty('amount', 2500);
      expect(result.calculationInputs.parts[2]).toHaveProperty('name', 'Tenure');
      expect(result.calculationInputs.parts[2]).toHaveProperty('amount', 300);
    });
    
    it('should calculate custom formula bonus correctly', async () => {
      const template = {
        calculationMethod: 'custom_formula',
        formula: 'baseSalary * 0.1 + (performance * 500) + (tenure * 200)'
      };
      
      const personnel = {
        id: 'personnel123',
        name: 'John Doe',
        salary: 50000,
        department: 'Engineering',
        performance: 4,
        tenure: 3
      };
      
      const result = await BonusCalculationService.calculateBonus(template, personnel);
      
      // Expected: 50000 * 0.1 + (4 * 500) + (3 * 200) = 5000 + 2000 + 600 = 7600
      expect(result.calculatedAmount).toBe(7600);
      expect(result.calculationInputs).toHaveProperty('method', 'custom_formula');
      expect(result.calculationInputs).toHaveProperty('formula', template.formula);
      expect(result.calculationInputs).toHaveProperty('variables');
      expect(result.calculationInputs.variables).toHaveProperty('baseSalary', 50000);
      expect(result.calculationInputs.variables).toHaveProperty('performance', 4);
      expect(result.calculationInputs.variables).toHaveProperty('tenure', 3);
    });
    
    it('should handle errors in custom formula calculation', async () => {
      const template = {
        calculationMethod: 'custom_formula',
        formula: 'baseSalary * 0.1 + nonExistentVariable'
      };
      
      const personnel = {
        id: 'personnel123',
        name: 'John Doe',
        salary: 50000
      };
      
      await expect(BonusCalculationService.calculateBonus(template, personnel))
        .rejects.toThrow('Error calculating bonus');
    });
    
    it('should throw error for unsupported calculation method', async () => {
      const template = {
        calculationMethod: 'unsupported_method'
      };
      
      const personnel = {
        id: 'personnel123',
        name: 'John Doe'
      };
      
      await expect(BonusCalculationService.calculateBonus(template, personnel))
        .rejects.toThrow('Unsupported calculation method');
    });
  });
  
  describe('evaluateFormula', () => {
    it('should evaluate simple formulas correctly', () => {
      const formula = '2 + 2';
      const variables = {};
      
      const result = BonusCalculationService.evaluateFormula(formula, variables);
      
      expect(result).toBe(4);
    });
    
    it('should evaluate formulas with variables correctly', () => {
      const formula = 'x + y * z';
      const variables = { x: 5, y: 3, z: 2 };
      
      const result = BonusCalculationService.evaluateFormula(formula, variables);
      
      expect(result).toBe(11); // 5 + (3 * 2)
    });
    
    it('should handle missing variables by treating them as 0', () => {
      const formula = 'x + y';
      const variables = { x: 5 };
      
      const result = BonusCalculationService.evaluateFormula(formula, variables);
      
      expect(result).toBe(5); // y is treated as 0
    });
    
    it('should throw error for invalid formulas', () => {
      const formula = 'x +* y';
      const variables = { x: 5, y: 3 };
      
      expect(() => BonusCalculationService.evaluateFormula(formula, variables))
        .toThrow();
    });
    
    it('should prevent execution of dangerous functions', () => {
      const formula = 'Math.max(x, y) + Math.min(z, 10)';
      const variables = { x: 5, y: 3, z: 15 };
      
      // This should throw an error because Math functions are not allowed
      expect(() => BonusCalculationService.evaluateFormula(formula, variables))
        .toThrow();
    });
  });
});
