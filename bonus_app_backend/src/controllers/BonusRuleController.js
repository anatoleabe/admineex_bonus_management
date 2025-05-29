const BonusRule = require("../models/BonusRule");
const { ApiError } = require("../utils/ApiError"); // Assuming ApiError utility exists
const httpStatus = require("http-status");

// Basic CRUD operations for Bonus Rules

const createRule = async (req, res, next) => {
    try {
        // Add validation logic here
        const newRule = new BonusRule({
            ...req.body,
            createdBy: req.user?.id, // Assuming user ID is available from auth middleware
            lastUpdatedBy: req.user?.id,
        });
        await newRule.save();
        res.status(httpStatus.CREATED).json(newRule);
    } catch (error) {
        // Handle potential duplicate name error (unique index)
        if (error.code === 11000) {
            next(new ApiError(httpStatus.BAD_REQUEST, `Bonus rule name \'${req.body.name}\' already exists.`));
        } else {
            next(error); // Pass other errors to the error handler
        }
    }
};

const getAllRules = async (req, res, next) => {
    try {
        // Add filtering (e.g., by appliesToTemplates, isActive), sorting, pagination later
        const filter = { isActive: true }; // Default to active rules
        if (req.query.templateId) {
            filter.appliesToTemplates = req.query.templateId;
        }
        if (req.query.includeInactive === 'true') {
            delete filter.isActive;
        }

        const rules = await BonusRule.find(filter).populate('appliesToTemplates', 'code name'); // Populate template refs
        res.status(httpStatus.OK).json(rules);
    } catch (error) {
        next(error);
    }
};

const getRuleById = async (req, res, next) => {
    try {
        const rule = await BonusRule.findById(req.params.id).populate('appliesToTemplates', 'code name');
        if (!rule) {
            throw new ApiError(httpStatus.NOT_FOUND, "Bonus rule not found");
        }
        res.status(httpStatus.OK).json(rule);
    } catch (error) {
        next(error);
    }
};

const updateRule = async (req, res, next) => {
    try {
        // Add validation logic here
        const rule = await BonusRule.findByIdAndUpdate(
            req.params.id,
            {
                ...req.body,
                lastUpdatedBy: req.user?.id,
            },
            { new: true, runValidators: true } // Return updated doc, run schema validators
        );
        if (!rule) {
            throw new ApiError(httpStatus.NOT_FOUND, "Bonus rule not found");
        }
        res.status(httpStatus.OK).json(rule);
    } catch (error) {
         if (error.code === 11000) {
            next(new ApiError(httpStatus.BAD_REQUEST, `Bonus rule name \'${req.body.name}\' already exists.`));
        } else {
            next(error);
        }
    }
};

// Soft delete - setting isActive to false
const deleteRule = async (req, res, next) => {
    try {
        const rule = await BonusRule.findByIdAndUpdate(
            req.params.id,
            {
                isActive: false,
                // Consider adding deactivatedAt/By fields if needed
                lastUpdatedBy: req.user?.id,
            },
            { new: true }
        );

        if (!rule) {
            throw new ApiError(httpStatus.NOT_FOUND, "Bonus rule not found");
        }
        res.status(httpStatus.OK).json({ message: "Bonus rule deactivated successfully", rule });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createRule,
    getAllRules,
    getRuleById,
    updateRule,
    deleteRule,
    // Add activate/deactivate endpoints if needed
    // Add validate/test endpoints later based on implementation plan
};
