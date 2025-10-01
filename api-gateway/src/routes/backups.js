const express = require('express');
const router = express.Router();
const { authenticate, requireScope, supabase } = require('../middleware/auth');

router.use(authenticate);

/**
 * GET /api/backups
 * List transaction backups
 */
router.get('/', requireScope('read'), async (req, res) => {
  try {
    const { backup_type, limit = 50 } = req.query;

    const { data, error } = await supabase.rpc('get_client_backups', {
      p_client_id: req.client.id,
      p_backup_type: backup_type || null,
      p_limit: parseInt(limit),
    });

    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FETCH_BACKUPS_ERROR',
          message: error.message,
        },
      });
    }

    res.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
    });
  } catch (error) {
    console.error('List backups error:', error);
    res.status(500).json({
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
router.get('/:id', requireScope('read'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('transaction_backups')
      .select('*')
      .eq('id', req.params.id)
      .eq('client_id', req.client.id)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Backup not found',
        },
      });
    }

    res.json({
      success: true,
      data: data,
    });
  } catch (error) {
    console.error('Get backup error:', error);
    res.status(500).json({
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
router.get('/:id/download', requireScope('read'), async (req, res) => {
  try {
    const { data: backup, error: backupError } = await supabase
      .from('transaction_backups')
      .select('file_path, format, backup_date')
      .eq('id', req.params.id)
      .eq('client_id', req.client.id)
      .single();

    if (backupError || !backup) {
      return res.status(404).json({
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
      return res.status(400).json({
        success: false,
        error: {
          code: 'DOWNLOAD_BACKUP_ERROR',
          message: urlError.message,
        },
      });
    }

    res.json({
      success: true,
      data: {
        download_url: signedUrl.signedUrl,
        file_name: `backup_${backup.backup_date}.${backup.format}`,
        format: backup.format,
        expires_in: 3600,
      },
    });
  } catch (error) {
    console.error('Download backup error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to download backup',
      },
    });
  }
});

module.exports = router;
