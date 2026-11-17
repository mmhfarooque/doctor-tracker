import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-500.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import '@fontsource/ibm-plex-sans/latin-700.css';
import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../components/ui/Toast';
import AppShell from '../components/layout/AppShell';

export const metadata = {
  title: 'Doctor Tracker',
  description: 'Manage doctors, their patients and clinical activity in one place.',
};

export const viewport = {
  themeColor: '#112620',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ToastProvider>
            <AppShell>{children}</AppShell>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
