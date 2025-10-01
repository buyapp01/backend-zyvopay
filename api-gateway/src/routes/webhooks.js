const express = require('express');
const router = express.Router();
const { authenticate, requireScope, supabase } = require('../middleware/auth');

router.use(authenticate);

/**
 * PATCH /api/webhooks/config
 * Update webhook configuration
 */
router.patch('/config', requireScope('write'), async (req, res) => {
  try {
    const { webhook_url, webhook_secret } = req.body;

    if (!webhook_url) {
      return res.status(400).json({
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
      .eq('id', req.client.id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'UPDATE_WEBHOOK_CONFIG_ERROR',
          message: error.message,
        },
      });
    }

    res.json({
      success: true,
      data: {
        webhook_url: data.webhook_url,
        webhook_secret: data.webhook_secret ? '***' : null,
      },
      message: 'Webhook configuration updated successfully',
    });
  } catch (error) {
    console.error('Update webhook config error:', error);
    res.status(500).json({
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
router.get('/deliveries', requireScope('read'), async (req, res) => {
  try {
    const { event_type, status, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('webhook_deliveries')
      .select('*', { count: 'exact' })
      .eq('client_id', req.client.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (event_type) query = query.eq('event_type', event_type);
    if (status) query = query.eq('status', status);

    const { data, error, count } = await query;

    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FETCH_WEBHOOK_DELIVERIES_ERROR',
          message: error.message,
        },
      });
    }

    res.json({
      success: true,
      data: data,
      pagination: {
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    console.error('List webhook deliveries error:', error);
    res.status(500).json({
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
router.get('/deliveries/:id', requireScope('read'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('webhook_deliveries')
      .select('*')
      .eq('id', req.params.id)
      .eq('client_id', req.client.id)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Webhook delivery not found',
        },
      });
    }

    res.json({
      success: true,
      data: data,
    });
  } catch (error) {
    console.error('Get webhook delivery error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get webhook delivery',
      },
    });
  }
});

module.exports = router;
