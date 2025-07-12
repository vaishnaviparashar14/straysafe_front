const Joi = require('joi');

// Validation middleware factory
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }
    
    next();
  };
};

// User validation schemas
const userSchemas = {
  register: Joi.object({
    name: Joi.string().min(2).max(255).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('citizen', 'ngo', 'volunteer').default('citizen'),
    phone: Joi.string().pattern(/^[+]?[\d\s-()]+$/).min(10).max(20).optional(),
    organization: Joi.string().max(255).optional().allow('')
  }),
  
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),
  
  updateProfile: Joi.object({
    name: Joi.string().min(2).max(255).optional(),
    phone: Joi.string().pattern(/^[+]?[\d\s-()]+$/).min(10).max(20).optional().allow(''),
    organization: Joi.string().max(255).optional().allow(''),
    avatar_url: Joi.string().uri().optional().allow('')
  }),
  
  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(6).required()
  })
};

// Report validation schemas
const reportSchemas = {
  create: Joi.object({
    title: Joi.string().min(5).max(255).required(),
    description: Joi.string().min(10).max(2000).required(),
    location: Joi.object({
      lat: Joi.number().min(-90).max(90).required(),
      lng: Joi.number().min(-180).max(180).required(),
      address: Joi.string().max(500).optional().allow('')
    }).required(),
    photos: Joi.array().items(Joi.string().uri()).max(10).optional(),
    urgency: Joi.string().valid('low', 'medium', 'high', 'critical').default('medium'),
    tags: Joi.array().items(Joi.string().max(50)).max(10).optional(),
    animal_type: Joi.string().max(100).optional().allow(''),
    animal_breed: Joi.string().max(100).optional().allow(''),
    animal_age_estimate: Joi.string().max(50).optional().allow(''),
    animal_gender: Joi.string().valid('male', 'female', 'unknown').optional().allow(''),
    animal_size: Joi.string().valid('small', 'medium', 'large', 'extra_large').optional().allow(''),
    animal_color: Joi.string().max(100).optional().allow(''),
    animal_condition: Joi.string().max(500).optional().allow(''),
    is_injured: Joi.boolean().default(false),
    is_aggressive: Joi.boolean().default(false)
  }),
  
  update: Joi.object({
    title: Joi.string().min(5).max(255).optional(),
    description: Joi.string().min(10).max(2000).optional(),
    status: Joi.string().valid('reported', 'in_progress', 'rescued', 'adopted', 'closed').optional(),
    urgency: Joi.string().valid('low', 'medium', 'high', 'critical').optional(),
    tags: Joi.array().items(Joi.string().max(50)).max(10).optional(),
    animal_type: Joi.string().max(100).optional().allow(''),
    animal_breed: Joi.string().max(100).optional().allow(''),
    animal_age_estimate: Joi.string().max(50).optional().allow(''),
    animal_gender: Joi.string().valid('male', 'female', 'unknown').optional().allow(''),
    animal_size: Joi.string().valid('small', 'medium', 'large', 'extra_large').optional().allow(''),
    animal_color: Joi.string().max(100).optional().allow(''),
    animal_condition: Joi.string().max(500).optional().allow(''),
    is_injured: Joi.boolean().optional(),
    is_aggressive: Joi.boolean().optional(),
    assigned_ngo: Joi.string().uuid().optional().allow(null),
    assigned_volunteer: Joi.string().uuid().optional().allow(null)
  }).min(1), // At least one field must be provided
  
  addUpdate: Joi.object({
    message: Joi.string().min(5).max(1000).required(),
    photos: Joi.array().items(Joi.string().uri()).max(5).optional(),
    is_public: Joi.boolean().default(true)
  })
};

// NGO validation schemas
const ngoSchemas = {
  register: Joi.object({
    organization_name: Joi.string().min(2).max(255).required(),
    registration_number: Joi.string().max(100).optional().allow(''),
    website: Joi.string().uri().optional().allow(''),
    description: Joi.string().max(1000).optional().allow(''),
    address: Joi.string().max(500).optional().allow(''),
    city: Joi.string().max(100).optional().allow(''),
    state: Joi.string().max(100).optional().allow(''),
    country: Joi.string().max(100).optional().allow(''),
    postal_code: Joi.string().max(20).optional().allow(''),
    contact_person: Joi.string().max(255).optional().allow(''),
    contact_email: Joi.string().email().optional().allow(''),
    contact_phone: Joi.string().pattern(/^[+]?[\d\s-()]+$/).min(10).max(20).optional().allow(''),
    service_areas: Joi.array().items(Joi.string().max(100)).max(20).optional(),
    specializations: Joi.array().items(Joi.string().max(100)).max(20).optional(),
    capacity_limit: Joi.number().integer().min(1).max(1000).default(50)
  }),
  
  update: Joi.object({
    organization_name: Joi.string().min(2).max(255).optional(),
    registration_number: Joi.string().max(100).optional().allow(''),
    website: Joi.string().uri().optional().allow(''),
    description: Joi.string().max(1000).optional().allow(''),
    address: Joi.string().max(500).optional().allow(''),
    city: Joi.string().max(100).optional().allow(''),
    state: Joi.string().max(100).optional().allow(''),
    country: Joi.string().max(100).optional().allow(''),
    postal_code: Joi.string().max(20).optional().allow(''),
    contact_person: Joi.string().max(255).optional().allow(''),
    contact_email: Joi.string().email().optional().allow(''),
    contact_phone: Joi.string().pattern(/^[+]?[\d\s-()]+$/).min(10).max(20).optional().allow(''),
    service_areas: Joi.array().items(Joi.string().max(100)).max(20).optional(),
    specializations: Joi.array().items(Joi.string().max(100)).max(20).optional(),
    capacity_limit: Joi.number().integer().min(1).max(1000).optional()
  }).min(1)
};

// Query parameter validation schemas
const querySchemas = {
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  }),
  
  reportsFilter: Joi.object({
    status: Joi.string().valid('reported', 'in_progress', 'rescued', 'adopted', 'closed').optional(),
    urgency: Joi.string().valid('low', 'medium', 'high', 'critical').optional(),
    animal_type: Joi.string().max(100).optional(),
    tags: Joi.string().optional(), // Comma-separated tags
    reported_by: Joi.string().uuid().optional(),
    assigned_ngo: Joi.string().uuid().optional(),
    near_lat: Joi.number().min(-90).max(90).optional(),
    near_lng: Joi.number().min(-180).max(180).optional(),
    radius: Joi.number().min(0.1).max(100).default(10).optional(),
    sort: Joi.string().valid('created_at', 'updated_at', 'urgency', 'status').default('created_at').optional(),
    order: Joi.string().valid('asc', 'desc').default('desc').optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  }),
  
  nearbyReports: Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required(),
    radius: Joi.number().min(0.1).max(100).default(10).optional(),
    status: Joi.string().valid('reported', 'in_progress', 'rescued', 'adopted', 'closed').optional(),
    urgency: Joi.string().valid('low', 'medium', 'high', 'critical').optional()
  })
};

// Validate query parameters
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        error: 'Query validation failed',
        details: errors
      });
    }
    
    req.query = value;
    next();
  };
};

// Validate UUID parameters
const validateUUID = (paramName) => {
  return (req, res, next) => {
    const uuid = req.params[paramName];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(uuid)) {
      return res.status(400).json({
        error: 'Invalid UUID format',
        details: [{ field: paramName, message: 'Must be a valid UUID' }]
      });
    }
    
    next();
  };
};

module.exports = {
  validate,
  validateQuery,
  validateUUID,
  userSchemas,
  reportSchemas,
  ngoSchemas,
  querySchemas
};