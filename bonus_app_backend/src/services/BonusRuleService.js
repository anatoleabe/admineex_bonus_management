/**
 * BonusRuleService.js
 * 
 * Responsible for evaluating bonus rules against personnel data:
 * - Securely evaluates rule conditions and actions
 * - Applies rules in priority order
 * - Integrates with bonus generation process
 * 
 * Security is a primary concern for rule evaluation.
 */

const vm = require('vm');
const { createContext } = vm;

class BonusRuleService {
  /**
   * Evaluate rules against personnel data
   * 
   * @param {Array} rules - Array of BonusRule documents
   * @param {Object} personnelSnapshot - The PersonnelSnapshot document
   * @param {Object} context - Initial context (will be modified by rule actions)
   * @returns {Object} Modified context after rule application
   */
  async evaluateRules(rules, personnelSnapshot, context = {}) {
    try {
      // Initialize result context if not provided
      const resultContext = {
        isEligible: true, // Default to eligible
        adjustmentFactors: {}, // Store adjustment factors
        excludeReason: null, // Reason for exclusion if applicable
        ...context // Include any existing context
      };
      
      // Sort rules by priority (lower number = higher priority)
      const sortedRules = [...rules].sort((a, b) => a.priority - b.priority);
      
      // Track which rules were applied
      const appliedRules = [];
      
      // Evaluate each rule in priority order
      for (const rule of sortedRules) {
        // Skip inactive rules
        if (!rule.isActive) continue;
        
        // Evaluate rule condition
        const conditionResult = await this._evaluateCondition(rule.condition, personnelSnapshot, resultContext);
        
        // If condition is true, apply the action
        if (conditionResult) {
          await this._executeAction(rule.action, personnelSnapshot, resultContext);
          
          // Track that this rule was applied
          appliedRules.push({
            ruleId: rule._id,
            ruleName: rule.name,
            condition: rule.condition,
            action: rule.action
          });
          
          // If rule excluded the personnel, stop processing further rules
          if (resultContext.isEligible === false) {
            resultContext.excludeReason = `Excluded by rule: ${rule.name}`;
            break;
          }
        }
      }
      
      // Add applied rules to the result context
      resultContext.appliedRules = appliedRules;
      
      return resultContext;
    } catch (error) {
      console.error('Error in rule evaluation:', error);
      throw new Error(`Rule evaluation failed: ${error.message}`);
    }
  }
  
  /**
   * Evaluate a single rule condition
   * 
   * @param {String} condition - Rule condition string
   * @param {Object} personnelSnapshot - Personnel snapshot data
   * @param {Object} context - Current context
   * @returns {Boolean} Whether condition evaluates to true
   */
  async _evaluateCondition(condition, personnelSnapshot, context) {
    try {
      // Create a secure sandbox with personnel data and context
      const sandbox = {
        data: personnelSnapshot.data || {},
        context: { ...context },
        // Add utility functions that might be useful in conditions
        utils: {
          hasValue: (val) => val !== undefined && val !== null,
          inArray: (arr, val) => Array.isArray(arr) && arr.includes(val),
          dateInRange: (date, start, end) => {
            const checkDate = new Date(date);
            return (!start || checkDate >= new Date(start)) && 
                   (!end || checkDate <= new Date(end));
          }
        }
      };
      
      // Create VM context
      const vmContext = createContext(sandbox);
      
      // Evaluate the condition with a timeout for safety
      const result = vm.runInContext(`(${condition})`, vmContext, {
        timeout: 100, // 100ms timeout
        displayErrors: false
      });
      
      // Ensure result is a boolean
      return !!result;
    } catch (error) {
      console.warn(`Error evaluating rule condition: ${error.message}`);
      // Return false on error to skip this rule
      return false;
    }
  }
  
  /**
   * Execute a rule action
   * 
   * @param {String} action - Rule action string
   * @param {Object} personnelSnapshot - Personnel snapshot data
   * @param {Object} context - Current context (will be modified)
   */
  async _executeAction(action, personnelSnapshot, context) {
    try {
      // Create a secure sandbox with personnel data and context
      const sandbox = {
        data: personnelSnapshot.data || {},
        context: context, // This will be modified by the action
        // Add utility functions that might be useful in actions
        utils: {
          setAdjustmentFactor: (key, value) => {
            if (!context.adjustmentFactors) context.adjustmentFactors = {};
            context.adjustmentFactors[key] = value;
          },
          exclude: (reason) => {
            context.isEligible = false;
            context.excludeReason = reason || 'Excluded by rule';
          },
          setParts: (value) => {
            context.parts = value;
          }
        }
      };
      
      // Create VM context
      const vmContext = createContext(sandbox);
      
      // Execute the action with a timeout for safety
      vm.runInContext(`(${action})`, vmContext, {
        timeout: 100, // 100ms timeout
        displayErrors: false
      });
      
      // Context is modified directly by the action
      return context;
    } catch (error) {
      console.warn(`Error executing rule action: ${error.message}`);
      // Return unmodified context on error
      return context;
    }
  }
  
  /**
   * Test a rule with sample data
   * 
   * @param {Object} rule - Rule to test (with condition and action)
   * @param {Object} sampleData - Sample data to use for testing
   * @returns {Object} Test result with condition result, context after action, and any errors
   */
  async testRule(rule, sampleData) {
    try {
      // Create a test context
      const testContext = {
        isEligible: true,
        adjustmentFactors: {},
      };
      
      // Create a mock personnel snapshot with the sample data
      const mockSnapshot = {
        data: sampleData
      };
      
      // Evaluate the condition
      const conditionResult = await this._evaluateCondition(rule.condition, mockSnapshot, testContext);
      
      // If condition is true, apply the action
      let actionResult = null;
      if (conditionResult) {
        actionResult = await this._executeAction(rule.action, mockSnapshot, testContext);
      }
      
      return {
        success: true,
        conditionResult,
        resultContext: actionResult || testContext,
        error: null
      };
    } catch (error) {
      return {
        success: false,
        conditionResult: null,
        resultContext: null,
        error: error.message
      };
    }
  }
}

module.exports = new BonusRuleService();
