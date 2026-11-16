// @ts-check
/** Fills a property completely through the API (every section, one room type, 5 + 2 photos) — ready to submit. */
import { uploadPhoto } from './images.js';

export const LONG_DESCRIPTION = 'A calm sea-facing hotel on Marine Drive with rooms that look over the bay and a rooftop restaurant.';

/**
 * @param {Awaited<ReturnType<typeof import('./http.js').startServer>>} srv
 * @param {Record<string, string>} auth
 * @param {string} id
 * @param {{ id: string, lat: number, lng: number }} city
 * @returns {Promise<{ version: number, roomId: string }>}
 */
export async function completeProperty(srv, auth, id, city) {
  const sections = {
    basic: { name: 'Sea View', propertyTypeKey: 'hotel', starRating: 3, description: LONG_DESCRIPTION },
    location: { cityId: city.id, line1: '12 Marine Drive', pin: '400020', lat: city.lat + 0.01, lng: city.lng },
    contacts: { email: 'stay@seaview.in', phone: '9876543210' },
    times: { checkInTime: '14:00', checkOutTime: '11:00', timeZone: 'Asia/Kolkata' },
    policies: {
      childrenAllowed: true,
      childFreeUntilAge: 5,
      extraBeds: false,
      petsAllowed: false,
      coupleFriendly: true,
      localIdAccepted: true,
      smoking: 'NO',
      idProofs: ['AADHAAR'],
    },
    amenities: { amenities: ['wifi'] },
  };
  let v = (await srv.get(`/api/v1/hotel/properties/${id}`, auth)).body.version;
  for (const [section, body] of Object.entries(sections)) {
    const r = await srv.put(`/api/v1/hotel/properties/${id}/sections/${section}`, body, { ...auth, 'if-match': `"${v}"` });
    if (r.status !== 200) throw new Error(`section ${section}: ${r.status} ${JSON.stringify(r.body)}`);
    v = r.body.version;
  }
  const room = (
    await srv.post(
      `/api/v1/hotel/properties/${id}/room-types`,
      {
        name: 'Deluxe',
        description: '',
        sizeSqm: 30,
        beds: [{ bedTypeKey: 'king', count: 1 }],
        maxAdults: 2,
        maxChildren: 1,
        maxOccupancy: 3,
        extraBeds: { allowed: false, max: 0 },
        amenities: [],
      },
      auth,
    )
  ).body;
  for (let i = 0; i < 5; i += 1) await uploadPhoto(srv.base, auth, id);
  for (let i = 0; i < 2; i += 1) await uploadPhoto(srv.base, auth, id, { fields: { category: 'ROOM', roomTypeId: room.id } });
  return { version: v, roomId: room.id };
}
