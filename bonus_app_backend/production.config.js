/**
 * Production configuration for Bonus Management System Backend
 * 
 * This file contains production-specific settings and optimizations
 */

module.exports = {
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    host: '0.0.0.0', // Listen on all network interfaces
    trustProxy: true, // Trust proxy headers (important when behind load balancers)
    compression: true, // Enable response compression
    helmet: true, // Enable security headers
    cors: {
      origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['https://bonus.example.com'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true
    }
  },
  
  // Database configuration
  database: {
    uri: process.env.MONGODB_URI,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      poolSize: 10, // Connection pool size
      serverSelectionTimeoutMS: 5000, // Server selection timeout
      socketTimeoutMS: 45000, // Socket timeout
      keepAlive: true,
      keepAliveInitialDelay: 300000 // Keep alive initial delay
    }
  },
  
  // Authentication configuration
  auth: {
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: 'json', // JSON format for better parsing by log aggregation tools
    transports: ['console', 'file'],
    fileOptions: {
      filename: '/var/log/bonus-app/app.log',
      maxSize: '10m',
      maxFiles: 5
    }
  },
  
  // API rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false // Disable the `X-RateLimit-*` headers
  },
  
  // Cache configuration
  cache: {
    enabled: true,
    ttl: 60 * 5, // 5 minutes default TTL
    redisUrl: process.env.REDIS_URL // Optional Redis URL for distributed caching
  },
  
  // Main application integration
  mainApp: {
    apiUrl: process.env.MAIN_APP_API_URL,
    notificationApiUrl: process.env.MAIN_APP_NOTIFICATION_API_URL,
    apiKey: process.env.MAIN_APP_API_KEY
  },
  
  // Performance optimization
  performance: {
    batchSize: 100, // Batch size for large operations
    reportRowLimit: 10000, // Maximum rows for reports
    queryTimeout: 30000 // Query timeout in milliseconds
  },
  
  // Monitoring configuration
  monitoring: {
    enabled: true,
    apm: {
      serviceName: 'bonus-management-backend',
      serverUrl: process.env.APM_SERVER_URL,
      environment: process.env.NODE_ENV || 'production'
    }
  }
};
