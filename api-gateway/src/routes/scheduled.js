const express = require('express');
const router = express.Router();
const { authenticate, requireScope, supabase } = require('../middleware/auth');

router.use(authenticate);

/**
 * POST /api/scheduled
 * Create scheduled transfer
 */
router.post('/', requireScope('write'), async (req, res) => {
  try {
    const {
      subaccount_id,
      transfer_type,
      pix_key,
      pix_key_type,
      ted_bank_code,
      ted_agency,
      ted_account,
      amount_cents,
      scheduled_date,
      scheduled_time,
      description,
    } = req.body;

    if (!subaccount_id || !transfer_type || !amount_cents || !scheduled_date) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields',
        },
      });
    }

    const { data, error } = await supabase.rpc('create_scheduled_transfer', {
      p_debit_subaccount_id: subaccount_id,
      p_transfer_type: transfer_type,
      p_pix_key: pix_key || null,
      p_pix_key_type: pix_key_type || null,
      p_ted_bank_code: ted_bank_code || null,
      p_ted_agency: ted_agency || null,
      p_ted_account: ted_account || null,
      p_amount_cents: amount_cents,
      p_scheduled_date: scheduled_date,
      p_scheduled_time: scheduled_time || null,
      p_description: description || null,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CREATE_SCHEDULED_TRANSFER_ERROR',
          message: error.message,
        },
      });
    }

    res.status(201).json({
      success: true,
      data: {
        scheduled_transfer_id: data,
      },
    });
  } catch (error) {
    console.error('Create scheduled transfer error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create scheduled transfer',
      },
    });
  }
});

/**
 * GET /api/scheduled
 * List scheduled transfers
 */
router.get('/', requireScope('read'), async (req, res) => {
  try {
    const { subaccount_id, status, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('scheduled_transfers')
      .select(`
        *,
        subaccounts!inner(client_id)
      `, { count: 'exact' })
      .eq('subaccounts.client_id', req.client.id)
      .order('scheduled_date', { ascending: true })
      .range(offset, offset + parseInt(limit) - 1);

    if (subaccount_id) query = query.eq('debit_subaccount_id', subaccount_id);
    if (status) query = query.eq('status', status);

    const { data, error, count } = await query;

    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FETCH_SCHEDULED_TRANSFERS_ERROR',
          message: error.message,
        },
      });
    }

    const cleanedData = data.map(({ subaccounts, ...transfer }) => transfer);

    res.json({
      success: true,
      data: cleanedData,
      pagination: {
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    console.error('List scheduled transfers error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list scheduled transfers',
      },
    });
  }
});

/**
 * DELETE /api/scheduled/:id
 * Cancel scheduled transfer
 */
router.delete('/:id', requireScope('write'), async (req, res) => {
  try {
    const { data, error } = await supabase.rpc('cancel_scheduled_transfer', {
      p_scheduled_transfer_id: req.params.id,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CANCEL_SCHEDULED_TRANSFER_ERROR',
          message: error.message,
        },
      });
    }

    res.json({
      success: true,
      message: 'Scheduled transfer cancelled successfully',
    });
  } catch (error) {
    console.error('Cancel scheduled transfer error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to cancel scheduled transfer',
      },
    });
  }
});

module.exports = router;
