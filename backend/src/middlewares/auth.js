const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'gourmet_secret_key_change_in_production';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido o expirado.' });
    }
    req.user = decoded;
    next();
  });
};

const requireSuperadmin = (req, res, next) => {
  if (req.user && req.user.role === 'superadmin') {
    next();
  } else {
    return res.status(403).json({ error: 'Acceso denegado. Permisos de Súper-Administrador requeridos.' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'superadmin')) {
    next();
  } else {
    return res.status(403).json({ error: 'Acceso denegado. Permisos de Administrador requeridos.' });
  }
};

module.exports = {
  authenticateToken,
  requireSuperadmin,
  requireAdmin,
  JWT_SECRET
};
