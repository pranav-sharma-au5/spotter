import type { EldRow } from './eldRules';

/** Shared SVG layout — keep grid row centres in sync with ROW_Y_TOPS */
export const ELD_LAYOUT = {
  VIEW_WIDTH: 680,
  GRID_X_START: 58,
  GRID_X_END: 618,
  GRID_SUBTITLE_Y: 140,
  ROW_Y_TOPS: [160, 188, 216, 244] as const,
  ROW_HEIGHT: 22,
  HOUR_LABEL_Y: 152,
  GRID_LINE_TOP: 154,
  REMARKS_TITLE_Y: 308,
  REMARKS_BOX_Y: 312,
  /** ~12 remark lines at 9px line height (day 4+ trips exceed the old 6-line cap) */
  REMARKS_BOX_H: 116,
  REMARKS_LINE_HEIGHT: 9,
  TOTALS_LINE_Y: 436,
  TOTALS_TEXT_Y: 448,
  TOTALS_SUB_Y: 460,
  FOOTER_LINE_Y: 476,
  FOOTER_TEXT_Y: 488,
  SIGNATURE_LINE_Y: 499,
  SIGNATURE_LABEL_Y: 507,
  VIEW_HEIGHT: 520,
} as const;

export function remarksMaxLines(): number {
  return Math.floor((ELD_LAYOUT.REMARKS_BOX_H - 8) / ELD_LAYOUT.REMARKS_LINE_HEIGHT);
}

const GRID_WIDTH = ELD_LAYOUT.GRID_X_END - ELD_LAYOUT.GRID_X_START;

const ROW_Y_CENTRES: Record<EldRow, number> = {
  0: ELD_LAYOUT.ROW_Y_TOPS[0] + ELD_LAYOUT.ROW_HEIGHT / 2,
  1: ELD_LAYOUT.ROW_Y_TOPS[1] + ELD_LAYOUT.ROW_HEIGHT / 2,
  2: ELD_LAYOUT.ROW_Y_TOPS[2] + ELD_LAYOUT.ROW_HEIGHT / 2,
  3: ELD_LAYOUT.ROW_Y_TOPS[3] + ELD_LAYOUT.ROW_HEIGHT / 2,
};

export function hourToX(gridHour: number): number {
  return ELD_LAYOUT.GRID_X_START + (gridHour / 24) * GRID_WIDTH;
}

export function rowCentreY(row: EldRow): number {
  return ROW_Y_CENTRES[row];
}
