const express = require('express');
const autoriser = require('./middleware');

module.exports = (pool) => {
  const router = express.Router();
  const admin = autoriser('administrateur');

  const gererErreur = (res, err) => {
    if (err.code === '23503') return res.status(409).json({ erreur: 'Horaire déjà réservé : annulez-le au lieu de le supprimer' });
    if (['23502', '23514', '22P02', '22007', '22008', '22003'].includes(err.code)) {
      return res.status(400).json({ erreur: 'Données invalides' });
    }
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  };

  const introuvable = (res) => res.status(404).json({ erreur: 'Horaire introuvable' });

  // Recherche des trajets : /horaires?depart=1&arrivee=2
  router.get('/', async (req, res) => {
    const { depart, arrivee } = req.query;
    try {
      const { rows } = await pool.query(
        `SELECT h.*, l.code AS ligne, l.type, l.tarif, d.nom AS depart, a.nom AS arrivee
         FROM horaires h
         JOIN lignes l ON l.id = h.ligne_id
         JOIN stations d ON d.id = l.station_depart_id
         JOIN stations a ON a.id = l.station_arrivee_id
         WHERE ($1::int IS NULL OR l.station_depart_id = $1::int)
           AND ($2::int IS NULL OR l.station_arrivee_id = $2::int)
         ORDER BY h.date_depart`,
        [depart || null, arrivee || null]
      );
      res.json(rows);
    } catch (err) { gererErreur(res, err); }
  });

  // Les places libres viennent de la capacité du véhicule
  router.post('/', admin, async (req, res) => {
    const { ligne_id, vehicule_id, date_depart, date_arrivee } = req.body || {};
    try {
      const { rows } = await pool.query(
        `INSERT INTO horaires (ligne_id, vehicule_id, date_depart, date_arrivee, places_libres)
         SELECT l.id, v.id, $3::timestamptz, $4::timestamptz, v.capacite
         FROM vehicules v JOIN lignes l ON l.id = $1
         WHERE v.id = $2 AND v.type = l.type AND v.statut = 'actif'
         RETURNING *`,
        [ligne_id, vehicule_id, date_depart, date_arrivee]
      );
      if (!rows[0]) {
        return res.status(400).json({ erreur: 'Ligne ou véhicule invalide (même type et véhicule actif requis)' });
      }
      res.status(201).json(rows[0]);
    } catch (err) { gererErreur(res, err); }
  });

  // Modifier les dates ou le statut (champs facultatifs)
  router.put('/:id', admin, async (req, res) => {
    const { date_depart, date_arrivee, statut } = req.body || {};
    try {
      const { rows } = await pool.query(
        `UPDATE horaires SET
           date_depart = COALESCE($1::timestamptz, date_depart),
           date_arrivee = COALESCE($2::timestamptz, date_arrivee),
           statut = COALESCE($3, statut)
         WHERE id = $4 RETURNING *`,
        [date_depart || null, date_arrivee || null, statut || null, req.params.id]
      );
      if (!rows[0]) return introuvable(res);
      res.json(rows[0]);
    } catch (err) { gererErreur(res, err); }
  });

  router.delete('/:id', admin, async (req, res) => {
    try {
      const { rowCount } = await pool.query('DELETE FROM horaires WHERE id = $1', [req.params.id]);
      if (!rowCount) return introuvable(res);
      res.status(204).end();
    } catch (err) { gererErreur(res, err); }
  });

  return router;
};
