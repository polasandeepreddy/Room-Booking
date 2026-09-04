'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  Building2, 
  BedDouble, 
  Calendar, 
  Clock, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ArrowLeft, 
  X, 
  Sparkles, 
  ShieldCheck, 
  User as UserIcon, 
  Phone, 
  Mail,
  ChevronDown,
  Ban,
  DoorOpen
} from 'lucide-react';
import { Booking, RoomSelectionOption } from '@/lib/types';
import { formatDateDDMMYYYY, formatTime12H, getTimeOptions } from '@/lib/format';

interface BookingFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRoomSelection?: RoomSelectionOption;
}

export function BookingFlowModal({
  isOpen,
  onClose,
  initialRoomSelection = 'auto',
}: BookingFlowModalProps) {
  const { user, refreshUser } = useAuth();
  const router = useRouter();

  const timeOptions = getTimeOptions();

  // Multi-step state: 1 (Guest Info), 2 (Dates, Room Dropdown & Capacity), 3 (Review & Summary), 4 (Confirmed)
  const [step, setStep] = useState<number>(1);

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');

  // Date & Time states
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const [checkInDate, setCheckInDate] = useState(todayStr);
  const [checkInTime, setCheckInTime] = useState('14:00');
  const [checkOutDate, setCheckOutDate] = useState(tomorrowStr);
  const [checkOutTime, setCheckOutTime] = useState('11:00');

  // Room selection dropdown: 'auto', 'room1', 'room2', 'both'
  const [selectedRoomOption, setSelectedRoomOption] = useState<RoomSelectionOption>(initialRoomSelection);
  const [numberOfPersons, setNumberOfPersons] = useState<number>(2);
  const [specialRequests, setSpecialRequests] = useState('');

  // Availability state
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityResult, setAvailabilityResult] = useState<{
    isAvailable: boolean;
    message: string;
    room1Available?: boolean;
    room2Available?: boolean;
    bothAvailable?: boolean;
    autoAssignedRoomDisplay?: string;
    conflictingBookings?: {
      booking_id: string;
      room_id: number;
      room_name?: string;
      check_in: string;
      check_out: string;
      check_in_at?: string;
      check_out_at?: string;
    }[];
    existingBookingsOnDates?: {
      booking_id: string;
      room_id: number;
      room_name: string;
      check_in_date: string;
      check_in_time: string;
      check_out_date: string;
      check_out_time: string;
      check_in_at: string;
      check_out_at: string;
      status: string;
    }[];
  } | null>(null);

  // Submission & Confirmed booking state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedRoomOption(initialRoomSelection);
      setErrorMessage('');
      setStep(1);
      setConfirmedBooking(null);
      if (user) {
        setFullName(user.fullName || user.full_name || '');
        setEmail(user.email || '');
        setMobileNumber(user.mobileNumber || user.mobile_number || '');
      }
    }
  }, [isOpen, initialRoomSelection, user]);

  // Adjust number of persons when room option changes
  useEffect(() => {
    if (selectedRoomOption !== 'both' && numberOfPersons > 5) {
      setNumberOfPersons(5);
    }
  }, [selectedRoomOption, numberOfPersons]);

  // Check real-time availability whenever dates/times/rooms change
  useEffect(() => {
    if (!isOpen) return;
    if (!checkInDate || !checkInTime || !checkOutDate || !checkOutTime) return;

    const checkAvail = async () => {
      setCheckingAvailability(true);
      try {
        const res = await fetch('/api/availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            flatId: 1,
            roomOption: selectedRoomOption,
            checkInDate,
            checkInTime,
            checkOutDate,
            checkOutTime,
          }),
        });

        const data = await res.json();
        setAvailabilityResult({
          isAvailable: !!data.isAvailable,
          message: data.message || '',
          room1Available: data.room1Available,
          room2Available: data.room2Available,
          bothAvailable: data.bothAvailable,
          autoAssignedRoomDisplay: data.autoAssignedRoomDisplay,
          conflictingBookings: data.conflictingBookings || [],
          existingBookingsOnDates: data.existingBookingsOnDates || [],
        });
      } catch (err) {
        setAvailabilityResult({
          isAvailable: false,
          message: 'Unable to verify availability right now.',
        });
      } finally {
        setCheckingAvailability(false);
      }
    };

    const timer = setTimeout(checkAvail, 200);
    return () => clearTimeout(timer);
  }, [isOpen, checkInDate, checkInTime, checkOutDate, checkOutTime, selectedRoomOption]);

  if (!isOpen) return null;

  // Derived room availability states
  const room1Free = availabilityResult?.room1Available ?? true;
  const room2Free = availabilityResult?.room2Available ?? true;
  const entireFlatFree = room1Free && room2Free;
  const allRoomsBlocked = !room1Free && !room2Free;

  const isCurrentSelectionBlocked =
    allRoomsBlocked ||
    (selectedRoomOption === 'both' && !entireFlatFree) ||
    (selectedRoomOption === 'room1' && !room1Free) ||
    (selectedRoomOption === 'room2' && !room2Free) ||
    (selectedRoomOption === 'auto' && !room1Free && !room2Free);

  const handleNextStep = () => {
    setErrorMessage('');

    if (step === 1) {
      if (!fullName.trim()) {
        setErrorMessage('Please enter your full name.');
        return;
      }
      if (!email.trim() || !email.includes('@')) {
        setErrorMessage('Please enter a valid email address.');
        return;
      }
      if (!mobileNumber.trim() || mobileNumber.trim().length < 8) {
        setErrorMessage('Please enter a valid mobile number.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      const checkInDT = new Date(`${checkInDate}T${checkInTime}`);
      const checkOutDT = new Date(`${checkOutDate}T${checkOutTime}`);

      if (checkOutDT <= checkInDT) {
        setErrorMessage('Check-out date and time must be after check-in date and time.');
        return;
      }

      if (allRoomsBlocked) {
        setErrorMessage('Both rooms are unavailable for the selected date and time. Please select a different date or time.');
        return;
      }

      if (isCurrentSelectionBlocked) {
        setErrorMessage('The selected room option is already booked for this schedule. Please select an available room from the dropdown or change your dates.');
        return;
      }

      if (numberOfPersons < 1 || numberOfPersons > 10) {
        setErrorMessage('Maximum capacity is 10 persons (Minimum 1).');
        return;
      }

      if ((selectedRoomOption === 'room1' || selectedRoomOption === 'room2' || selectedRoomOption === 'auto') && numberOfPersons > 5) {
        setErrorMessage('Single room capacity is maximum 5 persons. For more guests, please select Both Rooms.');
        return;
      }

      setStep(3); // Go to Review
    }
  };

  const handleConfirmBooking = async () => {
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flatId: 1,
          roomOption: selectedRoomOption,
          fullName: fullName.trim(),
          email: email.trim(),
          mobileNumber: mobileNumber.trim(),
          checkInDate,
          checkInTime,
          checkOutDate,
          checkOutTime,
          numberOfPersons: Number(numberOfPersons),
          specialRequests: specialRequests.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Both rooms are unavailable for the selected date and time. Please select a different date or time.');
        setIsSubmitting(false);
        return;
      }

      setConfirmedBooking(data.booking);
      setStep(4); // Confirmed screen

      try {
        await refreshUser?.();
      } catch (e) {}

      try {
        const confetti = (await import('canvas-confetti')).default;
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
        });
      } catch (e) {}
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to complete booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl bg-slate-800 text-gray-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Multi-step Header */}
        {step < 4 && (
          <div className="mb-6 pr-10">
            <div className="flex items-center justify-between text-xs font-semibold mb-2">
              <span className={step >= 1 ? 'text-amber-400 font-bold' : 'text-gray-500'}>1. Guest Info</span>
              <span className={step >= 2 ? 'text-amber-400 font-bold' : 'text-gray-500'}>2. Dates & Rooms</span>
              <span className={step >= 3 ? 'text-amber-400 font-bold' : 'text-gray-500'}>3. Summary</span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-300"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block mb-0.5">Booking Notice</span>
              <span className="text-xs">{errorMessage}</span>
            </div>
          </div>
        )}

        {/* STEP 1: GUEST DETAILS */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-white">Guest Information</h2>
              <p className="text-xs text-gray-400 mt-1">Please provide your contact details for booking confirmation.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Full Name *</label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter full name"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Email Address *</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Mobile Number *</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: DATES, ROOM SELECTION & CAPACITY */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-white">Select Dates & Room</h2>
              <p className="text-xs text-gray-400 mt-0.5">Schedule your stay. Only the exact booked hours are blocked; remaining hours stay fully available.</p>
            </div>

            {/* Check-In & Check-Out Times */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Check-In */}
              <div className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-700 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-amber-400">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> Check-In Date
                  </span>
                  {checkInDate && (
                    <span className="font-mono text-[11px] text-amber-300">
                      {formatDateDDMMYYYY(checkInDate)}
                    </span>
                  )}
                </div>
                <input
                  type="date"
                  min={todayStr}
                  value={checkInDate}
                  onChange={(e) => setCheckInDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                />
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] text-gray-400">Check-in Time</label>
                    <span className="text-[10px] text-amber-400 font-mono font-semibold">
                      {formatTime12H(checkInTime)}
                    </span>
                  </div>
                  <select
                    value={checkInTime}
                    onChange={(e) => setCheckInTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    {timeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Check-Out */}
              <div className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-700 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-amber-400">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> Check-Out Date
                  </span>
                  {checkOutDate && (
                    <span className="font-mono text-[11px] text-amber-300">
                      {formatDateDDMMYYYY(checkOutDate)}
                    </span>
                  )}
                </div>
                <input
                  type="date"
                  min={checkInDate || todayStr}
                  value={checkOutDate}
                  onChange={(e) => setCheckOutDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                />
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] text-gray-400">Check-out Time</label>
                    <span className="text-[10px] text-amber-400 font-mono font-semibold">
                      {formatTime12H(checkOutTime)}
                    </span>
                  </div>
                  <select
                    value={checkOutTime}
                    onChange={(e) => setCheckOutTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    {timeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Visual Day Schedule & Available Time-Slots Breakdown */}
            {availabilityResult?.existingBookingsOnDates && availabilityResult.existingBookingsOnDates.length > 0 ? (
              <div className="p-3.5 bg-slate-800/40 rounded-xl border border-slate-700 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Schedule on Selected Dates
                  </span>
                  <span className="text-[10px] text-gray-400">Exact time-blocks reserved</span>
                </div>

                <div className="space-y-1.5">
                  {availabilityResult.existingBookingsOnDates.map((b, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-slate-900/80 border border-slate-700/60 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                        <div>
                          <span className="font-bold text-white">{b.room_name}</span>
                          <span className="text-gray-400 ml-1.5">
                            Booked: {formatDateDDMMYYYY(b.check_in_date)} ({formatTime12H(b.check_in_time)}) → {formatDateDDMMYYYY(b.check_out_date)} ({formatTime12H(b.check_out_time)})
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-semibold uppercase">
                        Booked
                      </span>
                    </div>
                  ))}
                </div>

                <p className="text-[11px] text-emerald-400/90 pt-1">
                  ✓ Remaining hours before and after booked slots are available and can be booked.
                </p>
              </div>
            ) : null}

            {/* Room Availability Live Cards */}
            <div className="grid grid-cols-2 gap-2.5">
              <div
                className={`p-3 rounded-xl border text-xs transition-all ${
                  room1Free
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">Room 1</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                    room1Free ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                  }`}>
                    {room1Free ? 'Available' : 'Occupied'}
                  </span>
                </div>
                <span className="text-[10px] block mt-0.5 text-gray-400">
                  {room1Free ? 'Room 1 — Available for selected interval' : 'Room 1 — Booked during this interval'}
                </span>
              </div>

              <div
                className={`p-3 rounded-xl border text-xs transition-all ${
                  room2Free
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">Room 2</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                    room2Free ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                  }`}>
                    {room2Free ? 'Available' : 'Occupied'}
                  </span>
                </div>
                <span className="text-[10px] block mt-0.5 text-gray-400">
                  {room2Free ? 'Room 2 — Available for selected interval' : 'Room 2 — Booked during this interval'}
                </span>
              </div>
            </div>

            {/* Room Option Dropdown */}
            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 space-y-3">
              <div>
                <label className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <BedDouble className="w-3.5 h-3.5" />
                  <span>Select Room Option *</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedRoomOption}
                    onChange={(e) => setSelectedRoomOption(e.target.value as RoomSelectionOption)}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-600 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer appearance-none"
                  >
                    <option value="auto" disabled={allRoomsBlocked}>
                      {room1Free && room2Free
                        ? '⚡ Auto-Assign Available Room (Room 1 or Room 2)'
                        : room1Free
                        ? '⚡ Auto-Assign Available Room (Will assign Room 1)'
                        : room2Free
                        ? '⚡ Auto-Assign Available Room (Will assign Room 2)'
                        : '⚡ Auto-Assign — 🚫 BLOCKED (Both Rooms Occupied for this time)'}
                    </option>
                    <option value="room1" disabled={!room1Free}>
                      {room1Free
                        ? 'Room 1 (Master Double Bed) — Max 5 Guests [Available]'
                        : 'Room 1 (Master Double Bed) — 🚫 BLOCKED (Occupied for this time)'}
                    </option>
                    <option value="room2" disabled={!room2Free}>
                      {room2Free
                        ? 'Room 2 (Comfort Double Bed) — Max 5 Guests [Available]'
                        : 'Room 2 (Comfort Double Bed) — 🚫 BLOCKED (Occupied for this time)'}
                    </option>
                    <option value="both" disabled={!entireFlatFree}>
                      {entireFlatFree
                        ? 'Both Rooms (Entire Flat: Room 1 & 2) — Max 10 Guests [Available]'
                        : 'Both Rooms (Entire Flat) — 🚫 BLOCKED (Requires Both Rooms Free)'}
                    </option>
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {allRoomsBlocked ? (
                <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <Ban className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Both rooms are unavailable for this specific time interval. Please choose remaining available hours or different dates.</span>
                </div>
              ) : isCurrentSelectionBlocked ? (
                <div className="p-3 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    {selectedRoomOption === 'both'
                      ? 'Both rooms are required for this option, but one room is booked. You can book the other room or change time.'
                      : 'The selected room is occupied for this time slot. The other room is available or select Auto-Assign.'}
                  </span>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>
                      {selectedRoomOption === 'both'
                        ? 'Both Room 1 & 2 are free for this time slot'
                        : selectedRoomOption === 'auto'
                        ? `Auto-Assign ready: Will assign ${room1Free ? 'Room 1' : 'Room 2'}`
                        : `${selectedRoomOption === 'room1' ? 'Room 1' : 'Room 2'} is free for this time slot`}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20">
                    Available
                  </span>
                </div>
              )}
            </div>

            {/* Capacity Controls */}
            <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700 flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-white flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-amber-400" />
                  <span>Number of Guests</span>
                </label>
                <span className="text-[10px] text-gray-400">
                  {selectedRoomOption === 'both' ? 'Max 10 persons' : 'Max 5 persons per room'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setNumberOfPersons(Math.max(1, numberOfPersons - 1))}
                  className="w-8 h-8 rounded-lg bg-slate-700 text-white font-bold hover:bg-slate-600 flex items-center justify-center text-xs"
                >
                  -
                </button>
                <span className="text-sm font-bold text-amber-400 w-6 text-center">
                  {numberOfPersons}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const maxLimit = selectedRoomOption === 'both' ? 10 : 5;
                    setNumberOfPersons(Math.min(maxLimit, numberOfPersons + 1));
                  }}
                  className="w-8 h-8 rounded-lg bg-slate-700 text-white font-bold hover:bg-slate-600 flex items-center justify-center text-xs"
                >
                  +
                </button>
              </div>
            </div>

            {/* Special Requests */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Special Requests (Optional)</label>
              <textarea
                rows={2}
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                placeholder="Any special notes or requirements..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>
        )}

        {/* STEP 3: REVIEW & CONFIRM */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-white">Review Reservation</h2>
              <p className="text-xs text-gray-400 mt-0.5">Please verify your booking details.</p>
            </div>

            <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-700 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                <span className="text-white font-bold">1 BHK Luxury Flat (2 Rooms)</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                  <ShieldCheck className="w-3 h-3" /> Guaranteed
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-400 block text-[10px]">Guest Name</span>
                  <span className="font-semibold text-white">{fullName}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Mobile</span>
                  <span className="font-semibold text-white">{mobileNumber}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Room Option</span>
                  <span className="font-semibold text-amber-300">
                    {selectedRoomOption === 'both'
                      ? 'Both Rooms (1 & 2)'
                      : selectedRoomOption === 'room1'
                      ? 'Room 1'
                      : selectedRoomOption === 'room2'
                      ? 'Room 2'
                      : `Auto-Assign (${room1Free ? 'Room 1' : 'Room 2'})`}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Total Guests</span>
                  <span className="font-semibold text-white">{numberOfPersons} Person(s)</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Check-In</span>
                  <span className="font-semibold text-white">
                    {formatDateDDMMYYYY(checkInDate)} at {formatTime12H(checkInTime)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Check-Out</span>
                  <span className="font-semibold text-white">
                    {formatDateDDMMYYYY(checkOutDate)} at {formatTime12H(checkOutTime)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: SUCCESSFUL CONFIRMATION */}
        {step === 4 && confirmedBooking && (
          <div className="text-center py-4 space-y-5 animate-in zoom-in-95 duration-300">
            {/* Success Icon */}
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-500/10 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold uppercase tracking-wider mb-2">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Booking Successful</span>
              </div>
              <h2 className="text-2xl font-bold text-white">Reservation Confirmed!</h2>
              <p className="text-xs text-gray-400 mt-1">Your room has been locked and booking is confirmed.</p>
            </div>

            {/* Booking Summary Box */}
            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 text-xs space-y-3 text-left">
              <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                <span className="text-gray-400">Booking Reference:</span>
                <span className="text-amber-400 font-mono font-bold text-sm tracking-wide">{confirmedBooking.booking_id}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                <span className="text-gray-400">Guest Name:</span>
                <span className="text-white font-medium">{confirmedBooking.full_name || fullName}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                <span className="text-gray-400">Assigned Room:</span>
                <span className="text-emerald-400 font-bold">{confirmedBooking.rooms_display}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] pb-2 border-b border-slate-700">
                <div>
                  <span className="text-gray-400 block text-[10px]">Check-In</span>
                  <span className="text-white font-medium">
                    {formatDateDDMMYYYY(confirmedBooking.check_in_date)} at {formatTime12H(confirmedBooking.check_in_time)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Check-Out</span>
                  <span className="text-white font-medium">
                    {formatDateDDMMYYYY(confirmedBooking.check_out_date)} at {formatTime12H(confirmedBooking.check_out_time)}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Total Guests:</span>
                <span className="text-white font-semibold">{confirmedBooking.number_of_persons} Person(s)</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  router.push('/my-bookings');
                }}
                className="flex-1 py-3 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs hover:brightness-110 shadow-lg shadow-amber-400/20 transition-all text-center"
              >
                View My Bookings
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 rounded-xl bg-slate-800 text-gray-200 font-semibold text-xs hover:bg-slate-700 border border-slate-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* Modal Navigation Buttons */}
        {step < 4 && (
          <div className="flex items-center justify-between pt-5 mt-5 border-t border-slate-800">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 bg-slate-800 hover:bg-slate-700 border border-slate-700"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={handleNextStep}
                disabled={step === 2 && (isCurrentSelectionBlocked || allRoomsBlocked)}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-amber-400 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmBooking}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-amber-400 hover:brightness-110 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Reserving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirm Booking</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
