'use client';

import React from 'react';
import {
  Wifi,
  Wind,
  BedDouble,
  Bath,
  Flame,
  Sparkles,
  Tv,
  Zap,
  Coffee,
  ShieldCheck,
  Video,
  HeartPulse,
  Car,
  Utensils,
  Armchair,
  Ban,
  CheckCircle2,
  HelpCircle,
  Home,
  Key,
  Layers,
  Lock,
  Sun,
  Moon,
  Users,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  Wifi,
  Wind,
  BedDouble,
  Bath,
  Flame,
  Sparkles,
  Tv,
  Zap,
  Coffee,
  ShieldCheck,
  Video,
  HeartPulse,
  Car,
  Utensils,
  Armchair,
  Ban,
  CheckCircle2,
  Home,
  Key,
  Layers,
  Lock,
  Sun,
  Moon,
  Users,
};

export function FacilityIcon({
  name,
  className = 'w-6 h-6',
}: {
  name: string;
  className?: string;
}) {
  const IconComponent = ICON_MAP[name] || Sparkles;
  return <IconComponent className={className} />;
}
