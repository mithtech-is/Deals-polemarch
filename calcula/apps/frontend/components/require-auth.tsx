'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from './auth-context';

export function RequireAuth({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { token, role } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!token && pathname !== '/login') {
      router.replace('/login');
      return;
    }
    if (token && adminOnly && role !== 'ADMIN') {
      router.replace('/');
    }
  }, [adminOnly, pathname, role, router, token]);

  if (!token) {
    return (
      <div className="card">
        <p>Please login to continue.</p>
        <Link href="/login">Go to login</Link>
      </div>
    );
  }

  if (adminOnly && role !== 'ADMIN') {
    return (
      <div className="card">
        <p className="error">Admin access required. Redirecting...</p>
      </div>
    );
  }

  return <>{children}</>;
}
