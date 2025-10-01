const express = require('express');
const router = express.Router();
const { authenticate, requireScope, supabase } = require('../middleware/auth');

router.use(authenticate);

/**
 * POST /api/ted/transfers
 * Create TED transfer
 */
router.post('/transfers', requireScope('write'), async (req, res) => {
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
    } = req.body;

    if (!subaccount_id || !bank_code || !branch || !account_number || !beneficiary_name || !beneficiary_document || !amount_cents) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields',
        },
      });
    }

    const { data, error } = await supabase.rpc('create_ted_transfer', {
      p_client_id: req.client.id,
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
      return res.status(400).json({
        success: false,
        error: {
          code: 'CREATE_TED_TRANSFER_ERROR',
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
    console.error('Create TED transfer error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create TED transfer',
      },
    });
  }
});

module.exports = router;
