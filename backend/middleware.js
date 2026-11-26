const jwt = require('jsonwebtoken');

// N'autorise que les utilisateurs connectés ayant l'un des rôles indiqués
module.exports = (...roles) => (req, res, next) => {
  const [type, token] = (req.headers.authorization || '').split(' ');
  if (type !== 'Bearer' || !token) return res.status(401).json({ erreur: 'Connexion requise' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ erreur: 'Jeton invalide ou expiré' });
  }
  if (!roles.includes(req.user.role)) return res.status(403).json({ erreur: 'Accès refusé' });
  next();
};
