const BonusTemplate = require("../models/BonusTemplate");
const { ApiError } = require("../utils/ApiError"); // Assuming ApiError utility exists
const httpStatus = require("http-status");

// Basic CRUD operations for Bonus Templates

const createTemplate = async (req, res, next) => {
    try {
        // Add validation logic here (e.g., using Joi or express-validator)
        const newTemplate = new BonusTemplate({
            ...req.body,
            createdBy: req.user?.id, // Assuming user ID is available from auth middleware
            lastUpdatedBy: req.user?.id,
        });
        await newTemplate.save();
        res.status(httpStatus.CREATED).json(newTemplate);
    } catch (error) {
        // Handle potential duplicate code error (unique index)
        if (error.code === 11000) {
            next(new ApiError(httpStatus.BAD_REQUEST, `Bonus template code '${req.body.code}' already exists.`));
        } else {
            next(error); // Pass other errors to the error handler
        }
    }
};

const getAllTemplates = async (req, res, next) => {
    try {
        // Add filtering, sorting, pagination later
        const templates = await BonusTemplate.find({ isActive: true }); // Default to active templates
        res.status(httpStatus.OK).json(templates);
    } catch (error) {
        next(error);
    }
};

const getTemplateById = async (req, res, next) => {
    try {
        const template = await BonusTemplate.findById(req.params.id);
        if (!template) {
            throw new ApiError(httpStatus.NOT_FOUND, "Bonus template not found");
        }
        res.status(httpStatus.OK).json(template);
    } catch (error) {
        next(error);
    }
};

const updateTemplate = async (req, res, next) => {
    try {
        // Add validation logic here
        const template = await BonusTemplate.findByIdAndUpdate(
            req.params.id,
            {
                ...req.body,
                lastUpdatedBy: req.user?.id,
            },
            { new: true, runValidators: true } // Return updated doc, run schema validators
        );
        if (!template) {
            throw new ApiError(httpStatus.NOT_FOUND, "Bonus template not found");
        }
        res.status(httpStatus.OK).json(template);
    } catch (error) {
         if (error.code === 11000) {
            next(new ApiError(httpStatus.BAD_REQUEST, `Bonus template code '${req.body.code}' already exists.`));
        } else {
            next(error);
        }
    }
};

// Soft delete might be preferable - setting isActive to false
const deleteTemplate = async (req, res, next) => {
    try {
        const template = await BonusTemplate.findByIdAndUpdate(
            req.params.id,
            {
                isActive: false,
                deactivatedAt: new Date(),
                deactivatedBy: req.user?.id,
            },
            { new: true }
        );

        if (!template) {
            throw new ApiError(httpStatus.NOT_FOUND, "Bonus template not found");
        }
        // Instead of 204, maybe return the deactivated template?
        res.status(httpStatus.OK).json({ message: "Bonus template deactivated successfully", template });
        // Or standard 204 No Content:
        // res.status(httpStatus.NO_CONTENT).send();
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createTemplate,
    getAllTemplates,
    getTemplateById,
    updateTemplate,
    deleteTemplate,
};
