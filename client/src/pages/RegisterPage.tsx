import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { coatFromName, mottoFromName } from '../lore/intro';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '',
    username: '',
    password: '',
    kingdomName: '',
    rulerName: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const previewName = form.rulerName || form.kingdomName || 'Dein Haus';
  const coat = coatFromName(previewName);
  const motto = mottoFromName(previewName);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await register(form);
      navigate('/game');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registrierung fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  return (
    <div
      className="min-h-dvh flex items-center justify-center p-4"
      style={{
        background:
          'radial-gradient(ellipse at 50% 20%, #2a2218 0%, #0e0c0a 55%), linear-gradient(180deg, #1a2a1f 0%, #0e0c0a 100%)',
      }}
    >
      <div className="panel parchment-frame w-full max-w-md p-6 space-y-5">
        <div className="text-center space-y-2">
          <div
            className="coat-of-arms mx-auto"
            style={{ background: `linear-gradient(145deg, ${coat.primary}, ${coat.secondary})` }}
          >
            <span>{coat.emblem}</span>
          </div>
          <h1 className="font-display text-2xl text-gold">Dynastie gründen</h1>
          <p className="text-parchment/60 text-sm">Das Jahr 1148 – eine neue Chronik beginnt</p>
          <p className="text-[11px] italic text-gold/70">„{motto}"</p>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-200 px-3 py-2 rounded text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {[
            { key: 'email', label: 'E-Mail', type: 'email' },
            { key: 'username', label: 'Benutzername', type: 'text' },
            { key: 'password', label: 'Passwort', type: 'password' },
            { key: 'kingdomName', label: 'Name des Königreichs', type: 'text' },
            { key: 'rulerName', label: 'Name des Herrschers', type: 'text' },
          ].map(({ key, label, type }) => (
            <div key={key}>
              <label className="block text-xs text-parchment/70 mb-1 font-display">{label}</label>
              <input
                type={type}
                value={form[key as keyof typeof form]}
                onChange={(e) => update(key, e.target.value)}
                className="input-field"
                required
                minLength={key === 'password' ? 6 : 3}
              />
            </div>
          ))}
          <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
            {loading ? 'Gründung…' : 'Herrschaft beginnen'}
          </button>
        </form>

        <p className="text-center text-sm text-parchment/50">
          Bereits ein Erbe?{' '}
          <Link to="/login" className="text-gold hover:underline">
            Anmelden
          </Link>
        </p>
      </div>
    </div>
  );
}
