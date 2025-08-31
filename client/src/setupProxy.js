const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // In-memory storage for barriers (in production, this would be a database)
  const barriers = [];

  // POST /api/barriers - Submit new barrier report
  app.post('/api/barriers', (req, res) => {
    const { type, location, description, severity, reporter } = req.body;
    
    if (!type || !location || !description) {
      return res.status(400).json({ 
        error: 'Missing required fields: type, location, description' 
      });
    }
    
    const newBarrier = {
      id: Date.now().toString(),
      type,
      location,
      description,
      severity: severity || 'medium',
      reporter: reporter || 'anonymous',
      status: 'reported',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    barriers.push(newBarrier);
    
    res.status(201).json({
      success: true,
      message: 'Barrier report submitted successfully',
      barrier: newBarrier
    });
  });

  // GET /api/barriers - Get all barriers with optional filtering
  app.get('/api/barriers', (req, res) => {
    const { type, severity, status, limit = 50, offset = 0 } = req.query;
    
    let filteredBarriers = [...barriers];
    
    // Apply filters
    if (type) {
      filteredBarriers = filteredBarriers.filter(b => b.type === type);
    }
    if (severity) {
      filteredBarriers = filteredBarriers.filter(b => b.severity === severity);
    }
    if (status) {
      filteredBarriers = filteredBarriers.filter(b => b.status === status);
    }
    
    // Apply pagination
    const paginatedBarriers = filteredBarriers.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    
    res.json({
      barriers: paginatedBarriers,
      total: filteredBarriers.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  });

  // PATCH /api/barriers/:id - Update barrier status
  app.patch('/api/barriers/:id', (req, res) => {
    const { id } = req.params;
    const { status, description } = req.body;
    
    const barrierIndex = barriers.findIndex(b => b.id === id);
    
    if (barrierIndex === -1) {
      return res.status(404).json({ error: 'Barrier not found' });
    }
    
    // Update barrier
    if (status) barriers[barrierIndex].status = status;
    if (description) barriers[barrierIndex].description = description;
    
    res.json({
      success: true,
      message: 'Barrier updated successfully',
      barrier: barriers[barrierIndex]
    });
  });

  // GET /api/barriers/:id - Get specific barrier
  app.get('/api/barriers/:id', (req, res) => {
    const { id } = req.params;
    
    const barrier = barriers.find(b => b.id === id);
    
    if (!barrier) {
      return res.status(404).json({ error: 'Barrier not found' });
    }
    
    res.json({ barrier });
  });

  // General API proxy for other endpoints
  app.use('/api', createProxyMiddleware({
    target: 'http://localhost:3001',
    changeOrigin: true,
    onError: (err, req, res) => {
      res.status(404).json({ error: 'API endpoint not found' });
    }
  }));
};
