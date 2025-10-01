const { authenticate, requireScope, supabase } = require('../middleware/auth');

/**
 * Subaccounts routes
 * Handles subaccount creation, listing, and management
 */
async function routes(fastify, options) {
  /**
   * POST /api/subaccounts
   * Create a new subaccount (calls celcoin-create-subaccount Edge Function)
   */
  fastify.post('/', {
    onRequest: [authenticate, requireScope('write')]
  }, async (request, reply) => {
    try {
      const { account_type, owner_name, owner_document, owner_email, owner_phone } = request.body;

      if (!account_type || !owner_name || !owner_document) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required fields: account_type, owner_name, owner_document',
          },
        });
      }

      if (!['PF', 'PJ'].includes(account_type)) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'account_type must be PF or PJ',
          },
        });
      }

      // Call Edge Function to create subaccount with Celcoin
      const response = await fetch(
        `${process.env.SUPABASE_URL}/functions/v1/celcoin-create-subaccount`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            client_id: request.client.id,
            account_type,
            owner_name,
            owner_document,
            owner_email,
            owner_phone,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        return reply.status(response.status).send({
          success: false,
          error: result.error || { code: 'CREATE_SUBACCOUNT_ERROR', message: 'Failed to create subaccount' },
        });
      }

      return reply.status(201).send({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Create subaccount error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create subaccount',
        },
      });
    }
  });

  /**
   * GET /api/subaccounts
   * List all subaccounts for client
   */
  fastify.get('/', {
    onRequest: [authenticate, requireScope('read')]
  }, async (request, reply) => {
    try {
      const { status, account_type, limit = 50, offset = 0 } = request.query;

      let query = supabase
        .from('subaccounts')
        .select('id, account_type, status, balance_cents, blocked_balance_cents, daily_pix_limit_cents, kyc_completed_at, created_at', { count: 'exact' })
        .eq('client_id', request.client.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + parseInt(limit) - 1);

      if (status) query = query.eq('status', status);
      if (account_type) query = query.eq('account_type', account_type);

      const { data, error, count } = await query;

      if (error) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'FETCH_SUBACCOUNTS_ERROR',
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
      console.error('List subaccounts error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list subaccounts',
        },
      });
    }
  });

  /**
   * GET /api/subaccounts/:id
   * Get subaccount details
   */
  fastify.get('/:id', {
    onRequest: [authenticate, requireScope('read')]
  }, async (request, reply) => {
    try {
      const { data, error } = await supabase.rpc('get_subaccount_details', {
        p_subaccount_id: request.params.id,
        p_client_id: request.client.id,
      });

      if (error) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'FETCH_SUBACCOUNT_ERROR',
            message: error.message,
          },
        });
      }

      if (!data) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Subaccount not found',
          },
        });
      }

      return {
        success: true,
        data: data,
      };
    } catch (error) {
      console.error('Get subaccount error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get subaccount',
        },
      });
    }
  });

  /**
   * PATCH /api/subaccounts/:id
   * Update subaccount
   */
  fastify.patch('/:id', {
    onRequest: [authenticate, requireScope('write')]
  }, async (request, reply) => {
    try {
      const { daily_pix_limit_cents, daily_ted_limit_cents, metadata } = request.body;

      const updates = {};
      if (daily_pix_limit_cents !== undefined) updates.daily_pix_limit_cents = daily_pix_limit_cents;
      if (daily_ted_limit_cents !== undefined) updates.daily_ted_limit_cents = daily_ted_limit_cents;
      if (metadata) updates.metadata = metadata;

      if (Object.keys(updates).length === 0) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'No fields to update',
          },
        });
      }

      // Verify ownership
      const { data: subaccount } = await supabase
        .from('subaccounts')
        .select('id')
        .eq('id', request.params.id)
        .eq('client_id', request.client.id)
        .single();

      if (!subaccount) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Subaccount not found',
          },
        });
      }

      const { data, error } = await supabase
        .from('subaccounts')
        .update(updates)
        .eq('id', request.params.id)
        .select()
        .single();

      if (error) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'UPDATE_SUBACCOUNT_ERROR',
            message: error.message,
          },
        });
      }

      return {
        success: true,
        data: data,
      };
    } catch (error) {
      console.error('Update subaccount error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update subaccount',
        },
      });
    }
  });

  /**
   * GET /api/subaccounts/:id/balance
   * Get subaccount balance
   */
  fastify.get('/:id/balance', {
    onRequest: [authenticate, requireScope('read')]
  }, async (request, reply) => {
    try {
      const { data, error } = await supabase.rpc('get_subaccount_balance', {
        p_subaccount_id: request.params.id,
        p_client_id: request.client.id,
      });

      if (error) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'FETCH_BALANCE_ERROR',
            message: error.message,
          },
        });
      }

      if (!data) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Subaccount not found',
          },
        });
      }

      return {
        success: true,
        data: data,
      };
    } catch (error) {
      console.error('Get balance error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get balance',
        },
      });
    }
  });
}

module.exports = routes;
