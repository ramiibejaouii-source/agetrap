const express = require('express');
const autoriser = require('./middleware');

module.exports = (pool) => {
  const router = express.Router();

  const erreurServeur = (res, err) => {
    if (['22P02', '22003'].includes(err.code)) return res.status(400).json({ erreur: 'Données invalides' });
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  };

  // Liste des passagers d'un trajet (administrateur ou chauffeur)
  router.get('/horaires/:id/passagers', autoriser('administrateur', 'chauffeur'), async (req, res) => {
    try {
      const horaire = await pool.query('SELECT id FROM horaires WHERE id = $1', [req.params.id]);
      if (!horaire.rows[0]) return res.status(404).json({ erreur: 'Horaire introuvable' });
      const { rows } = await pool.query(
        `SELECT r.id AS reservation_id, r.numero_place, u.nom, u.prenom, u.telephone,
                COALESCE(b.utilise, false) AS embarque
         FROM reservations r
         JOIN utilisateurs u ON u.id = r.utilisateur_id
         LEFT JOIN billets b ON b.reservation_id = r.id
         WHERE r.horaire_id = $1 AND r.statut = 'confirmee'
         ORDER BY r.numero_place`,
        [req.params.id]
      );
      res.json(rows);
    } catch (err) { erreurServeur(res, err); }
  });

  // Statistiques : trajets, réservations et annulations
  router.get('/statistiques', autoriser('administrateur'), async (req, res) => {
    try {
      const reservations = await pool.query(
        `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE statut = 'confirmee')::int AS confirmees,
                COUNT(*) FILTER (WHERE statut = 'annulee')::int AS annulees,
                COALESCE(ROUND(100.0 * COUNT(*) FILTER (WHERE statut = 'annulee')
                  / NULLIF(COUNT(*), 0), 1), 0)::float AS taux_annulation
         FROM reservations`
      );
      const trajets = await pool.query(
        'SELECT statut, COUNT(*)::int AS nombre FROM horaires GROUP BY statut ORDER BY statut'
      );
      const lignes = await pool.query(
        `SELECT l.code,
                COUNT(DISTINCT h.id)::int AS trajets,
                COUNT(r.id) FILTER (WHERE r.statut = 'confirmee')::int AS confirmees,
                COUNT(r.id) FILTER (WHERE r.statut = 'annulee')::int AS annulees
         FROM lignes l
         LEFT JOIN horaires h ON h.ligne_id = l.id
         LEFT JOIN reservations r ON r.horaire_id = h.id
         GROUP BY l.id, l.code
         ORDER BY l.code`
      );
      res.json({ reservations: reservations.rows[0], trajets: trajets.rows, par_ligne: lignes.rows });
    } catch (err) { erreurServeur(res, err); }
  });

  return router;
};
