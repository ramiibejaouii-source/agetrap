# Documentation de l'API – Application de gestion de transport

Équipe : Aya Boukadida, Rami Bejaoui, Ranim Hmaidi

## Généralités

- Technologies : Node.js, Express, PostgreSQL
- Adresse locale : `http://localhost:3000` (sur le même Wi-Fi : `http://192.168.1.214:3000`)
- Format des données : JSON (en-tête `Content-Type: application/json`)
- Routes protégées : en-tête `Authorization: Bearer <token>`. Le jeton expire après 2 heures.
- Rôles : `passager`, `chauffeur`, `administrateur`
- Les mots de passe sont enregistrés hachés (bcrypt).

## Résumé des routes

| Méthode | Route | Rôle | Accès | Testée |
|---|---|---|---|---|
| GET | `/health` | Vérifier le serveur | Public | Non |
| GET | `/db-check` | Vérifier la base de données | Public | Oui |
| GET | `/stations` | Lister les stations | Public | Oui |
| POST | `/auth/register` | Créer un compte passager | Public | Oui |
| POST | `/auth/login` | Se connecter | Public | Oui |
| GET | `/vehicules` | Lister les véhicules | Administrateur | Oui |
| POST | `/vehicules` | Ajouter un véhicule | Administrateur | Oui |
| PUT | `/vehicules/:id` | Modifier un véhicule | Administrateur | Non |
| DELETE | `/vehicules/:id` | Supprimer un véhicule | Administrateur | Non |
| GET | `/lignes` | Lister les lignes | Public | Non |
| POST | `/lignes` | Ajouter une ligne | Administrateur | Oui |
| PUT | `/lignes/:id` | Modifier une ligne | Administrateur | Non |
| DELETE | `/lignes/:id` | Supprimer une ligne | Administrateur | Non |
| GET | `/horaires` | Rechercher des horaires | Public | Oui |
| POST | `/horaires` | Ajouter un horaire | Administrateur | Oui |
| PUT | `/horaires/:id` | Modifier un horaire | Administrateur | Non |
| DELETE | `/horaires/:id` | Supprimer un horaire | Administrateur | Non |
| GET | `/reservations/places/:horaireId` | Places déjà prises | Passager | Non |
| GET | `/reservations` | Historique du passager | Passager | Oui |
| POST | `/reservations` | Réserver une place | Passager | Oui |
| PUT | `/reservations/:id` | Modifier une réservation | Passager | Oui |
| DELETE | `/reservations/:id` | Annuler une réservation | Passager | Oui |
| GET | `/billets/:reservationId` | Obtenir le billet QR | Passager | Oui |
| POST | `/billets/scan` | Valider un billet | Chauffeur | Oui |
| GET | `/admin/horaires/:id/passagers` | Liste des passagers | Administrateur, chauffeur | Oui |
| GET | `/admin/statistiques` | Statistiques | Administrateur | Oui |

## Codes de réponse

| Code | Signification |
|---|---|
| 200 | Succès |
| 201 | Élément créé |
| 204 | Élément supprimé (réponse vide) |
| 400 | Données manquantes ou invalides |
| 401 | Non connecté, jeton invalide ou identifiants incorrects |
| 403 | Rôle non autorisé |
| 404 | Élément introuvable |
| 409 | Conflit (doublon ou élément utilisé ailleurs) |
| 500 | Erreur serveur |

Les erreurs des routes d'authentification et de gestion ont la forme `{ "erreur": "..." }`.
Les routes de test `/db-check` et `/stations` répondent `{ "status": "erreur", "message": "..." }`.

## Tests

- `GET /health` retourne `status`, `serveur` et `heure`.
- `GET /db-check` retourne `status`, `heure`, `base` et `ip_base`.
- `GET /stations` retourne une liste : `[{ "id": 1, "nom": "Tunis", "ville": "Tunis" }]`

## Authentification

### POST /auth/register

`telephone` est facultatif. `mot_de_passe` : 8 caractères minimum. Le rôle est toujours `passager`.

```json
{ "nom": "Test", "prenom": "User", "email": "test@example.com", "mot_de_passe": "Test12345" }
```

Réponse 201 :

```json
{ "id": 1, "nom": "Test", "prenom": "User", "email": "test@example.com", "role": "passager" }
```

Erreurs : 400 (champs invalides), 409 (email déjà utilisé).

### POST /auth/login

```json
{ "email": "test@example.com", "mot_de_passe": "Test12345" }
```

Réponse 200 :

```json
{ "token": "<jeton JWT>", "role": "passager" }
```

Erreurs : 400 (champs manquants), 401 (email ou mot de passe incorrect).

## Véhicules (administrateur)

- `type` : `train`, `bus` ou `louage`
- `statut` : `actif`, `maintenance` ou `hors_service`
- `numero` est facultatif.

### POST /vehicules

```json
{ "immatriculation": "123 TU 4567", "type": "bus", "numero": "B01", "capacite": 50 }
```

Réponse 201 : le véhicule créé, avec `id`, `statut`, `chauffeur_id`, `places_libres` et `en_service`.

### PUT /vehicules/:id

Envoyer tous les champs, y compris `statut`.

```json
{ "immatriculation": "123 TU 4567", "type": "bus", "numero": "B01", "capacite": 50, "statut": "maintenance" }
```

### GET /vehicules et DELETE /vehicules/:id

Aucun corps. La suppression est refusée (409) si le véhicule est utilisé par un horaire.

## Lignes

### GET /lignes

Retourne les lignes avec les noms des stations (`depart`, `arrivee`).

### POST /lignes et PUT /lignes/:id

Tous les champs sont requis, sauf `distance_km`.

```json
{ "code": "TEST-TN-SO", "type": "bus", "station_depart_id": 1, "station_arrivee_id": 2, "tarif": 12.5, "distance_km": 140 }
```

Dans les réponses, `tarif` et `distance_km` sont des chaînes (`"12.500"`, `"140.00"`).

### DELETE /lignes/:id

Supprime aussi les horaires sans réservation de la ligne. Refusée (409) si un horaire a des réservations.

## Horaires

### GET /horaires

Filtres facultatifs : `/horaires?depart=1&arrivee=2` (identifiants des stations).
Chaque résultat contient aussi `ligne`, `type`, `tarif`, `depart` et `arrivee`.

### POST /horaires

Le véhicule doit être `actif` et du même type que la ligne. `places_libres` est égal à sa capacité.

```json
{ "ligne_id": 4, "vehicule_id": 4, "date_depart": "2026-12-01T08:00:00+01:00", "date_arrivee": "2026-12-01T10:30:00+01:00" }
```

Réponse 201 :

```json
{ "id": 4, "ligne_id": 4, "vehicule_id": 4, "date_depart": "2026-12-01T07:00:00.000Z",
  "date_arrivee": "2026-12-01T09:30:00.000Z", "places_libres": 50, "statut": "planifie" }
```

Les dates sont retournées en UTC (Tunisie : UTC+1).

### PUT /horaires/:id

Champs facultatifs : `date_depart`, `date_arrivee`, `statut` (`planifie`, `en_cours`, `termine`, `annule`).

```json
{ "statut": "annule" }
```

### DELETE /horaires/:id

Refusée (409) si l'horaire a des réservations : il faut alors l'annuler.

## Réservations (passager)

Chaque passager n'accède qu'à ses propres réservations. `horaire_id` et `numero_place` sont des nombres.

### POST /reservations

```json
{ "horaire_id": 4, "numero_place": 5 }
```

Réponse 201 :

```json
{ "id": 1, "utilisateur_id": 1, "horaire_id": 4, "numero_place": 5,
  "date_reservation": "2026-11-26T11:52:09.555Z", "statut": "confirmee" }
```

Erreurs : 400 (numéro de place invalide), 404 (horaire introuvable), 409 (place déjà réservée, trajet complet, parti ou non ouvert).

### PUT /reservations/:id

Champs facultatifs : `numero_place`, `horaire_id`.

```json
{ "numero_place": 6 }
```

### DELETE /reservations/:id

Passe le statut à `annulee`. La réservation reste dans l'historique. Refusée (409) si elle est déjà annulée ou si le trajet est parti.

### GET /reservations et GET /reservations/places/:horaireId

La première route retourne l'historique avec les détails du trajet. La seconde retourne `{ "places_prises": [5, 10] }`.

## Billets QR

### GET /billets/:reservationId

Retourne `reservation_id`, `code_qr`, `utilise` et `image` (QR au format data URL). Le code contient la réservation, le trajet et la place, avec une signature.

### POST /billets/scan (chauffeur)

```json
{ "code": "<texte lu dans le QR>" }
```

Réponse 200 :

```json
{ "valide": true, "passager": "User Test", "horaire_id": 4, "numero_place": 10,
  "date_scan": "2026-11-26T12:11:53.162Z" }
```

Erreurs : 404 (billet invalide), 409 (billet déjà utilisé, réservation ou trajet non valable).

## Administration

### GET /admin/horaires/:id/passagers

Retourne les réservations confirmées : `reservation_id`, `numero_place`, `nom`, `prenom`, `telephone`, `embarque`.

### GET /admin/statistiques

```json
{
  "reservations": { "total": 2, "confirmees": 1, "annulees": 1, "taux_annulation": 50 },
  "trajets": [ { "statut": "planifie", "nombre": 4 } ],
  "par_ligne": [ { "code": "TEST-TN-SO", "trajets": 1, "confirmees": 1, "annulees": 1 } ]
}
```
