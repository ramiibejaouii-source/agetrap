const express = require('express');
const autoriser = require('./middleware');

class Refus extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

module.exports = (pool) => {
  const router = express.Router();
  router.use(autoriser('passager'));

  const gererErreur = (res, err) => {
    if (err instanceof Refus) return res.status(err.status).json({ erreur: err.message });
    if (err.code === '23505') return res.status(409).json({ erreur: 'Cette place est déjà réservée' });
    if (['23502', '23514', '22P02', '22003'].includes(err.code)) {
      return res.status(400).json({ erreur: 'Données invalides' });
    }
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  };

  // Tout réussit ou rien n'est enregistré
  const transaction = async (travail) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const resultat = await travail(client);
      await client.query('COMMIT');
      return resultat;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  };

  // Verrouille l'horaire pour éviter deux réservations en même temps
  const lireHoraire = async (client, id) => {
    const { rows } = await client.query(
      `SELECT h.id, h.statut, h.places_libres, v.capacite, h.date_depart > NOW() AS a_venir
       FROM horaires h JOIN vehicules v ON v.id = h.vehicule_id
       WHERE h.id = $1 FOR UPDATE OF h`,
      [id]
    );
    if (!rows[0]) throw new Refus(404, 'Horaire introuvable');
    return rows[0];
  };

  const verifierTrajet = (horaire, place) => {
    if (horaire.statut !== 'planifie' || !horaire.a_venir) {
      throw new Refus(409, "Ce trajet n'est plus ouvert à la réservation");
    }
    if (!Number.isInteger(place) || place < 1 || place > horaire.capacite) {
      throw new Refus(400, `Numéro de place entre 1 et ${horaire.capacite}`);
    }
  };

  // La réservation doit appartenir au passager, être confirmée et à venir
  const lireReservation = async (client, id, utilisateurId) => {
    const { rows } = await client.query(
      `SELECT r.*, h.date_depart > NOW() AS a_venir
       FROM reservations r JOIN horaires h ON h.id = r.horaire_id
       WHERE r.id = $1 AND r.utilisateur_id = $2 FOR UPDATE OF r`,
      [id, utilisateurId]
    );
    const reservation = rows[0];
    if (!reservation) throw new Refus(404, 'Réservation introuvable');
    if (reservation.statut !== 'confirmee') throw new Refus(409, 'Réservation déjà annulée');
    if (!reservation.a_venir) throw new Refus(409, 'Le trajet est déjà parti');
    return reservation;
  };

  const changerPlacesLibres = (client, horaireId, ecart) =>
    client.query('UPDATE horaires SET places_libres = places_libres + $1 WHERE id = $2', [ecart, horaireId]);

  // Places déjà prises sur un horaire
  router.get('/places/:horaireId', async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT numero_place FROM reservations
         WHERE horaire_id = $1 AND statut = 'confirmee' ORDER BY numero_place`,
        [req.params.horaireId]
      );
      res.json({ places_prises: rows.map((r) => r.numero_place) });
    } catch (err) { gererErreur(res, err); }
  });

  // Historique du passager connecté
  router.get('/', async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT r.id, r.horaire_id, r.numero_place, r.statut, r.date_reservation,
                h.date_depart, h.date_arrivee, l.code AS ligne, l.tarif,
                d.nom AS depart, a.nom AS arrivee
         FROM reservations r
         JOIN horaires h ON h.id = r.horaire_id
         JOIN lignes l ON l.id = h.ligne_id
         JOIN stations d ON d.id = l.station_depart_id
         JOIN stations a ON a.id = l.station_arrivee_id
         WHERE r.utilisateur_id = $1
         ORDER BY r.date_reservation DESC`,
        [req.user.id]
      );
      res.json(rows);
    } catch (err) { gererErreur(res, err); }
  });

  // Réserver une place
  router.post('/', async (req, res) => {
    const { horaire_id, numero_place } = req.body || {};
    try {
      const reservation = await transaction(async (client) => {
        const horaire = await lireHoraire(client, horaire_id);
        verifierTrajet(horaire, numero_place);
        if (horaire.places_libres < 1) throw new Refus(409, 'Trajet complet');
        const { rows } = await client.query(
          `INSERT INTO reservations (utilisateur_id, horaire_id, numero_place)
           VALUES ($1, $2, $3) RETURNING *`,
          [req.user.id, horaire.id, numero_place]
        );
        await changerPlacesLibres(client, horaire.id, -1);
        return rows[0];
      });
      res.status(201).json(reservation);
    } catch (err) { gererErreur(res, err); }
  });

  // Modifier la place, ou changer de trajet
  router.put('/:id', async (req, res) => {
    const { horaire_id, numero_place } = req.body || {};
    try {
      const reservation = await transaction(async (client) => {
        const ancienne = await lireReservation(client, req.params.id, req.user.id);
        const horaire = await lireHoraire(client, horaire_id ?? ancienne.horaire_id);
        const place = numero_place ?? ancienne.numero_place;
        verifierTrajet(horaire, place);
        const autreTrajet = horaire.id !== ancienne.horaire_id;
        if (autreTrajet && horaire.places_libres < 1) throw new Refus(409, 'Trajet complet');
        const { rows } = await client.query(
          'UPDATE reservations SET horaire_id = $1, numero_place = $2 WHERE id = $3 RETURNING *',
          [horaire.id, place, ancienne.id]
        );
        if (autreTrajet) {
          await changerPlacesLibres(client, ancienne.horaire_id, 1);
          await changerPlacesLibres(client, horaire.id, -1);
        }
        return rows[0];
      });
      res.json(reservation);
    } catch (err) { gererErreur(res, err); }
  });

  // Annuler (la réservation reste dans l'historique)
  router.delete('/:id', async (req, res) => {
    try {
      const reservation = await transaction(async (client) => {
        const ancienne = await lireReservation(client, req.params.id, req.user.id);
        const { rows } = await client.query(
          "UPDATE reservations SET statut = 'annulee' WHERE id = $1 RETURNING *",
          [ancienne.id]
        );
        await changerPlacesLibres(client, ancienne.horaire_id, 1);
        return rows[0];
      });
      res.json(reservation);
    } catch (err) { gererErreur(res, err); }
  });

  return router;
};
