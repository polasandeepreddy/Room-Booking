export type UserRole = 'user' | 'admin';
export type UserStatus = 'active' | 'inactive';

export interface User {
  id: number;
  full_name: string;
  fullName?: string;
  email: string;
  password_hash?: string;
  mobile_number: string | null;
  mobileNumber?: string | null;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  createdAt?: string;
  updated_at: string;
  booking_count?: number;
}

export interface Flat {
  id: number;
  flat_name: string;
  description: string;
  max_capacity: number;
  status: 'active' | 'maintenance';
  image_url: string;
  created_at: string;
  updated_at: string;
  rooms?: Room[];
}

export interface Room {
  id: number;
  flat_id: number;
  room_name: string;
  room_type: string;
  description: string;
  capacity: number;
  status: 'available' | 'maintenance' | 'disabled';
  image_url: string;
  created_at: string;
  updated_at: string;
}

export interface Facility {
  id: number;
  name: string;
  description: string;
  icon: string;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

export type BookingStatus = 'confirmed' | 'pending' | 'cancelled' | 'completed';
export type RoomSelectionOption = 'auto' | 'room1' | 'room2' | 'both';

export interface Booking {
  id: number;
  booking_id: string;
  user_id: number;
  flat_id: number;
  check_in_date: string; // YYYY-MM-DD
  check_in_time: string; // HH:mm
  check_out_date: string; // YYYY-MM-DD
  check_out_time: string; // HH:mm
  check_in_at?: string; // DATETIME
  check_out_at?: string; // DATETIME
  number_of_persons: number;
  status: BookingStatus;
  special_requests?: string | null;
  cancelled_by?: 'admin' | 'user' | string | null;
  cancellation_reason?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  updated_at: string;
  // Joins & Populated relations
  full_name?: string;
  user_email?: string;
  mobile_number?: string;
  flat_name?: string;
  room_ids?: number[];
  rooms?: { id: number; room_name: string; room_type: string }[];
  rooms_display?: string;
}

export interface AvailabilityCheckResult {
  isAvailable: boolean;
  flatAvailable: boolean;
  room1Available: boolean;
  room2Available: boolean;
  bothAvailable: boolean;
  requestedRoomsAvailable: boolean;
  availableRoomIds: number[];
  autoAssignedRoomIds: number[];
  autoAssignedRoomDisplay: string;
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
  message: string;
}

export interface AdminStats {
  totalBookings: number;
  todayBookings: number;
  upcomingBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  completedBookings: number;
  totalUsers: number;
  roomAvailability: {
    room1: {
      id: number;
      name: string;
      status: 'available' | 'occupied' | 'maintenance';
      currentBooking?: {
        bookingId: string;
        guestName: string;
        checkIn: string;
        checkOut: string;
      };
    };
    room2: {
      id: number;
      name: string;
      status: 'available' | 'occupied' | 'maintenance';
      currentBooking?: {
        bookingId: string;
        guestName: string;
        checkIn: string;
        checkOut: string;
      };
    };
  };
}

export interface SettingItem {
  id: number;
  setting_key: string;
  setting_value: string;
  created_at: string;
  updated_at: string;
}
