import React, { useState } from 'react';
import { Bus } from 'lucide-react';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:3000';

const TUNISIAN_REGIONS = {
  Tunis: ['Tunis', 'Carthage', 'La Marsa', 'Le Bardo', 'Sidi Bou Said', 'El Menzah'],
  Ariana: ['Ariana Ville', 'La Soukra', 'Raoued', 'Kalaat el-Andalous', 'Sidi Thabet'],
  'Ben Arous': ['Ben Arous', 'Megrine', 'Radès', 'Hammam Lif', 'Ezzahra', 'Fouchana'],
  Manouba: ['Manouba', 'Oued Ellil', 'Den Den', 'Douar Hicher', 'Tebourba', 'El Batan'],
  Sousse: ['Sousse Ville', 'Hammam Sousse', 'Akouda', 'Kalaa Kebira', 'Enfidha', 'Msaken'],
  Sfax: ['Sfax Ville', 'Sakiet Ezzit', 'Sakiet Eddaier', 'Thyna', 'El Hencha', 'Mahres'],
  Nabeul: ['Nabeul', 'Hammamet', 'Kelibia', 'Menzel Temime', 'Korba', 'Grombalia'],
  Bizerte: ['Bizerte Nord', 'Bizerte Sud', 'Menzel Bourguiba', 'Mateur', 'Ras Jebel'],
  Monastir: ['Monastir', 'Moknine', 'Jemmal', 'Ksar Hellal', 'Sahline', 'Téboulba'],
  Mahdia: ['Mahdia', 'Ksour Essef', 'El Jem', 'Chebba', 'Mellouleche'],
};

function parseJwtPayload(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 2 && parts.length !== 3) return {};
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return {};
  }
}

export default function LoginView({ onLoginSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [cin, setCin] = useState('');
  const [phone, setPhone] = useState('');
  const [governorate, setGovernorate] = useState('Tunis');
  const [city, setCity] = useState(TUNISIAN_REGIONS['Tunis'][0]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleGovernorateChange = (e) => {
    const selectedGov = e.target.value;
    setGovernorate(selectedGov);
    setCity(TUNISIAN_REGIONS[selectedGov][0]);
  };

  const splitFullName = (name) => {
    const clean = name.trim().replace(/\s+/g, ' ');
    if (!clean) return { prenom: 'Passager', nom: 'AGETRAP' };
    const parts = clean.split(' ');
    if (parts.length === 1) {
      return { prenom: parts[0], nom: parts[0] };
    }
    return {
      prenom: parts[0],
      nom: parts.slice(1).join(' '),
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');
    setSubmitting(true);

    try {
      if (isSignUp) {
        if (password.length < 8) {
          setErrorMsg('Password must be at least 8 characters long.');
          setSubmitting(false);
          return;
        }

        const { prenom, nom } = splitFullName(fullName);
        const res = await fetch(`${API_BASE_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nom,
            prenom,
            email: email.trim(),
            mot_de_passe: password,
            telephone: phone.trim() || undefined,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setErrorMsg(data.erreur || 'Unable to register account.');
          setSubmitting(false);
          return;
        }

        const profiles = JSON.parse(localStorage.getItem('agetrap_profiles')) || {};
        profiles[email.trim().toLowerCase()] = {
          fullName: fullName.trim() || `${prenom} ${nom}`,
          cin: cin.trim(),
          phone: phone.trim(),
          governorate,
          city,
          email: email.trim(),
        };
        localStorage.setItem('agetrap_profiles', JSON.stringify(profiles));

        setInfoMsg('Passenger account created! You can now sign in.');
        setIsSignUp(false);
      } else {
        const res = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim(),
            mot_de_passe: password,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setErrorMsg(data.erreur || 'Invalid email or password.');
          setSubmitting(false);
          return;
        }

        const role = data.role || 'passager';
        const token = data.token;
        const payload = parseJwtPayload(token);

        const profiles = JSON.parse(localStorage.getItem('agetrap_profiles')) || {};
        const savedProfile = profiles[email.trim().toLowerCase()] || {};

        const userObj = {
          id: payload.id,
          email: email.trim(),
          role,
          fullName:
            savedProfile.fullName ||
            (role === 'administrateur'
              ? 'AGETRAP Administrator'
              : role === 'chauffeur'
                ? 'AGETRAP Driver'
                : email.trim().split('@')[0]),
          cin: savedProfile.cin || '',
          phone: savedProfile.phone || '',
          governorate: savedProfile.governorate || 'Tunis',
          city: savedProfile.city || 'Tunis',
        };

        onLoginSuccess(role, userObj, token);
      }
    } catch {
      setErrorMsg(`Cannot reach backend at ${API_BASE_URL}. Check that the server is running.`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="card login-card" style={{ maxWidth: '460px' }}>
        <div className="login-header">
          <div className="brand-icon brand-icon-large">
            <Bus size={28} />
          </div>
          <h2>{isSignUp ? 'Create Passenger Account' : 'Welcome to AGETRAP'}</h2>
          <p>
            {isSignUp
              ? 'Register a passenger account on AGETRAP'
              : 'Sign in with your AGETRAP account'}
          </p>
        </div>

        {errorMsg && (
          <div
            style={{
              marginBottom: '12px',
              padding: '10px 12px',
              borderRadius: '8px',
              background: '#fef2f2',
              color: '#991b1b',
              fontSize: '0.88rem',
              fontWeight: 600,
            }}
          >
            {errorMsg}
          </div>
        )}

        {infoMsg && (
          <div
            style={{
              marginBottom: '12px',
              padding: '10px 12px',
              borderRadius: '8px',
              background: '#ecfdf5',
              color: '#065f46',
              fontSize: '0.88rem',
              fontWeight: 600,
            }}
          >
            {infoMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          {isSignUp && (
            <>
              <div className="input-group">
                <label>Full Name</label>
                <input
                  type="text"
                  placeholder="e.g., Rami Bejaoui"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label>CIN Number (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g., 08234567"
                  maxLength="8"
                  value={cin}
                  onChange={(e) => setCin(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label>Phone Number (Optional)</label>
                <input
                  type="tel"
                  placeholder="e.g., +216 20 000 000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="input-group">
                  <label>Governorate (State)</label>
                  <select value={governorate} onChange={handleGovernorateChange}>
                    {Object.keys(TUNISIAN_REGIONS).map((gov) => (
                      <option key={gov} value={gov}>
                        {gov}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label>City / Delegation</label>
                  <select value={city} onChange={(e) => setCity(e.target.value)}>
                    {TUNISIAN_REGIONS[governorate].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          <div className="input-group">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label>Password {isSignUp ? '(min. 8 characters)' : ''}</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ marginTop: '6px' }}
            disabled={submitting}
          >
            {submitting
              ? 'Please wait...'
              : isSignUp
                ? 'Create Passenger Account'
                : 'Sign In'}
          </button>
        </form>

        <div className="auth-switch">
          <span>
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          </span>
          <button
            type="button"
            className="auth-switch-btn"
            onClick={() => {
              setErrorMsg('');
              setInfoMsg('');
              setIsSignUp(!isSignUp);
            }}
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
}