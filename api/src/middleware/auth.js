const jwt = require('jsonwebtoken');

function requireRole(allowedRoles) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid token', code: 'UNAUTHORIZED' });
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!allowedRoles.includes(decoded.role)) {
        return res.status(403).json({ error: 'Insufficient permissions for this role', code: 'FORBIDDEN' });
      }
      req.user = decoded;
      next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired. Please re-authenticate.', code: 'TOKEN_EXPIRED' });
      }
      return res.status(401).json({ error: 'Token invalid', code: 'UNAUTHORIZED' });
    }
  };
}

module.exports = { requireRole };
