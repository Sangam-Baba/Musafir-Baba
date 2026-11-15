// @ts-check
/**
 * Starter master lists so hotels can begin before admins add more (S03-T02). Loaded once, repeat-safe, only
 * adding what is missing — an admin's later edits and switch-offs are never overwritten. City centres are
 * approximate; the radius is generous (the pin check only catches obvious mistakes). Pure data.
 */

/** @type {readonly [string, string, string, number, number, number][]} name, slug, state code, lat, lng, radius km */
export const SEED_CITIES = [
  ['Delhi', 'delhi', '07', 28.6139, 77.209, 40],
  ['Mumbai', 'mumbai', '27', 19.076, 72.8777, 40],
  ['Pune', 'pune', '27', 18.5204, 73.8567, 30],
  ['Goa', 'goa', '30', 15.4909, 73.8278, 70],
  ['Jaipur', 'jaipur', '08', 26.9124, 75.7873, 30],
  ['Udaipur', 'udaipur', '08', 24.5854, 73.7125, 30],
  ['Agra', 'agra', '09', 27.1767, 78.0081, 25],
  ['Varanasi', 'varanasi', '09', 25.3176, 82.9739, 25],
  ['Prayagraj', 'prayagraj', '09', 25.4358, 81.8463, 25],
  ['Ayodhya', 'ayodhya', '09', 26.7922, 82.1998, 25],
  ['Rishikesh', 'rishikesh', '05', 30.0869, 78.2676, 25],
  ['Haridwar', 'haridwar', '05', 29.9457, 78.1642, 25],
  ['Nainital', 'nainital', '05', 29.3919, 79.4542, 25],
  ['Shimla', 'shimla', '02', 31.1048, 77.1734, 30],
  ['Manali', 'manali', '02', 32.2432, 77.1892, 30],
  ['Amritsar', 'amritsar', '03', 31.634, 74.8723, 25],
  ['Srinagar', 'srinagar', '01', 34.0837, 74.7973, 30],
  ['Leh', 'leh', '38', 34.1526, 77.5771, 40],
  ['Bengaluru', 'bengaluru', '29', 12.9716, 77.5946, 40],
  ['Mysuru', 'mysuru', '29', 12.2958, 76.6394, 25],
  ['Kochi', 'kochi', '32', 9.9312, 76.2673, 30],
  ['Munnar', 'munnar', '32', 10.0889, 77.0595, 30],
  ['Chennai', 'chennai', '33', 13.0827, 80.2707, 40],
  ['Hyderabad', 'hyderabad', '36', 17.385, 78.4867, 40],
  ['Kolkata', 'kolkata', '19', 22.5726, 88.3639, 40],
  ['Darjeeling', 'darjeeling', '19', 27.041, 88.2663, 25],
  ['Gangtok', 'gangtok', '11', 27.3389, 88.6065, 25],
  ['Puri', 'puri', '21', 19.8135, 85.8312, 25],
  ['Ahmedabad', 'ahmedabad', '24', 23.0225, 72.5714, 35],
  ['Port Blair', 'port-blair', '35', 11.6234, 92.7265, 30],
];

/** @type {readonly [string, string, 'PROPERTY' | 'ROOM' | 'BOTH', string, string][]} key, name, level, group, icon (lucide) */
export const SEED_AMENITIES = [
  ['wifi', 'Free Wi-Fi', 'BOTH', 'Basics', 'wifi'],
  ['parking', 'Parking', 'PROPERTY', 'Basics', 'car'],
  ['power-backup', 'Power backup', 'PROPERTY', 'Basics', 'battery-charging'],
  ['lift', 'Lift', 'PROPERTY', 'Basics', 'arrow-up-down'],
  ['front-desk-24h', '24-hour front desk', 'PROPERTY', 'Services', 'concierge-bell'],
  ['room-service', 'Room service', 'PROPERTY', 'Services', 'bell-ring'],
  ['laundry', 'Laundry', 'PROPERTY', 'Services', 'shirt'],
  ['airport-transfer', 'Airport transfer', 'PROPERTY', 'Services', 'plane'],
  ['cctv', 'CCTV', 'PROPERTY', 'Basics', 'cctv'],
  ['restaurant', 'Restaurant', 'PROPERTY', 'Food & drink', 'utensils'],
  ['bar', 'Bar', 'PROPERTY', 'Food & drink', 'wine'],
  ['swimming-pool', 'Swimming pool', 'PROPERTY', 'Wellness', 'waves'],
  ['gym', 'Gym', 'PROPERTY', 'Wellness', 'dumbbell'],
  ['spa', 'Spa', 'PROPERTY', 'Wellness', 'flower-2'],
  ['banquet-hall', 'Banquet hall', 'PROPERTY', 'Services', 'party-popper'],
  ['kids-play-area', 'Kids play area', 'PROPERTY', 'Services', 'baby'],
  ['wheelchair-access', 'Wheelchair accessible', 'BOTH', 'Accessibility', 'accessibility'],
  ['air-conditioning', 'Air conditioning', 'ROOM', 'Room comfort', 'air-vent'],
  ['tv', 'TV', 'ROOM', 'Room comfort', 'tv'],
  ['work-desk', 'Work desk', 'ROOM', 'Room comfort', 'lamp-desk'],
  ['wardrobe', 'Wardrobe', 'ROOM', 'Room comfort', 'door-closed'],
  ['minibar', 'Minibar', 'ROOM', 'Room comfort', 'refrigerator'],
  ['kettle', 'Tea / coffee maker', 'ROOM', 'Room comfort', 'coffee'],
  ['safe', 'In-room safe', 'ROOM', 'Room comfort', 'lock'],
  ['balcony', 'Balcony', 'ROOM', 'Room comfort', 'sun'],
  ['hot-water', 'Hot water', 'ROOM', 'Bathroom', 'shower-head'],
  ['bathtub', 'Bathtub', 'ROOM', 'Bathroom', 'bath'],
  ['hairdryer', 'Hairdryer', 'ROOM', 'Bathroom', 'wind'],
  ['toiletries', 'Toiletries', 'ROOM', 'Bathroom', 'spray-can'],
];

/** @type {readonly [string, string][]} */
export const SEED_PROPERTY_TYPES = [
  ['hotel', 'Hotel'],
  ['resort', 'Resort'],
  ['boutique-hotel', 'Boutique hotel'],
  ['heritage-hotel', 'Heritage hotel'],
  ['homestay', 'Homestay'],
  ['guest-house', 'Guest house'],
  ['villa', 'Villa'],
  ['apartment', 'Serviced apartment'],
  ['hostel', 'Hostel'],
  ['camp', 'Camp / tents'],
];

/** @type {readonly [string, string][]} */
export const SEED_BED_TYPES = [
  ['single', 'Single bed'],
  ['double', 'Double bed'],
  ['queen', 'Queen bed'],
  ['king', 'King bed'],
  ['twin', 'Twin beds'],
  ['sofa-bed', 'Sofa bed'],
  ['bunk', 'Bunk bed'],
];

/** @type {readonly [string, string, string, string][]} key, code, name, description */
export const SEED_MEAL_PLANS = [
  ['ep', 'EP', 'Room only', 'No meals included'],
  ['cp', 'CP', 'Breakfast included', 'Breakfast for every guest'],
  ['map', 'MAP', 'Breakfast and one meal', 'Breakfast plus lunch or dinner'],
  ['ap', 'AP', 'All meals', 'Breakfast, lunch and dinner'],
];
