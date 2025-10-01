const { authenticate, requireScope, supabase } = require('../middleware/auth');

/**
 * Transactions routes
 * Handles transaction listing and statements
 */
async function routes(fastify, options) {
  /**
   * GET /api/transactions
   * List transactions
   */
  fastify.get('/', {
    onRequest: [authenticate, requireScope('read')]
  }, async (request, reply) => {
    try {
      const {
        subaccount_id,
        transaction_type,
        status,
        start_date,
        end_date,
        limit = 50,
        offset = 0,
      } = request.query;

      let query = supabase
        .from('transactions')
        .select('*', { count: 'exact' })
        .eq('client_id', request.client.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + parseInt(limit) - 1);

      if (subaccount_id) {
        query = query.or(`debit_subaccount_id.eq.${subaccount_id},credit_subaccount_id.eq.${subaccount_id}`);
      }
      if (transaction_type) query = query.eq('transaction_type', transaction_type);
      if (status) query = query.eq('status', status);
      if (start_date) query = query.gte('created_at', start_date);
      if (end_date) query = query.lte('created_at', end_date);

      const { data, error, count } = await query;

      if (error) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'FETCH_TRANSACTIONS_ERROR',
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
      console.error('List transactions error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list transactions',
        },
      });
    }
  });

  /**
   * GET /api/transactions/:id
   * Get transaction details
   */
  fastify.get('/:id', {
    onRequest: [authenticate, requireScope('read')]
  }, async (request, reply) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', request.params.id)
        .eq('client_id', request.client.id)
        .single();

      if (error || !data) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Transaction not found',
          },
        });
      }

      return {
        success: true,
        data: data,
      };
    } catch (error) {
      console.error('Get transaction error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get transaction',
        },
      });
    }
  });

  /**
   * GET /api/transactions/statement/:subaccount_id
   * Get account statement
   */
  fastify.get('/statement/:subaccount_id', {
    onRequest: [authenticate, requireScope('read')]
  }, async (request, reply) => {
    try {
      const { start_date, end_date } = request.query;

      if (!start_date || !end_date) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required parameters: start_date, end_date',
          },
        });
      }

      const { data, error } = await supabase.rpc('get_subaccount_statement', {
        p_subaccount_id: request.params.subaccount_id,
        p_start_date: start_date,
        p_end_date: end_date,
      });

      if (error) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'FETCH_STATEMENT_ERROR',
            message: error.message,
          },
        });
      }

      return {
        success: true,
        data: data || [],
      };
    } catch (error) {
      console.error('Get statement error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get statement',
        },
      });
    }
  });
}

module.exports = routes;
