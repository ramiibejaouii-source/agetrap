// Serveur minimal pour le test reseau (Action 3)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Test 1 : le serveur d'application repond (sans base de donnees)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', serveur: 'application', heure: new Date().toISOString() });
});

// Test 2 : le serveur d'application atteint la base de donnees
app.get('/db-check', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT NOW() AS heure, current_database() AS base, inet_server_addr() AS ip_base'
    );
    res.json({ status: 'ok', ...result.rows[0] });
  } catch (err) {
    console.error('Erreur base de donnees :', err.message);
    res.status(500).json({ status: 'erreur', message: err.message });
  }
});

// Test 3 : lecture de vraies donnees (apres seed.sql)
app.get('/stations', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nom, ville FROM stations ORDER BY nom');
    res.json(result.rows);
  } catch (err) {
    console.error('Erreur base de donnees :', err.message);
    res.status(500).json({ status: 'erreur', message: err.message });
  }
});
// Authentification (inscription et connexion)
app.use('/auth', require('./auth')(pool));
app.use('/vehicules', require('./vehicules')(pool));
app.use('/lignes', require('./lignes')(pool));
app.use('/horaires', require('./horaires')(pool));
app.use('/reservations', require('./reservations')(pool));
app.use('/billets', require('./billets')(pool));
app.use('/admin', require('./admin')(pool));
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API a l'ecoute sur le port ${PORT}`);
});
