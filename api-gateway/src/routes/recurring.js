const express = require('express');
const router = express.Router();
const { authenticate, requireScope, supabase } = require('../middleware/auth');

router.use(authenticate);

/**
 * POST /api/recurring
 * Create recurring payment
 */
router.post('/', requireScope('write'), async (req, res) => {
  try {
    const {
      subaccount_id,
      pix_key,
      pix_key_type,
      frequency,
      amount_cents,
      start_date,
      end_date,
      description,
    } = req.body;

    if (!subaccount_id || !pix_key || !pix_key_type || !frequency || !amount_cents || !start_date) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields',
        },
      });
    }

    const { data, error } = await supabase.rpc('create_recurring_payment', {
      p_debit_subaccount_id: subaccount_id,
      p_pix_key: pix_key,
      p_pix_key_type: pix_key_type,
      p_frequency: frequency,
      p_amount_cents: amount_cents,
      p_start_date: start_date,
      p_end_date: end_date || null,
      p_description: description || null,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CREATE_RECURRING_PAYMENT_ERROR',
          message: error.message,
        },
      });
    }

    res.status(201).json({
      success: true,
      data: {
        recurring_payment_id: data,
      },
    });
  } catch (error) {
    console.error('Create recurring payment error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create recurring payment',
      },
    });
  }
});

/**
 * GET /api/recurring
 * List recurring payments
 */
router.get('/', requireScope('read'), async (req, res) => {
  try {
    const { subaccount_id, is_active } = req.query;

    let query = supabase
      .from('recurring_payments')
      .select(`
        *,
        subaccounts!inner(client_id)
      `)
      .eq('subaccounts.client_id', req.client.id)
      .order('created_at', { ascending: false });

    if (subaccount_id) query = query.eq('debit_subaccount_id', subaccount_id);
    if (is_active !== undefined) query = query.eq('is_active', is_active === 'true');

    const { data, error } = await query;

    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FETCH_RECURRING_PAYMENTS_ERROR',
          message: error.message,
        },
      });
    }

    const cleanedData = data.map(({ subaccounts, ...payment }) => payment);

    res.json({
      success: true,
      data: cleanedData,
      count: cleanedData.length,
    });
  } catch (error) {
    console.error('List recurring payments error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list recurring payments',
      },
    });
  }
});

/**
 * PATCH /api/recurring/:id
 * Update recurring payment
 */
router.patch('/:id', requireScope('write'), async (req, res) => {
  try {
    const { is_active, end_date } = req.body;

    const { error } = await supabase.rpc('update_recurring_payment', {
      p_recurring_payment_id: req.params.id,
      p_is_active: is_active !== undefined ? is_active : null,
      p_end_date: end_date || null,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'UPDATE_RECURRING_PAYMENT_ERROR',
          message: error.message,
        },
      });
    }

    res.json({
      success: true,
      message: 'Recurring payment updated successfully',
    });
  } catch (error) {
    console.error('Update recurring payment error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update recurring payment',
      },
    });
  }
});

/**
 * DELETE /api/recurring/:id
 * Cancel recurring payment
 */
router.delete('/:id', requireScope('write'), async (req, res) => {
  try {
    const { error } = await supabase.rpc('cancel_recurring_payment', {
      p_recurring_payment_id: req.params.id,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CANCEL_RECURRING_PAYMENT_ERROR',
          message: error.message,
        },
      });
    }

    res.json({
      success: true,
      message: 'Recurring payment cancelled successfully',
    });
  } catch (error) {
    console.error('Cancel recurring payment error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to cancel recurring payment',
      },
    });
  }
});

module.exports = router;
