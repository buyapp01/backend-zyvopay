const { authenticate, supabase } = require('../middleware/auth');

/**
 * Authentication routes
 * Handles client registration, API key management, and client info
 */
async function routes(fastify, options) {
  /**
   * POST /api/auth/clients
   * Create a new client account
   */
  fastify.post('/clients', async (request, reply) => {
    try {
      const { name, legal_name, document, email, phone, webhook_url } = request.body;

      if (!name || !document || !email) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required fields: name, document, email',
          },
        });
      }

      const { data, error } = await supabase.rpc('create_client', {
        p_name: name,
        p_legal_name: legal_name || null,
        p_document: document,
        p_email: email,
        p_phone: phone || null,
        p_webhook_url: webhook_url || null,
      });

      if (error) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'CREATE_CLIENT_ERROR',
            message: error.message,
          },
        });
      }

      return reply.status(201).send({
        success: true,
        data: {
          client_id: data,
        },
      });
    } catch (error) {
      console.error('Create client error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create client',
        },
      });
    }
  });

  /**
   * POST /api/auth/api-keys
   * Generate new API key
   */
  fastify.post('/api-keys', {
    onRequest: [authenticate]
  }, async (request, reply) => {
    try {
      const { name, scopes, expires_in_days } = request.body;

      if (!name) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required field: name',
          },
        });
      }

      const { data, error } = await supabase.rpc('generate_api_key', {
        p_client_id: request.client.id,
        p_name: name,
        p_scopes: scopes || ['read', 'write'],
        p_expires_in_days: expires_in_days || null,
      });

      if (error) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'GENERATE_API_KEY_ERROR',
            message: error.message,
          },
        });
      }

      return reply.status(201).send({
        success: true,
        data: {
          api_key: data.api_key,
          api_key_id: data.api_key_id,
          prefix: data.prefix,
          message: 'Save this API key securely. It will not be shown again.',
        },
      });
    } catch (error) {
      console.error('Generate API key error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to generate API key',
        },
      });
    }
  });

  /**
   * GET /api/auth/api-keys
   * List all API keys for client
   */
  fastify.get('/api-keys', {
    onRequest: [authenticate]
  }, async (request, reply) => {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('id, name, key_prefix, scopes, is_active, last_used_at, expires_at, created_at')
        .eq('client_id', request.client.id)
        .order('created_at', { ascending: false });

      if (error) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'FETCH_API_KEYS_ERROR',
            message: error.message,
          },
        });
      }

      return {
        success: true,
        data: data,
        count: data.length,
      };
    } catch (error) {
      console.error('List API keys error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list API keys',
        },
      });
    }
  });

  /**
   * DELETE /api/auth/api-keys/:id
   * Revoke API key
   */
  fastify.delete('/api-keys/:id', {
    onRequest: [authenticate]
  }, async (request, reply) => {
    try {
      const { id } = request.params;

      const { data, error } = await supabase.rpc('revoke_api_key', {
        p_api_key_id: id,
        p_client_id: request.client.id,
      });

      if (error) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'REVOKE_API_KEY_ERROR',
            message: error.message,
          },
        });
      }

      if (!data) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'API key not found',
          },
        });
      }

      return {
        success: true,
        message: 'API key revoked successfully',
      };
    } catch (error) {
      console.error('Revoke API key error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to revoke API key',
        },
      });
    }
  });

  /**
   * GET /api/auth/me
   * Get current client info
   */
  fastify.get('/me', {
    onRequest: [authenticate]
  }, async (request, reply) => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, legal_name, document, email, phone, status, is_active, webhook_url, created_at')
        .eq('id', request.client.id)
        .single();

      if (error) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'FETCH_CLIENT_ERROR',
            message: error.message,
          },
        });
      }

      return {
        success: true,
        data: data,
      };
    } catch (error) {
      console.error('Get client info error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get client info',
        },
      });
    }
  });
}

module.exports = routes;
