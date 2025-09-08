/**
 * AI Oracle API Routes - Algorand Native Oracle Integration
 * 
 * Provides REST API endpoints for managing and monitoring the Sippar AI Oracle service.
 * Integrates with Algorand blockchain via Indexer API and delivers AI responses
 * using the existing XNode2 infrastructure.
 */

import express from 'express';
import { sipparAIOracleService, initializeOracleService, DEFAULT_INDEXER_CONFIG } from '../services/sipparAIOracleService.js';
import { oracleMonitoringService } from '../services/oracleMonitoringService.js';

const router = express.Router();

/**
 * GET /api/v1/ai-oracle/status
 * Get oracle service status and monitoring information
 */
router.get('/status', async (req, res) => {
  try {
    if (!sipparAIOracleService) {
      return res.status(503).json({
        error: 'Oracle service not initialized',
        initialized: false
      });
    }

    const status = sipparAIOracleService.getOracleStatus();
    const aiStatus = await sipparAIOracleService.getConnectionStatus();
    
    res.json({
      success: true,
      oracle: status,
      aiService: aiStatus,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error getting oracle status:', error);
    res.status(500).json({
      error: 'Failed to get oracle status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/v1/ai-oracle/initialize
 * Initialize oracle service with Algorand Indexer configuration
 */
router.post('/initialize', async (req, res) => {
  try {
    const { indexerConfig, oracleAppId } = req.body;
    
    // Use provided config or default
    const config = indexerConfig || DEFAULT_INDEXER_CONFIG;
    
    // Initialize oracle service
    const service = initializeOracleService(config);
    
    if (oracleAppId) {
      service.setOracleAppId(parseInt(oracleAppId));
    }

    // Initialize Oracle backend account for callback transactions
    await service.initializeOracleAccount();
    
    console.log('Oracle service and account initialized successfully');
    
    const oracleAccount = service.getOracleAccount();
    
    res.json({
      success: true,
      message: 'Oracle service and account initialized',
      config: {
        server: config.server,
        port: config.port,
        tokenConfigured: !!config.token
      },
      oracleAppId: oracleAppId || null,
      oracleAccount: oracleAccount ? {
        address: oracleAccount.address,
        principal: oracleAccount.principal
      } : null
    });
  } catch (error) {
    console.error('Error initializing oracle service:', error);
    res.status(500).json({
      error: 'Failed to initialize oracle service',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/v1/ai-oracle/start-monitoring
 * Start monitoring Algorand blockchain for oracle requests
 */
router.post('/start-monitoring', async (req, res) => {
  try {
    if (!sipparAIOracleService) {
      return res.status(503).json({
        error: 'Oracle service not initialized'
      });
    }

    await sipparAIOracleService.startOracleMonitoring();
    
    res.json({
      success: true,
      message: 'Oracle monitoring started',
      status: sipparAIOracleService.getOracleStatus()
    });
  } catch (error) {
    console.error('Error starting oracle monitoring:', error);
    res.status(500).json({
      error: 'Failed to start oracle monitoring',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/v1/ai-oracle/stop-monitoring
 * Stop monitoring oracle requests
 */
router.post('/stop-monitoring', async (req, res) => {
  try {
    if (!sipparAIOracleService) {
      return res.status(503).json({
        error: 'Oracle service not initialized'
      });
    }

    sipparAIOracleService.stopOracleMonitoring();
    
    res.json({
      success: true,
      message: 'Oracle monitoring stopped',
      status: sipparAIOracleService.getOracleStatus()
    });
  } catch (error) {
    console.error('Error stopping oracle monitoring:', error);
    res.status(500).json({
      error: 'Failed to stop oracle monitoring',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/v1/ai-oracle/set-app-id
 * Set the oracle application ID to monitor
 */
router.post('/set-app-id', async (req, res) => {
  try {
    if (!sipparAIOracleService) {
      return res.status(503).json({
        error: 'Oracle service not initialized'
      });
    }

    const { appId } = req.body;
    
    if (!appId || isNaN(parseInt(appId))) {
      return res.status(400).json({
        error: 'Invalid application ID'
      });
    }

    sipparAIOracleService.setOracleAppId(parseInt(appId));
    
    res.json({
      success: true,
      message: `Oracle app ID set to ${appId}`,
      appId: parseInt(appId)
    });
  } catch (error) {
    console.error('Error setting oracle app ID:', error);
    res.status(500).json({
      error: 'Failed to set oracle app ID',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/ai-oracle/supported-models
 * Get list of supported AI models
 */
router.get('/supported-models', async (req, res) => {
  try {
    if (!sipparAIOracleService) {
      // Return static list if service not initialized
      return res.json({
        success: true,
        models: ['qwen2.5', 'deepseek-r1', 'phi-3', 'mistral'],
        source: 'static'
      });
    }

    const availableModels = await sipparAIOracleService.getAvailableModels();
    
    res.json({
      success: true,
      models: availableModels,
      source: 'service'
    });
  } catch (error) {
    console.error('Error getting supported models:', error);
    res.status(500).json({
      error: 'Failed to get supported models',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/v1/ai-oracle/test-ai-query
 * Test AI query processing (for development/debugging)
 */
router.post('/test-ai-query', async (req, res) => {
  try {
    if (!sipparAIOracleService) {
      return res.status(503).json({
        error: 'Oracle service not initialized'
      });
    }

    const { query, model } = req.body;
    
    if (!query || !model) {
      return res.status(400).json({
        error: 'Query and model are required'
      });
    }

    const startTime = Date.now();
    const aiResponse = await sipparAIOracleService.askSimpleQuestion(query);
    const processingTime = Date.now() - startTime;
    
    res.json({
      success: true,
      query,
      model,
      response: aiResponse,
      processingTime,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error testing AI query:', error);
    res.status(500).json({
      error: 'Failed to test AI query',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/ai-oracle/health
 * Health check endpoint for oracle service
 */
router.get('/health', async (req, res) => {
  try {
    const health: any = {
      timestamp: Date.now(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      oracleService: {
        initialized: !!sipparAIOracleService,
        monitoring: sipparAIOracleService?.getOracleStatus().isMonitoring || false
      }
    };

    // Test AI service connection if oracle service is initialized
    if (sipparAIOracleService) {
      try {
        const aiStatus = await sipparAIOracleService.getConnectionStatus();
        health.aiService = {
          available: aiStatus.available,
          responseTime: aiStatus.responseTime,
          endpoint: aiStatus.endpoint
        };
      } catch (aiError) {
        health.aiService = {
          available: false,
          error: aiError instanceof Error ? aiError.message : 'Unknown error'
        };
      }
    }

    res.json({
      success: true,
      status: 'healthy',
      ...health
    });
  } catch (error) {
    console.error('Error in health check:', error);
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/ai-oracle/docs
 * API documentation for oracle endpoints
 */
router.get('/docs', (req, res) => {
  const docs = {
    title: 'Sippar AI Oracle API',
    version: '1.0.0',
    description: 'REST API for managing Algorand AI Oracle service integration',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/ai-oracle/status',
        description: 'Get oracle service status and monitoring information'
      },
      {
        method: 'POST',
        path: '/api/v1/ai-oracle/initialize',
        description: 'Initialize oracle service with Indexer configuration',
        body: {
          indexerConfig: {
            server: 'string',
            port: 'number',
            token: 'string'
          },
          oracleAppId: 'number (optional)'
        }
      },
      {
        method: 'POST',
        path: '/api/v1/ai-oracle/start-monitoring',
        description: 'Start monitoring blockchain for oracle requests'
      },
      {
        method: 'POST',
        path: '/api/v1/ai-oracle/stop-monitoring',
        description: 'Stop oracle request monitoring'
      },
      {
        method: 'POST',
        path: '/api/v1/ai-oracle/set-app-id',
        description: 'Set oracle application ID to monitor',
        body: {
          appId: 'number'
        }
      },
      {
        method: 'GET',
        path: '/api/v1/ai-oracle/supported-models',
        description: 'Get list of supported AI models'
      },
      {
        method: 'POST',
        path: '/api/v1/ai-oracle/test-ai-query',
        description: 'Test AI query processing',
        body: {
          query: 'string',
          model: 'string'
        }
      },
      {
        method: 'GET',
        path: '/api/v1/ai-oracle/health',
        description: 'Health check endpoint'
      }
    ],
    supportedModels: ['qwen2.5', 'deepseek-r1', 'phi-3', 'mistral'],
    oracleNote: 'sippar-ai-oracle'
  };

  res.json(docs);
});

/**
 * GET /api/v1/ai-oracle/metrics
 * Get Oracle performance metrics and statistics
 */
router.get('/metrics', async (req, res) => {
  try {
    const performanceStats = oracleMonitoringService.getPerformanceStats();
    
    res.json({
      success: true,
      metrics: performanceStats,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error getting Oracle metrics:', error);
    res.status(500).json({
      error: 'Failed to get Oracle metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/ai-oracle/health-detailed  
 * Get detailed Oracle system health status
 */
router.get('/health-detailed', async (req, res) => {
  try {
    const healthStatus = await oracleMonitoringService.getHealthStatus();
    
    res.json({
      success: true,
      health: healthStatus,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error getting Oracle health status:', error);
    res.status(500).json({
      error: 'Failed to get Oracle health status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/ai-oracle/errors
 * Get recent Oracle errors for debugging
 */
router.get('/errors', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const errors = oracleMonitoringService.getErrorSummary(limit);
    
    res.json({
      success: true,
      errors,
      count: errors.length,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error getting Oracle errors:', error);
    res.status(500).json({
      error: 'Failed to get Oracle errors',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;