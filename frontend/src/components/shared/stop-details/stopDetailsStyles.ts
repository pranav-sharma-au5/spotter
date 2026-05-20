import type { StopDetailsVariant } from './types';

export const STOP_DETAILS_STYLES = {
  sidebar: {
    metaText: 'text-[10px] text-text-secondary',
    metaRow: 'mt-1 truncate',
    phoneRow: 'mt-0.5 truncate',
    badgeWrap: 'mt-1.5 flex flex-wrap gap-1',
    badge: 'rounded-full px-2 py-0.5 text-[9px] font-semibold text-white',
    badgeMutedBg: false,
  },
  popup: {
    metaText: 'text-[9px] text-text-muted',
    metaRow: 'm-0',
    phoneRow: 'm-0',
    badgeWrap: '',
    badge: 'mt-1 inline-block rounded px-[5px] py-px text-[9px]',
    badgeMutedBg: true,
  },
} as const satisfies Record<
  StopDetailsVariant,
  {
    metaText: string;
    metaRow: string;
    phoneRow: string;
    badgeWrap: string;
    badge: string;
    badgeMutedBg: boolean;
  }
>;

export function getStopDetailsStyles(variant: StopDetailsVariant) {
  return STOP_DETAILS_STYLES[variant];
}
