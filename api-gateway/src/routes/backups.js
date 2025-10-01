const { authenticate, requireScope, supabase } = require('../middleware/auth');

/**
 * Backups routes
 * Handles transaction backup listing and download
 */
async function routes(fastify, options) {
  /**
   * GET /api/backups
   * List transaction backups
   */
  fastify.get('/', {
    onRequest: [authenticate, requireScope('read')]
  }, async (request, reply) => {
    try {
      const { backup_type, limit = 50 } = request.query;

      const { data, error } = await supabase.rpc('get_client_backups', {
        p_client_id: request.client.id,
        p_backup_type: backup_type || null,
        p_limit: parseInt(limit),
      });

      if (error) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'FETCH_BACKUPS_ERROR',
            message: error.message,
          },
        });
      }

      return {
        success: true,
        data: data || [],
        count: data?.length || 0,
      };
    } catch (error) {
      console.error('List backups error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list backups',
        },
      });
    }
  });

  /**
   * GET /api/backups/:id
   * Get backup details
   */
  fastify.get('/:id', {
    onRequest: [authenticate, requireScope('read')]
  }, async (request, reply) => {
    try {
      const { data, error } = await supabase
        .from('transaction_backups')
        .select('*')
        .eq('id', request.params.id)
        .eq('client_id', request.client.id)
        .single();

      if (error || !data) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Backup not found',
          },
        });
      }

      return {
        success: true,
        data: data,
      };
    } catch (error) {
      console.error('Get backup error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get backup',
        },
      });
    }
  });

  /**
   * GET /api/backups/:id/download
   * Download backup file
   */
  fastify.get('/:id/download', {
    onRequest: [authenticate, requireScope('read')]
  }, async (request, reply) => {
    try {
      const { data: backup, error: backupError } = await supabase
        .from('transaction_backups')
        .select('file_path, format, backup_date')
        .eq('id', request.params.id)
        .eq('client_id', request.client.id)
        .single();

      if (backupError || !backup) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Backup not found',
          },
        });
      }

      // Get signed URL from Storage
      const { data: signedUrl, error: urlError } = await supabase.storage
        .from('transaction-backups')
        .createSignedUrl(backup.file_path, 3600); // 1 hour

      if (urlError) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'DOWNLOAD_BACKUP_ERROR',
            message: urlError.message,
          },
        });
      }

      return {
        success: true,
        data: {
          download_url: signedUrl.signedUrl,
          file_name: `backup_${backup.backup_date}.${backup.format}`,
          format: backup.format,
          expires_in: 3600,
        },
      };
    } catch (error) {
      console.error('Download backup error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to download backup',
        },
      });
    }
  });
}

module.exports = routes;
