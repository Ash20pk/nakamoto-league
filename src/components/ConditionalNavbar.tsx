'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Navbar from './Navbar';

export default function ConditionalNavbar() {
  const pathname = usePathname();
  const isAdminPage = pathname?.includes('/admin');
  
  if (isAdminPage) {
    return null;
  }
  
  return <Navbar />;
}
