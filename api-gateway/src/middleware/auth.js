const { createClient } = require('@supabase/supabase-js');

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
 * Authentication middleware
 * Validates API key and attaches client info to request
 */
async function authenticate(req, res, next) {
  try {
    // Extract API key from header
    const apiKey =
      req.headers['x-api-key'] ||
      req.headers['authorization']?.replace('Bearer ', '');

    if (!apiKey) {
      return res.status(401).json({
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
      console.error('API key validation error:', validationError);
      return res.status(500).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Failed to validate API key',
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (!validation || !validation.is_valid) {
      return res.status(401).json({
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
        p_endpoint: req.path,
        p_limit_per_minute: 60,
      }
    );

    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError);
    }

    if (rateLimitCheck && !rateLimitCheck.allowed) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded for this endpoint',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Log API request
    await supabase.from('api_request_logs').insert({
      api_key_id: validation.api_key_id,
      client_id: validation.client_id,
      method: req.method,
      endpoint: req.path,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    });

    // Attach client info to request
    req.client = {
      id: validation.client_id,
      name: validation.client_name,
      scopes: validation.scopes || [],
      api_key_id: validation.api_key_id,
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
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
  return (req, res, next) => {
    if (!req.client) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Not authenticated',
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (!req.client.scopes.includes(scope) && !req.client.scopes.includes('*')) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Missing required scope: ${scope}`,
        },
        timestamp: new Date().toISOString(),
      });
    }

    next();
  };
}

module.exports = {
  authenticate,
  requireScope,
  supabase,
};
