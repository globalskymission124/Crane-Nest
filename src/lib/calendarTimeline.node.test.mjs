import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMobileDayCards,
  buildTwoWeekCalendarRows,
  buildVehicleTimelineRows,
} from "./calendarTimeline.ts";

test("buildVehicleTimelineRows groups active reservations by vehicle and clamps bars to the visible range", () => {
  const rows = buildVehicleTimelineRows(
    [
      {
        id: "r1",
        customerName: "Yamada",
        vehicleClass: "N-BOX (成田500わ1234)",
        pickupAt: "2026-08-02T10:00:00+09:00",
        returnAt: "2026-08-05T18:00:00+09:00",
        orderNo: "A-001",
        status: "scheduled",
      },
      {
        id: "r2",
        customerName: "Smith",
        vehicleClass: "N-BOX (成田500わ1234)",
        pickupAt: "2026-07-30T09:00:00+09:00",
        returnAt: "2026-08-01T12:00:00+09:00",
        status: "scheduled",
      },
      {
        id: "r3",
        customerName: "Lee",
        pickupAt: "2026-08-03T09:00:00+09:00",
        returnAt: "2026-08-03T12:00:00+09:00",
        status: "scheduled",
      },
      {
        id: "outside",
        customerName: "Outside",
        vehicleClass: "Fit",
        pickupAt: "2026-09-01T09:00:00+09:00",
        returnAt: "2026-09-03T12:00:00+09:00",
        status: "scheduled",
      },
    ],
    "2026-08-01",
    7,
    "未設定"
  );

  assert.deepEqual(
    rows.map((row) => row.vehicleLabel),
    ["N-BOX (成田500わ1234)", "未設定"]
  );
  assert.deepEqual(
    rows[0].bars.map((bar) => ({
      customerName: bar.reservation.customerName,
      offsetDays: bar.offsetDays,
      spanDays: bar.spanDays,
      startKey: bar.startKey,
      endKey: bar.endKey,
    })),
    [
      {
        customerName: "Smith",
        offsetDays: 0,
        spanDays: 1,
        startKey: "2026-07-30",
        endKey: "2026-08-01",
      },
      {
        customerName: "Yamada",
        offsetDays: 1,
        spanDays: 4,
        startKey: "2026-08-02",
        endKey: "2026-08-05",
      },
    ]
  );
  assert.equal(rows[1].bars[0].reservation.customerName, "Lee");
});

test("buildTwoWeekCalendarRows splits long reservations at week boundaries", () => {
  const weeks = buildTwoWeekCalendarRows(
    [
      {
        id: "long",
        customerName: "Long Rental",
        vehicleClass: "和泉501わ7432",
        pickupAt: "2026-08-06T10:00:00+09:00",
        returnAt: "2026-08-11T18:00:00+09:00",
        status: "scheduled",
      },
      {
        id: "same-week",
        customerName: "Same Week",
        vehicleClass: "和泉501わ7450",
        pickupAt: "2026-08-03T10:00:00+09:00",
        returnAt: "2026-08-05T18:00:00+09:00",
        status: "scheduled",
      },
    ],
    "2026-08-02",
    "未設定"
  );

  assert.equal(weeks.length, 2);
  assert.deepEqual(
    weeks[0].segments.map((segment) => ({
      id: segment.reservation.id,
      offsetDays: segment.offsetDays,
      spanDays: segment.spanDays,
      vehicleLabel: segment.vehicleLabel,
    })),
    [
      {
        id: "same-week",
        offsetDays: 1,
        spanDays: 3,
        vehicleLabel: "和泉501わ7450",
      },
      {
        id: "long",
        offsetDays: 4,
        spanDays: 3,
        vehicleLabel: "和泉501わ7432",
      },
    ]
  );
  assert.deepEqual(
    weeks[1].segments.map((segment) => ({
      id: segment.reservation.id,
      offsetDays: segment.offsetDays,
      spanDays: segment.spanDays,
    })),
    [{ id: "long", offsetDays: 0, spanDays: 3 }]
  );
});

test("buildMobileDayCards labels starts, active rentals, and returns for compact phone views", () => {
  const days = buildMobileDayCards(
    [
      {
        id: "trip",
        customerName: "Phone Rental",
        vehicleClass: "和泉501わ7432",
        pickupAt: "2026-08-03T08:00:00+09:00",
        returnAt: "2026-08-05T17:00:00+09:00",
        status: "scheduled",
      },
      {
        id: "outside",
        customerName: "Outside",
        vehicleClass: "Fit",
        pickupAt: "2026-09-01T09:00:00+09:00",
        returnAt: "2026-09-03T12:00:00+09:00",
        status: "scheduled",
      },
    ],
    "2026-08-03",
    4,
    "未設定"
  );

  assert.deepEqual(
    days.map((day) => ({
      dayKey: day.dayKey,
      items: day.items.map((item) => ({
        phase: item.phase,
        vehicleLabel: item.vehicleLabel,
        startKey: item.startKey,
        endKey: item.endKey,
      })),
    })),
    [
      {
        dayKey: "2026-08-03",
        items: [
          {
            phase: "pickup",
            vehicleLabel: "和泉501わ7432",
            startKey: "2026-08-03",
            endKey: "2026-08-05",
          },
        ],
      },
      {
        dayKey: "2026-08-04",
        items: [
          {
            phase: "active",
            vehicleLabel: "和泉501わ7432",
            startKey: "2026-08-03",
            endKey: "2026-08-05",
          },
        ],
      },
      {
        dayKey: "2026-08-05",
        items: [
          {
            phase: "return",
            vehicleLabel: "和泉501わ7432",
            startKey: "2026-08-03",
            endKey: "2026-08-05",
          },
        ],
      },
      { dayKey: "2026-08-06", items: [] },
    ]
  );
});
