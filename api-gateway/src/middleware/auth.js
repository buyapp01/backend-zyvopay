const { createClient } = require('@supabase/supabase-js');
const fp = require('fastify-plugin');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Authentication hook for Fastify
 * Validates API key and attaches client info to request
 */
async function authenticate(request, reply) {
  try {
    // Extract API key from header
    const apiKey =
      request.headers['x-api-key'] ||
      request.headers['authorization']?.replace('Bearer ', '');

    if (!apiKey) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing API key. Provide via X-API-Key or Authorization header',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Validate API key
    const { data: validation, error: validationError } = await supabase.rpc(
      'validate_api_key',
      {
        p_api_key: apiKey,
      }
    );

    if (validationError) {
      request.log.error('API key validation error:', validationError);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Failed to validate API key',
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (!validation || !validation.is_valid) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: validation?.message || 'Invalid or expired API key',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Check rate limit
    const { data: rateLimitCheck, error: rateLimitError } = await supabase.rpc(
      'check_rate_limit',
      {
        p_client_id: validation.client_id,
        p_endpoint: request.url,
        p_limit_per_minute: 60,
      }
    );

    if (rateLimitError) {
      request.log.error('Rate limit check error:', rateLimitError);
    }

    if (rateLimitCheck && !rateLimitCheck.allowed) {
      return reply.status(429).send({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded for this endpoint',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Log API request (non-blocking)
    supabase.from('api_request_logs').insert({
      api_key_id: validation.api_key_id,
      client_id: validation.client_id,
      method: request.method,
      endpoint: request.url,
      ip_address: request.ip,
      user_agent: request.headers['user-agent'],
    }).then(() => {}).catch((err) => request.log.error('Failed to log API request:', err));

    // Attach client info to request
    request.client = {
      id: validation.client_id,
      name: validation.client_name,
      scopes: validation.scopes || [],
      api_key_id: validation.api_key_id,
    };
  } catch (error) {
    request.log.error('Authentication error:', error);
    return reply.status(500).send({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication failed',
      },
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Check if client has required scope
 */
function requireScope(scope) {
  return async (request, reply) => {
    if (!request.client) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Not authenticated',
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (!request.client.scopes.includes(scope) && !request.client.scopes.includes('*')) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Missing required scope: ${scope}`,
        },
        timestamp: new Date().toISOString(),
      });
    }
  };
}

/**
 * Fastify plugin to register authentication
 */
async function authPlugin(fastify, options) {
  fastify.decorate('authenticate', authenticate);
  fastify.decorate('requireScope', requireScope);
  fastify.decorate('supabase', supabase);
}

module.exports = fp(authPlugin, {
  name: 'auth-plugin',
  fastify: '4.x'
});

module.exports.authenticate = authenticate;
module.exports.requireScope = requireScope;
module.exports.supabase = supabase;
