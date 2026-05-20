import {
  Navigation, Coffee, Fuel, Moon,
  Package, PackageCheck, RotateCcw, Clock,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { EventType } from '../types/trip';

export type EventVariant = 'drive' | 'stop';

export interface EventConfigEntry {
  colour: string;
  label: string;
  icon: LucideIcon;
  row: 0 | 1 | 2 | 3;
  markerSize: 'sm' | 'md' | 'lg';
  showInLegend: boolean;
  showOnMap: boolean;
  variant: EventVariant;
  eldRemark: string;
  showOpeningHours: boolean;
}

export const BADGE_CONFIG = {
  combined: { label: 'combined stop', colour: '#639922' },
  early: { label: 'early stop', colour: '#EF9F27' },
} as const;

export const EVENT_CONFIG: Record<EventType, EventConfigEntry> = {
  drive: {
    colour: '#6B7280',
    label: 'Drive',
    icon: Navigation,
    row: 2,
    markerSize: 'sm',
    showInLegend: true,
    showOnMap: false,
    variant: 'drive',
    eldRemark: 'Driving',
    showOpeningHours: false,
  },
  break: {
    colour: '#EF9F27',
    label: 'Break',
    icon: Coffee,
    row: 0,
    markerSize: 'sm',
    showInLegend: true,
    showOnMap: true,
    variant: 'stop',
    eldRemark: 'Off-duty break',
    showOpeningHours: true,
  },
  fuel: {
    colour: '#639922',
    label: 'Fuel Up',
    icon: Fuel,
    row: 3,
    markerSize: 'md',
    showInLegend: true,
    showOnMap: true,
    variant: 'stop',
    eldRemark: 'Fueling',
    showOpeningHours: true,
  },
  rest: {
    colour: '#378ADD',
    label: 'Rest Stop',
    icon: Moon,
    row: 1,
    markerSize: 'lg',
    showInLegend: true,
    showOnMap: true,
    variant: 'stop',
    eldRemark: '10-hour sleeper berth',
    showOpeningHours: false,
  },
  pickup: {
    colour: '#D85A30',
    label: 'Pick Up Load',
    icon: Package,
    row: 3,
    markerSize: 'md',
    showInLegend: true,
    showOnMap: true,
    variant: 'stop',
    eldRemark: 'Loading freight',
    showOpeningHours: true,
  },
  dropoff: {
    colour: '#D4537E',
    label: 'Drop Off Load',
    icon: PackageCheck,
    row: 3,
    markerSize: 'md',
    showInLegend: true,
    showOnMap: true,
    variant: 'stop',
    eldRemark: 'Unloading freight',
    showOpeningHours: true,
  },
  restart: {
    colour: '#7F77DD',
    label: '34-Hr Restart',
    icon: RotateCcw,
    row: 1,
    markerSize: 'lg',
    showInLegend: true,
    showOnMap: true,
    variant: 'stop',
    eldRemark: '34-hour restart',
    showOpeningHours: false,
  },
  on_duty: {
    colour: '#888888',
    label: 'On Duty',
    icon: Clock,
    row: 3,
    markerSize: 'sm',
    showInLegend: false,
    showOnMap: false,
    variant: 'stop',
    eldRemark: 'On-duty (not driving)',
    showOpeningHours: true,
  },
};
