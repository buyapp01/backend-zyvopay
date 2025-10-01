const express = require('express');
const router = express.Router();
const { authenticate, requireScope, supabase } = require('../middleware/auth');

router.use(authenticate);

/**
 * POST /api/splits
 * Create split rule
 */
router.post('/', requireScope('write'), async (req, res) => {
  try {
    const { name, recipients, description } = req.body;

    if (!name || !recipients || !Array.isArray(recipients)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: name, recipients (array)',
        },
      });
    }

    const { data, error } = await supabase.rpc('create_split_rule', {
      p_client_id: req.client.id,
      p_name: name,
      p_recipients: JSON.stringify(recipients),
      p_description: description || null,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CREATE_SPLIT_ERROR',
          message: error.message,
        },
      });
    }

    res.status(201).json({
      success: true,
      data: {
        split_rule_id: data,
      },
    });
  } catch (error) {
    console.error('Create split rule error:', error);
    res.status(500).json({
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
router.get('/', requireScope('read'), async (req, res) => {
  try {
    const { is_active } = req.query;

    let query = supabase
      .from('split_rules')
      .select('*')
      .eq('client_id', req.client.id)
      .order('created_at', { ascending: false });

    if (is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true');
    }

    const { data, error } = await query;

    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FETCH_SPLITS_ERROR',
          message: error.message,
        },
      });
    }

    res.json({
      success: true,
      data: data,
      count: data.length,
    });
  } catch (error) {
    console.error('List split rules error:', error);
    res.status(500).json({
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
router.get('/:id', requireScope('read'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('split_rules')
      .select('*')
      .eq('id', req.params.id)
      .eq('client_id', req.client.id)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Split rule not found',
        },
      });
    }

    res.json({
      success: true,
      data: data,
    });
  } catch (error) {
    console.error('Get split rule error:', error);
    res.status(500).json({
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
router.patch('/:id', requireScope('write'), async (req, res) => {
  try {
    const { name, recipients, is_active, description } = req.body;

    const { data, error } = await supabase.rpc('update_split_rule', {
      p_split_rule_id: req.params.id,
      p_client_id: req.client.id,
      p_name: name || null,
      p_recipients: recipients ? JSON.stringify(recipients) : null,
      p_is_active: is_active !== undefined ? is_active : null,
      p_description: description || null,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'UPDATE_SPLIT_ERROR',
          message: error.message,
        },
      });
    }

    res.json({
      success: true,
      message: 'Split rule updated successfully',
    });
  } catch (error) {
    console.error('Update split rule error:', error);
    res.status(500).json({
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
router.delete('/:id', requireScope('write'), async (req, res) => {
  try {
    const { error } = await supabase
      .from('split_rules')
      .delete()
      .eq('id', req.params.id)
      .eq('client_id', req.client.id);

    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'DELETE_SPLIT_ERROR',
          message: error.message,
        },
      });
    }

    res.json({
      success: true,
      message: 'Split rule deleted successfully',
    });
  } catch (error) {
    console.error('Delete split rule error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete split rule',
      },
    });
  }
});

module.exports = router;
