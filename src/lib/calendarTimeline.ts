export interface TimelineReservation {
  id: string;
  customerName: string;
  vehicleClass?: string;
  pickupAt?: string;
  returnAt?: string;
  orderNo?: string;
  status?: string;
}

export interface VehicleTimelineBar<T extends TimelineReservation = TimelineReservation> {
  reservation: T;
  startKey: string;
  endKey: string;
  offsetDays: number;
  spanDays: number;
}

export interface VehicleTimelineRow<T extends TimelineReservation = TimelineReservation> {
  vehicleLabel: string;
  bars: VehicleTimelineBar<T>[];
}

export interface WeekCalendarSegment<T extends TimelineReservation = TimelineReservation> {
  reservation: T;
  vehicleLabel: string;
  startKey: string;
  endKey: string;
  offsetDays: number;
  spanDays: number;
}

export interface WeekCalendarRow<T extends TimelineReservation = TimelineReservation> {
  weekIndex: number;
  weekStart: string;
  weekEnd: string;
  segments: WeekCalendarSegment<T>[];
}

export type MobileDayPhase = "pickup" | "active" | "return";

export interface MobileDayItem<T extends TimelineReservation = TimelineReservation> {
  reservation: T;
  vehicleLabel: string;
  startKey: string;
  endKey: string;
  phase: MobileDayPhase;
}

export interface MobileDayCard<T extends TimelineReservation = TimelineReservation> {
  dayKey: string;
  items: MobileDayItem<T>[];
}

export function dateKey(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10) || null;
  return dateToKey(d);
}

export function keyToDate(k: string): Date {
  const [year, month, day] = k.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function dateToKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

export function todayKey(): string {
  return dateToKey(new Date());
}

export function dayDiff(a: string, b: string): number {
  return Math.round((keyToDate(b).getTime() - keyToDate(a).getTime()) / 86400000);
}

export function vehicleLabelOf(
  reservation: Pick<TimelineReservation, "vehicleClass">,
  unsetLabel: string
): string {
  const label = reservation.vehicleClass?.trim();
  return label || unsetLabel;
}

export function buildVehicleTimelineRows<T extends TimelineReservation>(
  data: T[],
  start: string,
  visibleDays: number,
  unsetLabel: string
): VehicleTimelineRow<T>[] {
  const end = dateToKey(addDays(keyToDate(start), visibleDays - 1));
  const grouped = new Map<string, VehicleTimelineBar<T>[]>();

  data.forEach((reservation) => {
    const startKey = dateKey(reservation.pickupAt);
    const endKey = dateKey(reservation.returnAt) ?? startKey;
    if (!startKey || !endKey) return;
    if (endKey < start || startKey > end) return;

    const offsetDays = Math.max(0, dayDiff(start, startKey));
    const lastVisibleOffset = Math.min(visibleDays - 1, dayDiff(start, endKey));
    const spanDays = Math.max(1, lastVisibleOffset - offsetDays + 1);
    const vehicleLabel = vehicleLabelOf(reservation, unsetLabel);
    const current = grouped.get(vehicleLabel) ?? [];

    grouped.set(vehicleLabel, [
      ...current,
      { reservation, startKey, endKey, offsetDays, spanDays },
    ]);
  });

  return Array.from(grouped.entries())
    .map(([vehicleLabel, bars]) => ({
      vehicleLabel,
      bars: [...bars].sort((a, b) => {
        const byStart = a.startKey.localeCompare(b.startKey);
        if (byStart !== 0) return byStart;
        return a.reservation.customerName.localeCompare(b.reservation.customerName);
      }),
    }))
    .sort((a, b) => a.vehicleLabel.localeCompare(b.vehicleLabel));
}

export function buildTwoWeekCalendarRows<T extends TimelineReservation>(
  data: T[],
  start: string,
  unsetLabel: string
): WeekCalendarRow<T>[] {
  return Array.from({ length: 2 }, (_, weekIndex) => {
    const weekStart = dateToKey(addDays(keyToDate(start), weekIndex * 7));
    const weekEnd = dateToKey(addDays(keyToDate(weekStart), 6));
    const segments = data.flatMap((reservation) => {
      const startKey = dateKey(reservation.pickupAt);
      const endKey = dateKey(reservation.returnAt) ?? startKey;
      if (!startKey || !endKey) return [];
      if (endKey < weekStart || startKey > weekEnd) return [];

      const visibleStart = startKey < weekStart ? weekStart : startKey;
      const visibleEnd = endKey > weekEnd ? weekEnd : endKey;
      return [
        {
          reservation,
          vehicleLabel: vehicleLabelOf(reservation, unsetLabel),
          startKey,
          endKey,
          offsetDays: dayDiff(weekStart, visibleStart),
          spanDays: Math.max(1, dayDiff(visibleStart, visibleEnd) + 1),
        },
      ];
    });

    return {
      weekIndex,
      weekStart,
      weekEnd,
      segments: segments.sort((a, b) => {
        const byStart = a.startKey.localeCompare(b.startKey);
        if (byStart !== 0) return byStart;
        return a.vehicleLabel.localeCompare(b.vehicleLabel);
      }),
    };
  });
}

export function buildMobileDayCards<T extends TimelineReservation>(
  data: T[],
  start: string,
  visibleDays: number,
  unsetLabel: string
): MobileDayCard<T>[] {
  return Array.from({ length: visibleDays }, (_, index) => {
    const dayKey = dateToKey(addDays(keyToDate(start), index));
    const items = data.flatMap((reservation) => {
      const startKey = dateKey(reservation.pickupAt);
      const endKey = dateKey(reservation.returnAt) ?? startKey;
      if (!startKey || !endKey) return [];
      if (dayKey < startKey || dayKey > endKey) return [];

      const phase: MobileDayPhase =
        dayKey === startKey ? "pickup" : dayKey === endKey ? "return" : "active";
      return [
        {
          reservation,
          vehicleLabel: vehicleLabelOf(reservation, unsetLabel),
          startKey,
          endKey,
          phase,
        },
      ];
    });

    return {
      dayKey,
      items: items.sort((a, b) => {
        const byPhase =
          phaseOrder(a.phase) - phaseOrder(b.phase);
        if (byPhase !== 0) return byPhase;
        return a.vehicleLabel.localeCompare(b.vehicleLabel);
      }),
    };
  });
}

function phaseOrder(phase: MobileDayPhase): number {
  switch (phase) {
    case "pickup":
      return 0;
    case "return":
      return 1;
    case "active":
      return 2;
  }
}
