// middleware/authenticate.js
const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  const auth = req.header('Authorization') || '';
  const token = auth.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'trek-iq-secret-key');
    req.user = { 
      id: payload.id, 
      email: payload.email 
    };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

