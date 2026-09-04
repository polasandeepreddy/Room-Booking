'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Building2, 
  BedDouble, 
  Users, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  Clock, 
  MapPin, 
  Phone, 
  Mail,
  ChevronRight,
  Maximize2
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { FacilityIcon } from '@/components/FacilityIcon';
import { BookingFlowModal } from '@/components/BookingFlowModal';
import { Facility } from '@/lib/types';

export default function HomePage() {
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedRoomOption, setSelectedRoomOption] = useState<'room1' | 'room2' | 'both'>('both');
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loadingFacilities, setLoadingFacilities] = useState(true);

  useEffect(() => {
    fetch('/api/facilities')
      .then((res) => res.json())
      .then((data) => {
        if (data.facilities) {
          setFacilities(data.facilities);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingFacilities(false));
  }, []);

  const openBookingFor = (roomOption: 'room1' | 'room2' | 'both') => {
    setSelectedRoomOption(roomOption);
    setBookingModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-amber-500 selection:text-slate-950">
      {/* Navigation */}
      <Navbar onOpenBooking={() => openBookingFor('both')} />

      {/* 1. HERO SECTION */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Background Image with Overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 scale-105"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=2000&q=85')`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-slate-950/40" />
          <div className="absolute inset-0 bg-radial-gradient from-transparent via-slate-950/50 to-slate-950/90" />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          
          {/* Highlight Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs sm:text-sm font-semibold mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Premium Accommodation Reservation</span>
          </div>

          {/* Hero Title */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-6 leading-tight">
            Comfortable <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 bg-clip-text text-transparent">2-Room Flat</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-2xl text-gray-300 max-w-3xl mx-auto font-light leading-relaxed mb-8">
            A clean, comfortable and secure place for your stay.
          </p>

          {/* Property Stats Pill */}
          <div className="inline-flex flex-wrap items-center justify-center gap-3 sm:gap-6 px-6 py-3 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-slate-700/70 text-gray-200 text-sm font-medium mb-10 shadow-2xl">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-400" />
              <span>1 Flat</span>
            </div>
            <span className="text-slate-600">•</span>
            <div className="flex items-center gap-2">
              <BedDouble className="w-4 h-4 text-amber-400" />
              <span>2 Rooms</span>
            </div>
            <span className="text-slate-600">•</span>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              <span>Up to 10 Persons</span>
            </div>
          </div>

          {/* Hero Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <button
              onClick={() => openBookingFor('both')}
              className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-base text-slate-950 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:brightness-110 shadow-xl shadow-amber-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <BedDouble className="w-5 h-5" />
              <span>BOOK NOW</span>
            </button>

            <Link
              href="#flat"
              className="w-full sm:w-auto px-8 py-4 rounded-xl font-semibold text-base text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <span>VIEW FLAT</span>
              <ArrowRight className="w-4 h-4 text-amber-400" />
            </Link>
          </div>

        </div>
      </section>

      {/* 2. FLAT DETAILS & ROOM CONFIGURATION */}
      <section id="flat" className="py-20 bg-slate-900/50 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <div className="inline-flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
                <Building2 className="w-4 h-4" />
                <span>Property Details</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white">
                Flat & Room Configuration
              </h2>
            </div>
            <p className="text-sm text-gray-400 max-w-md mt-3 md:mt-0">
              The property contains 1 entire flat with 2 dedicated double bed rooms accommodating up to 10 guests.
            </p>
          </div>

          {/* Property Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            
            <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/80 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Property</p>
                <h3 className="text-xl font-bold text-white">1 Flat</h3>
                <p className="text-xs text-gray-400">Private accommodation</p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/80 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <BedDouble className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Rooms</p>
                <h3 className="text-xl font-bold text-white">2 Rooms</h3>
                <p className="text-xs text-gray-400">Both Double Bed Rooms</p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/80 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Maximum Capacity</p>
                <h3 className="text-xl font-bold text-white">10 Persons</h3>
                <p className="text-xs text-gray-400">Full flat occupancy</p>
              </div>
            </div>

          </div>

          {/* Rooms Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Room 1 Card */}
            <div className="group rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 transition-all overflow-hidden shadow-xl">
              <div className="relative h-64 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80"
                  alt="Room 1 — Double Bed Room"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-amber-500/30 text-amber-300 text-xs font-bold">
                  Room 1
                </div>
                <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-gray-300 text-xs font-medium">
                  Up to 5 Persons
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <h3 className="text-2xl font-bold text-white">Room 1 — Double Bed Room</h3>
                  <p className="text-xs text-amber-400/90 font-medium mt-1">Master Double Bedroom with Ensuite Bath</p>
                </div>

                <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                  Spacious master bedroom featuring a plush double bed, premium orthopedic mattress, private attached bathroom with instant hot water, silent air conditioning, and bedside USB charging points.
                </p>

                <div className="grid grid-cols-2 gap-2 pt-2 text-xs text-gray-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Plush Double Bed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Attached Bathroom</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Silent Air Conditioning</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>High-Speed Wi-Fi</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-gray-400">Available for single-room booking</span>
                  <button
                    onClick={() => openBookingFor('room1')}
                    className="px-5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-amber-400 hover:brightness-110 active:scale-95 transition-all"
                  >
                    Book Room 1
                  </button>
                </div>
              </div>
            </div>

            {/* Room 2 Card */}
            <div className="group rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 transition-all overflow-hidden shadow-xl">
              <div className="relative h-64 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80"
                  alt="Room 2 — Double Bed Room"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-amber-500/30 text-amber-300 text-xs font-bold">
                  Room 2
                </div>
                <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-gray-300 text-xs font-medium">
                  Up to 5 Persons
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <h3 className="text-2xl font-bold text-white">Room 2 — Double Bed Room</h3>
                  <p className="text-xs text-amber-400/90 font-medium mt-1">Comfort Double Bedroom with Smart Television</p>
                </div>

                <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                  Cozy second double bedroom furnished with a comfortable double bed, pristine linens, climate-controlled air conditioning, attached bathroom, work desk, and 55" Smart UHD Television.
                </p>

                <div className="grid grid-cols-2 gap-2 pt-2 text-xs text-gray-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Comfort Double Bed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Attached Bathroom</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>55" Smart TV</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>High-Speed Wi-Fi</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-gray-400">Available for single-room booking</span>
                  <button
                    onClick={() => openBookingFor('room2')}
                    className="px-5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-amber-400 hover:brightness-110 active:scale-95 transition-all"
                  >
                    Book Room 2
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* Book Both Rooms Full Flat Promo */}
          <div className="mt-8 p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-amber-500/20 via-slate-900 to-amber-500/10 border border-amber-500/30 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Ultimate Stay</span>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-1">Book Both Rooms (Full Flat Access)</h3>
              <p className="text-xs sm:text-sm text-gray-300 mt-1 max-w-xl">
                Enjoy exclusive access to the entire flat including Room 1, Room 2, fully equipped kitchen, and dining lounge for up to 10 persons.
              </p>
            </div>
            <button
              onClick={() => openBookingFor('both')}
              className="px-8 py-3.5 rounded-xl font-bold text-sm text-slate-950 bg-amber-400 hover:brightness-110 shadow-lg shadow-amber-400/20 shrink-0 active:scale-95 transition-all"
            >
              BOOK BOTH ROOMS
            </button>
          </div>

        </div>
      </section>

      {/* 3. FACILITIES & SAFETY */}
      <section id="facilities" className="py-20 bg-slate-950 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
              <ShieldCheck className="w-4 h-4" />
              <span>Amenities & Standards</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Facilities & Safety Features
            </h2>
            <p className="text-sm text-gray-400">
              Thoughtfully curated for total relaxation, convenience, and complete safety. All facilities are maintained in real-time.
            </p>
          </div>

          {/* Facilities Grid */}
          {loadingFacilities ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-28 rounded-xl bg-slate-900 border border-slate-800 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {facilities.map((fac) => (
                <div
                  key={fac.id}
                  className="p-5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-amber-500/40 hover:bg-slate-900 transition-all group shadow-sm"
                >
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3 group-hover:scale-110 transition-transform">
                    <FacilityIcon name={fac.icon} className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-white">{fac.name}</h4>
                  <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">{fac.description}</p>
                </div>
              ))}
            </div>
          )}

        </div>
      </section>

      {/* 4. QUICK BOOKING BANNER CTA */}
      <section className="py-16 bg-gradient-to-b from-slate-900 to-slate-950 border-t border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
            <Building2 className="w-7 h-7" />
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold text-white">
            Ready to reserve your stay?
          </h2>
          <p className="text-sm sm:text-base text-gray-300 max-w-2xl mx-auto font-light">
            Select your dates and times to lock your reservation directly in our system. Quick, reliable, and instant confirmation.
          </p>
          <div className="pt-2">
            <button
              onClick={() => openBookingFor('both')}
              className="px-10 py-4 rounded-xl font-bold text-base text-slate-950 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:brightness-110 shadow-xl shadow-amber-500/25 active:scale-95 transition-all inline-flex items-center gap-2"
            >
              <BedDouble className="w-5 h-5" />
              <span>BOOK NOW</span>
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />

      {/* Interactive Booking Flow Modal */}
      <BookingFlowModal
        isOpen={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        initialRoomSelection={selectedRoomOption}
      />
    </div>
  );
}
