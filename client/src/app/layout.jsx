import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import AppLayout from '../components/layout/AppLayout';

export const metadata = {
  title: 'Doctor Tracker — Healthcare Administrative Portal',
  description: 'High-performance medical administrative dashboard to manage doctors and corresponding patients.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 antialiased text-slate-800">
        <AuthProvider>
          <AppLayout>{children}</AppLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
