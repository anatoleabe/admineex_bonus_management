/**
 * BonusAllocationController.js
 * 
 * Controller for managing bonus allocations
 */

const BonusAllocation = require('../models/BonusAllocation');
const BonusInstance = require('../models/BonusInstance');
const ApiError = require('../utils/ApiError');
const mongoose = require('mongoose');

class BonusAllocationController {
  /**
   * Get allocations for a bonus instance
   */
  async getAllocations(req, res, next) {
    try {
      const { instanceId, status, personnelId } = req.query;
      
      // Build query based on filters
      const query = {};
      if (instanceId) query.instanceId = instanceId;
      if (status) query.status = status;
      if (personnelId) query.personnelId = personnelId;
      
      // Get allocations with populated personnel details
      const allocations = await BonusAllocation.find(query)
        .populate('personnelId', 'name') // Assuming Personnel model has name field
        .sort({ createdAt: -1 });
      
      res.json(allocations);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get a single allocation by ID
   */
  async getAllocation(req, res, next) {
    try {
      const { id } = req.params;
      
      const allocation = await BonusAllocation.findById(id)
        .populate('personnelId', 'name')
        .populate('instanceId', 'referencePeriod status')
        .populate('templateId', 'code name');
      
      if (!allocation) {
        return next(new ApiError(404, 'Bonus allocation not found'));
      }
      
      res.json(allocation);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Update an allocation (manual adjustment)
   */
  async updateAllocation(req, res, next) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const { id } = req.params;
      const { finalAmount, adjustmentReason } = req.body;
      
      // Get current allocation
      const currentAllocation = await BonusAllocation.findById(id).session(session);
      if (!currentAllocation) {
        await session.abortTransaction();
        session.endSession();
        return next(new ApiError(404, 'Bonus allocation not found'));
      }
      
      // Check if instance allows adjustments
      const instance = await BonusInstance.findById(currentAllocation.instanceId).session(session);
      if (!instance) {
        await session.abortTransaction();
        session.endSession();
        return next(new ApiError(404, 'Bonus instance not found'));
      }
      
      // Only allow adjustments in certain statuses
      const allowedStatuses = ['generated', 'under_review'];
      if (!allowedStatuses.includes(instance.status)) {
        await session.abortTransaction();
        session.endSession();
        return next(new ApiError(400, `Cannot adjust allocations for instance in ${instance.status} status`));
      }
      
      // Create a new version of the allocation
      const newAllocation = new BonusAllocation({
        ...currentAllocation.toObject(),
        _id: new mongoose.Types.ObjectId(), // Generate new ID
        finalAmount,
        adjustmentReason,
        status: 'adjusted',
        version: currentAllocation.version + 1,
        previousVersion: currentAllocation._id
      });
      
      await newAllocation.save({ session });
      
      // Update current allocation to point to new version
      currentAllocation.status = 'superseded';
      await currentAllocation.save({ session });
      
      await session.commitTransaction();
      session.endSession();
      
      res.json(newAllocation);
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      next(error);
    }
  }
  
  /**
   * Exclude an allocation
   */
  async excludeAllocation(req, res, next) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const { id } = req.params;
      const { reason } = req.body;
      
      // Get current allocation
      const currentAllocation = await BonusAllocation.findById(id).session(session);
      if (!currentAllocation) {
        await session.abortTransaction();
        session.endSession();
        return next(new ApiError(404, 'Bonus allocation not found'));
      }
      
      // Check if instance allows exclusions
      const instance = await BonusInstance.findById(currentAllocation.instanceId).session(session);
      if (!instance) {
        await session.abortTransaction();
        session.endSession();
        return next(new ApiError(404, 'Bonus instance not found'));
      }
      
      // Only allow exclusions in certain statuses
      const allowedStatuses = ['generated', 'under_review'];
      if (!allowedStatuses.includes(instance.status)) {
        await session.abortTransaction();
        session.endSession();
        return next(new ApiError(400, `Cannot exclude allocations for instance in ${instance.status} status`));
      }
      
      // Create a new version of the allocation
      const newAllocation = new BonusAllocation({
        ...currentAllocation.toObject(),
        _id: new mongoose.Types.ObjectId(), // Generate new ID
        finalAmount: 0, // Excluded allocations have zero final amount
        adjustmentReason: reason || 'Manually excluded',
        status: 'excluded_manual',
        version: currentAllocation.version + 1,
        previousVersion: currentAllocation._id
      });
      
      await newAllocation.save({ session });
      
      // Update current allocation to point to new version
      currentAllocation.status = 'superseded';
      await currentAllocation.save({ session });
      
      await session.commitTransaction();
      session.endSession();
      
      res.json(newAllocation);
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      next(error);
    }
  }
  
  /**
   * Get allocation history (all versions)
   */
  async getAllocationHistory(req, res, next) {
    try {
      const { id } = req.params;
      
      // Get the allocation
      const allocation = await BonusAllocation.findById(id);
      if (!allocation) {
        return next(new ApiError(404, 'Bonus allocation not found'));
      }
      
      // Find all allocations in the version chain
      const history = await BonusAllocation.find({
        $or: [
          { _id: id },
          { previousVersion: id },
          { _id: allocation.previousVersion }
        ]
      }).sort({ version: 1 });
      
      // If we found the allocation but not its previous version (if it has one),
      // we need to recursively find all previous versions
      if (allocation.previousVersion && !history.some(a => a._id.toString() === allocation.previousVersion.toString())) {
        const allVersions = await this._getAllVersions(allocation);
        res.json(allVersions);
      } else {
        res.json(history);
      }
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Recursively get all versions of an allocation
   * 
   * @param {Object} allocation - The allocation to get versions for
   * @returns {Array} All versions of the allocation
   */
  async _getAllVersions(allocation) {
    const versions = [allocation];
    let currentVersion = allocation;
    
    // Traverse backwards through previous versions
    while (currentVersion.previousVersion) {
      const previousVersion = await BonusAllocation.findById(currentVersion.previousVersion);
      if (!previousVersion) break;
      
      versions.unshift(previousVersion); // Add to beginning of array
      currentVersion = previousVersion;
    }
    
    // Find any newer versions
    let latestVersion = allocation;
    let newerVersions = await BonusAllocation.find({ previousVersion: latestVersion._id });
    
    while (newerVersions.length > 0) {
      latestVersion = newerVersions[0];
      versions.push(latestVersion);
      newerVersions = await BonusAllocation.find({ previousVersion: latestVersion._id });
    }
    
    return versions;
  }
}

module.exports = new BonusAllocationController();
