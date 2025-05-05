'use client';

import React from 'react';
import AdminNavbar from '@/components/AdminNavbar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <AdminNavbar />
      {children}
    </div>
  );
}
