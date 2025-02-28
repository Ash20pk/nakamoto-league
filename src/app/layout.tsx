import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '@/providers/AuthProvider';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Nakamoto League - Web3 Hackathon Platform',
  description: 'Join the most prestigious tech dojos and compete in epic blockchain battles',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <AuthProvider>
          <Navbar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}