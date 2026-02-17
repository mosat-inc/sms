const Joi = require('joi');
const logger = require('../utils/logger');

// Common validation schemas
const commonSchemas = {
    id: Joi.number().integer().positive().required(),
    email: Joi.string().email().max(100).required(),
    password: Joi.string().min(6).max(100).required(),
    phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]{10,20}$/).optional(),
    name: Joi.string().min(1).max(100).trim().required(),
    optionalName: Joi.string().min(1).max(100).trim().optional(),
    academicYear: Joi.string().pattern(/^\d{4}-\d{4}$/).default('2024-2025'),
    pagination: {
        limit: Joi.number().integer().min(1).max(100).default(20),
        offset: Joi.number().integer().min(0).default(0)
    },
    search: Joi.string().max(100).trim().optional().allow('')
};

// Subject validation schemas
const subjectSchemas = {
    createSubject: Joi.object({
        name: commonSchemas.name,
        code: Joi.string().min(2).max(10).uppercase().required(),
        description: Joi.string().max(500).optional(),
        department: Joi.string().max(100).optional()
    }),
    
    updateSubject: Joi.object({
        name: commonSchemas.optionalName,
        code: Joi.string().min(2).max(10).uppercase().optional(),
        description: Joi.string().max(500).optional(),
        department: Joi.string().max(100).optional(),
        is_active: Joi.boolean().optional()
    }),
    
    assignTeacher: Joi.object({
        teacher_id: commonSchemas.id,
        class_ids: Joi.array().items(commonSchemas.id).min(1).required(),
        academic_year: commonSchemas.academicYear,
        is_primary_teacher: Joi.boolean().default(false)
    }),

    getSubjects: Joi.object({
        search: commonSchemas.search,
        department: Joi.string().max(100).optional().allow(''),
        ...commonSchemas.pagination,
        academic_year: commonSchemas.academicYear.optional()
    })
};

// Materials validation schemas
const materialSchemas = {
    uploadMaterials: Joi.object({
        subject_id: Joi.number().integer().positive().optional(),
        category: Joi.string().valid('lesson_plan', 'teaching_material', 'syllabus', 'worksheet', 'assessment', 'other').default('teaching_material'),
        class_level: Joi.number().integer().min(1).max(4).optional(),
        is_public: Joi.boolean().default(false),
        tags: Joi.string().optional()
    }),
    
    updateMaterial: Joi.object({
        title: Joi.string().min(1).max(255).optional(),
        description: Joi.string().max(1000).optional(),
        subject_id: Joi.number().integer().positive().optional().allow(null),
        category: Joi.string().valid('lesson_plan', 'teaching_material', 'syllabus', 'worksheet', 'assessment', 'other').optional(),
        class_level: Joi.number().integer().min(1).max(4).optional().allow(null),
        is_public: Joi.boolean().optional(),
        tags: Joi.array().items(Joi.string().max(50)).optional()
    }),

    getMaterials: Joi.object({
        search: commonSchemas.search,
        subject_id: Joi.number().integer().positive().optional().allow(''),
        category: Joi.string().valid('lesson_plan', 'teaching_material', 'syllabus', 'worksheet', 'assessment', 'other').optional().allow(''),
        class_level: Joi.number().integer().min(1).max(4).optional().allow(''),
        ...commonSchemas.pagination
    })
};

// Curriculum validation schemas
const curriculumSchemas = {
    createTopic: Joi.object({
        subject_id: commonSchemas.id,
        class_id: Joi.number().integer().positive().optional(),
        topic_title: Joi.string().min(1).max(255).required(),
        topic_description: Joi.string().max(1000).optional(),
        estimated_hours: Joi.number().min(0.1).max(100).default(1.0),
        difficulty_level: Joi.string().valid('beginner', 'intermediate', 'advanced').default('intermediate'),
        prerequisites: Joi.array().items(Joi.string().max(100)).optional(),
        learning_objectives: Joi.string().max(1000).optional(),
        resources_needed: Joi.string().max(500).optional(),
        assessment_methods: Joi.string().max(500).optional(),
        order_index: Joi.number().integer().min(0).default(0),
        is_mandatory: Joi.boolean().default(true),
        academic_year: commonSchemas.academicYear
    }),

    updateTopic: Joi.object({
        topic_title: Joi.string().min(1).max(255).optional(),
        topic_description: Joi.string().max(1000).optional(),
        estimated_hours: Joi.number().min(0.1).max(100).optional(),
        difficulty_level: Joi.string().valid('beginner', 'intermediate', 'advanced').optional(),
        prerequisites: Joi.array().items(Joi.string().max(100)).optional(),
        learning_objectives: Joi.string().max(1000).optional(),
        resources_needed: Joi.string().max(500).optional(),
        assessment_methods: Joi.string().max(500).optional(),
        order_index: Joi.number().integer().min(0).optional(),
        is_mandatory: Joi.boolean().optional()
    }),

    updateProgress: Joi.object({
        status: Joi.string().valid('pending', 'in_progress', 'completed', 'skipped').required(),
        start_date: Joi.date().iso().optional(),
        completion_date: Joi.date().iso().optional(),
        actual_hours: Joi.number().min(0).max(100).optional(),
        notes: Joi.string().max(1000).optional(),
        student_feedback: Joi.string().max(1000).optional(),
        assessment_score: Joi.number().min(0).max(100).optional(),
        challenges_faced: Joi.string().max(1000).optional(),
        improvements_needed: Joi.string().max(1000).optional(),
        class_id: Joi.number().integer().positive().optional()
    }),

    bulkProgress: Joi.object({
        updates: Joi.array().items(
            Joi.object({
                topicId: commonSchemas.id,
                status: Joi.string().valid('pending', 'in_progress', 'completed', 'skipped').required(),
                class_id: Joi.number().integer().positive().optional(),
                actual_hours: Joi.number().min(0).max(100).optional(),
                notes: Joi.string().max(1000).optional(),
                completion_date: Joi.date().iso().optional()
            })
        ).min(1).required()
    }),

    getTopics: Joi.object({
        subject_id: commonSchemas.id,
        class_id: Joi.number().integer().positive().optional().allow(''),
        academic_year: commonSchemas.academicYear.optional(),
        status: Joi.string().valid('pending', 'in_progress', 'completed', 'skipped').optional().allow(''),
        search: commonSchemas.search,
        ...commonSchemas.pagination
    }),

    getProgressSummary: Joi.object({
        subject_id: Joi.number().integer().positive().optional().allow(''),
        class_id: Joi.number().integer().positive().optional().allow(''),
        academic_year: commonSchemas.academicYear.optional()
    }),

    getProgressReport: Joi.object({
        subject_id: commonSchemas.id,
        class_id: Joi.number().integer().positive().optional().allow(''),
        academic_year: commonSchemas.academicYear.optional(),
        format: Joi.string().valid('json', 'pdf', 'csv').default('json')
    })
};

// Create validation middleware factory
const validate = (schema, source = 'body') => {
    return (req, res, next) => {
        const data = source === 'query' ? req.query : 
                    source === 'params' ? req.params : req.body;

        const { error, value } = schema.validate(data, {
            abortEarly: false,
            stripUnknown: true,
            convert: true
        });

        if (error) {
            const errorDetails = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                value: detail.context?.value
            }));

            logger.apiError(req, new Error('Validation Error'), 400);
            
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errorDetails
            });
        }

        // Replace the original data with validated and sanitized data
        if (source === 'query') {
            req.query = value;
        } else if (source === 'params') {
            req.params = value;
        } else {
            req.body = value;
        }

        next();
    };
};

// Validation middleware for file uploads
const validateFileUpload = (maxFiles = 10, maxSize = 50 * 1024 * 1024, allowedTypes = []) => {
    return (req, res, next) => {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No files uploaded'
            });
        }

        if (req.files.length > maxFiles) {
            return res.status(400).json({
                success: false,
                message: `Maximum ${maxFiles} files allowed`
            });
        }

        for (const file of req.files) {
            if (file.size > maxSize) {
                return res.status(400).json({
                    success: false,
                    message: `File ${file.originalname} exceeds maximum size of ${Math.round(maxSize / 1024 / 1024)}MB`
                });
            }

            if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
                return res.status(400).json({
                    success: false,
                    message: `File type ${file.mimetype} not allowed for ${file.originalname}`
                });
            }
        }

        next();
    };
};

// Export all schemas and middleware
module.exports = {
    validate,
    validateFileUpload,
    schemas: {
        common: commonSchemas,
        subject: subjectSchemas,
        material: materialSchemas,
        curriculum: curriculumSchemas
    }
};
