import React, { useState, useEffect, useCallback } from 'react';
import {
  Bus,
  QrCode,
  Trash2,
  PlusCircle,
  User,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import LoginView from './components/LoginView';
import './App.css';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function apiRequest(path, { method = 'GET', body, token } = {}) {
  const headers = {};
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) {
    return null;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.erreur || data.message || `Request failed (${res.status})`);
  }
  return data;
}

function formatDateTime(isoStr) {
  if (!isoStr) return '-';
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return isoStr;
  return d.toLocaleString('fr-TN', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function toDatetimeLocalValue(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('agetrap_token') || '');
  const [userRole, setUserRole] = useState(() => localStorage.getItem('agetrap_role') || 'passager');
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('agetrap_user')) || null;
    } catch {
      return null;
    }
  });
  const [currentView, setCurrentView] = useState('passager-search');

  const isLoggedIn = Boolean(token);

  const handleLoginSuccess = (role, userObj, jwtToken) => {
    setToken(jwtToken);
    setUserRole(role);
    setCurrentUser(userObj);
    localStorage.setItem('agetrap_token', jwtToken);
    localStorage.setItem('agetrap_role', role);
    localStorage.setItem('agetrap_user', JSON.stringify(userObj));

    if (role === 'administrateur') {
      setCurrentView('admin-horaires');
    } else if (role === 'chauffeur') {
      setCurrentView('chauffeur-scanner');
    } else {
      setCurrentView('passager-search');
    }
  };

  const handleLogout = () => {
    setToken('');
    setUserRole('passager');
    setCurrentUser(null);
    localStorage.removeItem('agetrap_token');
    localStorage.removeItem('agetrap_role');
    localStorage.removeItem('agetrap_user');
  };

  if (!isLoggedIn) {
    return (
      <div className="app-shell">
        <LoginView onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="navbar">
        <div className="navbar-container">
          <div className="brand">
            <div className="brand-icon">
              <Bus size={24} />
            </div>
            <div>
              <span className="brand-title">AGETRAP</span>
              <span className="brand-subtitle">
                {userRole === 'administrateur' && 'Admin Control Center'}
                {userRole === 'passager' && `Passenger Portal • ${currentUser?.email || ''}`}
                {userRole === 'chauffeur' && `Driver Operations • ${currentUser?.email || ''}`}
              </span>
            </div>
          </div>

          <nav className="nav-links">
            {userRole === 'administrateur' && (
              <>
                <button
                  onClick={() => setCurrentView('admin-horaires')}
                  className={`nav-btn ${currentView === 'admin-horaires' ? 'active' : ''}`}
                >
                  Schedules & Lines
                </button>
                <button
                  onClick={() => setCurrentView('admin-vehicules')}
                  className={`nav-btn ${currentView === 'admin-vehicules' ? 'active' : ''}`}
                >
                  Vehicles
                </button>
                <button
                  onClick={() => setCurrentView('admin-stats')}
                  className={`nav-btn ${currentView === 'admin-stats' ? 'active' : ''}`}
                >
                  Statistics & Passengers
                </button>
              </>
            )}

            {userRole === 'passager' && (
              <>
                <button
                  onClick={() => setCurrentView('passager-search')}
                  className={`nav-btn ${currentView === 'passager-search' ? 'active' : ''}`}
                >
                  Search & Book
                </button>
                <button
                  onClick={() => setCurrentView('passager-reservations')}
                  className={`nav-btn ${currentView === 'passager-reservations' ? 'active' : ''}`}
                >
                  My Reservations & QR
                </button>
                <button
                  onClick={() => setCurrentView('passager-profile')}
                  className={`nav-btn ${currentView === 'passager-profile' ? 'active' : ''}`}
                >
                  Profile
                </button>
              </>
            )}

            {userRole === 'chauffeur' && (
              <>
                <button
                  onClick={() => setCurrentView('chauffeur-scanner')}
                  className={`nav-btn ${currentView === 'chauffeur-scanner' ? 'active' : ''}`}
                >
                  QR Boarding Scanner
                </button>
                <button
                  onClick={() => setCurrentView('chauffeur-horaires')}
                  className={`nav-btn ${currentView === 'chauffeur-horaires' ? 'active' : ''}`}
                >
                  Schedules & Passengers
                </button>
              </>
            )}
          </nav>

          <button onClick={handleLogout} className="btn-logout">
            Log Out
          </button>
        </div>
      </header>

      <main className="main-content">
        {userRole === 'administrateur' && currentView === 'admin-horaires' && (
          <AdminHorairesLignesView token={token} />
        )}
        {userRole === 'administrateur' && currentView === 'admin-vehicules' && (
          <AdminVehiculesView token={token} />
        )}
        {userRole === 'administrateur' && currentView === 'admin-stats' && (
          <AdminStatsView token={token} />
        )}

        {userRole === 'passager' && currentView === 'passager-search' && (
          <PassagerSearchView
            token={token}
            onBooked={() => setCurrentView('passager-reservations')}
          />
        )}
        {userRole === 'passager' && currentView === 'passager-reservations' && (
          <PassagerReservationsView token={token} />
        )}
        {userRole === 'passager' && currentView === 'passager-profile' && (
          <PassagerProfileView currentUser={currentUser} token={token} />
        )}

        {userRole === 'chauffeur' && currentView === 'chauffeur-scanner' && (
          <ChauffeurScannerView token={token} />
        )}
        {userRole === 'chauffeur' && currentView === 'chauffeur-horaires' && (
          <ChauffeurHorairesView token={token} />
        )}
      </main>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 1. Passager Views                                                          */
/* -------------------------------------------------------------------------- */
function PassagerSearchView({ token, onBooked }) {
  const [stations, setStations] = useState([]);
  const [departId, setDepartId] = useState('');
  const [arriveeId, setArriveeId] = useState('');
  const [horaires, setHoraires] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [selectedHoraire, setSelectedHoraire] = useState(null);
  const [takenSeats, setTakenSeats] = useState([]);
  const [selectedSeat, setSelectedSeat] = useState(1);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');

  const loadStations = useCallback(async () => {
    try {
      const data = await apiRequest('/stations');
      setStations(Array.isArray(data) ? data : []);
    } catch (err) {
      setErrorMsg(err.message);
    }
  }, []);

  const loadHoraires = useCallback(async (dep = '', arr = '') => {
    setLoading(true);
    setErrorMsg('');
    try {
      const params = new URLSearchParams();
      if (dep) params.set('depart', dep);
      if (arr) params.set('arrivee', arr);
      const query = params.toString() ? `?${params.toString()}` : '';
      const data = await apiRequest(`/horaires${query}`);
      setHoraires(Array.isArray(data) ? data : []);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStations();
    loadHoraires();
  }, [loadStations, loadHoraires]);

  const handleOpenBooking = async (horaire) => {
    setSelectedHoraire(horaire);
    setBookingError('');
    setSelectedSeat(1);
    try {
      const data = await apiRequest(`/reservations/places/${horaire.id}`, { token });
      const taken = Array.isArray(data?.places_prises) ? data.places_prises : [];
      setTakenSeats(taken);
      const capacity = Number(horaire.places_libres || 40) + taken.length;
      for (let i = 1; i <= Math.max(capacity, 1); i += 1) {
        if (!taken.includes(i)) {
          setSelectedSeat(i);
          break;
        }
      }
    } catch (err) {
      setTakenSeats([]);
      setBookingError(err.message);
    }
  };

  const handleConfirmReservation = async (e) => {
    e.preventDefault();
    if (!selectedHoraire) return;
    setBookingLoading(true);
    setBookingError('');
    try {
      await apiRequest('/reservations', {
        method: 'POST',
        token,
        body: {
          horaire_id: Number(selectedHoraire.id),
          numero_place: Number(selectedSeat),
        },
      });
      setSelectedHoraire(null);
      await loadHoraires(departId, arriveeId);
      onBooked();
    } catch (err) {
      setBookingError(err.message);
    } finally {
      setBookingLoading(false);
    }
  };

  const seatCount = selectedHoraire
    ? Math.max(Number(selectedHoraire.places_libres || 0) + takenSeats.length, ...takenSeats, 1)
    : 0;

  return (
    <div>
      <div className="hero-banner">
        <h1>Search Routes & Reserve Seats</h1>
        <p>Live schedules and seat availability from PostgreSQL</p>

        <div className="search-box">
          <div className="input-group">
            <label>Departure Station</label>
            <select
              value={departId}
              onChange={(e) => {
                const val = e.target.value;
                setDepartId(val);
                loadHoraires(val, arriveeId);
              }}
            >
              <option value="">All Departure Stations</option>
              {stations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nom} ({s.ville})
                </option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label>Arrival Station</label>
            <select
              value={arriveeId}
              onChange={(e) => {
                const val = e.target.value;
                setArriveeId(val);
                loadHoraires(departId, val);
              }}
            >
              <option value="">All Arrival Stations</option>
              {stations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nom} ({s.ville})
                </option>
              ))}
            </select>
          </div>

          <div>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setDepartId('');
                setArriveeId('');
                loadHoraires('', '');
              }}
            >
              Reset Filter
            </button>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="card" style={{ marginBottom: '16px', color: '#991b1b' }}>
          {errorMsg}
        </div>
      )}

      {selectedHoraire && (
        <div className="card" style={{ marginBottom: '24px', borderColor: 'var(--primary)' }}>
          <div className="card-header">
            <div>
              <h2 className="section-title" style={{ marginBottom: '4px' }}>
                Select Seat • {selectedHoraire.depart} {'->'} {selectedHoraire.arrivee} (
                {selectedHoraire.ligne})
              </h2>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Departure: <strong>{formatDateTime(selectedHoraire.date_depart)}</strong> • Free
                seats: <strong>{selectedHoraire.places_libres}</strong> • Fare:{' '}
                <strong>{selectedHoraire.tarif} TND</strong>
              </span>
            </div>
            <button
              type="button"
              className="action-link-edit"
              onClick={() => setSelectedHoraire(null)}
            >
              Close
            </button>
          </div>

          {bookingError && (
            <div style={{ color: '#dc2626', marginBottom: '12px', fontWeight: 600 }}>
              {bookingError}
            </div>
          )}

          <form onSubmit={handleConfirmReservation}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(56px, 1fr))',
                gap: '8px',
                marginBottom: '18px',
              }}
            >
              {Array.from({ length: seatCount }, (_, idx) => idx + 1).map((seatNum) => {
                const isTaken = takenSeats.includes(seatNum);
                const isSelected = Number(selectedSeat) === seatNum;
                return (
                  <button
                    key={seatNum}
                    type="button"
                    disabled={isTaken}
                    onClick={() => setSelectedSeat(seatNum)}
                    style={{
                      padding: '10px 6px',
                      borderRadius: '8px',
                      border: isSelected ? '2px solid var(--primary)' : '1px solid #cbd5e1',
                      background: isTaken ? '#e2e8f0' : isSelected ? '#eef2ff' : '#ffffff',
                      color: isTaken ? '#94a3b8' : '#0f172a',
                      fontWeight: 700,
                      cursor: isTaken ? 'not-allowed' : 'pointer',
                    }}
                  >
                    #{seatNum}
                  </button>
                );
              })}
            </div>

            <button
              type="submit"
              className="btn-primary btn-auto"
              disabled={bookingLoading}
            >
              {bookingLoading ? 'Booking...' : `Reserve Seat #${selectedSeat}`}
            </button>
          </form>
        </div>
      )}

      <div className="table-header-bar" style={{ marginBottom: '12px' }}>
        <h2 className="section-title" style={{ marginBottom: 0 }}>
          Available Schedules ({horaires.length})
        </h2>
        <button
          type="button"
          className="action-link-edit"
          onClick={() => loadHoraires(departId, arriveeId)}
        >
          <RefreshCw size={14} style={{ verticalAlign: 'middle' }} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="card">Loading schedules...</div>
      ) : (
        <div className="trips-grid">
          {horaires.map((h) => (
            <div className="card" key={h.id}>
              <div className="card-header">
                <span className="badge-success">
                  {h.statut} • {h.type}
                </span>
                <span className="price-tag">{h.tarif} TND</span>
              </div>
              <div className="route-display">
                <span>{h.depart}</span>
                <span className="route-arrow">{'->'}</span>
                <span>{h.arrivee}</span>
              </div>
              <div className="trip-meta">
                <p>
                  Line: <strong>{h.ligne}</strong>
                </p>
                <p>
                  Departure: <strong>{formatDateTime(h.date_depart)}</strong>
                </p>
                <p>
                  Free Seats: <strong>{h.places_libres}</strong>
                </p>
              </div>
              <button
                type="button"
                className="btn-dark"
                disabled={h.statut !== 'planifie' || Number(h.places_libres) <= 0}
                onClick={() => handleOpenBooking(h)}
              >
                {h.statut !== 'planifie'
                  ? `Status: ${h.statut}`
                  : Number(h.places_libres) <= 0
                    ? 'Full'
                    : 'Select Seat & Reserve'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PassagerReservationsView({ token }) {
  const [reservations, setReservations] = useState([]);
  const [ticketsByResId, setTicketsByResId] = useState({});
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const loadReservations = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await apiRequest('/reservations', { token });
      setReservations(Array.isArray(data) ? data : []);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  const handleFetchQr = async (reservationId) => {
    setErrorMsg('');
    try {
      const data = await apiRequest(`/billets/${reservationId}`, { token });
      setTicketsByResId((prev) => ({ ...prev, [reservationId]: data }));
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleChangeSeat = async (resItem) => {
    const input = window.prompt(
      `Enter new seat number for reservation #${resItem.id} (current: #${resItem.numero_place}):`,
      String(resItem.numero_place)
    );
    if (!input) return;
    const seatNum = Number(input);
    if (!Number.isInteger(seatNum) || seatNum < 1) {
      alert('Please enter a valid seat number.');
      return;
    }

    setErrorMsg('');
    try {
      await apiRequest(`/reservations/${resItem.id}`, {
        method: 'PUT',
        token,
        body: { numero_place: seatNum },
      });
      await loadReservations();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleCancelReservation = async (reservationId) => {
    setErrorMsg('');
    try {
      await apiRequest(`/reservations/${reservationId}`, {
        method: 'DELETE',
        token,
      });
      await loadReservations();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div>
      <div className="table-header-bar" style={{ marginBottom: '16px' }}>
        <h2 className="section-title" style={{ marginBottom: 0 }}>
          My Reservations & QR Tickets ({reservations.length})
        </h2>
        <button type="button" className="action-link-edit" onClick={loadReservations}>
          <RefreshCw size={14} style={{ verticalAlign: 'middle' }} /> Refresh
        </button>
      </div>

      {errorMsg && (
        <div className="card" style={{ marginBottom: '16px', color: '#991b1b' }}>
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="card">Loading reservations...</div>
      ) : reservations.length === 0 ? (
        <div className="card">No reservations found yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {reservations.map((r) => {
            const billet = ticketsByResId[r.id];
            const isConfirmed = r.statut === 'confirmee';

            return (
              <div className="card ticket-card" key={r.id}>
                <div className="qr-box" style={{ height: 'auto', width: 'auto', padding: '10px' }}>
                  {billet?.image ? (
                    <>
                      <img
                        src={billet.image}
                        alt={`QR code for reservation ${r.id}`}
                        style={{ width: '116px', height: '116px', borderRadius: '8px' }}
                      />
                      <span>{billet.utilise ? 'Used' : 'Ready to Scan'}</span>
                    </>
                  ) : (
                    <div style={{ padding: '14px', textAlign: 'center', maxWidth: '125px' }}>
                      <QrCode size={38} />
                      <span style={{ display: 'block', marginTop: '6px' }}>
                        {isConfirmed ? 'Click Get QR' : `Status: ${r.statut}`}
                      </span>
                    </div>
                  )}
                </div>

                <div className="ticket-info">
                  <div className="card-header">
                    <span className={isConfirmed ? 'badge-success' : 'badge-primary'}>
                      {r.statut}
                    </span>
                    <span className="ticket-ref">RES #{r.id}</span>
                  </div>

                  <h3 className="ticket-route-title">
                    {r.depart} {'->'} {r.arrivee} ({r.ligne})
                  </h3>
                  <p className="ticket-date">
                    Departure: <strong>{formatDateTime(r.date_depart)}</strong> • Fare:{' '}
                    <strong>{r.tarif} TND</strong>
                  </p>

                  <div className="ticket-divider">
                    <div>
                      <span className="label-small">Seat</span>
                      <strong>#{r.numero_place}</strong>
                    </div>
                    <div>
                      <span className="label-small">Schedule ID</span>
                      <strong>#{r.horaire_id}</strong>
                    </div>
                  </div>

                  {isConfirmed && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '14px' }}>
                      <button
                        type="button"
                        className="btn-primary btn-auto"
                        onClick={() => handleFetchQr(r.id)}
                      >
                        Get QR Ticket
                      </button>
                      <button
                        type="button"
                        className="btn-dark btn-auto"
                        onClick={() => handleChangeSeat(r)}
                      >
                        Change Seat
                      </button>
                      <button
                        type="button"
                        className="btn-logout"
                        onClick={() => handleCancelReservation(r.id)}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PassagerProfileView({ currentUser, token }) {
  return (
    <div className="card" style={{ maxWidth: '640px', margin: '0 auto' }}>
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="brand-icon">
            <User size={24} />
          </div>
          <div>
            <h2 className="section-title" style={{ marginBottom: '2px' }}>
              {currentUser?.fullName || 'Passenger Account'}
            </h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {currentUser?.email}
            </span>
          </div>
        </div>
        <span className="badge-success">{currentUser?.role || 'passager'}</span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
          marginTop: '16px',
        }}
      >
        <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
          <span className="label-small">User ID</span>
          <strong>{currentUser?.id ?? '-'}</strong>
        </div>
        <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
          <span className="label-small">JWT Session</span>
          <strong>{token ? 'Active (2h)' : 'Inactive'}</strong>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Chauffeur Views                                                         */
/* -------------------------------------------------------------------------- */
function ChauffeurScannerView({ token }) {
  const [code, setCode] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleScan = async (e) => {
    e.preventDefault();
    setLoading(true);
    setScanResult(null);
    try {
      const data = await apiRequest('/billets/scan', {
        method: 'POST',
        token,
        body: { code: code.trim() },
      });
      setScanResult({
        ok: true,
        message: `Valid Ticket! Passenger: ${data.passager} • Schedule #${data.horaire_id} • Seat #${data.numero_place}`,
      });
      setCode('');
    } catch (err) {
      setScanResult({
        ok: false,
        message: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="scanner-container">
      <div className="card">
        <h2 className="section-title">QR Ticket Boarding Validator</h2>
        <p className="scanner-subtitle">
          Paste or scan the QR code text from a passenger ticket to validate boarding.
        </p>

        <form onSubmit={handleScan} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Paste QR code (e.g., RES1.HOR4.PL5....)"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            style={{
              flex: 1,
              minWidth: '220px',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
            }}
            required
          />
          <button type="submit" className="btn-primary btn-auto" disabled={loading}>
            {loading ? 'Verifying...' : 'Validate Ticket'}
          </button>
        </form>

        {scanResult && (
          <div
            style={{
              marginTop: '14px',
              padding: '12px',
              borderRadius: '8px',
              background: scanResult.ok ? '#ecfdf5' : '#fef2f2',
              color: scanResult.ok ? '#065f46' : '#991b1b',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.9rem',
              fontWeight: 600,
            }}
          >
            {scanResult.ok ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{scanResult.message}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ChauffeurHorairesView({ token }) {
  const [horaires, setHoraires] = useState([]);
  const [selectedHoraireId, setSelectedHoraireId] = useState('');
  const [passengers, setPassengers] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    apiRequest('/horaires')
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setHoraires(list);
        if (list[0]) {
          setSelectedHoraireId(String(list[0].id));
        }
      })
      .catch((err) => setErrorMsg(err.message));
  }, []);

  useEffect(() => {
    if (!selectedHoraireId) return;
    setErrorMsg('');
    apiRequest(`/admin/horaires/${selectedHoraireId}/passagers`, { token })
      .then((data) => setPassengers(Array.isArray(data) ? data : []))
      .catch((err) => setErrorMsg(err.message));
  }, [selectedHoraireId, token]);

  return (
    <div className="card">
      <div className="table-header-bar">
        <h2 className="section-title">Schedules & Confirmed Passengers</h2>
        <select
          value={selectedHoraireId}
          onChange={(e) => setSelectedHoraireId(e.target.value)}
          style={{ width: 'auto' }}
        >
          {horaires.map((h) => (
            <option key={h.id} value={h.id}>
              #{h.id} • {h.depart} {'->'} {h.arrivee} ({formatDateTime(h.date_depart)})
            </option>
          ))}
        </select>
      </div>

      {errorMsg && <p style={{ color: '#dc2626' }}>{errorMsg}</p>}

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Seat</th>
              <th>Passenger</th>
              <th>Phone</th>
              <th>Boarded</th>
            </tr>
          </thead>
          <tbody>
            {passengers.map((p) => (
              <tr key={p.reservation_id}>
                <td className="font-mono-bold">#{p.numero_place}</td>
                <td className="font-bold">
                  {p.prenom} {p.nom}
                </td>
                <td>{p.telephone || '-'}</td>
                <td>{p.embarque ? 'Yes' : 'No'}</td>
              </tr>
            ))}
            {passengers.length === 0 && (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  No confirmed passengers for this schedule.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Administrateur Views                                                    */
/* -------------------------------------------------------------------------- */
function AdminHorairesLignesView({ token }) {
  const [stations, setStations] = useState([]);
  const [lignes, setLignes] = useState([]);
  const [vehicules, setVehicules] = useState([]);
  const [horaires, setHoraires] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  const [ligneCode, setLigneCode] = useState('');
  const [ligneType, setLigneType] = useState('bus');
  const [stationDep, setStationDep] = useState('');
  const [stationArr, setStationArr] = useState('');
  const [tarif, setTarif] = useState('15.00');
  const [distanceKm, setDistanceKm] = useState('');

  const [horaireLigneId, setHoraireLigneId] = useState('');
  const [horaireVehiculeId, setHoraireVehiculeId] = useState('');
  const [dateDepart, setDateDepart] = useState(() => toDatetimeLocalValue(new Date()));
  const [dateArrivee, setDateArrivee] = useState(() =>
    toDatetimeLocalValue(new Date(Date.now() + 2 * 3600 * 1000))
  );

  const loadAll = useCallback(async () => {
    setErrorMsg('');
    try {
      const [st, lg, vh, hr] = await Promise.all([
        apiRequest('/stations'),
        apiRequest('/lignes'),
        apiRequest('/vehicules', { token }),
        apiRequest('/horaires'),
      ]);
      const stList = Array.isArray(st) ? st : [];
      const lgList = Array.isArray(lg) ? lg : [];
      const vhList = Array.isArray(vh) ? vh : [];
      const hrList = Array.isArray(hr) ? hr : [];

      setStations(stList);
      setLignes(lgList);
      setVehicules(vhList);
      setHoraires(hrList);

      if (stList.length >= 2) {
        setStationDep((prev) => prev || String(stList[0].id));
        setStationArr((prev) => prev || String(stList[1].id));
      }
      if (lgList[0]) {
        setHoraireLigneId((prev) => prev || String(lgList[0].id));
      }
      if (vhList[0]) {
        setHoraireVehiculeId((prev) => prev || String(vhList[0].id));
      }
    } catch (err) {
      setErrorMsg(err.message);
    }
  }, [token]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleCreateLigne = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await apiRequest('/lignes', {
        method: 'POST',
        token,
        body: {
          code: ligneCode.trim(),
          type: ligneType,
          station_depart_id: Number(stationDep),
          station_arrivee_id: Number(stationArr),
          tarif: Number(tarif),
          distance_km: distanceKm ? Number(distanceKm) : null,
        },
      });
      setLigneCode('');
      setDistanceKm('');
      await loadAll();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteLigne = async (id) => {
    setErrorMsg('');
    try {
      await apiRequest(`/lignes/${id}`, { method: 'DELETE', token });
      await loadAll();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleCreateHoraire = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await apiRequest('/horaires', {
        method: 'POST',
        token,
        body: {
          ligne_id: Number(horaireLigneId),
          vehicule_id: Number(horaireVehiculeId),
          date_depart: new Date(dateDepart).toISOString(),
          date_arrivee: new Date(dateArrivee).toISOString(),
        },
      });
      await loadAll();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleCancelHoraire = async (id) => {
    setErrorMsg('');
    try {
      await apiRequest(`/horaires/${id}`, {
        method: 'PUT',
        token,
        body: { statut: 'annule' },
      });
      await loadAll();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteHoraire = async (id) => {
    setErrorMsg('');
    try {
      await apiRequest(`/horaires/${id}`, { method: 'DELETE', token });
      await loadAll();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div>
      {errorMsg && (
        <div className="card" style={{ marginBottom: '16px', color: '#991b1b', fontWeight: 600 }}>
          {errorMsg}
        </div>
      )}

      <div className="card" style={{ marginBottom: '24px' }}>
        <h2 className="section-title">Create New Line (/lignes)</h2>
        <form
          onSubmit={handleCreateLigne}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '12px',
            alignItems: 'end',
          }}
        >
          <div className="input-group">
            <label>Line Code</label>
            <input
              type="text"
              placeholder="e.g., TN-SO-01"
              value={ligneCode}
              onChange={(e) => setLigneCode(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label>Type</label>
            <select value={ligneType} onChange={(e) => setLigneType(e.target.value)}>
              <option value="bus">bus</option>
              <option value="train">train</option>
              <option value="louage">louage</option>
            </select>
          </div>
          <div className="input-group">
            <label>Departure Station</label>
            <select value={stationDep} onChange={(e) => setStationDep(e.target.value)}>
              {stations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nom}
                </option>
              ))}
            </select>
          </div>
          <div className="input-group">
            <label>Arrival Station</label>
            <select value={stationArr} onChange={(e) => setStationArr(e.target.value)}>
              {stations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nom}
                </option>
              ))}
            </select>
          </div>
          <div className="input-group">
            <label>Fare (TND)</label>
            <input
              type="number"
              step="0.01"
              value={tarif}
              onChange={(e) => setTarif(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label>Distance (km)</label>
            <input
              type="number"
              step="0.1"
              placeholder="optional"
              value={distanceKm}
              onChange={(e) => setDistanceKm(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary">
            <PlusCircle size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            Add Line
          </button>
        </form>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <h2 className="section-title">Publish Schedule (/horaires)</h2>
        <form
          onSubmit={handleCreateHoraire}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            alignItems: 'end',
          }}
        >
          <div className="input-group">
            <label>Line</label>
            <select value={horaireLigneId} onChange={(e) => setHoraireLigneId(e.target.value)}>
              {lignes.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.code} ({l.depart} {'->'} {l.arrivee}, {l.type})
                </option>
              ))}
            </select>
          </div>
          <div className="input-group">
            <label>Active Vehicle (Matching Type)</label>
            <select
              value={horaireVehiculeId}
              onChange={(e) => setHoraireVehiculeId(e.target.value)}
            >
              {vehicules.map((v) => (
                <option key={v.id} value={v.id}>
                  #{v.id} • {v.immatriculation} ({v.type}, {v.statut}, {v.capacite} pl.)
                </option>
              ))}
            </select>
          </div>
          <div className="input-group">
            <label>Departure Date & Time</label>
            <input
              type="datetime-local"
              value={dateDepart}
              onChange={(e) => setDateDepart(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label>Arrival Date & Time</label>
            <input
              type="datetime-local"
              value={dateArrivee}
              onChange={(e) => setDateArrivee(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary">
            Publish Schedule
          </button>
        </form>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <h2 className="section-title">Lines ({lignes.length})</h2>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Code</th>
                <th>Type</th>
                <th>Route</th>
                <th>Fare</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((l) => (
                <tr key={l.id}>
                  <td>#{l.id}</td>
                  <td className="font-mono-bold">{l.code}</td>
                  <td>{l.type}</td>
                  <td className="font-bold">
                    {l.depart} {'->'} {l.arrivee}
                  </td>
                  <td>{l.tarif} TND</td>
                  <td className="text-right">
                    <button
                      type="button"
                      onClick={() => handleDeleteLigne(l.id)}
                      className="action-link-edit"
                      style={{ color: '#dc2626' }}
                    >
                      <Trash2 size={14} style={{ verticalAlign: 'middle' }} /> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">Schedules ({horaires.length})</h2>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Line & Route</th>
                <th>Departure</th>
                <th>Free Seats</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {horaires.map((h) => (
                <tr key={h.id}>
                  <td>#{h.id}</td>
                  <td className="font-bold">
                    {h.ligne} • {h.depart} {'->'} {h.arrivee}
                  </td>
                  <td>{formatDateTime(h.date_depart)}</td>
                  <td>{h.places_libres}</td>
                  <td>
                    <span className={h.statut === 'planifie' ? 'badge-success' : 'badge-primary'}>
                      {h.statut}
                    </span>
                  </td>
                  <td className="text-right" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    {h.statut !== 'annule' && (
                      <button
                        type="button"
                        onClick={() => handleCancelHoraire(h.id)}
                        className="action-link-edit"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteHoraire(h.id)}
                      className="action-link-edit"
                      style={{ color: '#dc2626' }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminVehiculesView({ token }) {
  const [vehicules, setVehicules] = useState([]);
  const [immatriculation, setImmatriculation] = useState('');
  const [type, setType] = useState('bus');
  const [numero, setNumero] = useState('');
  const [capacite, setCapacite] = useState('50');
  const [errorMsg, setErrorMsg] = useState('');

  const loadVehicules = useCallback(async () => {
    setErrorMsg('');
    try {
      const data = await apiRequest('/vehicules', { token });
      setVehicules(Array.isArray(data) ? data : []);
    } catch (err) {
      setErrorMsg(err.message);
    }
  }, [token]);

  useEffect(() => {
    loadVehicules();
  }, [loadVehicules]);

  const handleAddVehicule = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await apiRequest('/vehicules', {
        method: 'POST',
        token,
        body: {
          immatriculation: immatriculation.trim(),
          type,
          numero: numero.trim() || undefined,
          capacite: Number(capacite),
        },
      });
      setImmatriculation('');
      setNumero('');
      await loadVehicules();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleToggleStatut = async (v) => {
    const nextStatut = v.statut === 'actif' ? 'maintenance' : 'actif';
    setErrorMsg('');
    try {
      await apiRequest(`/vehicules/${v.id}`, {
        method: 'PUT',
        token,
        body: {
          immatriculation: v.immatriculation,
          type: v.type,
          numero: v.numero || null,
          capacite: Number(v.capacite),
          statut: nextStatut,
        },
      });
      await loadVehicules();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteVehicule = async (id) => {
    setErrorMsg('');
    try {
      await apiRequest(`/vehicules/${id}`, { method: 'DELETE', token });
      await loadVehicules();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div>
      {errorMsg && (
        <div className="card" style={{ marginBottom: '16px', color: '#991b1b', fontWeight: 600 }}>
          {errorMsg}
        </div>
      )}

      <div className="card" style={{ marginBottom: '24px' }}>
        <h2 className="section-title">Add Vehicle (/vehicules)</h2>
        <form
          onSubmit={handleAddVehicule}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: '12px',
            alignItems: 'end',
          }}
        >
          <div className="input-group">
            <label>Plate Number</label>
            <input
              type="text"
              placeholder="123 TU 4567"
              value={immatriculation}
              onChange={(e) => setImmatriculation(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label>Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="bus">bus</option>
              <option value="train">train</option>
              <option value="louage">louage</option>
            </select>
          </div>
          <div className="input-group">
            <label>Number (Optional)</label>
            <input
              type="text"
              placeholder="B01"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
            />
          </div>
          <div className="input-group">
            <label>Capacity</label>
            <input
              type="number"
              min="1"
              value={capacite}
              onChange={(e) => setCapacite(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary">
            + Add Vehicle
          </button>
        </form>
      </div>

      <div className="card">
        <h2 className="section-title">Vehicles ({vehicules.length})</h2>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Plate</th>
                <th>Type</th>
                <th>Number</th>
                <th>Capacity</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {vehicules.map((v) => (
                <tr key={v.id}>
                  <td>#{v.id}</td>
                  <td className="font-mono-bold">{v.immatriculation}</td>
                  <td>{v.type}</td>
                  <td>{v.numero || '-'}</td>
                  <td>{v.capacite}</td>
                  <td>
                    <span className={v.statut === 'actif' ? 'badge-success' : 'badge-primary'}>
                      {v.statut}
                    </span>
                  </td>
                  <td className="text-right" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => handleToggleStatut(v)}
                      className="action-link-edit"
                    >
                      {v.statut === 'actif' ? 'Set Maintenance' : 'Set Active'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteVehicule(v.id)}
                      className="action-link-edit"
                      style={{ color: '#dc2626' }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminStatsView({ token }) {
  const [stats, setStats] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    apiRequest('/admin/statistiques', { token })
      .then((data) => setStats(data))
      .catch((err) => setErrorMsg(err.message));
  }, [token]);

  if (errorMsg) {
    return <div className="card" style={{ color: '#991b1b' }}>{errorMsg}</div>;
  }

  if (!stats) {
    return <div className="card">Loading statistics...</div>;
  }

  return (
    <div>
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="card">
          <span className="label-small">TOTAL RESERVATIONS</span>
          <div className="stat-value">{stats.reservations?.total ?? 0}</div>
          <span className="stat-trend">
            Confirmed: {stats.reservations?.confirmees ?? 0} • Cancelled:{' '}
            {stats.reservations?.annulees ?? 0}
          </span>
        </div>
        <div className="card">
          <span className="label-small">CANCELLATION RATE</span>
          <div className="stat-value">{stats.reservations?.taux_annulation ?? 0}%</div>
          <span className="stat-trend-primary">From /admin/statistiques</span>
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">By Line</h2>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Line Code</th>
                <th>Trips</th>
                <th>Confirmed</th>
                <th>Cancelled</th>
              </tr>
            </thead>
            <tbody>
              {(stats.par_ligne || []).map((row) => (
                <tr key={row.code}>
                  <td className="font-mono-bold">{row.code}</td>
                  <td>{row.trajets}</td>
                  <td>{row.confirmees}</td>
                  <td>{row.annulees}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}