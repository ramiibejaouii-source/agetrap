const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

module.exports = (pool) => {
  const router = express.Router();

  // Inscription : le rôle est toujours "passager"
  router.post('/register', async (req, res) => {
    const { nom, prenom, email, mot_de_passe, telephone } = req.body || {};
    if (!nom || !prenom || !email || typeof mot_de_passe !== 'string' || mot_de_passe.length < 8) {
      return res.status(400).json({ erreur: 'nom, prenom, email et mot_de_passe (8 caractères min.) requis' });
    }
    try {
      const hash = await bcrypt.hash(mot_de_passe, 10);
      const { rows } = await pool.query(
        `INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, telephone)
         VALUES ($1, $2, LOWER($3), $4, $5)
         RETURNING id, nom, prenom, email, role`,
        [nom, prenom, email, hash, telephone || null]
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ erreur: 'Email déjà utilisé' });
      console.error(err);
      res.status(500).json({ erreur: 'Erreur serveur' });
    }
  });

  // Connexion : retourne un jeton JWT
  router.post('/login', async (req, res) => {
    const { email, mot_de_passe } = req.body || {};
    if (!email || typeof mot_de_passe !== 'string') {
      return res.status(400).json({ erreur: 'email et mot_de_passe requis' });
    }
    try {
      const { rows } = await pool.query(
        'SELECT id, mot_de_passe, role FROM utilisateurs WHERE email = LOWER($1)',
        [email]
      );
      const user = rows[0];
      if (!user || !(await bcrypt.compare(mot_de_passe, user.mot_de_passe))) {
        return res.status(401).json({ erreur: 'Email ou mot de passe incorrect' });
      }
      const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '2h' });
      res.json({ token, role: user.role });
    } catch (err) {
      console.error(err);
      res.status(500).json({ erreur: 'Erreur serveur' });
    }
  });

  return router;
};
