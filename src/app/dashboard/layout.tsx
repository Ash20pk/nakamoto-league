import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard - Nakamoto League',
  description: 'Your personal dashboard for Nakamoto League activities',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
    </>
  );
}