import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

const LoginPage = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (res.ok) {
        const data = await res.json();
        onLogin(data.apiKey);
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error || 'Access Denied: Invalid Credentials');
        setLoading(false);
      }
    } catch (e) {
      setError('Connection failed. Is the engine online?');
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-8 max-w-md w-full text-center"
      >
        <div className="flex justify-center mb-6">
          <div className="p-4 rounded-full bg-white/5">
            <Lock className="w-8 h-8 text-purple-400" />
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-2">Video Engine Access</h1>
        <p className="text-gray-400 mb-8">Enter your authorized access key</p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4 text-left">
            <input
              type="password"
              placeholder="Access Key..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full"
            />
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-400 text-sm mb-4"
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            className="btn-primary flex items-center justify-center gap-2"
            disabled={loading}
          >
            {loading ? 'Verifying...' : 'Unlock Engine'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default LoginPage;
