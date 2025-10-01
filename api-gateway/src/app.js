require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yaml');
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

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// Middlewares
// ============================================================

// Security
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 60,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// ============================================================
// Swagger Documentation
// ============================================================

const swaggerDocument = YAML.parse(
  fs.readFileSync(path.join(__dirname, 'swagger', 'openapi.yaml'), 'utf8')
);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'ZyvoPay API Documentation',
}));

// ============================================================
// Health Check
// ============================================================

app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'zyvopay-api-gateway',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'ZyvoPay API Gateway',
    version: '1.0.0',
    documentation: '/api-docs',
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// API Routes
// ============================================================

app.use('/api/auth', authRoutes);
app.use('/api/subaccounts', subaccountsRoutes);
app.use('/api/pix', pixRoutes);
app.use('/api/ted', tedRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/splits', splitsRoutes);
app.use('/api/scheduled', scheduledRoutes);
app.use('/api/recurring', recurringRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/backups', backupsRoutes);
app.use('/api/webhooks', webhooksRoutes);

// ============================================================
// Error Handling
// ============================================================

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
      path: req.path,
    },
    timestamp: new Date().toISOString(),
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// Start Server
// ============================================================

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`\n🚀 ZyvoPay API Gateway running on port ${PORT}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
    console.log(`💚 Health Check: http://localhost:${PORT}/health`);
    console.log(`\n`);
  });
}

module.exports = app;
