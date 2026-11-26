const express = require('express');
const autoriser = require('./middleware');

module.exports = (pool) => {
  const router = express.Router();
  const admin = autoriser('administrateur');

  const gererErreur = (res, err) => {
    if (err.code === '23505') return res.status(409).json({ erreur: 'Code de ligne déjà utilisé' });
    if (err.code === '23503') return res.status(409).json({ erreur: 'Station inexistante ou ligne déjà réservée' });
    if (['23502', '23514', '22P02', '22001', '22003'].includes(err.code)) {
      return res.status(400).json({ erreur: 'Données invalides' });
    }
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  };

  const introuvable = (res) => res.status(404).json({ erreur: 'Ligne introuvable' });

  const valeurs = (b = {}) =>
    [b.code, b.type, b.station_depart_id, b.station_arrivee_id, b.tarif, b.distance_km ?? null];

  // Consultation : ouverte à tous
  router.get('/', async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT l.*, d.nom AS depart, a.nom AS arrivee
         FROM lignes l
         JOIN stations d ON d.id = l.station_depart_id
         JOIN stations a ON a.id = l.station_arrivee_id
         ORDER BY l.id`
      );
      res.json(rows);
    } catch (err) { gererErreur(res, err); }
  });

  router.post('/', admin, async (req, res) => {
    try {
      const { rows } = await pool.query(
        `INSERT INTO lignes (code, type, station_depart_id, station_arrivee_id, tarif, distance_km)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        valeurs(req.body)
      );
      res.status(201).json(rows[0]);
    } catch (err) { gererErreur(res, err); }
  });

  router.put('/:id', admin, async (req, res) => {
    try {
      const { rows } = await pool.query(
        `UPDATE lignes SET code = $1, type = $2, station_depart_id = $3,
           station_arrivee_id = $4, tarif = $5, distance_km = $6
         WHERE id = $7 RETURNING *`,
        [...valeurs(req.body), req.params.id]
      );
      if (!rows[0]) return introuvable(res);
      res.json(rows[0]);
    } catch (err) { gererErreur(res, err); }
  });

  // Supprime aussi les horaires sans réservation de cette ligne
  router.delete('/:id', admin, async (req, res) => {
    try {
      const { rowCount } = await pool.query('DELETE FROM lignes WHERE id = $1', [req.params.id]);
      if (!rowCount) return introuvable(res);
      res.status(204).end();
    } catch (err) { gererErreur(res, err); }
  });

  return router;
};
