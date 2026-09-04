'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  Building2, 
  LayoutDashboard, 
  CalendarCheck, 
  Calendar as CalendarIcon, 
  BedDouble, 
  Sparkles, 
  Users, 
  FileText, 
  Settings as SettingsIcon, 
  LogOut, 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  AlertTriangle,
  Eye, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Check, 
  X, 
  ShieldCheck, 
  DoorOpen,
  RefreshCw,
  Home
} from 'lucide-react';
import { AdminStats, Booking, Facility, Flat, Room, User } from '@/lib/types';
import { FacilityIcon } from '@/components/FacilityIcon';
import { formatDateDDMMYYYY, formatTime12H } from '@/lib/format';

export default function AdminDashboardPage() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'bookings' | 'calendar' | 'flats' | 'rooms' | 'facilities' | 'users' | 'reports' | 'settings'>('dashboard');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Dashboard Stats state
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Bookings state
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState('all');
  const [bookingRoomFilter, setBookingRoomFilter] = useState('all');
  const [bookingDateFilter, setBookingDateFilter] = useState('');
  const [bookingPage, setBookingPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [viewBookingModal, setViewBookingModal] = useState<Booking | null>(null);
  const [adminCancelModalBooking, setAdminCancelModalBooking] = useState<Booking | null>(null);
  const [adminCancelReason, setAdminCancelReason] = useState('Admin canceled your room booking');
  const [adminCancelling, setAdminCancelling] = useState(false);
  const [adminDeleteModalBooking, setAdminDeleteModalBooking] = useState<Booking | null>(null);
  const [adminDeleting, setAdminDeleting] = useState(false);
  const [adminCleanupModalOpen, setAdminCleanupModalOpen] = useState(false);
  const [adminCleaning, setAdminCleaning] = useState(false);

  // Calendar state
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day'>('month');
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState(false);

  // Flat state
  const [flatData, setFlatData] = useState<Flat | null>(null);
  const [flatSaving, setFlatSaving] = useState(false);

  // Rooms state
  const [roomsList, setRoomsList] = useState<Room[]>([]);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [newRoomModalOpen, setNewRoomModalOpen] = useState(false);
  const [newRoomData, setNewRoomData] = useState({
    roomName: '',
    roomType: 'Double Bed Room',
    description: '',
    capacity: 5,
    status: 'available',
    imageUrl: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
  });

  // Facilities state
  const [facilitiesList, setFacilitiesList] = useState<Facility[]>([]);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
  const [newFacilityModalOpen, setNewFacilityModalOpen] = useState(false);
  const [newFacilityData, setNewFacilityData] = useState({
    name: '',
    description: '',
    icon: 'Sparkles',
    status: 'active',
  });

  // Users state
  const [usersList, setUsersList] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [viewingUserBookings, setViewingUserBookings] = useState<{ user: User; bookings: any[] } | null>(null);
  const [newUserModalOpen, setNewUserModalOpen] = useState(false);
  const [newUserData, setNewUserData] = useState({
    fullName: '',
    email: '',
    mobileNumber: '',
    password: '',
    role: 'user' as 'user' | 'admin',
    status: 'active' as 'active' | 'inactive',
  });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUserData, setEditUserData] = useState({
    fullName: '',
    mobileNumber: '',
    role: 'user' as 'user' | 'admin',
    status: 'active' as 'active' | 'inactive',
    password: '',
  });

  // Reports state
  const [reportsData, setReportsData] = useState<any>(null);
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');

  // Settings state
  const [settingsMap, setSettingsMap] = useState<Record<string, string>>({});
  const [savingSettings, setSavingSettings] = useState(false);

  // Feedback Notification banner
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Auth Protection
  useEffect(() => {
    if (!isLoading) {
      if (!user || user.role !== 'admin') {
        router.push('/admin/login');
      } else {
        loadStats();
      }
    }
  }, [user, isLoading, router]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  // 1. Load Stats
  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch('/api/admin/stats');
      const data = await res.json();
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStats(false);
    }
  };

  // 2. Load Bookings
  const loadBookings = async () => {
    setLoadingBookings(true);
    try {
      const params = new URLSearchParams({
        page: String(bookingPage),
        limit: '10',
        search: bookingSearch,
        status: bookingStatusFilter,
        roomId: bookingRoomFilter,
        date: bookingDateFilter,
      });

      const res = await fetch(`/api/admin/bookings?${params.toString()}`);
      const data = await res.json();
      if (data.bookings) {
        setBookings(data.bookings);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBookings(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'bookings') {
      loadBookings();
    }
  }, [activeTab, bookingPage, bookingSearch, bookingStatusFilter, bookingRoomFilter, bookingDateFilter]);

  // Update Booking Status
  const handleUpdateBookingStatus = async (bookingId: number, newStatus: string, cancellationReason?: string) => {
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          ...(newStatus === 'cancelled' ? { cancellationReason: cancellationReason || 'Admin canceled your room booking' } : {}),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification('success', `Booking status updated to ${newStatus}.`);
        loadBookings();
        loadStats();
        if (viewBookingModal?.id === bookingId) {
          setViewBookingModal(data.booking);
        }
        setAdminCancelModalBooking(null);
      } else {
        showNotification('error', data.error || 'Failed to update booking status.');
      }
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setAdminCancelling(false);
    }
  };

  // Delete a single booking permanently
  const handleDeleteBooking = async (bookingId: number) => {
    setAdminDeleting(true);
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification('success', data.message || 'Booking deleted permanently.');
        loadBookings();
        loadStats();
        if (viewBookingModal?.id === bookingId) {
          setViewBookingModal(null);
        }
        setAdminDeleteModalBooking(null);
      } else {
        showNotification('error', data.error || 'Failed to delete booking.');
      }
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setAdminDeleting(false);
    }
  };

  // Clean / Purge bookings older than 30 days
  const handlePurgeOldBookings = async (days: number = 30) => {
    setAdminCleaning(true);
    try {
      const res = await fetch('/api/admin/bookings/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification('success', data.message);
        loadBookings();
        loadStats();
        setAdminCleanupModalOpen(false);
      } else {
        showNotification('error', data.error || 'Failed to purge old bookings.');
      }
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setAdminCleaning(false);
    }
  };

  // 3. Load Calendar
  const loadCalendar = async () => {
    setLoadingCalendar(true);
    try {
      const res = await fetch('/api/admin/calendar');
      const data = await res.json();
      if (data.events) {
        setCalendarEvents(data.events);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCalendar(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'calendar') {
      loadCalendar();
    }
  }, [activeTab]);

  // 4. Load Flat
  const loadFlat = async () => {
    try {
      const res = await fetch('/api/admin/flats');
      const data = await res.json();
      if (data.flat) {
        setFlatData(data.flat);
      }
    } catch (err) {}
  };

  useEffect(() => {
    if (activeTab === 'flats') {
      loadFlat();
    }
  }, [activeTab]);

  const handleSaveFlat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flatData) return;
    setFlatSaving(true);
    try {
      const res = await fetch('/api/admin/flats', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flatName: flatData.flat_name,
          description: flatData.description,
          maxCapacity: flatData.max_capacity,
          status: flatData.status,
          imageUrl: flatData.image_url,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification('success', 'Flat information updated successfully.');
        setFlatData(data.flat);
      } else {
        showNotification('error', data.error || 'Failed to update flat.');
      }
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setFlatSaving(false);
    }
  };

  // 5. Load Rooms
  const loadRooms = async () => {
    try {
      const res = await fetch('/api/admin/rooms');
      const data = await res.json();
      if (data.rooms) {
        setRoomsList(data.rooms);
      }
    } catch (err) {}
  };

  useEffect(() => {
    if (activeTab === 'rooms') {
      loadRooms();
    }
  }, [activeTab]);

  const handleSaveRoom = async (room: Room) => {
    try {
      const res = await fetch('/api/admin/rooms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: room.id,
          roomName: room.room_name,
          roomType: room.room_type,
          description: room.description,
          capacity: room.capacity,
          status: room.status,
          imageUrl: room.image_url,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification('success', 'Room updated successfully.');
        setEditingRoom(null);
        loadRooms();
      } else {
        showNotification('error', data.error || 'Failed to update room.');
      }
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  // 6. Load Facilities
  const loadFacilities = async () => {
    try {
      const res = await fetch('/api/admin/facilities');
      const data = await res.json();
      if (data.facilities) {
        setFacilitiesList(data.facilities);
      }
    } catch (err) {}
  };

  useEffect(() => {
    if (activeTab === 'facilities') {
      loadFacilities();
    }
  }, [activeTab]);

  const handleAddFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/facilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFacilityData),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification('success', 'Facility added successfully.');
        setNewFacilityModalOpen(false);
        setNewFacilityData({ name: '', description: '', icon: 'Sparkles', status: 'active' });
        loadFacilities();
      } else {
        showNotification('error', data.error || 'Failed to add facility.');
      }
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  const handleUpdateFacility = async (facility: Facility) => {
    try {
      const res = await fetch('/api/admin/facilities', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(facility),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification('success', 'Facility updated.');
        setEditingFacility(null);
        loadFacilities();
      } else {
        showNotification('error', data.error || 'Failed to update facility.');
      }
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  const handleDeleteFacility = async (id: number) => {
    if (!confirm('Are you sure you want to delete this facility?')) return;
    try {
      const res = await fetch(`/api/admin/facilities?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        showNotification('success', 'Facility deleted.');
        loadFacilities();
      } else {
        showNotification('error', data.error || 'Failed to delete facility.');
      }
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  // 7. Load Users
  const loadUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (userSearch.trim()) params.append('search', userSearch.trim());
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const data = await res.json();
      if (data.users) {
        setUsersList(data.users);
      }
    } catch (err) {}
  };

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    }
  }, [activeTab, userSearch]);

  const handleToggleUserStatus = async (userId: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, status: nextStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification('success', `User set to ${nextStatus}.`);
        loadUsers();
      } else {
        showNotification('error', data.error || 'Failed to update user.');
      }
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  const handleUpdateUserRole = async (userId: number, newRole: 'user' | 'admin') => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification('success', `User role changed to ${newRole.toUpperCase()}.`);
        loadUsers();
      } else {
        showNotification('error', data.error || 'Failed to update role.');
      }
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserData.fullName.trim() || !newUserData.email.trim() || !newUserData.password) {
      showNotification('error', 'Please fill in Name, Email, and Password.');
      return;
    }
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserData),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification('success', data.message || 'User created successfully.');
        setNewUserModalOpen(false);
        setNewUserData({
          fullName: '',
          email: '',
          mobileNumber: '',
          password: '',
          role: 'user',
          status: 'active',
        });
        loadUsers();
        loadStats();
      } else {
        showNotification('error', data.error || 'Failed to create user.');
      }
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  const handleStartEditUser = (u: User) => {
    setEditingUser(u);
    setEditUserData({
      fullName: u.full_name,
      mobileNumber: u.mobile_number || '',
      role: u.role,
      status: u.status,
      password: '',
    });
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const payload: any = {
        userId: editingUser.id,
        fullName: editUserData.fullName,
        mobileNumber: editUserData.mobileNumber,
        role: editUserData.role,
        status: editUserData.status,
      };
      if (editUserData.password) {
        payload.password = editUserData.password;
      }

      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification('success', 'User details updated successfully.');
        setEditingUser(null);
        loadUsers();
      } else {
        showNotification('error', data.error || 'Failed to update user.');
      }
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  const handleDeleteUser = async (userId: number, userName: string) => {
    if (!confirm(`Are you sure you want to delete user "${userName}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/users?userId=${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        showNotification('success', 'User deleted successfully.');
        loadUsers();
        loadStats();
      } else {
        showNotification('error', data.error || 'Failed to delete user.');
      }
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  const handleViewUserBookings = async (userId: number) => {
    try {
      const res = await fetch(`/api/admin/users?userId=${userId}`);
      const data = await res.json();
      if (data.user) {
        setViewingUserBookings({ user: data.user, bookings: data.bookings || [] });
      }
    } catch (err) {}
  };

  // 8. Load Reports
  const loadReports = async () => {
    try {
      const params = new URLSearchParams();
      if (reportStartDate) params.append('startDate', reportStartDate);
      if (reportEndDate) params.append('endDate', reportEndDate);

      const res = await fetch(`/api/admin/reports?${params.toString()}`);
      const data = await res.json();
      if (data.report) {
        setReportsData(data.report);
      }
    } catch (err) {}
  };

  useEffect(() => {
    if (activeTab === 'reports') {
      loadReports();
    }
  }, [activeTab, reportStartDate, reportEndDate]);

  const handleExportCsv = () => {
    const params = new URLSearchParams({ export: 'csv' });
    if (reportStartDate) params.append('startDate', reportStartDate);
    if (reportEndDate) params.append('endDate', reportEndDate);
    window.open(`/api/admin/reports?${params.toString()}`, '_blank');
  };

  // 9. Load Settings
  const loadSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      if (data.settings) {
        setSettingsMap(data.settings);
      }
    } catch (err) {}
  };

  useEffect(() => {
    if (activeTab === 'settings') {
      loadSettings();
    }
  }, [activeTab]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: settingsMap }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification('success', 'Property & booking settings saved.');
      } else {
        showNotification('error', data.error || 'Failed to save settings.');
      }
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const sidebarLinks: {
    id: 'dashboard' | 'bookings' | 'calendar' | 'flats' | 'rooms' | 'facilities' | 'users' | 'reports' | 'settings';
    label: string;
    icon: any;
  }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'bookings', label: 'Bookings', icon: CalendarCheck },
    { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
    { id: 'flats', label: 'Flats', icon: Building2 },
    { id: 'rooms', label: 'Rooms', icon: BedDouble },
    { id: 'facilities', label: 'Facilities', icon: Sparkles },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col md:flex-row selection:bg-amber-500 selection:text-slate-950">
      
      {/* SIDEBAR */}
      <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
        
        {/* Brand */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-bold shadow-md">
              <Building2 className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-wide text-white block">ADMIN PORTAL</span>
              <span className="text-[10px] text-amber-400 uppercase tracking-wider font-semibold">1 Flat • 2 Rooms</span>
            </div>
          </Link>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {sidebarLinks.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                    : 'text-gray-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-gray-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Info & Actions */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          <Link
            href="/"
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <Home className="w-4 h-4 text-amber-400" />
            <span>Customer Website</span>
          </Link>

          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top bar */}
        <header className="h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-white capitalize">{activeTab}</h1>
            <span className="text-xs text-gray-500">| Property Management</span>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-white">{user.fullName || user.full_name}</p>
              <p className="text-[10px] text-amber-400">Administrator</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center border border-amber-500/30">
              {(user.fullName || user.full_name || 'A')[0].toUpperCase()}
            </div>
          </div>
        </header>

        {/* Body Container */}
        <main className="flex-1 p-6 overflow-y-auto max-w-7xl w-full">
          
          {/* Alert notification banner */}
          {alert && (
            <div
              className={`mb-6 p-4 rounded-xl text-xs flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200 ${
                alert.type === 'success'
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {alert.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{alert.message}</span>
              </div>
              <button onClick={() => setAlert(null)}><X className="w-4 h-4" /></button>
            </div>
          )}

          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              
              {/* Stat Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] text-gray-400 block font-medium">Total Bookings</span>
                  <span className="text-2xl font-bold text-white mt-1 block">
                    {loadingStats ? '-' : stats?.totalBookings || 0}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] text-amber-400 block font-medium">Today's Bookings</span>
                  <span className="text-2xl font-bold text-amber-400 mt-1 block">
                    {loadingStats ? '-' : stats?.todayBookings || 0}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] text-blue-400 block font-medium">Upcoming</span>
                  <span className="text-2xl font-bold text-blue-400 mt-1 block">
                    {loadingStats ? '-' : stats?.upcomingBookings || 0}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] text-emerald-400 block font-medium">Confirmed</span>
                  <span className="text-2xl font-bold text-emerald-400 mt-1 block">
                    {loadingStats ? '-' : stats?.confirmedBookings || 0}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] text-rose-400 block font-medium">Cancelled</span>
                  <span className="text-2xl font-bold text-rose-400 mt-1 block">
                    {loadingStats ? '-' : stats?.cancelledBookings || 0}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] text-purple-400 block font-medium">Completed</span>
                  <span className="text-2xl font-bold text-purple-400 mt-1 block">
                    {loadingStats ? '-' : stats?.completedBookings || 0}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] text-gray-400 block font-medium">Total Users</span>
                  <span className="text-2xl font-bold text-white mt-1 block">
                    {loadingStats ? '-' : stats?.totalUsers || 0}
                  </span>
                </div>
              </div>

              {/* Real-time Room Availability Cards */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <DoorOpen className="w-5 h-5 text-amber-400" />
                    <span>Real-Time Room Status</span>
                  </h3>
                  <button
                    onClick={loadStats}
                    className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Refresh</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Room 1 */}
                  <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-amber-400 uppercase">Room 1</span>
                        <h4 className="text-base font-bold text-white">Double Bed Room</h4>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          stats?.roomAvailability.room1.status === 'available'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : stats?.roomAvailability.room1.status === 'occupied'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {stats?.roomAvailability.room1.status === 'available'
                          ? 'Available'
                          : stats?.roomAvailability.room1.status === 'occupied'
                          ? 'Booked / Occupied'
                          : 'Maintenance'}
                      </span>
                    </div>

                    {stats?.roomAvailability.room1.currentBooking ? (
                      <div className="p-3 bg-slate-800/80 rounded-xl text-xs space-y-1 text-gray-300">
                        <p><strong>Guest:</strong> {stats.roomAvailability.room1.currentBooking.guestName}</p>
                        <p><strong>Booking ID:</strong> {stats.roomAvailability.room1.currentBooking.bookingId}</p>
                        <p><strong>Stay:</strong> {stats.roomAvailability.room1.currentBooking.checkIn} to {stats.roomAvailability.room1.currentBooking.checkOut}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">Ready for incoming reservations.</p>
                    )}
                  </div>

                  {/* Room 2 */}
                  <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-amber-400 uppercase">Room 2</span>
                        <h4 className="text-base font-bold text-white">Double Bed Room</h4>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          stats?.roomAvailability.room2.status === 'available'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : stats?.roomAvailability.room2.status === 'occupied'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {stats?.roomAvailability.room2.status === 'available'
                          ? 'Available'
                          : stats?.roomAvailability.room2.status === 'occupied'
                          ? 'Booked / Occupied'
                          : 'Maintenance'}
                      </span>
                    </div>

                    {stats?.roomAvailability.room2.currentBooking ? (
                      <div className="p-3 bg-slate-800/80 rounded-xl text-xs space-y-1 text-gray-300">
                        <p><strong>Guest:</strong> {stats.roomAvailability.room2.currentBooking.guestName}</p>
                        <p><strong>Booking ID:</strong> {stats.roomAvailability.room2.currentBooking.bookingId}</p>
                        <p><strong>Stay:</strong> {stats.roomAvailability.room2.currentBooking.checkIn} to {stats.roomAvailability.room2.currentBooking.checkOut}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">Ready for incoming reservations.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Jump Actions */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <button
                  onClick={() => setActiveTab('bookings')}
                  className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-400/40 text-left transition-all group"
                >
                  <CalendarCheck className="w-5 h-5 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-white block">Manage Bookings</span>
                  <span className="text-[11px] text-gray-400">Search & status updates</span>
                </button>

                <button
                  onClick={() => setActiveTab('calendar')}
                  className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-400/40 text-left transition-all group"
                >
                  <CalendarIcon className="w-5 h-5 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-white block">Visual Calendar</span>
                  <span className="text-[11px] text-gray-400">Timeline & occupancy</span>
                </button>

                <button
                  onClick={() => setActiveTab('facilities')}
                  className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-400/40 text-left transition-all group"
                >
                  <Sparkles className="w-5 h-5 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-white block">Facilities</span>
                  <span className="text-[11px] text-gray-400">Update amenities</span>
                </button>

                <button
                  onClick={() => setActiveTab('reports')}
                  className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-400/40 text-left transition-all group"
                >
                  <FileText className="w-5 h-5 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-white block">Export Reports</span>
                  <span className="text-[11px] text-gray-400">Download CSV dataset</span>
                </button>
              </div>

            </div>
          )}

          {/* TAB 2: BOOKINGS MANAGEMENT */}
          {activeTab === 'bookings' && (
            <div className="space-y-6">
              
              {/* 30-Day Retention Notice & Auto-Clean Action */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-400/10 text-amber-400 border border-amber-400/20 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-white">30-Day Auto Retention Active</h4>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
                        Enabled
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Booking records past 30 days are automatically removed from database and Property Management views.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setAdminCleanupModalOpen(true)}
                  disabled={adminCleaning}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-400/20 text-xs font-bold flex items-center gap-2 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{adminCleaning ? 'Purging...' : 'Purge 30+ Day Bookings'}</span>
                </button>
              </div>

              {/* Search & Filter Bar */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  
                  {/* Search */}
                  <div className="relative sm:col-span-2">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={bookingSearch}
                      onChange={(e) => {
                        setBookingSearch(e.target.value);
                        setBookingPage(1);
                      }}
                      placeholder="Search ID, Guest name, Mobile, Email..."
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* Status Filter */}
                  <div>
                    <select
                      value={bookingStatusFilter}
                      onChange={(e) => {
                        setBookingStatusFilter(e.target.value);
                        setBookingPage(1);
                      }}
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="all">All Statuses</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="completed">Completed</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>

                  {/* Room Filter */}
                  <div>
                    <select
                      value={bookingRoomFilter}
                      onChange={(e) => {
                        setBookingRoomFilter(e.target.value);
                        setBookingPage(1);
                      }}
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="all">All Rooms</option>
                      <option value="1">Room 1</option>
                      <option value="2">Room 2</option>
                    </select>
                  </div>

                </div>
              </div>

              {/* Bookings Table */}
              <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800/80 text-gray-400 border-b border-slate-700">
                      <tr>
                        <th className="py-3.5 px-3 font-semibold">Booking ID</th>
                        <th className="py-3.5 px-3 font-semibold">Customer Name</th>
                        <th className="py-3.5 px-3 font-semibold">Email</th>
                        <th className="py-3.5 px-3 font-semibold">Mobile Number</th>
                        <th className="py-3.5 px-3 font-semibold">Room Number</th>
                        <th className="py-3.5 px-3 font-semibold">Check-in Date</th>
                        <th className="py-3.5 px-3 font-semibold">Check-in Time</th>
                        <th className="py-3.5 px-3 font-semibold">Check-out Date</th>
                        <th className="py-3.5 px-3 font-semibold">Check-out Time</th>
                        <th className="py-3.5 px-3 font-semibold">Status</th>
                        <th className="py-3.5 px-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {loadingBookings ? (
                        <tr>
                          <td colSpan={11} className="py-8 text-center text-gray-400">Loading bookings...</td>
                        </tr>
                      ) : bookings.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="py-8 text-center text-gray-400">No bookings found matching filters.</td>
                        </tr>
                      ) : (
                        bookings.map((b) => (
                          <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3.5 px-3 font-mono font-bold text-amber-400 whitespace-nowrap">{b.booking_id}</td>
                            <td className="py-3.5 px-3 text-white font-medium whitespace-nowrap">{b.full_name}</td>
                            <td className="py-3.5 px-3 text-gray-300 font-mono text-[11px]">{b.user_email}</td>
                            <td className="py-3.5 px-3 text-gray-300 whitespace-nowrap font-mono text-[11px]">{b.mobile_number}</td>
                            <td className="py-3.5 px-3 text-amber-300 font-semibold whitespace-nowrap">{b.rooms_display}</td>
                            <td className="py-3.5 px-3 text-gray-300 whitespace-nowrap font-mono text-[11px]">{formatDateDDMMYYYY(b.check_in_date)}</td>
                            <td className="py-3.5 px-3 text-gray-300 whitespace-nowrap font-mono text-[11px]">{formatTime12H(b.check_in_time)}</td>
                            <td className="py-3.5 px-3 text-gray-300 whitespace-nowrap font-mono text-[11px]">{formatDateDDMMYYYY(b.check_out_date)}</td>
                            <td className="py-3.5 px-3 text-gray-300 whitespace-nowrap font-mono text-[11px]">{formatTime12H(b.check_out_time)}</td>
                            <td className="py-3.5 px-3">
                              <div className="flex flex-col gap-0.5">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-center ${
                                    b.status === 'confirmed'
                                      ? 'bg-emerald-500/20 text-emerald-300'
                                      : b.status === 'cancelled'
                                      ? 'bg-rose-500/20 text-rose-300'
                                      : b.status === 'completed'
                                      ? 'bg-blue-500/20 text-blue-300'
                                      : 'bg-amber-500/20 text-amber-300'
                                  }`}
                                >
                                  {b.status}
                                </span>
                                {b.status === 'cancelled' && (
                                  <span className="text-[9px] text-gray-400 text-center font-medium">
                                    {b.cancelled_by === 'admin' ? 'by Admin' : 'by Guest'}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setViewBookingModal(b)}
                                  className="p-1.5 rounded-lg bg-slate-800 text-gray-300 hover:text-white hover:bg-slate-700"
                                  title="View Details"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                {b.status === 'confirmed' && (
                                  <>
                                    <button
                                      onClick={() => handleUpdateBookingStatus(b.id, 'completed')}
                                      className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                                      title="Mark Completed"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setAdminCancelModalBooking(b);
                                        setAdminCancelReason('Admin canceled your room booking');
                                      }}
                                      className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                                      title="Cancel Booking"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                                {b.status === 'cancelled' && (
                                  <button
                                    onClick={() => handleUpdateBookingStatus(b.id, 'confirmed')}
                                    className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                                    title="Re-confirm"
                                  >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => setAdminDeleteModalBooking(b)}
                                  className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                                  title="Delete Booking Record"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))

                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-gray-400">
                  <span>Page {bookingPage} of {totalPages}</span>
                  <div className="flex items-center space-x-2">
                    <button
                      disabled={bookingPage <= 1}
                      onClick={() => setBookingPage(bookingPage - 1)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      disabled={bookingPage >= totalPages}
                      onClick={() => setBookingPage(bookingPage + 1)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: VISUAL CALENDAR */}
          {activeTab === 'calendar' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Visual Reservation Calendar</h2>
                  <p className="text-xs text-gray-400">View timeline of Room 1 and Room 2 bookings.</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCalendarView('month')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      calendarView === 'month' ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-gray-300'
                    }`}
                  >
                    Month
                  </button>
                  <button
                    onClick={() => setCalendarView('week')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      calendarView === 'week' ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-gray-300'
                    }`}
                  >
                    Week
                  </button>
                  <button
                    onClick={() => setCalendarView('day')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      calendarView === 'day' ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-gray-300'
                    }`}
                  >
                    Day
                  </button>
                </div>
              </div>

              {/* Calendar Events Grid */}
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4">
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500" /> Confirmed</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-rose-500" /> Cancelled</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500" /> Completed</span>
                </div>

                {calendarEvents.length === 0 ? (
                  <p className="text-xs text-gray-400 py-8 text-center">No bookings recorded on calendar schedule.</p>
                ) : (
                  <div className="space-y-3">
                    {calendarEvents.map((evt) => (
                      <div
                        key={evt.id}
                        className="p-4 rounded-xl bg-slate-800/70 border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-amber-400">{evt.bookingId}</span>
                            <span className="text-white font-bold">{evt.guestName}</span>
                            <span className="text-gray-400">({evt.rooms.map((r: any) => r.room_name).join(', ')})</span>
                          </div>
                          <p className="text-gray-400 mt-1">
                            {evt.checkInDate} ({evt.checkInTime}) → {evt.checkOutDate} ({evt.checkOutTime})
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              evt.status === 'confirmed'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : evt.status === 'cancelled'
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-blue-500/20 text-blue-300'
                            }`}
                          >
                            {evt.status}
                          </span>
                          <span className="text-gray-400 font-medium">{evt.numberOfPersons} Guest(s)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: FLAT MANAGEMENT */}
          {activeTab === 'flats' && flatData && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h2 className="text-xl font-bold text-white">Flat Configuration</h2>
                <p className="text-xs text-gray-400">Update property details, capacity, and status.</p>
              </div>

              <form onSubmit={handleSaveFlat} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Flat Name</label>
                  <input
                    type="text"
                    value={flatData.flat_name}
                    onChange={(e) => setFlatData({ ...flatData, flat_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Description</label>
                  <textarea
                    rows={4}
                    value={flatData.description}
                    onChange={(e) => setFlatData({ ...flatData, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">Max Total Capacity (Persons)</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={flatData.max_capacity}
                      onChange={(e) => setFlatData({ ...flatData, max_capacity: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">Status</label>
                    <select
                      value={flatData.status}
                      onChange={(e) => setFlatData({ ...flatData, status: e.target.value as any })}
                      className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="active">Active (Bookable)</option>
                      <option value="maintenance">Maintenance</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Image URL</label>
                  <input
                    type="url"
                    value={flatData.image_url}
                    onChange={(e) => setFlatData({ ...flatData, image_url: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={flatSaving}
                    className="px-6 py-2.5 rounded-xl font-bold text-xs text-slate-950 bg-amber-400 hover:brightness-110 shadow-lg shadow-amber-400/20 active:scale-95 disabled:opacity-50 transition-all"
                  >
                    {flatSaving ? 'Saving Changes...' : 'Save Flat Configuration'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 5: ROOMS MANAGEMENT */}
          {activeTab === 'rooms' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Room Management</h2>
                  <p className="text-xs text-gray-400">Configure Room 1 and Room 2 parameters and statuses.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {roomsList.map((room) => (
                  <div key={room.id} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
                    <div className="h-44 rounded-xl overflow-hidden">
                      <img src={room.image_url} alt={room.room_name} className="w-full h-full object-cover" />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-amber-400 uppercase">{room.room_name}</span>
                        <h4 className="text-lg font-bold text-white">{room.room_type}</h4>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          room.status === 'available'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {room.status}
                      </span>
                    </div>

                    <p className="text-xs text-gray-400">{room.description}</p>
                    <p className="text-xs text-gray-300"><strong>Capacity:</strong> {room.capacity} Persons</p>

                    <button
                      onClick={() => setEditingRoom(room)}
                      className="w-full py-2.5 rounded-xl bg-slate-800 text-amber-400 hover:bg-slate-700 font-bold text-xs border border-slate-700 transition-colors"
                    >
                      Edit Room Details
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: FACILITIES MANAGEMENT */}
          {activeTab === 'facilities' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Facilities & Amenities</h2>
                  <p className="text-xs text-gray-400">Changes appear immediately on customer portal.</p>
                </div>
                <button
                  onClick={() => setNewFacilityModalOpen(true)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-amber-400 hover:brightness-110 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Facility</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {facilitiesList.map((fac) => (
                  <div key={fac.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                        <FacilityIcon name={fac.icon} className="w-5 h-5" />
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          fac.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-gray-500/20 text-gray-400'
                        }`}
                      >
                        {fac.status}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-white">{fac.name}</h4>
                      <p className="text-[11px] text-gray-400 mt-1 line-clamp-2">{fac.description}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                      <button
                        onClick={() => setEditingFacility(fac)}
                        className="text-amber-400 hover:text-amber-300 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteFacility(fac.id)}
                        className="text-rose-400 hover:text-rose-300"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: USER MANAGEMENT */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search users by name, email, mobile..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setNewUserModalOpen(true)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold text-xs text-slate-950 bg-amber-400 hover:brightness-110 flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New User</span>
                </button>
              </div>

              <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/80 text-gray-400 border-b border-slate-700">
                    <tr>
                      <th className="py-3.5 px-4 font-semibold">User</th>
                      <th className="py-3.5 px-4 font-semibold">Email</th>
                      <th className="py-3.5 px-4 font-semibold">Mobile</th>
                      <th className="py-3.5 px-4 font-semibold">Role</th>
                      <th className="py-3.5 px-4 font-semibold">Status</th>
                      <th className="py-3.5 px-4 font-semibold">Bookings</th>
                      <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-800/40">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[11px] font-bold text-amber-400 uppercase">
                              {u.full_name?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <p className="text-white font-medium">{u.full_name}</p>
                              <p className="text-[10px] text-gray-500 font-mono">ID: #{u.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-gray-300 font-mono text-[11px]">{u.email}</td>
                        <td className="py-3.5 px-4 text-gray-300">{u.mobile_number || 'N/A'}</td>
                        <td className="py-3.5 px-4">
                          {u.id === user.id ? (
                            <span className="px-2.5 py-1 rounded-lg bg-amber-400/10 text-amber-400 border border-amber-400/20 font-bold uppercase text-[10px] tracking-wider">
                              Admin (You)
                            </span>
                          ) : (
                            <select
                              value={u.role}
                              onChange={(e) => handleUpdateUserRole(u.id, e.target.value as 'user' | 'admin')}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-semibold text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                            >
                              <option value="user">User</option>
                              <option value="admin">Admin</option>
                            </select>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              u.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            {u.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-white">{u.booking_count || 0}</td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleViewUserBookings(u.id)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 text-gray-300 hover:text-white hover:bg-slate-700 font-medium"
                              title="View Bookings"
                            >
                              Bookings
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStartEditUser(u)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 text-amber-400 hover:bg-amber-400/10 font-medium"
                              title="Edit User"
                            >
                              Edit
                            </button>
                            {u.id !== user.id && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleToggleUserStatus(u.id, u.status)}
                                  className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                                    u.status === 'active'
                                      ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                                      : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                                  }`}
                                >
                                  {u.status === 'active' ? 'Deactivate' : 'Activate'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(u.id, u.full_name)}
                                  className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/10"
                                  title="Delete User"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 8: REPORTS & EXPORTS */}
          {activeTab === 'reports' && reportsData && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">Booking Reports & Statistics</h2>
                  <p className="text-xs text-gray-400">Strictly reservation metrics and occupancy analysis.</p>
                </div>
                <button
                  onClick={handleExportCsv}
                  className="px-4 py-2.5 rounded-xl font-bold text-xs text-slate-950 bg-amber-400 hover:brightness-110 flex items-center gap-2 shadow-lg shadow-amber-400/20 self-start sm:self-auto"
                >
                  <Download className="w-4 h-4" />
                  <span>Export CSV Report</span>
                </button>
              </div>

              {/* Date Filters */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center gap-4 text-xs">
                <div>
                  <label className="block text-gray-400 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={reportStartDate}
                    onChange={(e) => setReportStartDate(e.target.value)}
                    className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">End Date</label>
                  <input
                    type="date"
                    value={reportEndDate}
                    onChange={(e) => setReportEndDate(e.target.value)}
                    className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                {(reportStartDate || reportEndDate) && (
                  <button
                    onClick={() => {
                      setReportStartDate('');
                      setReportEndDate('');
                    }}
                    className="mt-4 text-xs text-amber-400 hover:underline"
                  >
                    Clear Filter
                  </button>
                )}
              </div>

              {/* Summary Numbers */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-xs text-gray-400">Total Bookings</span>
                  <span className="text-xl font-bold text-white block mt-1">{reportsData.summary.totalBookings}</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-xs text-emerald-400">Confirmed</span>
                  <span className="text-xl font-bold text-emerald-400 block mt-1">{reportsData.summary.confirmedBookings}</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-xs text-rose-400">Cancelled</span>
                  <span className="text-xl font-bold text-rose-400 block mt-1">{reportsData.summary.cancelledBookings}</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-xs text-blue-400">Completed</span>
                  <span className="text-xl font-bold text-blue-400 block mt-1">{reportsData.summary.completedBookings}</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-xs text-amber-400">Total Guests Served</span>
                  <span className="text-xl font-bold text-amber-400 block mt-1">{reportsData.summary.totalGuestsServed}</span>
                </div>
              </div>

              {/* Bookings By Date Breakdown */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <h3 className="text-base font-bold text-white">Daily Booking Volume</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800 text-gray-400">
                      <tr>
                        <th className="py-2.5 px-4 font-semibold">Date</th>
                        <th className="py-2.5 px-4 font-semibold">Total Reservations</th>
                        <th className="py-2.5 px-4 font-semibold text-emerald-400">Confirmed</th>
                        <th className="py-2.5 px-4 font-semibold text-rose-400">Cancelled</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {reportsData.bookingsByDate?.map((d: any, idx: number) => (
                        <tr key={idx}>
                          <td className="py-2.5 px-4 font-mono">{d.date}</td>
                          <td className="py-2.5 px-4 font-bold text-white">{d.total_count}</td>
                          <td className="py-2.5 px-4 text-emerald-400">{d.confirmed_count}</td>
                          <td className="py-2.5 px-4 text-rose-400">{d.cancelled_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-3xl">
              <div>
                <h2 className="text-xl font-bold text-white">Property & Booking Settings</h2>
                <p className="text-xs text-gray-400">All configurations are stored and applied in database.</p>
              </div>

              <form onSubmit={handleSaveSettings} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6 shadow-xl">
                <div>
                  <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-3">Property Information</h3>
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-gray-300 font-semibold mb-1">Property Name</label>
                      <input
                        type="text"
                        value={settingsMap.property_name || ''}
                        onChange={(e) => setSettingsMap({ ...settingsMap, property_name: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 font-semibold mb-1">Contact Phone</label>
                      <input
                        type="text"
                        value={settingsMap.contact_number || ''}
                        onChange={(e) => setSettingsMap({ ...settingsMap, contact_number: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 font-semibold mb-1">Contact Email</label>
                      <input
                        type="email"
                        value={settingsMap.contact_email || ''}
                        onChange={(e) => setSettingsMap({ ...settingsMap, contact_email: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 font-semibold mb-1">Address</label>
                      <input
                        type="text"
                        value={settingsMap.property_address || ''}
                        onChange={(e) => setSettingsMap({ ...settingsMap, property_address: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-4">
                  <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-3">Booking Rules</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-gray-300 font-semibold mb-1">Maximum Persons</label>
                      <input
                        type="number"
                        value={settingsMap.max_persons || '10'}
                        onChange={(e) => setSettingsMap({ ...settingsMap, max_persons: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 font-semibold mb-1">Advance Booking Limit (Days)</label>
                      <input
                        type="number"
                        value={settingsMap.advance_booking_days || '90'}
                        onChange={(e) => setSettingsMap({ ...settingsMap, advance_booking_days: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 font-semibold mb-1">Default Check-In Time</label>
                      <input
                        type="time"
                        value={settingsMap.default_check_in_time || '14:00'}
                        onChange={(e) => setSettingsMap({ ...settingsMap, default_check_in_time: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 font-semibold mb-1">Default Check-Out Time</label>
                      <input
                        type="time"
                        value={settingsMap.default_check_out_time || '11:00'}
                        onChange={(e) => setSettingsMap({ ...settingsMap, default_check_out_time: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">Booking Data Retention Policy</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      30 Days (Active)
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    To maintain database performance and privacy standards, all booking and guest stay records older than 30 days are automatically purged from the system.
                  </p>
                </div>


                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="px-6 py-2.5 rounded-xl font-bold text-xs text-slate-950 bg-amber-400 hover:brightness-110 shadow-lg shadow-amber-400/20 active:scale-95 disabled:opacity-50 transition-all"
                  >
                    {savingSettings ? 'Saving Settings...' : 'Save Settings'}
                  </button>
                </div>
              </form>
            </div>
          )}

        </main>
      </div>

      {/* VIEW BOOKING MODAL */}
      {viewBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-gray-400 text-[11px]">Booking Reference</span>
                <h3 className="text-lg font-mono font-bold text-amber-400">{viewBookingModal.booking_id}</h3>
              </div>
              <button onClick={() => setViewBookingModal(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-800/60 rounded-xl border border-slate-700">
              <span className="text-gray-400 font-semibold">Booking Status:</span>
              <span
                className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                  viewBookingModal.status === 'confirmed'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : viewBookingModal.status === 'cancelled'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : viewBookingModal.status === 'completed'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {viewBookingModal.status}
              </span>
            </div>

            {viewBookingModal.status === 'cancelled' && (
              <div className="p-3.5 bg-rose-950/40 border border-rose-500/40 rounded-xl space-y-1.5 text-rose-200">
                <div className="flex items-center gap-1.5 font-bold text-rose-300">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>Cancellation Information</span>
                </div>
                <p>
                  <strong>Cancelled By:</strong>{' '}
                  <span className="font-semibold text-white">
                    {viewBookingModal.cancelled_by === 'admin' ? 'Administrator' : 'Guest / User'}
                  </span>
                </p>
                {viewBookingModal.cancellation_reason && (
                  <p>
                    <strong>Reason / Note:</strong> {viewBookingModal.cancellation_reason}
                  </p>
                )}
                {viewBookingModal.cancelled_at && (
                  <p className="text-rose-400/80 text-[11px]">
                    <strong>Cancelled At:</strong> {formatDateDDMMYYYY(viewBookingModal.cancelled_at)} at {formatTime12H(viewBookingModal.cancelled_at)}
                  </p>
                )}
              </div>
            )}

            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700 space-y-2">
              <h4 className="font-bold text-amber-400 uppercase">Guest Information</h4>
              <p><strong>Name:</strong> {viewBookingModal.full_name}</p>
              <p><strong>Email:</strong> {viewBookingModal.user_email}</p>
              <p><strong>Mobile:</strong> {viewBookingModal.mobile_number}</p>
            </div>

            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700 space-y-2">
              <h4 className="font-bold text-amber-400 uppercase">Stay & Accommodation</h4>
              <p><strong>Flat:</strong> 1 Flat</p>
              <p><strong>Rooms:</strong> {viewBookingModal.rooms_display}</p>
              <p><strong>Guests:</strong> {viewBookingModal.number_of_persons} Person(s)</p>
              <p><strong>Check-In:</strong> {formatDateDDMMYYYY(viewBookingModal.check_in_date)} at {formatTime12H(viewBookingModal.check_in_time)}</p>
              <p><strong>Check-Out:</strong> {formatDateDDMMYYYY(viewBookingModal.check_out_date)} at {formatTime12H(viewBookingModal.check_out_time)}</p>
            </div>

            {viewBookingModal.special_requests && (
              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700">
                <p><strong>Special Requests:</strong> {viewBookingModal.special_requests}</p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewBookingModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-white font-semibold hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN CANCEL BOOKING MODAL */}
      {adminCancelModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-white">Cancel Room Booking?</h3>
              <p className="text-xs text-gray-400 mt-1">
                Are you sure you want to cancel booking <strong className="text-white font-mono">{adminCancelModalBooking.booking_id}</strong> for <strong className="text-white">{adminCancelModalBooking.full_name}</strong>?
              </p>
            </div>

            <div className="p-3 bg-slate-800 rounded-xl text-xs space-y-1 text-gray-300">
              <p><strong>Stay:</strong> {adminCancelModalBooking.check_in_date} to {adminCancelModalBooking.check_out_date}</p>
              <p><strong>Rooms:</strong> {adminCancelModalBooking.rooms_display}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Cancellation Reason / Note for User:
              </label>
              <textarea
                value={adminCancelReason}
                onChange={(e) => setAdminCancelReason(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                placeholder="Admin canceled your room booking"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                This note will be shown to the user in their booking history as "Admin canceled your room booking".
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={adminCancelling}
                onClick={() => setAdminCancelModalBooking(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-gray-300 font-semibold text-xs hover:bg-slate-700"
              >
                Keep Booking
              </button>
              <button
                type="button"
                disabled={adminCancelling}
                onClick={() => {
                  setAdminCancelling(true);
                  handleUpdateBookingStatus(adminCancelModalBooking.id, 'cancelled', adminCancelReason);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-500 disabled:opacity-50"
              >
                {adminCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT ROOM MODAL */}
      {editingRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 text-xs space-y-4">
            <h3 className="text-base font-bold text-white">Edit {editingRoom.room_name}</h3>
            
            <div>
              <label className="block text-gray-400 mb-1">Room Name</label>
              <input
                type="text"
                value={editingRoom.room_name}
                onChange={(e) => setEditingRoom({ ...editingRoom, room_name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
              />
            </div>

            <div>
              <label className="block text-gray-400 mb-1">Room Type</label>
              <input
                type="text"
                value={editingRoom.room_type}
                onChange={(e) => setEditingRoom({ ...editingRoom, room_type: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
              />
            </div>

            <div>
              <label className="block text-gray-400 mb-1">Description</label>
              <textarea
                rows={3}
                value={editingRoom.description}
                onChange={(e) => setEditingRoom({ ...editingRoom, description: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-400 mb-1">Capacity</label>
                <input
                  type="number"
                  value={editingRoom.capacity}
                  onChange={(e) => setEditingRoom({ ...editingRoom, capacity: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1">Status</label>
                <select
                  value={editingRoom.status}
                  onChange={(e) => setEditingRoom({ ...editingRoom, status: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                >
                  <option value="available">Available</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-gray-400 mb-1">Image URL</label>
              <input
                type="url"
                value={editingRoom.image_url}
                onChange={(e) => setEditingRoom({ ...editingRoom, image_url: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingRoom(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-gray-300 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveRoom(editingRoom)}
                className="flex-1 py-2.5 rounded-xl bg-amber-400 text-slate-950 font-bold"
              >
                Save Room
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD/EDIT FACILITY MODAL */}
      {(newFacilityModalOpen || editingFacility) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 text-xs space-y-4">
            <h3 className="text-base font-bold text-white">
              {editingFacility ? 'Edit Facility' : 'Add New Facility'}
            </h3>

            <div>
              <label className="block text-gray-400 mb-1">Facility Name</label>
              <input
                type="text"
                value={editingFacility ? editingFacility.name : newFacilityData.name}
                onChange={(e) => {
                  if (editingFacility) setEditingFacility({ ...editingFacility, name: e.target.value });
                  else setNewFacilityData({ ...newFacilityData, name: e.target.value });
                }}
                placeholder="e.g. Free Wi-Fi"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
              />
            </div>

            <div>
              <label className="block text-gray-400 mb-1">Description</label>
              <textarea
                rows={2}
                value={editingFacility ? editingFacility.description : newFacilityData.description}
                onChange={(e) => {
                  if (editingFacility) setEditingFacility({ ...editingFacility, description: e.target.value });
                  else setNewFacilityData({ ...newFacilityData, description: e.target.value });
                }}
                placeholder="Short description"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-400 mb-1">Icon Name</label>
                <input
                  type="text"
                  value={editingFacility ? editingFacility.icon : newFacilityData.icon}
                  onChange={(e) => {
                    if (editingFacility) setEditingFacility({ ...editingFacility, icon: e.target.value });
                    else setNewFacilityData({ ...newFacilityData, icon: e.target.value });
                  }}
                  placeholder="e.g. Wifi, Wind, Bath, Tv"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1">Status</label>
                <select
                  value={editingFacility ? editingFacility.status : newFacilityData.status}
                  onChange={(e) => {
                    if (editingFacility) setEditingFacility({ ...editingFacility, status: e.target.value as any });
                    else setNewFacilityData({ ...newFacilityData, status: e.target.value as any });
                  }}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setNewFacilityModalOpen(false);
                  setEditingFacility(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-gray-300 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={(e) => {
                  if (editingFacility) handleUpdateFacility(editingFacility);
                  else handleAddFacility(e);
                }}
                className="flex-1 py-2.5 rounded-xl bg-amber-400 text-slate-950 font-bold"
              >
                {editingFacility ? 'Save Facility' : 'Add Facility'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW USER BOOKINGS MODAL */}
      {viewingUserBookings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">{viewingUserBookings.user.full_name}'s Bookings</h3>
                <p className="text-gray-400">{viewingUserBookings.user.email}</p>
              </div>
              <button onClick={() => setViewingUserBookings(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {viewingUserBookings.bookings.length === 0 ? (
              <p className="py-6 text-center text-gray-400">No bookings for this user.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {viewingUserBookings.bookings.map((b) => (
                  <div key={b.id} className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-amber-400">{b.booking_id}</span>
                      <p className="text-gray-300 mt-0.5">{b.check_in_date} to {b.check_out_date} • {b.rooms_display}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-700 text-white">
                      {b.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button onClick={() => setViewingUserBookings(null)} className="px-4 py-2 rounded-xl bg-slate-800 text-white font-semibold">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD NEW USER MODAL */}
      {newUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 text-xs space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-400/10 text-amber-400">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">Add New User</h3>
              </div>
              <button
                type="button"
                onClick={() => setNewUserModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-3">
              <div>
                <label className="block text-gray-400 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newUserData.fullName}
                  onChange={(e) => setNewUserData({ ...newUserData, fullName: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  placeholder="e.g. rahul@example.com"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    value={newUserData.mobileNumber}
                    onChange={(e) => setNewUserData({ ...newUserData, mobileNumber: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newUserData.password}
                    onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                    placeholder="Min 6 characters"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1">User Role *</label>
                  <select
                    value={newUserData.role}
                    onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="user">User (Guest)</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 mb-1">Status *</label>
                  <select
                    value={newUserData.status}
                    onChange={(e) => setNewUserData({ ...newUserData, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setNewUserModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-gray-300 font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-400 text-slate-950 font-bold hover:brightness-110 shadow-lg shadow-amber-400/20"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 text-xs space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Edit User: {editingUser.full_name}</h3>
                <p className="text-gray-400">{editingUser.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-3">
              <div>
                <label className="block text-gray-400 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editUserData.fullName}
                  onChange={(e) => setEditUserData({ ...editUserData, fullName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1">Mobile Number</label>
                <input
                  type="tel"
                  value={editUserData.mobileNumber}
                  onChange={(e) => setEditUserData({ ...editUserData, mobileNumber: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1">User Role</label>
                  {editingUser.id === user.id ? (
                    <div className="px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-amber-400 font-bold">
                      Admin (You)
                    </div>
                  ) : (
                    <select
                      value={editUserData.role}
                      onChange={(e) => setEditUserData({ ...editUserData, role: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="user">User (Guest)</option>
                      <option value="admin">Administrator</option>
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-gray-400 mb-1">Account Status</label>
                  {editingUser.id === user.id ? (
                    <div className="px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-emerald-400 font-bold">
                      Active
                    </div>
                  ) : (
                    <select
                      value={editUserData.status}
                      onChange={(e) => setEditUserData({ ...editUserData, status: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-gray-400 mb-1">
                  Reset Password <span className="text-gray-500 font-normal">(Leave blank to keep unchanged)</span>
                </label>
                <input
                  type="password"
                  value={editUserData.password}
                  onChange={(e) => setEditUserData({ ...editUserData, password: e.target.value })}
                  placeholder="Enter new password"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-gray-300 font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-400 text-slate-950 font-bold hover:brightness-110 shadow-lg shadow-amber-400/20"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE SINGLE BOOKING MODAL */}
      {adminDeleteModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 text-xs space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-white">Delete Booking Permanently?</h3>
              <p className="text-gray-400 mt-1">
                Are you sure you want to permanently remove booking <strong className="text-amber-400 font-mono">{adminDeleteModalBooking.booking_id}</strong>?
              </p>
            </div>

            <div className="p-3.5 bg-slate-800 rounded-xl space-y-1.5 text-gray-300 border border-slate-700">
              <p><strong>Guest:</strong> {adminDeleteModalBooking.full_name} ({adminDeleteModalBooking.user_email})</p>
              <p><strong>Stay:</strong> {formatDateDDMMYYYY(adminDeleteModalBooking.check_in_date)} to {formatDateDDMMYYYY(adminDeleteModalBooking.check_out_date)}</p>
              <p><strong>Room(s):</strong> {adminDeleteModalBooking.rooms_display}</p>
              <p><strong>Status:</strong> <span className="uppercase font-semibold text-amber-400">{adminDeleteModalBooking.status}</span></p>
            </div>

            <p className="text-[11px] text-rose-400/90 text-center font-medium">
              This action cannot be undone and will permanently delete this reservation record.
            </p>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                disabled={adminDeleting}
                onClick={() => setAdminDeleteModalBooking(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-gray-300 font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={adminDeleting}
                onClick={() => handleDeleteBooking(adminDeleteModalBooking.id)}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-500 disabled:opacity-50 shadow-lg shadow-rose-600/20"
              >
                {adminDeleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PURGE 30+ DAY OLD BOOKINGS MODAL */}
      {adminCleanupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 text-xs space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-amber-400/20 text-amber-400 border border-amber-400/30 flex items-center justify-center mx-auto">
              <Clock className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-white">Purge Bookings Older Than 30 Days?</h3>
              <p className="text-gray-400 mt-1">
                This will automatically remove all completed or past reservation data where check-out took place more than 30 days ago.
              </p>
            </div>

            <div className="p-3.5 bg-slate-800 rounded-xl space-y-2 text-gray-300 border border-slate-700">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Current & Upcoming reservations are completely safe</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400 text-[11px]">
                <span>• Frees up database storage and optimizes search indexes.</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400 text-[11px]">
                <span>• Maintains compliance with 30-day retention policies.</span>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                disabled={adminCleaning}
                onClick={() => setAdminCleanupModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-gray-300 font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={adminCleaning}
                onClick={() => handlePurgeOldBookings(30)}
                className="flex-1 py-2.5 rounded-xl bg-amber-400 text-slate-950 font-bold hover:brightness-110 disabled:opacity-50 shadow-lg shadow-amber-400/20"
              >
                {adminCleaning ? 'Purging Old Data...' : 'Confirm Purge (30+ Days)'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

