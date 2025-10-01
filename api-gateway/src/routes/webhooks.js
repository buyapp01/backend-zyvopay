const { authenticate, requireScope, supabase } = require('../middleware/auth');

/**
 * Webhooks routes
 * Handles webhook configuration and delivery tracking
 */
async function routes(fastify, options) {
  /**
   * PATCH /api/webhooks/config
   * Update webhook configuration
   */
  fastify.patch('/config', {
    onRequest: [authenticate, requireScope('write')]
  }, async (request, reply) => {
    try {
      const { webhook_url, webhook_secret } = request.body;

      if (!webhook_url) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required field: webhook_url',
          },
        });
      }

      const { data, error } = await supabase
        .from('clients')
        .update({
          webhook_url,
          webhook_secret: webhook_secret || null,
        })
        .eq('id', request.client.id)
        .select()
        .single();

      if (error) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'UPDATE_WEBHOOK_CONFIG_ERROR',
            message: error.message,
          },
        });
      }

      return {
        success: true,
        data: {
          webhook_url: data.webhook_url,
          webhook_secret: data.webhook_secret ? '***' : null,
        },
        message: 'Webhook configuration updated successfully',
      };
    } catch (error) {
      console.error('Update webhook config error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update webhook configuration',
        },
      });
    }
  });

  /**
   * GET /api/webhooks/deliveries
   * List webhook deliveries
   */
  fastify.get('/deliveries', {
    onRequest: [authenticate, requireScope('read')]
  }, async (request, reply) => {
    try {
      const { event_type, status, limit = 50, offset = 0 } = request.query;

      let query = supabase
        .from('webhook_deliveries')
        .select('*', { count: 'exact' })
        .eq('client_id', request.client.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + parseInt(limit) - 1);

      if (event_type) query = query.eq('event_type', event_type);
      if (status) query = query.eq('status', status);

      const { data, error, count } = await query;

      if (error) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'FETCH_WEBHOOK_DELIVERIES_ERROR',
            message: error.message,
          },
        });
      }

      return {
        success: true,
        data: data,
        pagination: {
          total: count,
          limit: parseInt(limit),
          offset: parseInt(offset),
        },
      };
    } catch (error) {
      console.error('List webhook deliveries error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list webhook deliveries',
        },
      });
    }
  });

  /**
   * GET /api/webhooks/deliveries/:id
   * Get webhook delivery details
   */
  fastify.get('/deliveries/:id', {
    onRequest: [authenticate, requireScope('read')]
  }, async (request, reply) => {
    try {
      const { data, error } = await supabase
        .from('webhook_deliveries')
        .select('*')
        .eq('id', request.params.id)
        .eq('client_id', request.client.id)
        .single();

      if (error || !data) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Webhook delivery not found',
          },
        });
      }

      return {
        success: true,
        data: data,
      };
    } catch (error) {
      console.error('Get webhook delivery error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get webhook delivery',
        },
      });
    }
  });
}

module.exports = routes;
