import React, { useState, useEffect, useMemo } from 'react';
import {
  Bus,
  QrCode,
  Trash2,
  PlusCircle,
  ShieldCheck,
  MapPin,
  Gauge,
  Wallet,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import LoginView from './components/LoginView';
import './App.css';

const TUNISIAN_DEPOTS = [
  'Tunis Central Depot (Bab Saadoun)',
  'Sousse Regional Hub',
  'Sfax South Base',
  'Bizerte North Depot',
  'Nabeul Cap Bon Base',
  'Monastir Coastal Depot',
];

const FALLBACK_BUS_IMAGE =
  'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80';

const DEFAULT_TRIPS = [
  {
    id: 'TR-101',
    departure: 'Tunis',
    arrival: 'Sousse',
    time: '08:30 AM',
    price: '25.00',
    busId: 'BUS-04',
    driver: 'Karim Mansouri',
    status: 'On Time',
  },
  {
    id: 'TR-102',
    departure: 'Tunis',
    arrival: 'Sfax',
    time: '11:00 AM',
    price: '32.50',
    busId: 'BUS-09',
    driver: 'Sami Trabelsi',
    status: 'On Time',
  },
];

const DEFAULT_FLEET = [
  {
    id: 'BUS-04',
    plateNumber: '198 TN 3421',
    model: 'Mercedes Tourismo',
    capacity: 50,
    departmentBase: 'Tunis Central Depot (Bab Saadoun)',
    mileage: '142,500 km',
    imageUrl:
      'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80',
    checkup: 'Routine Brake & Tire Check',
    status: 'Operational',
  },
  {
    id: 'BUS-07',
    plateNumber: '205 TN 8810',
    model: 'Volvo 9700',
    capacity: 54,
    departmentBase: 'Sousse Regional Hub',
    mileage: '198,200 km',
    imageUrl:
      'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=800&q=80',
    checkup: 'Engine Oil & AC Filter Replacement',
    status: 'In Workshop',
  },
  {
    id: 'BUS-09',
    plateNumber: '214 TN 1194',
    model: 'Volvo MultiAxle',
    capacity: 52,
    departmentBase: 'Sfax South Base',
    mileage: '89,400 km',
    imageUrl:
      'https://images.unsplash.com/photo-1557223562-6c77ef16210f?auto=format&fit=crop&w=800&q=80',
    checkup: 'Passed Monthly Safety Inspection',
    status: 'Operational',
  },
  {
    id: 'BUS-02',
    plateNumber: '189 TN 7723',
    model: 'Irizar i6',
    capacity: 48,
    departmentBase: 'Bizerte North Depot',
    mileage: '165,000 km',
    imageUrl:
      'https://images.unsplash.com/photo-1509749837427-ac94a2553d0e?auto=format&fit=crop&w=800&q=80',
    checkup: 'Suspension & Alignment Review',
    status: 'Operational',
  },
];

const SEAT_OPTIONS = [
  '01A', '01B', '01C', '01D',
  '02A', '02B', '02C', '02D',
  '03A', '03B', '03C', '03D',
  '04A', '04B', '04C', '04D',
  '05A', '05B', '05C', '05D',
  '06A', '06B', '06C', '06D',
];

/* -------------------------------------------------------------------------- */
/* Deterministic QR-style SVG Matrix Generator (Zero extra packages needed)   */
/* -------------------------------------------------------------------------- */
function TicketQrCode({ payload, size = 112 }) {
  const gridSize = 21;

  const matrix = useMemo(() => {
    let hash = 2166136261;
    for (let i = 0; i < payload.length; i += 1) {
      hash ^= payload.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }

    const cells = Array.from({ length: gridSize }, () =>
      Array.from({ length: gridSize }, () => false)
    );

    const drawFinder = (r0, c0) => {
      for (let r = 0; r < 7; r += 1) {
        for (let c = 0; c < 7; c += 1) {
          const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
          const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          cells[r0 + r][c0 + c] = isBorder || isCenter;
        }
      }
    };

    drawFinder(0, 0);
    drawFinder(0, gridSize - 7);
    drawFinder(gridSize - 7, 0);

    let seed = Math.abs(hash) || 1;
    for (let r = 0; r < gridSize; r += 1) {
      for (let c = 0; c < gridSize; c += 1) {
        const inTopLeft = r < 8 && c < 8;
        const inTopRight = r < 8 && c >= gridSize - 8;
        const inBottomLeft = r >= gridSize - 8 && c < 8;
        if (inTopLeft || inTopRight || inBottomLeft) continue;

        seed = (seed * 1664525 + 1013904223) % 4294967296;
        cells[r][c] = (seed >>> 24) % 2 === 0;
      }
    }

    return cells;
  }, [payload]);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${gridSize} ${gridSize}`}
      style={{
        background: '#ffffff',
        padding: '6px',
        borderRadius: '8px',
        border: '1px solid #cbd5e1',
      }}
      aria-label={`QR Code for ${payload}`}
    >
      {matrix.map((row, r) =>
        row.map((filled, c) =>
          filled ? <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#0f172a" /> : null
        )
      )}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Helper: Format Remaining Deadline                                          */
/* -------------------------------------------------------------------------- */
function formatCountdown(deadlineIso, nowMs) {
  const diffMs = new Date(deadlineIso).getTime() - nowMs;
  if (diffMs <= 0) return 'Expired';
  const totalSeconds = Math.floor(diffMs / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState('client');
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState('client-search');

  const [trips, setTrips] = useState(() => {
    return JSON.parse(localStorage.getItem('agetrap_trips')) || DEFAULT_TRIPS;
  });

  const [fleet, setFleet] = useState(() => {
    const saved = JSON.parse(localStorage.getItem('agetrap_fleet'));
    if (saved && Array.isArray(saved)) {
      return saved.map((b) => ({
        plateNumber: '200 TN 0000',
        departmentBase: TUNISIAN_DEPOTS[0],
        mileage: '120,000 km',
        imageUrl: FALLBACK_BUS_IMAGE,
        ...b,
      }));
    }
    return DEFAULT_FLEET;
  });

  // Client Wallet Balance stored per user email in localStorage
  const [wallets, setWallets] = useState(() => {
    return JSON.parse(localStorage.getItem('agetrap_wallets')) || {};
  });

  // Client Bookings / Tickets stored in localStorage
  const [bookings, setBookings] = useState(() => {
    return JSON.parse(localStorage.getItem('agetrap_bookings')) || [];
  });

  useEffect(() => {
    localStorage.setItem('agetrap_trips', JSON.stringify(trips));
  }, [trips]);

  useEffect(() => {
    localStorage.setItem('agetrap_fleet', JSON.stringify(fleet));
  }, [fleet]);

  useEffect(() => {
    localStorage.setItem('agetrap_wallets', JSON.stringify(wallets));
  }, [wallets]);

  useEffect(() => {
    localStorage.setItem('agetrap_bookings', JSON.stringify(bookings));
  }, [bookings]);

  const userKey = currentUser?.email?.toLowerCase() || 'guest@agetrap.tn';
  const currentBalance = Number(wallets[userKey] ?? 60.0); // Starter balance: 60.00 TND for demo

  const updateBalance = (newAmount) => {
    const safeAmount = Math.max(0, Number(newAmount.toFixed(2)));
    setWallets((prev) => ({
      ...prev,
      [userKey]: safeAmount,
    }));
  };

  const handleLoginSuccess = (role, userObj) => {
    setUserRole(role);
    setCurrentUser(userObj);
    setIsLoggedIn(true);

    // Initialize default balance if user hasn't had a wallet entry yet
    const key = userObj?.email?.toLowerCase() || 'guest@agetrap.tn';
    setWallets((prev) => {
      if (prev[key] !== undefined) return prev;
      return { ...prev, [key]: 60.0 };
    });

    if (role === 'admin') {
      setCurrentView('admin-trips');
    } else if (role === 'client') {
      setCurrentView('client-search');
    } else if (role === 'driver') {
      setCurrentView('driver-dashboard');
    } else if (role === 'technician') {
      setCurrentView('tech-maintenance');
    }
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
                {userRole === 'admin' && 'Admin Control Center'}
                {userRole === 'client' && `Passenger Portal • ${currentBalance.toFixed(2)} TND`}
                {userRole === 'driver' && 'Driver Operations'}
                {userRole === 'technician' && 'Fleet Maintenance'}
              </span>
            </div>
          </div>

          <nav className="nav-links">
            {userRole === 'admin' && (
              <>
                <button
                  onClick={() => setCurrentView('admin-trips')}
                  className={`nav-btn ${currentView === 'admin-trips' ? 'active' : ''}`}
                >
                  Routes & Schedules
                </button>
                <button
                  onClick={() => setCurrentView('admin-fleet')}
                  className={`nav-btn ${currentView === 'admin-fleet' ? 'active' : ''}`}
                >
                  Fleet & Depots
                </button>
                <button
                  onClick={() => setCurrentView('admin-users')}
                  className={`nav-btn ${currentView === 'admin-users' ? 'active' : ''}`}
                >
                  Users & Roles
                </button>
              </>
            )}

            {userRole === 'client' && (
              <>
                <button
                  onClick={() => setCurrentView('client-search')}
                  className={`nav-btn ${currentView === 'client-search' ? 'active' : ''}`}
                >
                  Search & Book
                </button>
                <button
                  onClick={() => setCurrentView('client-tickets')}
                  className={`nav-btn ${currentView === 'client-tickets' ? 'active' : ''}`}
                >
                  My Tickets & QR ({bookings.filter((b) => b.userEmail === userKey).length})
                </button>
                <button
                  onClick={() => setCurrentView('client-wallet')}
                  className={`nav-btn ${currentView === 'client-wallet' ? 'active' : ''}`}
                >
                  Balance ({currentBalance.toFixed(2)} TND)
                </button>
                <button
                  onClick={() => setCurrentView('client-profile')}
                  className={`nav-btn ${currentView === 'client-profile' ? 'active' : ''}`}
                >
                  Profile
                </button>
              </>
            )}

            {userRole === 'driver' && (
              <>
                <button
                  onClick={() => setCurrentView('driver-dashboard')}
                  className={`nav-btn ${currentView === 'driver-dashboard' ? 'active' : ''}`}
                >
                  My Assigned Trips
                </button>
                <button
                  onClick={() => setCurrentView('driver-scanner')}
                  className={`nav-btn ${currentView === 'driver-scanner' ? 'active' : ''}`}
                >
                  QR Boarding Scanner
                </button>
              </>
            )}

            {userRole === 'technician' && (
              <button
                onClick={() => setCurrentView('tech-maintenance')}
                className={`nav-btn ${currentView === 'tech-maintenance' ? 'active' : ''}`}
              >
                Vehicle Diagnostics & Repairs
              </button>
            )}
          </nav>

          <button onClick={() => setIsLoggedIn(false)} className="btn-logout">
            Log Out
          </button>
        </div>
      </header>

      <main className="main-content">
        {currentView === 'admin-trips' && (
          <AdminTripsView trips={trips} setTrips={setTrips} fleet={fleet} />
        )}
        {currentView === 'admin-fleet' && (
          <AdminFleetView fleet={fleet} setFleet={setFleet} />
        )}
        {currentView === 'admin-users' && <AdminUsersView />}

        {currentView === 'client-search' && (
          <ClientSearchView
            trips={trips}
            fleet={fleet}
            currentUser={currentUser}
            userKey={userKey}
            balance={currentBalance}
            updateBalance={updateBalance}
            bookings={bookings}
            setBookings={setBookings}
            onGoToTickets={() => setCurrentView('client-tickets')}
          />
        )}
        {currentView === 'client-tickets' && (
          <ClientTicketsView
            currentUser={currentUser}
            userKey={userKey}
            balance={currentBalance}
            updateBalance={updateBalance}
            bookings={bookings}
            setBookings={setBookings}
          />
        )}
        {currentView === 'client-wallet' && (
          <ClientWalletView
            balance={currentBalance}
            updateBalance={updateBalance}
            bookings={bookings.filter((b) => b.userEmail === userKey)}
          />
        )}
        {currentView === 'client-profile' && (
          <ClientProfileView
            currentUser={currentUser}
            balance={currentBalance}
            ticketCount={bookings.filter((b) => b.userEmail === userKey).length}
            onGoToWallet={() => setCurrentView('client-wallet')}
          />
        )}

        {currentView === 'driver-dashboard' && <DriverDashboardView trips={trips} />}
        {currentView === 'driver-scanner' && <DriverScannerView />}

        {currentView === 'tech-maintenance' && (
          <TechnicianMaintenanceView fleet={fleet} setFleet={setFleet} />
        )}
      </main>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 0. Admin Views                                                             */
/* -------------------------------------------------------------------------- */
function AdminTripsView({ trips, setTrips, fleet }) {
  const [departure, setDeparture] = useState('');
  const [arrival, setArrival] = useState('');
  const [time, setTime] = useState('09:00 AM');
  const [price, setPrice] = useState('20.00');
  const [busId, setBusId] = useState(fleet[0]?.id || 'BUS-04');
  const [driver, setDriver] = useState('');

  const registeredUsers = JSON.parse(localStorage.getItem('agetrap_users')) || [];
  const operationalBuses = fleet.filter((b) => b.status === 'Operational');

  const handleAddTrip = (e) => {
    e.preventDefault();
    const newTrip = {
      id: `TR-${Math.floor(100 + Math.random() * 900)}`,
      departure,
      arrival,
      time,
      price,
      busId,
      driver: driver || 'Assigned Driver',
      status: 'On Time',
    };
    setTrips([...trips, newTrip]);
    setDeparture('');
    setArrival('');
    setDriver('');
  };

  const handleDeleteTrip = (id) => {
    setTrips(trips.filter((t) => t.id !== id));
  };

  return (
    <div>
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="card">
          <span className="label-small">SCHEDULED TRIPS</span>
          <div className="stat-value">{trips.length} Routes</div>
          <span className="stat-trend">Active across Tunisia</span>
        </div>
        <div className="card">
          <span className="label-small">OPERATIONAL FLEET</span>
          <div className="stat-value">
            {operationalBuses.length} / {fleet.length} Buses
          </div>
          <span className="stat-trend">Ready for dispatch</span>
        </div>
        <div className="card">
          <span className="label-small">REGISTERED ACCOUNTS</span>
          <div className="stat-value">{registeredUsers.length} Users</div>
          <span className="stat-trend-primary">Clients, Drivers & Techs</span>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <h2 className="section-title">Schedule New Route & Assign Fleet</h2>
        <form
          onSubmit={handleAddTrip}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '12px',
            alignItems: 'end',
          }}
        >
          <div className="input-group">
            <label>Departure City</label>
            <input
              type="text"
              placeholder="e.g., Bizerte"
              value={departure}
              onChange={(e) => setDeparture(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label>Arrival City</label>
            <input
              type="text"
              placeholder="e.g., Tunis"
              value={arrival}
              onChange={(e) => setArrival(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label>Departure Time</label>
            <input
              type="text"
              placeholder="e.g., 02:30 PM"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label>Ticket Price (TND)</label>
            <input
              type="text"
              placeholder="15.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label>Assign Operational Bus</label>
            <select value={busId} onChange={(e) => setBusId(e.target.value)}>
              {operationalBuses.map((bus) => (
                <option key={bus.id} value={bus.id}>
                  {bus.id} - {bus.model} ({bus.departmentBase.split(' ')[0]} Base)
                </option>
              ))}
            </select>
          </div>
          <div className="input-group">
            <label>Driver Name</label>
            <input
              type="text"
              placeholder="e.g., Nizar Gharbi"
              value={driver}
              onChange={(e) => setDriver(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary">
            <PlusCircle size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            Publish Trip
          </button>
        </form>
      </div>

      <div className="card">
        <h2 className="section-title">Active Trips & Assignments</h2>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Trip ID</th>
                <th>Route</th>
                <th>Departure</th>
                <th>Bus</th>
                <th>Driver</th>
                <th>Price</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {trips.map((trip) => (
                <tr key={trip.id}>
                  <td className="font-mono-bold">{trip.id}</td>
                  <td className="font-bold">
                    {trip.departure} {'->'} {trip.arrival}
                  </td>
                  <td>{trip.time}</td>
                  <td>{trip.busId}</td>
                  <td>{trip.driver}</td>
                  <td>{trip.price} TND</td>
                  <td className="text-right">
                    <button
                      onClick={() => handleDeleteTrip(trip.id)}
                      className="action-link-edit"
                      style={{ color: '#dc2626' }}
                    >
                      <Trash2 size={15} style={{ verticalAlign: 'middle' }} /> Cancel
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

function AdminFleetView({ fleet, setFleet }) {
  const [newBusId, setNewBusId] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newCapacity, setNewCapacity] = useState('50');
  const [departmentBase, setDepartmentBase] = useState(TUNISIAN_DEPOTS[0]);
  const [mileage, setMileage] = useState('0 km');
  const [imageUrl, setImageUrl] = useState('');
  const [depotFilter, setDepotFilter] = useState('all');

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleAddBus = (e) => {
    e.preventDefault();
    if (fleet.some((b) => b.id.toUpperCase() === newBusId.toUpperCase())) {
      alert('A bus with this Fleet ID already exists.');
      return;
    }
    const newBus = {
      id: newBusId.toUpperCase(),
      plateNumber: plateNumber || '220 TN 1001',
      model: newModel,
      capacity: Number(newCapacity),
      departmentBase,
      mileage: mileage || '0 km',
      imageUrl: imageUrl.trim() || FALLBACK_BUS_IMAGE,
      checkup: 'Initial Commissioning Check Passed',
      status: 'Operational',
    };
    setFleet([...fleet, newBus]);
    setNewBusId('');
    setPlateNumber('');
    setNewModel('');
    setMileage('0 km');
    setImageUrl('');
  };

  const toggleBusStatus = (id) => {
    setFleet(
      fleet.map((bus) =>
        bus.id === id
          ? {
              ...bus,
              status: bus.status === 'Operational' ? 'In Workshop' : 'Operational',
            }
          : bus
      )
    );
  };

  const handleDepotReassign = (id, newBase) => {
    setFleet(
      fleet.map((bus) =>
        bus.id === id ? { ...bus, departmentBase: newBase } : bus
      )
    );
  };

  const handleDeleteBus = (id) => {
    setFleet(fleet.filter((bus) => bus.id !== id));
  };

  const filteredFleet =
    depotFilter === 'all'
      ? fleet
      : fleet.filter((bus) => bus.departmentBase === depotFilter);

  return (
    <div>
      <div className="card" style={{ marginBottom: '24px' }}>
        <h2 className="section-title">Register New Bus & Assign Department Base</h2>
        <form
          onSubmit={handleAddBus}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            alignItems: 'end',
          }}
        >
          <div className="input-group">
            <label>Bus Fleet ID</label>
            <input
              type="text"
              placeholder="e.g., BUS-12"
              value={newBusId}
              onChange={(e) => setNewBusId(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label>Tunisian License Plate</label>
            <input
              type="text"
              placeholder="e.g., 218 TN 4590"
              value={plateNumber}
              onChange={(e) => setPlateNumber(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label>Vehicle Model</label>
            <input
              type="text"
              placeholder="e.g., Mercedes Travego"
              value={newModel}
              onChange={(e) => setNewModel(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label>Department Base (Depot)</label>
            <select
              value={departmentBase}
              onChange={(e) => setDepartmentBase(e.target.value)}
            >
              {TUNISIAN_DEPOTS.map((depot) => (
                <option key={depot} value={depot}>
                  {depot}
                </option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label>Seat Capacity</label>
            <input
              type="number"
              min="15"
              max="70"
              value={newCapacity}
              onChange={(e) => setNewCapacity(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label>Current Mileage</label>
            <input
              type="text"
              placeholder="e.g., 45,000 km"
              value={mileage}
              onChange={(e) => setMileage(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>Bus Photo URL (optional)</label>
            <input
              type="url"
              placeholder="https://..."
              value={imageUrl.startsWith('data:') ? '' : imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>Or Upload Photo File</label>
            <input type="file" accept="image/*" onChange={handleImageFileChange} />
          </div>

          <button type="submit" className="btn-primary">
            + Add Bus to Fleet
          </button>
        </form>
      </div>

      <div className="table-header-bar" style={{ marginBottom: '16px' }}>
        <div>
          <h2 className="section-title" style={{ marginBottom: '2px' }}>
            Fleet Directory & Depot Allocation ({filteredFleet.length})
          </h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Inspect vehicle photos, reassign home bases, or toggle maintenance status
          </span>
        </div>

        <select
          value={depotFilter}
          onChange={(e) => setDepotFilter(e.target.value)}
          style={{ width: 'auto' }}
        >
          <option value="all">All Department Bases ({fleet.length})</option>
          {TUNISIAN_DEPOTS.map((depot) => (
            <option key={depot} value={depot}>
              {depot}
            </option>
          ))}
        </select>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
          gap: '20px',
        }}
      >
        {filteredFleet.map((bus) => (
          <div
            className="card"
            key={bus.id}
            style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ position: 'relative', height: '175px', background: '#e2e8f0' }}>
              <img
                src={bus.imageUrl || FALLBACK_BUS_IMAGE}
                alt={`${bus.id} ${bus.model}`}
                onError={(e) => {
                  e.currentTarget.src = FALLBACK_BUS_IMAGE;
                }}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              <span
                className={
                  bus.status === 'Operational' ? 'badge-success' : 'badge-primary'
                }
                style={{ position: 'absolute', top: '12px', right: '12px' }}
              >
                {bus.status}
              </span>
              <span
                style={{
                  position: 'absolute',
                  bottom: '10px',
                  left: '12px',
                  background: 'rgba(15, 23, 42, 0.82)',
                  color: '#fff',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                }}
              >
                {bus.id} • {bus.plateNumber}
              </span>
            </div>

            <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{bus.model}</h3>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.85rem',
                    color: 'var(--text-muted)',
                    marginTop: '4px',
                  }}
                >
                  <MapPin size={14} />
                  <span>{bus.departmentBase}</span>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.85rem',
                  padding: '8px 10px',
                  background: 'var(--bg-subtle, #f8fafc)',
                  borderRadius: '8px',
                }}
              >
                <span>
                  Capacity: <strong>{bus.capacity} seats</strong>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Gauge size={14} /> <strong>{bus.mileage}</strong>
                </span>
              </div>

              <div className="input-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.75rem' }}>Reassign Department Base</label>
                <select
                  value={bus.departmentBase}
                  onChange={(e) => handleDepotReassign(bus.id, e.target.value)}
                >
                  {TUNISIAN_DEPOTS.map((depot) => (
                    <option key={depot} value={depot}>
                      {depot}
                    </option>
                  ))}
                </select>
              </div>

              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                Last Note: <strong>{bus.checkup}</strong>
              </p>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 'auto',
                  paddingTop: '10px',
                  borderTop: '1px solid #e2e8f0',
                }}
              >
                <button
                  onClick={() => toggleBusStatus(bus.id)}
                  className="action-link-edit"
                >
                  {bus.status === 'Operational' ? 'Send to Workshop' : 'Mark Operational'}
                </button>
                <button
                  onClick={() => handleDeleteBus(bus.id)}
                  className="action-link-edit"
                  style={{ color: '#dc2626' }}
                >
                  <Trash2 size={14} style={{ verticalAlign: 'middle' }} /> Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminUsersView() {
  const [users, setUsers] = useState(() => {
    return JSON.parse(localStorage.getItem('agetrap_users')) || [];
  });
  const [roleFilter, setRoleFilter] = useState('all');

  const handleDeleteUser = (email) => {
    const updated = users.filter((u) => u.email !== email);
    setUsers(updated);
    localStorage.setItem('agetrap_users', JSON.stringify(updated));
  };

  const filteredUsers =
    roleFilter === 'all' ? users : users.filter((u) => u.role === roleFilter);

  return (
    <div className="card">
      <div className="table-header-bar">
        <div>
          <h2 className="section-title">Registered Accounts Directory</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Manage passengers, drivers, and maintenance technicians stored locally
          </p>
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{ width: 'auto' }}
        >
          <option value="all">All Roles ({users.length})</option>
          <option value="client">Clients</option>
          <option value="driver">Drivers</option>
          <option value="technician">Maintenance Technicians</option>
        </select>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Full Name</th>
              <th>Role</th>
              <th>CIN</th>
              <th>Location</th>
              <th>Email / Phone</th>
              <th className="text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="font-bold">
                <ShieldCheck size={15} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                AGETRAP Administrator
              </td>
              <td>
                <span className="badge-primary">admin (static)</span>
              </td>
              <td>-</td>
              <td>Headquarters</td>
              <td>admin@agetrap.tn</td>
              <td className="text-right" style={{ color: 'var(--text-muted)' }}>
                Protected
              </td>
            </tr>

            {filteredUsers.map((u) => (
              <tr key={u.email}>
                <td className="font-bold">{u.fullName}</td>
                <td>
                  <span className="badge-success">{u.role}</span>
                </td>
                <td className="font-mono-bold">{u.cin}</td>
                <td>
                  {u.governorate}, {u.city}
                </td>
                <td>
                  <div>{u.email}</div>
                  <small style={{ color: 'var(--text-muted)' }}>{u.phone}</small>
                </td>
                <td className="text-right">
                  <button
                    onClick={() => handleDeleteUser(u.email)}
                    className="action-link-edit"
                    style={{ color: '#dc2626' }}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}

            {filteredUsers.length === 0 && (
              <tr>
                <td
                  colSpan="6"
                  style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}
                >
                  No registered users found for this filter. Sign up a test account to see it
                  listed here.
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
/* 1. Client Views (Trip Search + Seat/Deadline Booking, Tickets, Wallet, Profile) */
/* -------------------------------------------------------------------------- */
function ClientSearchView({
  trips,
  fleet,
  currentUser,
  userKey,
  balance,
  updateBalance,
  bookings,
  setBookings,
  onGoToTickets,
}) {
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [selectedSeat, setSelectedSeat] = useState('01A');
  const [searchDep, setSearchDep] = useState('');
  const [searchArr, setSearchArr] = useState('');

  const filteredTrips = trips.filter(
    (t) =>
      t.departure.toLowerCase().includes(searchDep.toLowerCase()) &&
      t.arrival.toLowerCase().includes(searchArr.toLowerCase())
  );

  const selectedTrip = trips.find((t) => t.id === selectedTripId) || null;
  const getBusDetails = (busId) => fleet.find((b) => b.id === busId);

  const takenSeatsForTrip = useMemo(() => {
    if (!selectedTrip) return [];
    return bookings
      .filter((b) => b.tripId === selectedTrip.id && b.status !== 'Expired' && b.status !== 'Cancelled')
      .map((b) => b.seat);
  }, [bookings, selectedTrip]);

  const handleConfirmBooking = (payNowFromBalance) => {
    if (!selectedTrip) return;
    const fare = Number(selectedTrip.price) || 0;

    if (payNowFromBalance && balance < fare) {
      alert(
        `Insufficient balance (${balance.toFixed(2)} TND) for this ${fare.toFixed(2)} TND ticket. You can hold the seat with a 15-minute payment deadline or top up your balance.`
      );
      return;
    }

    if (payNowFromBalance) {
      updateBalance(balance - fare);
    }

    // 15-minute reservation/payment deadline from now
    const deadlineDate = new Date(Date.now() + 15 * 60 * 1000);
    const newBooking = {
      ref: `TR-${Math.floor(1000 + Math.random() * 9000)}`,
      tripId: selectedTrip.id,
      userEmail: userKey,
      passengerName: currentUser?.fullName || 'Passenger',
      passengerCin: currentUser?.cin || 'N/A',
      route: `${selectedTrip.departure} -> ${selectedTrip.arrival}`,
      departureTime: selectedTrip.time,
      busId: selectedTrip.busId,
      seat: selectedSeat,
      price: fare.toFixed(2),
      bookedAt: new Date().toISOString(),
      deadline: deadlineDate.toISOString(),
      status: payNowFromBalance ? 'Confirmed & Paid' : 'Pending Payment',
    };

    setBookings([newBooking, ...bookings]);
    setSelectedTripId(null);
    onGoToTickets();
  };

  return (
    <div>
      <div className="hero-banner">
        <h1>Find Your Next Journey</h1>
        <p>
          Current Balance: <strong>{balance.toFixed(2)} TND</strong> • Held seats include a
          15-minute payment deadline.
        </p>

        <div className="search-box">
          <div className="input-group">
            <label>Departure</label>
            <input
              type="text"
              placeholder="e.g., Tunis"
              value={searchDep}
              onChange={(e) => setSearchDep(e.target.value)}
            />
          </div>
          <div className="input-group">
            <label>Arrival</label>
            <input
              type="text"
              placeholder="e.g., Sousse"
              value={searchArr}
              onChange={(e) => setSearchArr(e.target.value)}
            />
          </div>
          <div className="input-group">
            <label>Date</label>
            <input type="date" />
          </div>
          <div>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setSearchDep('');
                setSearchArr('');
              }}
            >
              Reset Filter
            </button>
          </div>
        </div>
      </div>

      {/* Seat & Deadline Booking Panel */}
      {selectedTrip && (
        <div className="card" style={{ marginBottom: '24px', borderColor: 'var(--primary)' }}>
          <div className="card-header">
            <div>
              <h2 className="section-title" style={{ marginBottom: '4px' }}>
                Seat Selection & Booking Deadline ({selectedTrip.departure} {'->'}{' '}
                {selectedTrip.arrival})
              </h2>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Departure: <strong>{selectedTrip.time}</strong> • Fare:{' '}
                <strong>{selectedTrip.price} TND</strong> • Your Balance:{' '}
                <strong>{balance.toFixed(2)} TND</strong>
              </span>
            </div>
            <button
              type="button"
              className="action-link-edit"
              onClick={() => setSelectedTripId(null)}
            >
              Close
            </button>
          </div>

          <div
            style={{
              background: '#f8fafc',
              padding: '12px 14px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Clock size={16} />
            <span>
              <strong>Booking Rule:</strong> Paying now confirms your QR ticket immediately.
              Holding a seat gives you a <strong>15-minute payment deadline</strong> before the
              reservation expires.
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, minmax(48px, 1fr))',
              gap: '8px',
              marginBottom: '18px',
            }}
          >
            {SEAT_OPTIONS.map((seat) => {
              const isTaken = takenSeatsForTrip.includes(seat);
              const isPicked = selectedSeat === seat;
              return (
                <button
                  key={seat}
                  type="button"
                  disabled={isTaken}
                  onClick={() => setSelectedSeat(seat)}
                  style={{
                    padding: '10px 6px',
                    borderRadius: '8px',
                    border: isPicked ? '2px solid var(--primary)' : '1px solid #cbd5e1',
                    background: isTaken ? '#e2e8f0' : isPicked ? '#eef2ff' : '#ffffff',
                    color: isTaken ? '#94a3b8' : '#0f172a',
                    fontWeight: 600,
                    cursor: isTaken ? 'not-allowed' : 'pointer',
                  }}
                >
                  {seat}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            <button
              type="button"
              className="btn-primary btn-auto"
              onClick={() => handleConfirmBooking(true)}
            >
              Pay {selectedTrip.price} TND from Balance & Issue QR
            </button>
            <button
              type="button"
              className="btn-dark btn-auto"
              onClick={() => handleConfirmBooking(false)}
            >
              Hold Seat {selectedSeat} (15-Min Deadline)
            </button>
          </div>
        </div>
      )}

      <h2 className="section-title">Available Trips ({filteredTrips.length})</h2>
      <div className="trips-grid">
        {filteredTrips.map((trip) => {
          const bus = getBusDetails(trip.busId);
          return (
            <div className="card" key={trip.id}>
              <div className="card-header">
                <span className="badge-success">{trip.status}</span>
                <span className="price-tag">{trip.price} TND</span>
              </div>
              <div className="route-display">
                <span>{trip.departure}</span>
                <span className="route-arrow">{'->'}</span>
                <span>{trip.arrival}</span>
              </div>
              <div className="trip-meta">
                <p>
                  Departure Time: <strong>{trip.time}</strong>
                </p>
                <p>
                  Vehicle:{' '}
                  <strong>
                    {trip.busId} {bus ? `(${bus.model})` : ''}
                  </strong>
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedTripId(trip.id);
                  const firstFree = SEAT_OPTIONS.find(
                    (s) =>
                      !bookings.some(
                        (b) =>
                          b.tripId === trip.id &&
                          b.seat === s &&
                          b.status !== 'Expired' &&
                          b.status !== 'Cancelled'
                      )
                  );
                  if (firstFree) setSelectedSeat(firstFree);
                }}
                className="btn-dark"
              >
                Select Seats & Book
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ClientTicketsView({
  currentUser,
  userKey,
  balance,
  updateBalance,
  bookings,
  setBookings,
}) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Tick every second so pending payment deadlines count down live
  useEffect(() => {
    const interval = setInterval(() => {
      const current = Date.now();
      setNowMs(current);

      setBookings((prev) =>
        prev.map((b) => {
          if (
            b.status === 'Pending Payment' &&
            new Date(b.deadline).getTime() <= current
          ) {
            return { ...b, status: 'Expired' };
          }
          return b;
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [setBookings]);

  const myBookings = bookings.filter((b) => b.userEmail === userKey);

  const handlePayPendingTicket = (ticket) => {
    const fare = Number(ticket.price) || 0;
    if (balance < fare) {
      alert(
        `Not enough balance (${balance.toFixed(2)} TND). Add at least ${fare.toFixed(2)} TND in the Balance tab first.`
      );
      return;
    }

    updateBalance(balance - fare);
    setBookings((prev) =>
      prev.map((b) =>
        b.ref === ticket.ref ? { ...b, status: 'Confirmed & Paid' } : b
      )
    );
  };

  const handleCancelTicket = (ref) => {
    setBookings((prev) =>
      prev.map((b) => (b.ref === ref ? { ...b, status: 'Cancelled' } : b))
    );
  };

  return (
    <div>
      <h2 className="section-title">My Tickets & QR Codes ({myBookings.length})</h2>

      {myBookings.length === 0 ? (
        <div className="card">
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            You have no bookings yet. Go to <strong>Search & Book</strong> to reserve a seat
            and generate a QR ticket.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {myBookings.map((ticket) => {
            const isPaid = ticket.status === 'Confirmed & Paid';
            const isPending = ticket.status === 'Pending Payment';
            const countdown = formatCountdown(ticket.deadline, nowMs);

            const qrData = JSON.stringify({
              ref: ticket.ref,
              passenger: ticket.passengerName,
              cin: ticket.passengerCin,
              route: ticket.route,
              time: ticket.departureTime,
              seat: ticket.seat,
              status: ticket.status,
            });

            return (
              <div className="card ticket-card" key={ticket.ref}>
                <div className="qr-box" style={{ height: 'auto', width: 'auto', padding: '10px' }}>
                  {isPaid ? (
                    <>
                      <TicketQrCode payload={qrData} size={112} />
                      <span>Valid Boarding QR</span>
                    </>
                  ) : (
                    <div style={{ padding: '16px', textAlign: 'center', maxWidth: '125px' }}>
                      <QrCode size={42} />
                      <span style={{ display: 'block', marginTop: '6px' }}>
                        {isPending
                          ? 'QR unlocks after payment'
                          : `Ticket ${ticket.status}`}
                      </span>
                    </div>
                  )}
                </div>

                <div className="ticket-info">
                  <div className="card-header">
                    <span
                      className={isPaid ? 'badge-success' : 'badge-primary'}
                    >
                      {ticket.status}
                    </span>
                    <span className="ticket-ref">REF: #{ticket.ref}</span>
                  </div>

                  <h3 className="ticket-route-title">{ticket.route}</h3>
                  <p className="ticket-date">
                    Departure: <strong>{ticket.departureTime}</strong> • Vehicle:{' '}
                    <strong>{ticket.busId}</strong> • Fare: <strong>{ticket.price} TND</strong>
                  </p>

                  {isPending && (
                    <p
                      style={{
                        fontSize: '0.85rem',
                        color: '#b45309',
                        marginTop: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Clock size={15} />
                      <span>
                        Payment Deadline Countdown: <strong>{countdown}</strong> (Expires:{' '}
                        {new Date(ticket.deadline).toLocaleTimeString()})
                      </span>
                    </p>
                  )}

                  <div className="ticket-divider">
                    <div>
                      <span className="label-small">Seat</span>
                      <strong>{ticket.seat}</strong>
                    </div>
                    <div>
                      <span className="label-small">Passenger</span>
                      <strong>{ticket.passengerName}</strong>
                    </div>
                  </div>

                  {(isPending || isPaid) && (
                    <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                      {isPending && (
                        <button
                          type="button"
                          className="btn-primary btn-auto"
                          onClick={() => handlePayPendingTicket(ticket)}
                        >
                          Pay {ticket.price} TND Now
                        </button>
                      )}
                      {ticket.status !== 'Cancelled' && (
                        <button
                          type="button"
                          className="btn-logout"
                          onClick={() => handleCancelTicket(ticket.ref)}
                        >
                          Cancel Reservation
                        </button>
                      )}
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

function ClientWalletView({ balance, updateBalance, bookings }) {
  const [customAmount, setCustomAmount] = useState('25');

  const handleTopUp = (amountToAdd) => {
    const num = Number(amountToAdd);
    if (!num || num <= 0) {
      alert('Please enter a valid positive amount in TND.');
      return;
    }
    updateBalance(balance + num);
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    handleTopUp(customAmount);
  };

  return (
    <div>
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="card">
          <span className="label-small">AVAILABLE BALANCE</span>
          <div className="stat-value">
            <Wallet size={22} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
            {balance.toFixed(2)} TND
          </div>
          <span className="stat-trend">Ready for instant seat booking</span>
        </div>

        <div className="card">
          <span className="label-small">QUICK TOP-UP</span>
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
            {[10, 20, 50, 100].map((amt) => (
              <button
                key={amt}
                type="button"
                className="btn-primary btn-auto"
                onClick={() => handleTopUp(amt)}
              >
                +{amt} TND
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <h2 className="section-title">Add Custom Balance Amount</h2>
        <form
          onSubmit={handleCustomSubmit}
          style={{ display: 'flex', gap: '12px', alignItems: 'end', flexWrap: 'wrap' }}
        >
          <div className="input-group" style={{ flex: '1', minWidth: '180px' }}>
            <label>Amount to Add (TND)</label>
            <input
              type="number"
              min="1"
              step="0.5"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary btn-auto">
            Add Money to Balance
          </button>
        </form>
      </div>

      <div className="card">
        <h2 className="section-title">Recent Ticket Charges & Reservations</h2>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ref</th>
                <th>Route</th>
                <th>Seat</th>
                <th>Fare</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.ref}>
                  <td className="font-mono-bold">{b.ref}</td>
                  <td className="font-bold">{b.route}</td>
                  <td>{b.seat}</td>
                  <td>{b.price} TND</td>
                  <td>
                    <span
                      className={
                        b.status === 'Confirmed & Paid' ? 'badge-success' : 'badge-primary'
                      }
                    >
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
              {bookings.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    No ticket activity yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ClientProfileView({ currentUser, balance, ticketCount, onGoToWallet }) {
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
              {currentUser?.email || 'passenger@agetrap.tn'}
            </span>
          </div>
        </div>
        <span className="badge-success">{currentUser?.role || 'client'}</span>
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
          <span className="label-small">CIN Number</span>
          <strong>{currentUser?.cin || 'Not provided'}</strong>
        </div>
        <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
          <span className="label-small">Phone Number</span>
          <strong>{currentUser?.phone || 'Not provided'}</strong>
        </div>
        <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
          <span className="label-small">Governorate & City</span>
          <strong>
            {currentUser?.governorate || 'Tunis'}
            {currentUser?.city ? `, ${currentUser.city}` : ''}
          </strong>
        </div>
        <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
          <span className="label-small">Wallet Balance & Tickets</span>
          <strong>
            {balance.toFixed(2)} TND • {ticketCount} Tickets
          </strong>
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <button type="button" className="btn-primary btn-auto" onClick={onGoToWallet}>
          Manage Balance & Top-Up
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Driver Views                                                            */
/* -------------------------------------------------------------------------- */
function DriverDashboardView({ trips }) {
  return (
    <div>
      <h2 className="section-title">Today's Assigned Routes</h2>
      <div className="card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Trip ID</th>
                <th>Route</th>
                <th>Departure</th>
                <th>Assigned Bus</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {trips.map((trip) => (
                <tr key={trip.id}>
                  <td className="font-mono-bold">{trip.id}</td>
                  <td className="font-bold">
                    {trip.departure} {'->'} {trip.arrival}
                  </td>
                  <td>{trip.time}</td>
                  <td>{trip.busId}</td>
                  <td>
                    <span className="badge-success">Ready for Boarding</span>
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

function DriverScannerView() {
  const [scannedInput, setScannedInput] = useState('');
  const [scanResult, setScanResult] = useState(null);

  const handleVerifyTicket = (e) => {
    e.preventDefault();
    const allBookings = JSON.parse(localStorage.getItem('agetrap_bookings')) || [];
    const cleanRef = scannedInput.replace(/^#/, '').trim().toUpperCase();

    const found = allBookings.find(
      (b) => b.ref.toUpperCase() === cleanRef || b.ref.toUpperCase() === scannedInput.trim().toUpperCase()
    );

    if (!found) {
      setScanResult({
        ok: false,
        message: `No booking found for reference "${scannedInput}".`,
      });
      return;
    }

    if (found.status === 'Confirmed & Paid') {
      setScanResult({
        ok: true,
        message: `Valid Ticket! ${found.passengerName} • Seat ${found.seat} (${found.route})`,
      });
    } else {
      setScanResult({
        ok: false,
        message: `Ticket #${found.ref} is "${found.status}" (not paid/confirmed).`,
      });
    }
  };

  return (
    <div className="scanner-container">
      <div className="card">
        <h2 className="section-title">Passenger Ticket QR Scanner</h2>
        <p className="scanner-subtitle">
          Scan or enter a passenger's ticket reference (e.g., TR-1234) before boarding to verify
          payment status.
        </p>
        <div className="camera-viewfinder">
          <div className="camera-frame">Camera preview ready (enter ticket REF below to verify)</div>
        </div>

        <form onSubmit={handleVerifyTicket} style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            placeholder="Enter ticket REF (e.g. TR-4821)"
            value={scannedInput}
            onChange={(e) => setScannedInput(e.target.value)}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
            }}
            required
          />
          <button type="submit" className="btn-primary btn-auto">
            Verify Ticket
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

/* -------------------------------------------------------------------------- */
/* 3. Maintenance Technician View                                             */
/* -------------------------------------------------------------------------- */
function TechnicianMaintenanceView({ fleet, setFleet }) {
  const operationalCount = fleet.filter((b) => b.status === 'Operational').length;
  const workshopCount = fleet.filter((b) => b.status !== 'Operational').length;

  const toggleStatus = (id) => {
    setFleet(
      fleet.map((bus) =>
        bus.id === id
          ? {
              ...bus,
              status: bus.status === 'Operational' ? 'In Workshop' : 'Operational',
            }
          : bus
      )
    );
  };

  return (
    <div>
      <div className="stats-grid">
        <div className="card">
          <span className="label-small">OPERATIONAL FLEET</span>
          <div className="stat-value">{operationalCount} Buses</div>
          <span className="stat-trend">Cleared for service</span>
        </div>
        <div className="card">
          <span className="label-small">IN MAINTENANCE</span>
          <div className="stat-value">{workshopCount} Buses</div>
          <span className="stat-trend-primary">Scheduled servicing</span>
        </div>
      </div>

      <div className="card">
        <div className="table-header-bar">
          <h2 className="section-title">Fleet Maintenance & Inspection Log</h2>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Bus ID</th>
                <th>Model</th>
                <th>Department Base</th>
                <th>Issue / Checkup</th>
                <th>Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {fleet.map((bus) => (
                <tr key={bus.id}>
                  <td className="font-mono-bold">{bus.id}</td>
                  <td>{bus.model}</td>
                  <td>{bus.departmentBase}</td>
                  <td>{bus.checkup}</td>
                  <td>
                    <span
                      className={
                        bus.status === 'Operational' ? 'badge-success' : 'badge-primary'
                      }
                    >
                      {bus.status}
                    </span>
                  </td>
                  <td className="text-right">
                    <button
                      onClick={() => toggleStatus(bus.id)}
                      className="action-link-edit"
                    >
                      {bus.status === 'Operational' ? 'Flag for Repair' : 'Mark Repaired'}
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