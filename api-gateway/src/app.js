require('dotenv').config();
const Fastify = require('fastify');
const fs = require('fs');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth');
const subaccountsRoutes = require('./routes/subaccounts');
const pixRoutes = require('./routes/pix');
const tedRoutes = require('./routes/ted');
const transactionsRoutes = require('./routes/transactions');
const splitsRoutes = require('./routes/splits');
const scheduledRoutes = require('./routes/scheduled');
const recurringRoutes = require('./routes/recurring');
const documentsRoutes = require('./routes/documents');
const backupsRoutes = require('./routes/backups');
const webhooksRoutes = require('./routes/webhooks');

const PORT = process.env.PORT || 8000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Create Fastify instance
const fastify = Fastify({
  logger: process.env.NODE_ENV !== 'test' ? {
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    }
  } : false,
  trustProxy: true,
  ignoreTrailingSlash: true,
  requestIdHeader: 'x-request-id',
});

// ============================================================
// Register Plugins
// ============================================================

// Helmet for security headers
fastify.register(require('@fastify/helmet'), {
  contentSecurityPolicy: false,
  global: true,
});

// CORS
fastify.register(require('@fastify/cors'), {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
});

// Rate limiting
fastify.register(require('@fastify/rate-limit'), {
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 60,
  timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  errorResponseBuilder: function (req, context) {
    return {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
        retryAfter: context.after,
      },
      timestamp: new Date().toISOString(),
    };
  },
});

// Multipart support
fastify.register(require('@fastify/multipart'), {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// ============================================================
// Swagger Documentation
// ============================================================

const swaggerSpec = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'swagger', 'openapi.json'), 'utf8')
);

fastify.register(require('@fastify/swagger'), {
  mode: 'static',
  specification: {
    document: swaggerSpec,
  },
});

fastify.register(require('@fastify/swagger-ui'), {
  routePrefix: '/api-docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: true,
  },
  staticCSP: true,
  transformStaticCSP: (header) => header,
  transformSpecification: (swaggerObject) => {
    return swaggerObject;
  },
  transformSpecificationClone: true,
});

// ============================================================
// Health Check Routes
// ============================================================

fastify.get('/health', async (request, reply) => {
  return {
    success: true,
    service: 'zyvopay-api-gateway',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };
});

fastify.get('/', async (request, reply) => {
  return {
    success: true,
    message: 'ZyvoPay API Gateway',
    version: '1.0.0',
    documentation: '/api-docs',
    timestamp: new Date().toISOString(),
  };
});

// ============================================================
// API Routes
// ============================================================

fastify.register(authRoutes, { prefix: '/api/auth' });
fastify.register(subaccountsRoutes, { prefix: '/api/subaccounts' });
fastify.register(pixRoutes, { prefix: '/api/pix' });
fastify.register(tedRoutes, { prefix: '/api/ted' });
fastify.register(transactionsRoutes, { prefix: '/api/transactions' });
fastify.register(splitsRoutes, { prefix: '/api/splits' });
fastify.register(scheduledRoutes, { prefix: '/api/scheduled' });
fastify.register(recurringRoutes, { prefix: '/api/recurring' });
fastify.register(documentsRoutes, { prefix: '/api/documents' });
fastify.register(backupsRoutes, { prefix: '/api/backups' });
fastify.register(webhooksRoutes, { prefix: '/api/webhooks' });

// ============================================================
// Error Handling
// ============================================================

// 404 Handler
fastify.setNotFoundHandler((request, reply) => {
  reply.status(404).send({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
      path: request.url,
    },
    timestamp: new Date().toISOString(),
  });
});

// Global Error Handler
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);

  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';

  reply.status(statusCode).send({
    success: false,
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    },
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// Graceful Shutdown
// ============================================================

const closeGracefully = async (signal) => {
  fastify.log.info(`Received signal to terminate: ${signal}`);
  await fastify.close();
  process.exit(0);
};

process.on('SIGINT', closeGracefully);
process.on('SIGTERM', closeGracefully);

// ============================================================
// Start Server
// ============================================================

const start = async () => {
  try {
    await fastify.listen({
      port: PORT,
      host: '0.0.0.0'
    });

    if (process.env.NODE_ENV !== 'test') {
      console.log(`\n🚀 ZyvoPay API Gateway running on port ${PORT}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
      console.log(`💚 Health Check: http://localhost:${PORT}/health`);
      console.log(`\n`);
    }
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== 'test') {
  start();
}

module.exports = fastify;
