'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Building2, 
  BedDouble, 
  Users, 
  ShieldCheck, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight,
  Utensils,
  Armchair,
  Bath,
  Wifi,
  Wind
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { BookingFlowModal } from '@/components/BookingFlowModal';
import { Flat, Room } from '@/lib/types';

export default function FlatDetailsPage() {
  const [flat, setFlat] = useState<Flat | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [roomSelection, setRoomSelection] = useState<'room1' | 'room2' | 'both'>('both');

  useEffect(() => {
    fetch('/api/flats')
      .then((res) => res.json())
      .then((data) => {
        if (data.flat) {
          setFlat(data.flat);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openBooking = (opt: 'room1' | 'room2' | 'both') => {
    setRoomSelection(opt);
    setBookingModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-amber-500 selection:text-slate-950">
      <Navbar onOpenBooking={() => openBooking('both')} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header Breadcrumb & Title */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
            <Link href="/" className="hover:text-amber-400">Home</Link>
            <span>/</span>
            <span className="text-amber-400 font-medium">Flat Details</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold text-white">
            Comfortable 2-Room Flat
          </h1>
          <p className="text-sm sm:text-base text-gray-400 mt-2">
            1 Flat • 2 Rooms • Maximum Capacity: 10 Persons
          </p>
        </div>

        {/* Hero Gallery Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <div className="md:col-span-2 h-[350px] sm:h-[450px] rounded-2xl overflow-hidden shadow-xl border border-slate-800">
            <img
              src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1600&q=80"
              alt="Flat Living & Interior"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-1 gap-4 h-[350px] sm:h-[450px]">
            <div className="h-full rounded-2xl overflow-hidden shadow-xl border border-slate-800">
              <img
                src="https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80"
                alt="Room 1"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="h-full rounded-2xl overflow-hidden shadow-xl border border-slate-800">
              <img
                src="https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80"
                alt="Room 2"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Overview Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
            <Building2 className="w-5 h-5 text-amber-400 mx-auto mb-1.5" />
            <span className="text-xs text-gray-400 block">Property</span>
            <span className="text-base font-bold text-white">1 Private Flat</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
            <BedDouble className="w-5 h-5 text-amber-400 mx-auto mb-1.5" />
            <span className="text-xs text-gray-400 block">Bedrooms</span>
            <span className="text-base font-bold text-white">2 Double Beds</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
            <Users className="w-5 h-5 text-amber-400 mx-auto mb-1.5" />
            <span className="text-xs text-gray-400 block">Max Occupancy</span>
            <span className="text-base font-bold text-white">10 Persons</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
            <ShieldCheck className="w-5 h-5 text-amber-400 mx-auto mb-1.5" />
            <span className="text-xs text-gray-400 block">Security</span>
            <span className="text-base font-bold text-white">24/7 Monitored</span>
          </div>
        </div>

        {/* Detailed Room Configurations */}
        <div className="space-y-8 mb-16">
          <div>
            <h2 className="text-2xl font-bold text-white">Room Configuration</h2>
            <p className="text-xs text-gray-400 mt-1">
              Explore the two double bed rooms available within the flat.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Room 1 */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="h-56 rounded-xl overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1000&q=80"
                  alt="Room 1"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Room 1</span>
                <span className="text-xs text-gray-400">Up to 5 Persons</span>
              </div>
              <h3 className="text-xl font-bold text-white">Room 1 — Double Bed Room</h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                Spacious master bedroom featuring a plush double bed, premium mattress, private attached bathroom with hot water geyser, silent air conditioning, large acoustic window, and bedside USB charging ports.
              </p>
              <div className="space-y-2 pt-2 text-xs text-gray-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  <span>Plush Orthopedic Double Bed</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  <span>Ensuite Bathroom with 24/7 Hot Water</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  <span>Dual Inverter Climate Control AC</span>
                </div>
              </div>
              <button
                onClick={() => openBooking('room1')}
                className="w-full py-3 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs hover:brightness-110 active:scale-95 transition-all mt-4"
              >
                Book Room 1
              </button>
            </div>

            {/* Room 2 */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="h-56 rounded-xl overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1000&q=80"
                  alt="Room 2"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Room 2</span>
                <span className="text-xs text-gray-400">Up to 5 Persons</span>
              </div>
              <h3 className="text-xl font-bold text-white">Room 2 — Double Bed Room</h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                Cozy second double bedroom furnished with a comfortable double bed, pristine linens, climate-controlled air conditioning, attached ensuite bathroom, reading desk, and high-definition smart television.
              </p>
              <div className="space-y-2 pt-2 text-xs text-gray-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  <span>Comfort Double Bed with 400TC Linens</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  <span>55" 4K Smart UHD Television</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  <span>Dedicated Work Desk & Fast Wi-Fi</span>
                </div>
              </div>
              <button
                onClick={() => openBooking('room2')}
                className="w-full py-3 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs hover:brightness-110 active:scale-95 transition-all mt-4"
              >
                Book Room 2
              </button>
            </div>

          </div>
        </div>

        {/* Common Flat Spaces (Kitchen & Dining) */}
        <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 space-y-6 mb-16">
          <div>
            <h2 className="text-xl font-bold text-white">Shared & Common Living Amenities</h2>
            <p className="text-xs text-gray-400 mt-1">Included with every flat booking for complete comfort.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-gray-300">
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700 space-y-2">
              <Utensils className="w-6 h-6 text-amber-400" />
              <h4 className="font-bold text-white text-sm">Modular Kitchen</h4>
              <p className="text-gray-400">Microwave oven, induction cooktop, refrigerator, electric kettle, and cookware.</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700 space-y-2">
              <Armchair className="w-6 h-6 text-amber-400" />
              <h4 className="font-bold text-white text-sm">Dining & Lounge</h4>
              <p className="text-gray-400">Spacious dining table, ergonomic seating, and ambient lighting for group meals.</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700 space-y-2">
              <ShieldCheck className="w-6 h-6 text-amber-400" />
              <h4 className="font-bold text-white text-sm">Safe & Private</h4>
              <p className="text-gray-400">Smart electronic lock access, CCTV corridor coverage, and emergency support.</p>
            </div>
          </div>
        </div>

        {/* Book Now Floating/Bottom Action */}
        <div className="text-center bg-gradient-to-r from-amber-500/10 via-slate-900 to-amber-500/10 p-8 rounded-2xl border border-amber-500/30">
          <h3 className="text-2xl font-bold text-white mb-2">Book Your Accommodation</h3>
          <p className="text-xs sm:text-sm text-gray-300 max-w-lg mx-auto mb-6">
            Reserve Room 1, Room 2, or Both Rooms directly. Real-time availability verified instantly.
          </p>
          <button
            onClick={() => openBooking('both')}
            className="px-8 py-3.5 rounded-xl font-bold text-sm text-slate-950 bg-amber-400 hover:brightness-110 shadow-lg shadow-amber-400/20 active:scale-95 transition-all inline-flex items-center gap-2"
          >
            <BedDouble className="w-4 h-4" />
            <span>BOOK BOTH ROOMS</span>
          </button>
        </div>
      </main>

      <Footer />

      <BookingFlowModal
        isOpen={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        initialRoomSelection={roomSelection}
      />
    </div>
  );
}
