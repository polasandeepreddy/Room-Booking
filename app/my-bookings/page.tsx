'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { 
  CalendarCheck, 
  Building2, 
  BedDouble, 
  Users, 
  Calendar, 
  Clock, 
  AlertCircle, 
  AlertTriangle,
  CheckCircle2, 
  XCircle, 
  X, 
  Eye, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { Booking } from '@/lib/types';
import { formatDateDDMMYYYY, formatTime12H } from '@/lib/format';

export default function MyBookingsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelModalBooking, setCancelModalBooking] = useState<Booking | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchBookings = async () => {
    try {
      const res = await fetch('/api/bookings');
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login?redirect=my-bookings');
      } else {
        fetchBookings();
      }
    }
  }, [user, isLoading, router]);

  const handleCancelBooking = async (bookingId: string) => {
    setCancellingId(bookingId);
    setActionMessage(null);

    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setActionMessage({ type: 'error', text: data.error || 'Failed to cancel booking.' });
      } else {
        setActionMessage({ type: 'success', text: 'Booking has been cancelled successfully.' });
        setCancelModalBooking(null);
        if (selectedBooking?.booking_id === bookingId) {
          setSelectedBooking((prev) => (prev ? { ...prev, status: 'cancelled', cancelled_by: 'user' } : null));
        }
        await fetchBookings();
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Error occurred.' });
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusBadge = (status: string, cancelledBy?: string | null) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Confirmed</span>
          </span>
        );
      case 'cancelled':
        if (cancelledBy === 'admin') {
          return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/25 text-rose-200 border border-rose-500/40 shadow-sm shadow-rose-950/40">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>Cancelled by Admin</span>
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5" />
            <span>Cancelled</span>
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/15 text-blue-300 border border-blue-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Completed</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <span>{status}</span>
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-amber-500 selection:text-slate-950">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
              <Link href="/" className="hover:text-amber-400">Home</Link>
              <span>/</span>
              <span className="text-amber-400 font-medium">My Bookings</span>
            </div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <CalendarCheck className="w-8 h-8 text-amber-400" />
              <span>My Bookings</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">
              View and manage your active and past reservations.
            </p>
          </div>

          <Link
            href="/booking"
            className="px-5 py-2.5 rounded-xl font-bold text-xs text-slate-950 bg-amber-400 hover:brightness-110 shadow-lg shadow-amber-400/20 active:scale-95 transition-all inline-flex items-center gap-2 self-start sm:self-auto"
          >
            <BedDouble className="w-4 h-4" />
            <span>New Booking</span>
          </Link>
        </div>

        {/* Feedback Alert */}
        {actionMessage && (
          <div
            className={`mb-6 p-4 rounded-xl text-xs flex items-center justify-between ${
              actionMessage.type === 'success'
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
            }`}
          >
            <span>{actionMessage.text}</span>
            <button onClick={() => setActionMessage(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Content Area */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-44 rounded-2xl bg-slate-900 border border-slate-800 animate-pulse" />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          /* Empty State */
          <div className="py-20 px-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-center max-w-lg mx-auto shadow-xl">
            <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-gray-400 mx-auto mb-4">
              <CalendarCheck className="w-8 h-8 text-amber-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No bookings yet</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto mb-6 leading-relaxed">
              Book your stay and your booking will appear here.
            </p>
            <Link
              href="/booking"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-slate-950 bg-amber-400 hover:brightness-110 shadow-lg shadow-amber-400/20 active:scale-95 transition-all"
            >
              <span>BOOK NOW</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          /* Bookings List */
          <div className="space-y-4">
            {bookings.map((b) => (
              <div
                key={b.id}
                className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                      {b.booking_id}
                    </span>
                    {getStatusBadge(b.status, b.cancelled_by)}
                    <span className="text-xs text-gray-400">
                      Booked on {formatDateDDMMYYYY(b.created_at)}
                    </span>
                  </div>

                  {/* Prominent Admin Cancellation Alert Banner */}
                  {b.status === 'cancelled' && b.cancelled_by === 'admin' && (
                    <div className="p-3.5 bg-rose-950/40 border border-rose-500/40 rounded-xl flex items-start gap-3 text-rose-200">
                      <div className="p-1.5 bg-rose-500/20 rounded-lg text-rose-400 shrink-0 mt-0.5">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-rose-200 text-sm tracking-wide">
                            Admin canceled your room booking
                          </p>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            Canceled by Admin
                          </span>
                        </div>
                        {b.cancellation_reason && b.cancellation_reason.trim() !== '' && (
                          <p className="text-rose-200/90 text-xs">
                            <span className="text-rose-400 font-semibold">Reason / Note:</span> {b.cancellation_reason}
                          </p>
                        )}
                        {b.cancelled_at && (
                          <p className="text-rose-400/80 text-[11px]">
                            Cancelled on {formatDateDDMMYYYY(b.cancelled_at)} at {formatTime12H(b.cancelled_at)}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {b.status === 'cancelled' && b.cancelled_by !== 'admin' && (
                    <div className="p-3 bg-slate-800/80 border border-slate-700/80 rounded-xl flex items-center gap-2 text-xs text-gray-300">
                      <AlertCircle className="w-4 h-4 text-gray-400 shrink-0" />
                      <span>
                        Reservation cancelled by you
                        {b.cancelled_at ? ` on ${formatDateDDMMYYYY(b.cancelled_at)} at ${formatTime12H(b.cancelled_at)}` : ''}.
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-gray-300 pt-1">
                    <div>
                      <span className="text-gray-500 block">Accommodation</span>
                      <span className="text-white font-medium">1 Flat • {b.rooms_display}</span>
                    </div>

                    <div>
                      <span className="text-gray-500 block">Check-In</span>
                      <span className="text-white font-medium">{formatDateDDMMYYYY(b.check_in_date)} at {formatTime12H(b.check_in_time)}</span>
                    </div>

                    <div>
                      <span className="text-gray-500 block">Check-Out</span>
                      <span className="text-white font-medium">{formatDateDDMMYYYY(b.check_out_date)} at {formatTime12H(b.check_out_time)}</span>
                    </div>
                  </div>

                  <div className="text-xs text-gray-400 flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-amber-400" />
                    <span>Occupancy: <strong>{b.number_of_persons} Person(s)</strong></span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 border-t md:border-t-0 pt-3 md:pt-0 border-slate-800">
                  <button
                    onClick={() => setSelectedBooking(b)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700 flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Details</span>
                  </button>

                  {b.status === 'confirmed' && (
                    <button
                      onClick={() => setCancelModalBooking(b)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 transition-colors border border-rose-500/20"
                    >
                      Cancel Booking
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* VIEW DETAILS MODAL */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div>
                <span className="text-[11px] text-gray-400">Booking Details</span>
                <h3 className="text-lg font-bold text-white font-mono">{selectedBooking.booking_id}</h3>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Status:</span>
                {getStatusBadge(selectedBooking.status, selectedBooking.cancelled_by)}
              </div>

              {/* Cancellation Detail Box */}
              {selectedBooking.status === 'cancelled' && (
                selectedBooking.cancelled_by === 'admin' ? (
                  <div className="p-4 bg-rose-950/40 border border-rose-500/40 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-rose-200 font-bold text-sm">
                      <div className="p-1.5 bg-rose-500/20 rounded-lg text-rose-400">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <span>Admin canceled your room booking</span>
                    </div>
                    <div className="pl-8 space-y-1 text-xs">
                      {selectedBooking.cancellation_reason && (
                        <p className="text-rose-200/90">
                          <strong className="text-rose-300">Reason / Note:</strong> {selectedBooking.cancellation_reason}
                        </p>
                      )}
                      {selectedBooking.cancelled_at && (
                        <p className="text-rose-400/80 text-[11px]">
                          <strong>Cancelled On:</strong> {formatDateDDMMYYYY(selectedBooking.cancelled_at)} at {formatTime12H(selectedBooking.cancelled_at)}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl flex items-center gap-2 text-xs text-gray-300">
                    <AlertCircle className="w-4 h-4 text-gray-400" />
                    <span>
                      This booking was cancelled by you
                      {selectedBooking.cancelled_at ? ` on ${formatDateDDMMYYYY(selectedBooking.cancelled_at)} at ${formatTime12H(selectedBooking.cancelled_at)}` : ''}.
                    </span>
                  </div>
                )
              )}

              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700 space-y-2">
                <h4 className="font-bold text-amber-400 uppercase tracking-wider">Accommodation</h4>
                <div className="flex justify-between">
                  <span className="text-gray-400">Flat:</span>
                  <span className="text-white font-medium">1 Flat (Comfortable 2-Room Flat)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Selected Rooms:</span>
                  <span className="text-white font-medium">{selectedBooking.rooms_display}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Persons:</span>
                  <span className="text-white font-medium">{selectedBooking.number_of_persons} Person(s)</span>
                </div>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700 space-y-2">
                <h4 className="font-bold text-amber-400 uppercase tracking-wider">Schedule</h4>
                <div className="flex justify-between">
                  <span className="text-gray-400">Check-In:</span>
                  <span className="text-white font-medium">{formatDateDDMMYYYY(selectedBooking.check_in_date)} at {formatTime12H(selectedBooking.check_in_time)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Check-Out:</span>
                  <span className="text-white font-medium">{formatDateDDMMYYYY(selectedBooking.check_out_date)} at {formatTime12H(selectedBooking.check_out_time)}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700 space-y-2">
                <h4 className="font-bold text-amber-400 uppercase tracking-wider">Guest Information</h4>
                <div className="flex justify-between">
                  <span className="text-gray-400">Name:</span>
                  <span className="text-white font-medium">{selectedBooking.full_name || user?.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Email:</span>
                  <span className="text-white font-medium">{selectedBooking.user_email || user?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Mobile:</span>
                  <span className="text-white font-medium">{selectedBooking.mobile_number || user?.mobileNumber || 'Not provided'}</span>
                </div>
              </div>

              {selectedBooking.special_requests && (
                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700">
                  <span className="text-gray-400 block mb-1">Special Requests:</span>
                  <span className="text-white">{selectedBooking.special_requests}</span>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedBooking(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 text-white font-semibold text-xs hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL BOOKING CONFIRMATION MODAL */}
      {cancelModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold text-white">Cancel Reservation?</h3>
              <p className="text-xs text-gray-400 mt-1">
                Are you sure you want to cancel booking <strong className="text-white font-mono">{cancelModalBooking.booking_id}</strong>?
              </p>
            </div>

            <div className="p-3 bg-slate-800 rounded-xl text-xs space-y-1 text-gray-300">
              <p><strong>Stay:</strong> {cancelModalBooking.check_in_date} to {cancelModalBooking.check_out_date}</p>
              <p><strong>Rooms:</strong> {cancelModalBooking.rooms_display}</p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCancelModalBooking(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-gray-300 font-semibold text-xs hover:bg-slate-700"
              >
                Keep Booking
              </button>
              <button
                type="button"
                disabled={cancellingId === cancelModalBooking.booking_id}
                onClick={() => handleCancelBooking(cancelModalBooking.booking_id)}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-500 disabled:opacity-50"
              >
                {cancellingId === cancelModalBooking.booking_id ? 'Cancelling...' : 'Yes, Cancel Booking'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
