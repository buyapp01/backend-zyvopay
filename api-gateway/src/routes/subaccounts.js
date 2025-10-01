const express = require('express');
const router = express.Router();
const { authenticate, requireScope, supabase } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/subaccounts
 * Create a new subaccount (calls celcoin-create-subaccount Edge Function)
 */
router.post('/', requireScope('write'), async (req, res) => {
  try {
    const { account_type, owner_name, owner_document, owner_email, owner_phone } = req.body;

    if (!account_type || !owner_name || !owner_document) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: account_type, owner_name, owner_document',
        },
      });
    }

    if (!['PF', 'PJ'].includes(account_type)) {
      return res.status(400).json({
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
          client_id: req.client.id,
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
      return res.status(response.status).json({
        success: false,
        error: result.error || { code: 'CREATE_SUBACCOUNT_ERROR', message: 'Failed to create subaccount' },
      });
    }

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Create subaccount error:', error);
    res.status(500).json({
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
router.get('/', requireScope('read'), async (req, res) => {
  try {
    const { status, account_type, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('subaccounts')
      .select('id, account_type, status, balance_cents, blocked_balance_cents, daily_pix_limit_cents, kyc_completed_at, created_at', { count: 'exact' })
      .eq('client_id', req.client.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (status) query = query.eq('status', status);
    if (account_type) query = query.eq('account_type', account_type);

    const { data, error, count } = await query;

    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FETCH_SUBACCOUNTS_ERROR',
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
    console.error('List subaccounts error:', error);
    res.status(500).json({
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
router.get('/:id', requireScope('read'), async (req, res) => {
  try {
    const { data, error } = await supabase.rpc('get_subaccount_details', {
      p_subaccount_id: req.params.id,
      p_client_id: req.client.id,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FETCH_SUBACCOUNT_ERROR',
          message: error.message,
        },
      });
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Subaccount not found',
        },
      });
    }

    res.json({
      success: true,
      data: data,
    });
  } catch (error) {
    console.error('Get subaccount error:', error);
    res.status(500).json({
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
router.patch('/:id', requireScope('write'), async (req, res) => {
  try {
    const { daily_pix_limit_cents, daily_ted_limit_cents, metadata } = req.body;

    const updates = {};
    if (daily_pix_limit_cents !== undefined) updates.daily_pix_limit_cents = daily_pix_limit_cents;
    if (daily_ted_limit_cents !== undefined) updates.daily_ted_limit_cents = daily_ted_limit_cents;
    if (metadata) updates.metadata = metadata;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
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
      .eq('id', req.params.id)
      .eq('client_id', req.client.id)
      .single();

    if (!subaccount) {
      return res.status(404).json({
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
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'UPDATE_SUBACCOUNT_ERROR',
          message: error.message,
        },
      });
    }

    res.json({
      success: true,
      data: data,
    });
  } catch (error) {
    console.error('Update subaccount error:', error);
    res.status(500).json({
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
router.get('/:id/balance', requireScope('read'), async (req, res) => {
  try {
    const { data, error } = await supabase.rpc('get_subaccount_balance', {
      p_subaccount_id: req.params.id,
      p_client_id: req.client.id,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FETCH_BALANCE_ERROR',
          message: error.message,
        },
      });
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Subaccount not found',
        },
      });
    }

    res.json({
      success: true,
      data: data,
    });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get balance',
      },
    });
  }
});

module.exports = router;
