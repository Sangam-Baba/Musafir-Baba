// @ts-check
/**
 * Passengers of a bus booking (plan Stage 18 B6) — pure. One passenger per seat: name, age and gender (no ID numbers
 * are collected). Ladies-only seats are checked against the gender when seats are taken (bus-inventory).
 */
export const MAX_SEATS_PER_BOOKING = 10;
export const GENDERS = /** @type {const} */ (['F', 'M', 'O']);
const NAME = /^[\p{L}][\p{L} .'-]{0,58}[\p{L}.]$/u;

/** @typedef {{ no: string, passenger: { name: string, age: number, gender: typeof GENDERS[number] } }} SeatPassenger */

/** Every problem at once. @param {SeatPassenger[]} seats @returns {{ field: string, code: string }[]} */
export function checkPassengers(seats) {
  const out = [];
  if (!Array.isArray(seats) || seats.length < 1 || seats.length > MAX_SEATS_PER_BOOKING)
    return [{ field: 'seats', code: 'SEAT_COUNT_INVALID' }];
  if (new Set(seats.map((s) => s.no)).size !== seats.length) out.push({ field: 'seats', code: 'SEAT_REPEATED' });
  seats.forEach((s, i) => {
    const p = s.passenger;
    if (!NAME.test(String(p?.name ?? '').trim())) out.push({ field: `seats.${i}.passenger.name`, code: 'NAME_INVALID' });
    if (!Number.isInteger(p?.age) || p.age < 1 || p.age > 120) out.push({ field: `seats.${i}.passenger.age`, code: 'AGE_INVALID' });
    if (!GENDERS.includes(p?.gender)) out.push({ field: `seats.${i}.passenger.gender`, code: 'GENDER_INVALID' });
  });
  return out;
}

/** Seats whose passenger may sit in a ladies-only seat. @param {SeatPassenger[]} seats */
export const ladiesOkSeats = (seats) => seats.filter((s) => s.passenger.gender === 'F').map((s) => s.no);
