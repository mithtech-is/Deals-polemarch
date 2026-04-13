'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-context';
import { DashboardPage } from '@/components/dashboard/template';
import { rest } from '@/lib/api';
import type { AuthToken } from '@/types/domain';

export default function LoginPage() {
  const { setAuth } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await rest<AuthToken>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      setAuth(data);
      router.push('/admin/companies');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardPage
      title="Welcome Back"
      subtitle="Sign in to continue managing companies and financial data."
    >
      <div className="auth-shell">
        <div className="card col" style={{ maxWidth: 460, width: '100%', gap: 12 }}>
          <p className="muted">Sign in to your account</p>
          <label className="col">
            <span>Username</span>
            <input value={username} onChange={(e) => setUsername(e.target.value)} />
          </label>
          <label className="col">
            <span>Password</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <button onClick={submit} disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
          {error && <p className="error">{error}</p>}
        </div>
      </div>
    </DashboardPage>
  );
}
