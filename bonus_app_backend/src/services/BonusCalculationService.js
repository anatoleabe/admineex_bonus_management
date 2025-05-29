/**
 * BonusCalculationService.js
 * 
 * Responsible for calculating bonus amounts based on different calculation methods:
 * - fixed: Simple flat-rate bonuses
 * - percentage: Calculated as a percentage of a base value (e.g., salary)
 * - parts_based: Complex calculations with weighted components
 * - custom_formula: Custom mathematical formulas with variable substitution
 * 
 * Security is a primary concern, especially for custom_formula evaluation.
 */

const vm = require('vm');
const { createContext } = vm;
const math = require('mathjs'); // Assuming mathjs is installed for secure formula evaluation

class BonusCalculationService {
  /**
   * Calculate bonus amount based on template configuration and personnel data
   * 
   * @param {Object} template - The BonusTemplate document
   * @param {Object} personnelSnapshot - The PersonnelSnapshot document
   * @param {Object} context - Additional context data (e.g., rule results, adjustments)
   * @returns {Object} Calculation result with amount and detailed inputs
   */
  async calculateBonus(template, personnelSnapshot, context = {}) {
    try {
      // Extract calculation configuration from template
      const { calculationConfig } = template;
      const { formulaType } = calculationConfig;
      
      // Prepare calculation inputs to be stored for audit/transparency
      const calculationInputs = this._prepareCalculationInputs(template, personnelSnapshot, context);
      
      // Calculate amount based on formula type
      let calculatedAmount = 0;
      
      switch (formulaType) {
        case 'fixed':
          calculatedAmount = this._calculateFixed(calculationConfig, calculationInputs);
          break;
        case 'percentage':
          calculatedAmount = this._calculatePercentage(calculationConfig, calculationInputs);
          break;
        case 'parts_based':
          calculatedAmount = this._calculatePartsBased(calculationConfig, calculationInputs);
          break;
        case 'custom_formula':
          calculatedAmount = this._calculateCustomFormula(calculationConfig, calculationInputs);
          break;
        default:
          throw new Error(`Unsupported formula type: ${formulaType}`);
      }
      
      // Round to 2 decimal places for currency
      calculatedAmount = Math.round(calculatedAmount * 100) / 100;
      
      return {
        calculatedAmount,
        calculationInputs,
        formulaType
      };
    } catch (error) {
      console.error('Error in bonus calculation:', error);
      throw new Error(`Bonus calculation failed: ${error.message}`);
    }
  }
  
  /**
   * Prepare calculation inputs from personnel snapshot and context
   * 
   * @param {Object} template - The BonusTemplate document
   * @param {Object} personnelSnapshot - The PersonnelSnapshot document
   * @param {Object} context - Additional context data
   * @returns {Object} Structured calculation inputs
   */
  _prepareCalculationInputs(template, personnelSnapshot, context) {
    // Extract relevant data from personnel snapshot
    const { data } = personnelSnapshot;
    
    // Basic inputs that are commonly used
    const inputs = {
      baseSalary: data.salary || 0,
      category: data.category || '',
      grade: data.grade || '',
      status: data.status || '',
      rank: data.rank || '',
      // Default parts to 1 if not specified elsewhere
      parts: context.parts || 1,
      // Include any adjustment factors from rules or manual adjustments
      adjustmentFactors: context.adjustmentFactors || {}
    };
    
    // For parts-based calculation, determine parts based on rules if available
    if (template.calculationConfig.formulaType === 'parts_based' && 
        template.calculationConfig.partsConfig) {
      inputs.parts = this._determinePartsValue(template.calculationConfig.partsConfig, data);
    }
    
    return inputs;
  }
  
  /**
   * Calculate fixed amount bonus
   * 
   * @param {Object} config - Calculation configuration
   * @param {Object} inputs - Calculation inputs
   * @returns {Number} Calculated amount
   */
  _calculateFixed(config, inputs) {
    // For fixed bonuses, simply return the defaultShareAmount
    // Apply any global adjustment factors if present
    const baseAmount = config.defaultShareAmount || 0;
    const adjustmentFactor = inputs.adjustmentFactors.global || 1;
    
    return baseAmount * adjustmentFactor;
  }
  
  /**
   * Calculate percentage-based bonus
   * 
   * @param {Object} config - Calculation configuration
   * @param {Object} inputs - Calculation inputs
   * @returns {Number} Calculated amount
   */
  _calculatePercentage(config, inputs) {
    // Extract base value from inputs using the specified baseField
    const baseField = config.baseField || 'baseSalary';
    const baseValue = inputs[baseField] || 0;
    
    // Extract percentage from defaultShareAmount (assumed to be in decimal form, e.g., 0.05 for 5%)
    const percentage = config.defaultShareAmount || 0;
    
    // Apply any global adjustment factors if present
    const adjustmentFactor = inputs.adjustmentFactors.global || 1;
    
    return baseValue * percentage * adjustmentFactor;
  }
  
  /**
   * Calculate parts-based bonus
   * 
   * @param {Object} config - Calculation configuration
   * @param {Object} inputs - Calculation inputs
   * @returns {Number} Calculated amount
   */
  _calculatePartsBased(config, inputs) {
    // Get the share amount per part
    const shareAmount = config.defaultShareAmount || 0;
    
    // Get the number of parts (already determined in _prepareCalculationInputs)
    const parts = inputs.parts;
    
    // Apply any global adjustment factors if present
    const adjustmentFactor = inputs.adjustmentFactors.global || 1;
    
    return shareAmount * parts * adjustmentFactor;
  }
  
  /**
   * Determine the number of parts based on part rules
   * 
   * @param {Object} partsConfig - Parts configuration from template
   * @param {Object} personnelData - Personnel data from snapshot
   * @returns {Number} Number of parts
   */
  _determinePartsValue(partsConfig, personnelData) {
    // Start with default parts
    let parts = partsConfig.defaultParts || 1;
    
    // If no part rules, return default
    if (!partsConfig.partRules || partsConfig.partRules.length === 0) {
      return parts;
    }
    
    // Evaluate each part rule
    for (const rule of partsConfig.partRules) {
      try {
        // Create a secure context for evaluating the condition
        const context = { data: personnelData };
        const sandbox = createContext(context);
        
        // Evaluate the condition
        const conditionResult = vm.runInContext(`(${rule.condition})`, sandbox, {
          timeout: 100, // 100ms timeout for safety
          displayErrors: false
        });
        
        // If condition is true, use this rule's parts value
        if (conditionResult) {
          parts = rule.parts;
          break; // Stop at first matching rule
        }
      } catch (error) {
        console.warn(`Error evaluating part rule condition: ${error.message}`);
        // Continue with next rule on error
      }
    }
    
    return parts;
  }
  
  /**
   * Calculate custom formula bonus with secure evaluation
   * 
   * @param {Object} config - Calculation configuration
   * @param {Object} inputs - Calculation inputs
   * @returns {Number} Calculated amount
   */
  _calculateCustomFormula(config, inputs) {
    // Get the formula string
    const formula = config.formula;
    
    if (!formula) {
      throw new Error('Custom formula is required but not provided');
    }
    
    try {
      // Use mathjs for secure formula evaluation
      // Create a scope with all the inputs as variables
      const scope = { ...inputs };
      
      // Add special variables that might be referenced in formulas
      if (config.baseField && inputs[config.baseField]) {
        scope.base = inputs[config.baseField];
      } else {
        scope.base = inputs.baseSalary;
      }
      
      // Evaluate the formula securely
      const result = math.evaluate(formula, scope);
      
      // Ensure result is a number
      if (typeof result !== 'number' || isNaN(result)) {
        throw new Error('Formula evaluation did not result in a valid number');
      }
      
      return result;
    } catch (error) {
      throw new Error(`Error evaluating custom formula: ${error.message}`);
    }
  }
  
  /**
   * Test a custom formula with sample data
   * 
   * @param {String} formula - The formula to test
   * @param {Object} sampleData - Sample data to use for testing
   * @returns {Object} Test result with calculated value and any errors
   */
  testCustomFormula(formula, sampleData) {
    try {
      // Use mathjs for secure formula evaluation
      const result = math.evaluate(formula, sampleData);
      
      return {
        success: true,
        result,
        error: null
      };
    } catch (error) {
      return {
        success: false,
        result: null,
        error: error.message
      };
    }
  }
}

module.exports = new BonusCalculationService();
