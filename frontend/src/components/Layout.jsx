import React from 'react';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';

export function Layout({ children }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen md:ml-64">
        <main className="flex-1 p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
        <MobileNav />
      </div>
    </div>
  );
}