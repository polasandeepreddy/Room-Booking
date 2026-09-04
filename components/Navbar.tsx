'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Building2,
  CalendarCheck,
  ShieldAlert,
  User,
  LogOut,
  Menu,
  X,
  BedDouble,
  Sparkles
} from 'lucide-react';

export function Navbar({ onOpenBooking }: { onOpenBooking?: () => void }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-amber-500/20 text-white transition-all shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">

          {/* Logo / Property Name */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <Building2 className="w-6 h-6 text-slate-950 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xl tracking-wide bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 bg-clip-text text-transparent">
                  FLAT
                </span>
              </div>
              <p className="text-[11px] text-gray-400 tracking-wider font-light">1 Flat • 2 Rooms</p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            <Link
              href="/"
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${pathname === '/' ? 'text-amber-400 bg-white/10' : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
            >
              Home
            </Link>
            <Link
              href="/flat"
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${pathname === '/flat' ? 'text-amber-400 bg-white/10' : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
            >
              Flat
            </Link>
            <Link
              href="/#facilities"
              className="px-3.5 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              Facilities
            </Link>

            {user && (
              <>
                <Link
                  href="/my-bookings"
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${pathname === '/my-bookings' ? 'text-amber-400 bg-white/10' : 'text-gray-300 hover:text-white hover:bg-white/5'
                    }`}
                >
                  <CalendarCheck className="w-4 h-4 text-amber-400" />
                  <span>My Bookings</span>
                </Link>

                <Link
                  href="/profile"
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${pathname === '/profile' ? 'text-amber-400 bg-white/10' : 'text-gray-300 hover:text-white hover:bg-white/5'
                    }`}
                >
                  <User className="w-4 h-4 text-amber-400" />
                  <span>Profile</span>
                </Link>
              </>
            )}

            {user?.role === 'admin' && (
              <Link
                href="/admin"
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${pathname.startsWith('/admin')
                  ? 'text-amber-300 bg-amber-500/20 border border-amber-500/40'
                  : 'text-amber-400 hover:text-amber-200 hover:bg-white/5'
                  }`}
              >
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Admin Dashboard</span>
              </Link>
            )}
          </nav>

          {/* Right Action Area */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/5 border border-amber-500/30 hover:bg-white/10 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                    {((user.fullName || user.full_name || 'U')[0]).toUpperCase()}
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-gray-200 leading-tight truncate max-w-[120px]">
                      {user.fullName || user.full_name}
                    </p>
                    <p className="text-[10px] text-amber-400 font-medium capitalize">{user.role}</p>
                  </div>
                </button>

                {profileDropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 bg-slate-900 border border-amber-500/30 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                    onMouseLeave={() => setProfileDropdownOpen(false)}
                  >
                    <div className="px-4 py-2 border-b border-white/10">
                      <p className="text-xs text-gray-400">Signed in as</p>
                      <p className="text-sm font-medium text-white truncate">{user.email}</p>
                    </div>

                    <Link
                      href="/my-bookings"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-200 hover:bg-white/5 hover:text-amber-400 transition-colors"
                    >
                      <CalendarCheck className="w-4 h-4 text-amber-400" />
                      <span>My Bookings</span>
                    </Link>

                    <Link
                      href="/profile"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-200 hover:bg-white/5 hover:text-amber-400 transition-colors"
                    >
                      <User className="w-4 h-4 text-amber-400" />
                      <span>Profile</span>
                    </Link>

                    {user.role === 'admin' && (
                      <Link
                        href="/admin"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-amber-300 hover:bg-white/5 transition-colors"
                      >
                        <ShieldAlert className="w-4 h-4 text-amber-400" />
                        <span>Admin Dashboard</span>
                      </Link>
                    )}

                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        logout();
                      }}
                      className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors border-t border-white/10 mt-1"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-white/10 hover:bg-white/15 text-amber-300 border border-amber-500/40 transition-all"
                >
                  Sign Up
                </Link>
              </div>
            )}

            {/* Main Booking Button */}
            {onOpenBooking ? (
              <button
                onClick={onOpenBooking}
                className="relative group overflow-hidden px-5 py-2.5 rounded-xl font-semibold text-sm text-slate-950 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:brightness-110 shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-2"
              >
                <BedDouble className="w-4 h-4" />
                <span>BOOK NOW</span>
              </button>
            ) : (
              <Link
                href="/booking"
                className="relative group overflow-hidden px-5 py-2.5 rounded-xl font-semibold text-sm text-slate-950 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:brightness-110 shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-2"
              >
                <BedDouble className="w-4 h-4" />
                <span>BOOK NOW</span>
              </Link>
            )}
          </div>

          {/* Mobile Actions */}
          <div className="flex md:hidden items-center space-x-2">
            {onOpenBooking ? (
              <button
                onClick={onOpenBooking}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-950 bg-amber-400"
              >
                BOOK NOW
              </button>
            ) : (
              <Link
                href="/booking"
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-950 bg-amber-400"
              >
                BOOK NOW
              </Link>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6 text-amber-400" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-amber-500/20 px-4 pt-3 pb-6 space-y-3 animate-in slide-in-from-top duration-200">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-gray-200 hover:bg-white/5"
          >
            Home
          </Link>
          <Link
            href="/flat"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-gray-200 hover:bg-white/5"
          >
            Flat
          </Link>
          <Link
            href="/#facilities"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-gray-200 hover:bg-white/5"
          >
            Facilities
          </Link>

          {user && (
            <>
              <Link
                href="/my-bookings"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-base font-medium text-amber-300 hover:bg-white/5"
              >
                <CalendarCheck className="w-5 h-5 text-amber-400" />
                <span>My Bookings</span>
              </Link>
              <Link
                href="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-base font-medium text-amber-300 hover:bg-white/5"
              >
                <User className="w-5 h-5 text-amber-400" />
                <span>Profile</span>
              </Link>
            </>
          )}

          {user?.role === 'admin' && (
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-base font-medium text-amber-400 hover:bg-amber-500/10"
            >
              <ShieldAlert className="w-5 h-5" />
              <span>Admin Dashboard</span>
            </Link>
          )}

          <div className="pt-4 border-t border-white/10">
            {user ? (
              <div className="space-y-3">
                <div className="px-3">
                  <p className="text-sm font-semibold text-white">{user.fullName || user.full_name}</p>
                  <p className="text-xs text-gray-400">{user.email}</p>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-rose-400 bg-rose-500/10 hover:bg-rose-500/20"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-medium text-gray-200 bg-white/5 border border-white/10"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-950 bg-amber-400"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;
