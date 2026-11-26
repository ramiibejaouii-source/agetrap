const express = require('express');
const crypto = require('crypto');
const QRCode = require('qrcode');
const autoriser = require('./middleware');

// Contenu du QR : réservation, trajet, place et signature
const creerCode = (r) => {
  const donnees = `RES${r.id}.HOR${r.horaire_id}.PL${r.numero_place}`;
  const signature = crypto.createHmac('sha256', process.env.JWT_SECRET)
    .update(`billet:${donnees}`).digest('hex').slice(0, 24);
  return `${donnees}.${signature}`;
};

module.exports = (pool) => {
  const router = express.Router();

  const erreurServeur = (res, err) => {
    if (['22P02', '22003'].includes(err.code)) return res.status(400).json({ erreur: 'Données invalides' });
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  };

  // Le chauffeur scanne le billet
  router.post('/scan', autoriser('chauffeur'), async (req, res) => {
    const { code } = req.body || {};
    if (typeof code !== 'string') return res.status(400).json({ erreur: 'code requis' });
    try {
      const { rows } = await pool.query(
        `SELECT b.id AS billet_id, b.utilise, r.id, r.horaire_id, r.numero_place, r.statut,
                h.statut AS statut_horaire, u.nom, u.prenom
         FROM billets b
         JOIN reservations r ON r.id = b.reservation_id
         JOIN horaires h ON h.id = r.horaire_id
         JOIN utilisateurs u ON u.id = r.utilisateur_id
         WHERE b.code_qr = $1`,
        [code]
      );
      const b = rows[0];
      // Un ancien QR (place ou trajet modifié) n'est plus accepté
      if (!b || creerCode(b) !== code) return res.status(404).json({ erreur: 'Billet invalide' });
      if (b.statut !== 'confirmee' || ['annule', 'termine'].includes(b.statut_horaire)) {
        return res.status(409).json({ erreur: 'Réservation ou trajet non valable' });
      }
      const maj = await pool.query(
        `UPDATE billets SET utilise = true, date_scan = NOW(), scanne_par = $1
         WHERE id = $2 AND utilise = false RETURNING date_scan`,
        [req.user.id, b.billet_id]
      );
      if (!maj.rows[0]) return res.status(409).json({ erreur: 'Billet déjà utilisé' });
      res.json({
        valide: true, passager: `${b.prenom} ${b.nom}`, horaire_id: b.horaire_id,
        numero_place: b.numero_place, date_scan: maj.rows[0].date_scan,
      });
    } catch (err) { erreurServeur(res, err); }
  });

  // Le passager obtient le QR de sa réservation
  router.get('/:reservationId', autoriser('passager'), async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT id, horaire_id, numero_place FROM reservations
         WHERE id = $1 AND utilisateur_id = $2 AND statut = 'confirmee'`,
        [req.params.reservationId, req.user.id]
      );
      if (!rows[0]) return res.status(404).json({ erreur: 'Réservation confirmée introuvable' });
      const code = creerCode(rows[0]);
      await pool.query(
        `INSERT INTO billets (reservation_id, code_qr) VALUES ($1, $2)
         ON CONFLICT (reservation_id) DO UPDATE SET code_qr = EXCLUDED.code_qr
         WHERE billets.utilise = false`,
        [rows[0].id, code]
      );
      const billet = (await pool.query(
        'SELECT reservation_id, code_qr, utilise FROM billets WHERE reservation_id = $1',
        [rows[0].id]
      )).rows[0];
      res.json({ ...billet, image: await QRCode.toDataURL(billet.code_qr) });
    } catch (err) { erreurServeur(res, err); }
  });

  return router;
};
