const express = require('express');
const router = express.Router();
const { authenticate, requireScope, supabase } = require('../middleware/auth');

router.use(authenticate);

// ============================================================
// PIX Keys
// ============================================================

/**
 * POST /api/pix/keys
 * Register PIX key
 */
router.post('/keys', requireScope('write'), async (req, res) => {
  try {
    const { subaccount_id, key_type, key_value, is_default } = req.body;

    if (!subaccount_id || !key_type || !key_value) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: subaccount_id, key_type, key_value',
        },
      });
    }

    const { data, error } = await supabase.rpc('register_pix_key', {
      p_subaccount_id: subaccount_id,
      p_key_type: key_type,
      p_key_value: key_value,
      p_is_default: is_default || false,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'REGISTER_PIX_KEY_ERROR',
          message: error.message,
        },
      });
    }

    res.status(201).json({
      success: true,
      data: {
        pix_key_id: data,
      },
    });
  } catch (error) {
    console.error('Register PIX key error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to register PIX key',
      },
    });
  }
});

/**
 * GET /api/pix/keys
 * List PIX keys
 */
router.get('/keys', requireScope('read'), async (req, res) => {
  try {
    const { subaccount_id } = req.query;

    if (!subaccount_id) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required parameter: subaccount_id',
        },
      });
    }

    const { data, error } = await supabase.rpc('list_pix_keys', {
      p_subaccount_id: subaccount_id,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FETCH_PIX_KEYS_ERROR',
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
    console.error('List PIX keys error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list PIX keys',
      },
    });
  }
});

/**
 * DELETE /api/pix/keys/:id
 * Delete PIX key
 */
router.delete('/keys/:id', requireScope('write'), async (req, res) => {
  try {
    const { data, error } = await supabase.rpc('delete_pix_key', {
      p_pix_key_id: req.params.id,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'DELETE_PIX_KEY_ERROR',
          message: error.message,
        },
      });
    }

    res.json({
      success: true,
      message: 'PIX key deleted successfully',
    });
  } catch (error) {
    console.error('Delete PIX key error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete PIX key',
      },
    });
  }
});

// ============================================================
// PIX Payments
// ============================================================

/**
 * POST /api/pix/payments
 * Create PIX payment
 */
router.post('/payments', requireScope('write'), async (req, res) => {
  try {
    const {
      subaccount_id,
      pix_key,
      pix_key_type,
      amount_cents,
      description,
      client_request_id,
    } = req.body;

    if (!subaccount_id || !pix_key || !pix_key_type || !amount_cents) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: subaccount_id, pix_key, pix_key_type, amount_cents',
        },
      });
    }

    const { data, error } = await supabase.rpc('create_pix_payment_internal', {
      p_client_id: req.client.id,
      p_debit_subaccount_id: subaccount_id,
      p_pix_key: pix_key,
      p_pix_key_type: pix_key_type,
      p_amount_cents: amount_cents,
      p_description: description || '',
      p_client_request_id: client_request_id || null,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CREATE_PIX_PAYMENT_ERROR',
          message: error.message,
        },
      });
    }

    res.status(201).json({
      success: true,
      data: {
        transaction_id: data,
      },
    });
  } catch (error) {
    console.error('Create PIX payment error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create PIX payment',
      },
    });
  }
});

/**
 * GET /api/pix/payments/:id
 * Get PIX payment status
 */
router.get('/payments/:id', requireScope('read'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', req.params.id)
      .eq('client_id', req.client.id)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Transaction not found',
        },
      });
    }

    res.json({
      success: true,
      data: data,
    });
  } catch (error) {
    console.error('Get PIX payment error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get PIX payment',
      },
    });
  }
});

// ============================================================
// PIX QR Codes
// ============================================================

/**
 * POST /api/pix/qrcodes
 * Generate PIX QR Code
 */
router.post('/qrcodes', requireScope('write'), async (req, res) => {
  try {
    const {
      subaccount_id,
      qr_type,
      amount_cents,
      description,
      expires_in_minutes,
    } = req.body;

    if (!subaccount_id || !qr_type) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: subaccount_id, qr_type',
        },
      });
    }

    const { data, error } = await supabase.rpc('generate_pix_qr_code', {
      p_subaccount_id: subaccount_id,
      p_qr_type: qr_type,
      p_amount_cents: amount_cents || null,
      p_description: description || null,
      p_expires_in_minutes: expires_in_minutes || 60,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'GENERATE_QR_CODE_ERROR',
          message: error.message,
        },
      });
    }

    res.status(201).json({
      success: true,
      data: data,
    });
  } catch (error) {
    console.error('Generate QR code error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to generate QR code',
      },
    });
  }
});

/**
 * GET /api/pix/qrcodes/:id
 * Get QR Code details
 */
router.get('/qrcodes/:id', requireScope('read'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('pix_qr_codes')
      .select(`
        *,
        subaccounts!inner(client_id)
      `)
      .eq('id', req.params.id)
      .eq('subaccounts.client_id', req.client.id)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'QR code not found',
        },
      });
    }

    // Remove nested client_id from response
    const { subaccounts, ...qrCodeData } = data;

    res.json({
      success: true,
      data: qrCodeData,
    });
  } catch (error) {
    console.error('Get QR code error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get QR code',
      },
    });
  }
});

/**
 * GET /api/pix/qrcodes
 * List QR codes
 */
router.get('/qrcodes', requireScope('read'), async (req, res) => {
  try {
    const { subaccount_id, qr_type, is_active, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('pix_qr_codes')
      .select(`
        *,
        subaccounts!inner(client_id)
      `, { count: 'exact' })
      .eq('subaccounts.client_id', req.client.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (subaccount_id) query = query.eq('subaccount_id', subaccount_id);
    if (qr_type) query = query.eq('qr_type', qr_type);
    if (is_active !== undefined) query = query.eq('is_active', is_active === 'true');

    const { data, error, count } = await query;

    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FETCH_QR_CODES_ERROR',
          message: error.message,
        },
      });
    }

    // Remove nested client_id from response
    const cleanedData = data.map(({ subaccounts, ...qrCode }) => qrCode);

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
    console.error('List QR codes error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list QR codes',
      },
    });
  }
});

module.exports = router;
