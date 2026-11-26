const express = require('express');
const autoriser = require('./middleware');

module.exports = (pool) => {
  const router = express.Router();
  router.use(autoriser('administrateur'));

  const gererErreur = (res, err) => {
    if (err.code === '23505') return res.status(409).json({ erreur: 'Immatriculation déjà utilisée' });
    if (err.code === '23503') return res.status(409).json({ erreur: 'Véhicule utilisé par un horaire' });
    if (['23502', '23514', '22P02', '22001', '22003'].includes(err.code)) {
      return res.status(400).json({ erreur: 'Données invalides' });
    }
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  };

  const introuvable = (res) => res.status(404).json({ erreur: 'Véhicule introuvable' });

  router.get('/', async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT * FROM vehicules ORDER BY id');
      res.json(rows);
    } catch (err) { gererErreur(res, err); }
  });

  router.post('/', async (req, res) => {
    const { immatriculation, type, numero, capacite, statut } = req.body || {};
    try {
      const { rows } = await pool.query(
        `INSERT INTO vehicules (immatriculation, type, numero, capacite, statut)
         VALUES ($1, $2, $3, $4, COALESCE($5, 'actif')) RETURNING *`,
        [immatriculation, type, numero || null, capacite, statut || null]
      );
      res.status(201).json(rows[0]);
    } catch (err) { gererErreur(res, err); }
  });

  router.put('/:id', async (req, res) => {
    const { immatriculation, type, numero, capacite, statut } = req.body || {};
    try {
      const { rows } = await pool.query(
        `UPDATE vehicules SET immatriculation = $1, type = $2, numero = $3, capacite = $4, statut = $5
         WHERE id = $6 RETURNING *`,
        [immatriculation, type, numero || null, capacite, statut, req.params.id]
      );
      if (!rows[0]) return introuvable(res);
      res.json(rows[0]);
    } catch (err) { gererErreur(res, err); }
  });

  router.delete('/:id', async (req, res) => {
    try {
      const { rowCount } = await pool.query('DELETE FROM vehicules WHERE id = $1', [req.params.id]);
      if (!rowCount) return introuvable(res);
      res.status(204).end();
    } catch (err) { gererErreur(res, err); }
  });

  return router;
};
