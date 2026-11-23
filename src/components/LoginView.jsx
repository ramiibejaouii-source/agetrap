import React, { useState } from 'react';
import { Bus } from 'lucide-react';

const TUNISIAN_REGIONS = {
  "Tunis": ["Tunis", "Carthage", "La Marsa", "Le Bardo", "Sidi Bou Said", "El Menzah"],
  "Ariana": ["Ariana Ville", "La Soukra", "Raoued", "Kalaat el-Andalous", "Sidi Thabet"],
  "Ben Arous": ["Ben Arous", "Megrine", "Radès", "Hammam Lif", "Ezzahra", "Fouchana"],
  "Manouba": ["Manouba", "Oued Ellil", "Den Den", "Douar Hicher", "Tebourba", "El Batan"],
  "Sousse": ["Sousse Ville", "Hammam Sousse", "Akouda", "Kalaa Kebira", "Enfidha", "Msaken"],
  "Sfax": ["Sfax Ville", "Sakiet Ezzit", "Sakiet Eddaier", "Thyna", "El Hencha", "Mahres"],
  "Nabeul": ["Nabeul", "Hammamet", "Kelibia", "Menzel Temime", "Korba", "Grombalia"],
  "Bizerte": ["Bizerte Nord", "Bizerte Sud", "Menzel Bourguiba", "Mateur", "Ras Jebel"],
  "Monastir": ["Monastir", "Moknine", "Jemmal", "Ksar Hellal", "Sahline", "Téboulba"],
  "Mahdia": ["Mahdia", "Ksour Essef", "El Jem", "Chebba", "Mellouleche"]
};

// Static Admin Account
const STATIC_ADMIN = {
  fullName: 'AGETRAP Administrator',
  email: 'admin@agetrap.tn',
  password: 'admin123',
  role: 'admin'
};

export default function LoginView({ onLoginSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [cin, setCin] = useState('');
  const [phone, setPhone] = useState('');
  const [governorate, setGovernorate] = useState('Tunis');
  const [city, setCity] = useState(TUNISIAN_REGIONS['Tunis'][0]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('client');

  const handleGovernorateChange = (e) => {
    const selectedGov = e.target.value;
    setGovernorate(selectedGov);
    setCity(TUNISIAN_REGIONS[selectedGov][0]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (isSignUp) {
      if (email.toLowerCase() === STATIC_ADMIN.email) {
        alert("This email is reserved for the system administrator.");
        return;
      }

      const newUser = {
        fullName,
        cin,
        phone,
        governorate,
        city,
        email,
        password,
        role
      };

      const existingUsers = JSON.parse(localStorage.getItem('agetrap_users')) || [];

      if (existingUsers.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
        alert("An account with this email already exists! Try signing in.");
        return;
      }

      existingUsers.push(newUser);
      localStorage.setItem('agetrap_users', JSON.stringify(existingUsers));

      alert(`Account created as ${role.toUpperCase()}! Please sign in.`);
      setIsSignUp(false);
    } else {
      // 1. Check Static Admin Account first
      if (
        email.toLowerCase() === STATIC_ADMIN.email &&
        password === STATIC_ADMIN.password
      ) {
        onLoginSuccess('admin', STATIC_ADMIN);
        return;
      }

      // 2. Check registered users in localStorage
      const existingUsers = JSON.parse(localStorage.getItem('agetrap_users')) || [];
      const foundUser = existingUsers.find(
        (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
      );

      if (foundUser) {
        onLoginSuccess(foundUser.role, foundUser);
      } else {
        alert("Invalid email or password. (Admin demo: admin@agetrap.tn / admin123)");
      }
    }
  };

  return (
    <div className="login-wrapper">
      <div className="card login-card" style={{ maxWidth: '460px' }}>
        <div className="login-header">
          <div className="brand-icon brand-icon-large">
            <Bus size={28} />
          </div>
          <h2>{isSignUp ? 'Create an Account' : 'Welcome to AGETRAP'}</h2>
          <p>
            {isSignUp
              ? 'Select your role and register for the portal'
              : 'Sign in with your credentials'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {isSignUp && (
            <>
              <div className="input-group">
                <label>Account Role</label>
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="client">Client</option>
                  <option value="driver">Driver</option>
                  <option value="technician">Maintenance Technician</option>
                </select>
              </div>

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
                <label>CIN Number (National ID)</label>
                <input
                  type="text"
                  placeholder="e.g., 08234567"
                  maxLength="8"
                  value={cin}
                  onChange={(e) => setCin(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  placeholder="e.g., +216 20 000 000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
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
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: '6px' }}>
            {isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="auth-switch">
          <span>
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          </span>
          <button
            type="button"
            className="auth-switch-btn"
            onClick={() => setIsSignUp(!isSignUp)}
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
}