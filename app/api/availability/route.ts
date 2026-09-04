import { NextRequest, NextResponse } from 'next/server';
import { checkAvailability } from '@/lib/booking-engine';
import { RoomSelectionOption } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const flatId = searchParams.get('flatId');
    const roomOption = searchParams.get('roomOption') as RoomSelectionOption | null;
    const roomId = searchParams.get('roomId');
    const checkInDate = searchParams.get('checkInDate') || searchParams.get('date');
    const checkInTime = searchParams.get('checkInTime') || searchParams.get('time') || '14:00';
    const checkOutDate = searchParams.get('checkOutDate') || searchParams.get('date');
    const checkOutTime = searchParams.get('checkOutTime') || '11:00';

    if (!checkInDate || !checkInTime || !checkOutDate || !checkOutTime) {
      return NextResponse.json(
        { error: 'Check-in and Check-out dates and times are required.' },
        { status: 400 }
      );
    }

    let roomIds: number[] | undefined;
    if (roomId) {
      const parsedId = Number(roomId);
      if (!isNaN(parsedId)) {
        roomIds = [parsedId];
      }
    }

    const result = await checkAvailability({
      flatId: flatId ? Number(flatId) : 1,
      roomOption: roomOption || undefined,
      roomIds,
      checkInDate,
      checkInTime,
      checkOutDate,
      checkOutTime,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to check availability.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { flatId, roomOption, roomIds, checkInDate, checkInTime, checkOutDate, checkOutTime } = body;

    if (!checkInDate || !checkInTime || !checkOutDate || !checkOutTime) {
      return NextResponse.json(
        { error: 'Check-in and Check-out dates and times are required.' },
        { status: 400 }
      );
    }

    const requestedRoomIds: number[] | undefined = Array.isArray(roomIds)
      ? roomIds.map((id: any) => Number(id)).filter((id: number) => !isNaN(id))
      : undefined;

    const result = await checkAvailability({
      flatId: flatId ? Number(flatId) : 1,
      roomOption: roomOption || undefined,
      roomIds: requestedRoomIds,
      checkInDate,
      checkInTime,
      checkOutDate,
      checkOutTime,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to check availability.' },
      { status: 500 }
    );
  }
}
