const { authenticate, requireScope, supabase } = require('../middleware/auth');

/**
 * Splits routes
 * Handles split rule management
 */
async function routes(fastify, options) {
  /**
   * POST /api/splits
   * Create split rule
   */
  fastify.post('/', {
    onRequest: [authenticate, requireScope('write')]
  }, async (request, reply) => {
    try {
      const { name, recipients, description } = request.body;

      if (!name || !recipients || !Array.isArray(recipients)) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required fields: name, recipients (array)',
          },
        });
      }

      const { data, error } = await supabase.rpc('create_split_rule', {
        p_client_id: request.client.id,
        p_name: name,
        p_recipients: JSON.stringify(recipients),
        p_description: description || null,
      });

      if (error) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'CREATE_SPLIT_ERROR',
            message: error.message,
          },
        });
      }

      return reply.status(201).send({
        success: true,
        data: {
          split_rule_id: data,
        },
      });
    } catch (error) {
      console.error('Create split rule error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create split rule',
        },
      });
    }
  });

  /**
   * GET /api/splits
   * List split rules
   */
  fastify.get('/', {
    onRequest: [authenticate, requireScope('read')]
  }, async (request, reply) => {
    try {
      const { is_active } = request.query;

      let query = supabase
        .from('split_rules')
        .select('*')
        .eq('client_id', request.client.id)
        .order('created_at', { ascending: false });

      if (is_active !== undefined) {
        query = query.eq('is_active', is_active === 'true');
      }

      const { data, error } = await query;

      if (error) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'FETCH_SPLITS_ERROR',
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
      console.error('List split rules error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list split rules',
        },
      });
    }
  });

  /**
   * GET /api/splits/:id
   * Get split rule
   */
  fastify.get('/:id', {
    onRequest: [authenticate, requireScope('read')]
  }, async (request, reply) => {
    try {
      const { data, error } = await supabase
        .from('split_rules')
        .select('*')
        .eq('id', request.params.id)
        .eq('client_id', request.client.id)
        .single();

      if (error || !data) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Split rule not found',
          },
        });
      }

      return {
        success: true,
        data: data,
      };
    } catch (error) {
      console.error('Get split rule error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get split rule',
        },
      });
    }
  });

  /**
   * PATCH /api/splits/:id
   * Update split rule
   */
  fastify.patch('/:id', {
    onRequest: [authenticate, requireScope('write')]
  }, async (request, reply) => {
    try {
      const { name, recipients, is_active, description } = request.body;

      const { data, error } = await supabase.rpc('update_split_rule', {
        p_split_rule_id: request.params.id,
        p_client_id: request.client.id,
        p_name: name || null,
        p_recipients: recipients ? JSON.stringify(recipients) : null,
        p_is_active: is_active !== undefined ? is_active : null,
        p_description: description || null,
      });

      if (error) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'UPDATE_SPLIT_ERROR',
            message: error.message,
          },
        });
      }

      return {
        success: true,
        message: 'Split rule updated successfully',
      };
    } catch (error) {
      console.error('Update split rule error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update split rule',
        },
      });
    }
  });

  /**
   * DELETE /api/splits/:id
   * Delete split rule
   */
  fastify.delete('/:id', {
    onRequest: [authenticate, requireScope('write')]
  }, async (request, reply) => {
    try {
      const { error } = await supabase
        .from('split_rules')
        .delete()
        .eq('id', request.params.id)
        .eq('client_id', request.client.id);

      if (error) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'DELETE_SPLIT_ERROR',
            message: error.message,
          },
        });
      }

      return {
        success: true,
        message: 'Split rule deleted successfully',
      };
    } catch (error) {
      console.error('Delete split rule error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete split rule',
        },
      });
    }
  });
}

module.exports = routes;
