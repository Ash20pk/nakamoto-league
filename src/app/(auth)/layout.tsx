import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Authentication - Nakamoto League',
  description: 'Join or sign in to the Nakamoto League - The ultimate blockchain battle platform',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen pt-16">
      {/* Background effect */}
      <div className="fixed inset-0 bg-[url('/images/dojo-bg.jpg')] bg-cover bg-center opacity-20 z-[-1]"></div>
      {children}
    </div>
  );
}