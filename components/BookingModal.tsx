'use client';

import React from 'react';
import { BookingFlowModal } from './BookingFlowModal';
import { Room } from '@/lib/types';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  room?: Room | null;
  onBookingSuccess?: () => void;
  initialRoomSelection?: 'room1' | 'room2' | 'both';
}

export function BookingModal({
  isOpen,
  onClose,
  initialRoomSelection = 'both',
}: BookingModalProps) {
  return (
    <BookingFlowModal
      isOpen={isOpen}
      onClose={onClose}
      initialRoomSelection={initialRoomSelection}
    />
  );
}
