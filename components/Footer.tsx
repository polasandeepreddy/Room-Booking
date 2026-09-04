import React from 'react';
import Link from 'next/link';
import { Building2, Phone, Mail, MapPin, ShieldCheck, CheckCircle2 } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-slate-800 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Building2 className="w-5 h-5 text-slate-950 stroke-[2.2]" />
              </div>
              <span className="font-bold text-lg text-white">COMFORTABLE FLAT</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              A clean, comfortable and secure flat with two spacious double bedrooms, modern bathrooms, kitchen, and dining area. Up to 10 persons capacity.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>1 Flat • 2 Rooms • Max 10 Guests</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-white font-semibold text-sm tracking-wider uppercase">Navigation</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/" className="hover:text-amber-400 transition-colors">Home</Link>
              </li>
              <li>
                <Link href="/flat" className="hover:text-amber-400 transition-colors">Flat & Rooms</Link>
              </li>
              <li>
                <Link href="/#facilities" className="hover:text-amber-400 transition-colors">Facilities & Safety</Link>
              </li>
              <li>
                <Link href="/booking" className="hover:text-amber-400 transition-colors">Book Now</Link>
              </li>
              <li>
                <Link href="/my-bookings" className="hover:text-amber-400 transition-colors">My Bookings</Link>
              </li>
            </ul>
          </div>

          {/* Accommodation Structure */}
          <div className="space-y-3">
            <h4 className="text-white font-semibold text-sm tracking-wider uppercase">Accommodation</h4>
            <ul className="space-y-2 text-xs text-gray-400">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span><strong>1 Flat:</strong> Complete private accommodation</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span><strong>Room 1:</strong> Double Bed Room</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span><strong>Room 2:</strong> Double Bed Room</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span><strong>Capacity:</strong> Up to 10 Persons</span>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div className="space-y-3">
            <h4 className="text-white font-semibold text-sm tracking-wider uppercase">Contact & Location</h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                <span>+91 98765 43210</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                <span>contact@hotel.com</span>
              </div>
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>Flat 402, Greenfield Residency, City Center, Sector 18</span>
              </div>
            </div>
          </div>

        </div>

        <div className="mt-10 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-4">
          <p>© {new Date().getFullYear()} Comfortable Flat Accommodation. All rights reserved.</p>
          <div className="flex items-center space-x-6">
            <Link href="/flat" className="hover:text-gray-400">Flat Details</Link>
            <Link href="/admin/login" className="hover:text-amber-400">Admin Portal</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
