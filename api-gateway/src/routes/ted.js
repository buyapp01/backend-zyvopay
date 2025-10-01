const { authenticate, requireScope, supabase } = require('../middleware/auth');

/**
 * TED routes
 * Handles TED transfers
 */
async function routes(fastify, options) {
  /**
   * POST /api/ted/transfers
   * Create TED transfer
   */
  fastify.post('/transfers', {
    onRequest: [authenticate, requireScope('write')]
  }, async (request, reply) => {
    try {
      const {
        subaccount_id,
        bank_code,
        branch,
        account_number,
        account_type,
        beneficiary_name,
        beneficiary_document,
        amount_cents,
        description,
      } = request.body;

      if (!subaccount_id || !bank_code || !branch || !account_number || !beneficiary_name || !beneficiary_document || !amount_cents) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required fields',
          },
        });
      }

      const { data, error } = await supabase.rpc('create_ted_transfer', {
        p_client_id: request.client.id,
        p_debit_subaccount_id: subaccount_id,
        p_bank_code: bank_code,
        p_agency: branch,
        p_account: account_number,
        p_account_type: account_type || 'CC',
        p_recipient_name: beneficiary_name,
        p_recipient_document: beneficiary_document,
        p_amount_cents: amount_cents,
        p_description: description || '',
      });

      if (error) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'CREATE_TED_TRANSFER_ERROR',
            message: error.message,
          },
        });
      }

      return reply.status(201).send({
        success: true,
        data: {
          transaction_id: data,
        },
      });
    } catch (error) {
      console.error('Create TED transfer error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create TED transfer',
        },
      });
    }
  });
}

module.exports = routes;
