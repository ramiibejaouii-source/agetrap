const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Configure connection to the remote Ubuntu database[cite: 1, 2]
const db = mysql.createConnection({
    host: '192.168.1.55', // Put your Ubuntu VM IP here
    user: 'agetrap_user',
    password: 'projet',
    database: 'agetrap_db'
});

db.connect((err) => {
    if (err) {
        console.error('Database connection failed: ' + err.stack);
        return;
    }
    console.log('Connected to remote Ubuntu MySQL database successfully!');
});

// --- ACTION 4 IMPLEMENTATION ---

// 1. ALLOW THE CLIENT TO MAKE A RESERVATION[cite: 1, 4]
app.post('/api/reservations', (req, res) => {
    const { client_id, trajet_id, place_numero } = req.body;

    const query = 'INSERT INTO Reservations (client_id, trajet_id, place_numero, statut) VALUES (?, ?, ?, "confirmée")';
    
    db.query(query, [client_id, trajet_id, place_numero], (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ 
            message: "Reservation created successfully!", 
            reservationId: result.insertId 
        });
    });
});

// 2. ALLOW THE DRIVER TO CONSULT AND VERIFY RESERVATIONS FOR A TRIP
app.get('/api/reservations/driver/:trajet_id', (req, res) => {
    const { trajet_id } = req.params;

    const query = `
        SELECT r.id, r.place_numero, u.nom, u.prenom, r.statut 
        FROM Reservations r
        JOIN Utilisateurs u ON r.client_id = u.id
        WHERE r.trajet_id = ?
    `;

    db.query(query, [trajet_id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});