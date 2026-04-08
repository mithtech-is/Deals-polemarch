import './globals.css';
import { AuthProvider } from '@/components/auth-context';
import { AppShell } from '@/components/layout';

export const metadata = {
  title: 'Calcula'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
