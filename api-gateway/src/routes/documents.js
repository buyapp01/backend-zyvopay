const express = require('express');
const router = express.Router();
const { authenticate, requireScope, supabase } = require('../middleware/auth');

router.use(authenticate);

/**
 * POST /api/documents
 * Upload document
 */
router.post('/', requireScope('write'), async (req, res) => {
  try {
    const {
      subaccount_id,
      document_type,
      file_name,
      file_base64,
      mime_type,
    } = req.body;

    if (!document_type || !file_name || !file_base64 || !mime_type) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: document_type, file_name, file_base64, mime_type',
        },
      });
    }

    // Call upload-document Edge Function
    const response = await fetch(
      `${process.env.SUPABASE_URL}/functions/v1/upload-document`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          client_id: req.client.id,
          subaccount_id: subaccount_id || null,
          document_type,
          file_name,
          file_base64,
          mime_type,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: result.error || { code: 'UPLOAD_DOCUMENT_ERROR', message: 'Failed to upload document' },
      });
    }

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to upload document',
      },
    });
  }
});

/**
 * GET /api/documents
 * List documents
 */
router.get('/', requireScope('read'), async (req, res) => {
  try {
    const { subaccount_id, document_type, status } = req.query;

    const { data, error } = await supabase.rpc('get_client_documents', {
      p_client_id: req.client.id,
      p_document_type: document_type || null,
      p_status: status || null,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FETCH_DOCUMENTS_ERROR',
          message: error.message,
        },
      });
    }

    let filteredData = data;
    if (subaccount_id) {
      // Filter by subaccount_id if provided
      const { data: docs } = await supabase
        .from('documents')
        .select('*')
        .eq('client_id', req.client.id)
        .eq('subaccount_id', subaccount_id);
      filteredData = docs;
    }

    res.json({
      success: true,
      data: filteredData || [],
      count: filteredData?.length || 0,
    });
  } catch (error) {
    console.error('List documents error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list documents',
      },
    });
  }
});

/**
 * GET /api/documents/:id
 * Get document details
 */
router.get('/:id', requireScope('read'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', req.params.id)
      .eq('client_id', req.client.id)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Document not found',
        },
      });
    }

    res.json({
      success: true,
      data: data,
    });
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get document',
      },
    });
  }
});

/**
 * GET /api/documents/:id/download
 * Download document
 */
router.get('/:id/download', requireScope('read'), async (req, res) => {
  try {
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('file_path, file_name, mime_type')
      .eq('id', req.params.id)
      .eq('client_id', req.client.id)
      .single();

    if (docError || !document) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Document not found',
        },
      });
    }

    // Get signed URL from Storage
    const { data: signedUrl, error: urlError } = await supabase.storage
      .from('client-documents')
      .createSignedUrl(document.file_path, 3600); // 1 hour

    if (urlError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'DOWNLOAD_DOCUMENT_ERROR',
          message: urlError.message,
        },
      });
    }

    res.json({
      success: true,
      data: {
        download_url: signedUrl.signedUrl,
        file_name: document.file_name,
        mime_type: document.mime_type,
        expires_in: 3600,
      },
    });
  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to download document',
      },
    });
  }
});

module.exports = router;
