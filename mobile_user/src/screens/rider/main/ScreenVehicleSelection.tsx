import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import React from 'react';
import { ArrowLeft, ArrowRight, Car, Bus, Users, ShieldCheck, Check, MapPin, Snowflake, Navigation, Calendar, Briefcase, ChevronDown, ChevronUp, ChevronRight, Info, UserCheck, Headphones } from 'lucide-react-native';
import { Image } from 'react-native';
import { useRideStore } from '../../../store/useRideStore';
import { isRateCardOffer, type RideOffer, type RideFareBreakdown } from '../../../api/ride.api';
import { inr, plural, formatDisplayDate, AddressLine, MetaChip, RATE_CARD_TINT, RideFlowHeader, TripSummaryCard } from './rideUi';

const MBGO_LOGO = require('../../../desgin/mbgoLogo.png');


// Display-only helpers for the rate-card vehicle cards.
const VEHICLE_SUBTITLE: Record<string, string> = {
  Hatchback: 'Swift / Similar',
  Sedan: 'Dzire / Similar',
  'Rumion / Ertiga': 'Ertiga / Similar',
  'Carens / XL MUV': 'Carens / Similar',
  SUV: 'Innova / Similar',
  'Premium SUV': 'Innova Crysta / Similar',
};
// Typical luggage space for the vehicle class (guidance only).
const bagsFor = (offer: RideOffer) => {
  if (offer.partnerCategory === 'Tempo Traveller') return Math.max(6, Math.round(offer.seatingCapacity / 2));
  if (offer.partnerCategory === 'Hatchback') return 2;
  if (offer.partnerCategory === 'Sedan') return 3;
  return offer.seatingCapacity >= 7 ? 5 : 4;
};

// Vehicle category tabs (partner classes) shown above rate-card offers.
const VEHICLE_FILTERS: { key: string; label: string; seats: string }[] = [
  { key: 'Hatchback', label: 'Hatchback', seats: '4 Seats' },
  { key: 'Sedan', label: 'Sedan', seats: '4 Seats' },
  { key: 'SUV', label: 'SUV', seats: '6–7 Seats' },
  { key: 'Tempo Traveller', label: 'Tempo Traveller', seats: '9+ Seats' },
];

// Vehicle card for offers priced from the admin rate card. Shows the total
// only -- the price working is intentionally not shown to riders.
function RateCardOfferCard({
  offer,
  isSelected,
  onSelect,
}: {
  offer: RideOffer & { fare: RideFareBreakdown };
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { fare } = offer;
  const tint = RATE_CARD_TINT[offer.partnerCategory || ''] || RATE_CARD_TINT.Sedan;
  const VehicleIcon = offer.partnerCategory === 'Tempo Traveller' ? Bus : Car;
  const subtitle = VEHICLE_SUBTITLE[offer.category] || (offer.partnerCategory === 'Tempo Traveller' ? 'Force Traveller' : undefined);
  const isRoundTrip = fare.tripType === 'ROUND_TRIP';

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onSelect}
      style={{
        backgroundColor: isSelected ? '#FFF8F1' : '#FFFFFF',
        borderRadius: 18,
        borderWidth: isSelected ? 1.5 : 1,
        borderColor: isSelected ? '#FF7A1A' : '#EEF2F6',
        padding: 12,
        flexDirection: 'row',
        gap: 12,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isSelected ? 0.08 : 0.03,
        shadowRadius: 10,
      }}
    >
      {/* Vehicle picture area */}
      <View style={{ width: 84, alignSelf: 'stretch', minHeight: 84, borderRadius: 14, backgroundColor: tint.bg, alignItems: 'center', justifyContent: 'center' }}>
        <VehicleIcon size={38} color={tint.icon} strokeWidth={1.5} />
      </View>

      <View style={{ flex: 1, gap: 7 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15.5, fontWeight: '700', color: '#0B1E3D', letterSpacing: -0.2, lineHeight: 20 }} numberOfLines={2}>{offer.category}</Text>
            {!!subtitle && <Text style={{ fontSize: 12, fontWeight: '400', color: '#64748B', marginTop: 1 }} numberOfLines={1}>{subtitle}</Text>}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: '#0B1E3D', letterSpacing: -0.4 }}>{inr(offer.totalAmount)}</Text>
            <Text style={{ fontSize: 10.5, fontWeight: '500', color: '#64748B', marginTop: 1 }}>{isRoundTrip ? `Total for ${plural(fare.days, 'Day')}` : 'Total fare'}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 12, rowGap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Users size={13} color="#475569" strokeWidth={2} />
            <Text style={{ fontSize: 12, fontWeight: '500', color: '#334155' }}>{offer.seatingCapacity} Seats</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Snowflake size={13} color="#475569" strokeWidth={2} />
            <Text style={{ fontSize: 12, fontWeight: '500', color: '#334155' }}>AC</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Briefcase size={13} color="#475569" strokeWidth={2} />
            <Text style={{ fontSize: 12, fontWeight: '500', color: '#334155' }}>{bagsFor(offer)} Bags</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 15, height: 15, borderRadius: 8, backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center' }}>
            <Check size={10} color="#FFFFFF" strokeWidth={3} />
          </View>
          <Text style={{ flex: 1, fontSize: 11, fontWeight: '500', color: '#475569', lineHeight: 15 }}>
            Fuel & Driver Included <Text style={{ color: '#CBD5E1' }}>•</Text> Tolls & Parking Extra
          </Text>
          <ChevronRight size={16} color="#94A3B8" strokeWidth={2} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

function TrustStrip() {
  const items = [
    { icon: ShieldCheck, title: 'Verified Vehicles', sub: 'Well-maintained & clean' },
    { icon: UserCheck, title: 'Expert Drivers', sub: 'Professional & verified' },
    { icon: Headphones, title: '24x7 Support', sub: 'We are here to help' },
  ];
  return (
    <View style={{ flexDirection: 'row', backgroundColor: '#F1F6FF', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 6 }}>
      {items.map((it, i) => {
        const Icon = it.icon;
        return (
          <View key={it.title} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4, borderLeftWidth: i ? 1 : 0, borderLeftColor: '#DCE6F7' }}>
            <Icon size={20} color="#2563EB" strokeWidth={1.8} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#0B1E3D' }} numberOfLines={2}>{it.title}</Text>
              <Text style={{ fontSize: 9.5, fontWeight: '400', color: '#64748B' }} numberOfLines={2}>{it.sub}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const CATEGORY_STYLE: Record<string, { bg: string; border: string; icon: string }> = {
  Hatchback: { bg: '#EFF6FF', border: '#DBEAFE', icon: '#2563EB' },
  Sedan: { bg: '#FFF5EF', border: '#FFEDD5', icon: '#FF5500' },
  SUV: { bg: '#ECFDF5', border: '#A7F3D0', icon: '#059669' },
  'Tempo Traveller': { bg: '#F3E8FF', border: '#E9D5FF', icon: '#9333EA' },
};

// Default fallback mock offers if quote is loading
const FALLBACK_OFFERS: RideOffer[] = [
  { category: 'Hatchback', vehicleName: 'Maruti Suzuki Swift VXI', seatingCapacity: 5, baseFare: 3000, driverAllowance: 382, totalAmount: 3382 },
  { category: 'Sedan', vehicleName: 'Maruti Suzuki Dzire VDI', seatingCapacity: 4, baseFare: 3500, driverAllowance: 479, totalAmount: 3979 },
  { category: 'SUV', vehicleName: 'Toyota Innova Crysta', seatingCapacity: 7, baseFare: 4500, driverAllowance: 673, totalAmount: 5173 },
  { category: 'Tempo Traveller', vehicleName: 'Force Motors Traveller 3350', seatingCapacity: 12, baseFare: 6000, driverAllowance: 665, totalAmount: 6665 },
];

export default function ScreenVehicleSelection({ onNavigate, onBack }: { onNavigate: (screen: string) => void; onBack?: () => void }) {
  const pickup = useRideStore((s) => s.pickup);
  const drop = useRideStore((s) => s.drop);
  const rideDate = useRideStore((s) => s.rideDate);
  const rideTime = useRideStore((s) => s.rideTime);
  const tripType = useRideStore((s) => s.tripType);
  const returnDate = useRideStore((s) => s.returnDate);
  const returnTime = useRideStore((s) => s.returnTime);
  const quote = useRideStore((s) => s.quote);
  const selectedOffer = useRideStore((s) => s.selectedOffer);
  const setSelectedOffer = useRideStore((s) => s.setSelectedOffer);

  const offersToDisplay = (quote && quote.offers && quote.offers.length > 0) ? quote.offers : FALLBACK_OFFERS;

  // Auto select SUV if none selected yet
  React.useEffect(() => {
    if (!selectedOffer && offersToDisplay.length > 0) {
      setSelectedOffer(offersToDisplay[2] || offersToDisplay[0]);
    }
  }, [selectedOffer, offersToDisplay, setSelectedOffer]);

  const handleSelect = (offer: RideOffer) => {
    setSelectedOffer(offer);
  };

  const firstRateCardOffer = offersToDisplay.find(isRateCardOffer);
  // Vehicle-class tab ('' = all). Only shown for rate-card offers.
  const [vehicleFilter, setVehicleFilter] = React.useState('');
  const availableFilters = VEHICLE_FILTERS.filter((f) => offersToDisplay.some((o) => o.partnerCategory === f.key));
  const listedOffers = vehicleFilter ? offersToDisplay.filter((o) => o.partnerCategory === vehicleFilter) : offersToDisplay;
  const tripDays = firstRateCardOffer?.fare.days;

  const handleContinue = () => {
    if (!selectedOffer) return;
    onNavigate('32');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 84 }} showsVerticalScrollIndicator={false}>
        <View style={{ padding: 12, gap: 10 }}>
          
          <RideFlowHeader title="Choose a Vehicle" subtitle="Select the best vehicle for your trip" onBack={() => (onBack ? onBack() : onNavigate('31'))} />

          <TripSummaryCard
            pickup={pickup || 'New Delhi, Delhi'}
            drop={drop || 'Jaipur, Rajasthan'}
            isRoundTrip={tripType === 'ROUND_TRIP'}
            distanceKm={quote?.distanceKm ?? 298.4}
            rideDate={rideDate || '2026-08-13'}
            rideTime={rideTime || '02:34 PM'}
            returnDate={returnDate}
            returnTime={returnTime}
            tripDays={tripDays}
            onEdit={() => (onBack ? onBack() : onNavigate('31'))}
          />

          {/* Vehicle Offers List */}
          <View style={{ gap: 10 }}>
            {firstRateCardOffer && availableFilters.length > 1 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
                {[{ key: '', label: 'All', seats: 'Vehicles' }, ...availableFilters].map((f) => {
                  const active = vehicleFilter === f.key;
                  const Icon = f.key === 'Tempo Traveller' ? Bus : Car;
                  return (
                    <TouchableOpacity
                      key={f.key || 'all'}
                      onPress={() => setVehicleFilter(f.key)}
                      style={{ minWidth: 84, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 14, alignItems: 'center', gap: 3, borderWidth: active ? 1.5 : 1, borderColor: active ? '#93C5FD' : '#E8EDF3', backgroundColor: active ? '#EFF6FF' : '#FFFFFF' }}
                    >
                      <Icon size={18} color={active ? '#2563EB' : '#475569'} strokeWidth={1.9} />
                      <Text style={{ fontSize: 12.5, fontWeight: '700', color: active ? '#1D4ED8' : '#1E293B' }}>{f.label}</Text>
                      <Text style={{ fontSize: 10.5, fontWeight: '500', color: active ? '#3B82F6' : '#94A3B8' }}>{f.key ? `(${f.seats})` : f.seats}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2, paddingTop: 4 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>
                  {offersToDisplay.length} vehicles available
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' }} />
                  <Text style={{ fontSize: 11, fontWeight: '500', color: '#059669' }}>Instant confirmation</Text>
                </View>
              </View>
            )}

            {listedOffers.map((offer) => {
              const isSelected = selectedOffer?.category === offer.category;
              if (isRateCardOffer(offer)) {
                return (
                  <RateCardOfferCard key={offer.category} offer={offer} isSelected={isSelected} onSelect={() => handleSelect(offer)} />
                );
              }
              return (
                <TouchableOpacity
                  key={offer.category}
                  onPress={() => handleSelect(offer)}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 14,
                    padding: 9,
                    gap: 5,
                    borderWidth: isSelected ? 1.5 : 1,
                    borderColor: isSelected ? '#FF5500' : '#F1F5F9',
                    shadowColor: '#0F172A',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.02,
                    shadowRadius: 4,
                  }}
                >
                  {/* Top Header Row: Car Graphic, Name, Tag & Price */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                      {/* Left Graphic Box */}
                      <View style={{ width: 44, height: 40, borderRadius: 10, backgroundColor: isSelected ? '#FFF5EF' : '#F8FAFC', borderWidth: 1, borderColor: isSelected ? '#FFE8D9' : '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                        <Car size={18} color={isSelected ? '#FF5500' : '#1E293B'} />
                        <Text style={{ fontSize: 7.5, fontWeight: '600', color: '#64748B', marginTop: 1 }}>
                          {offer.category === 'Hatchback' ? '5m away' : '3m away'}
                        </Text>
                      </View>

                      {/* Name & Subtitle */}
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: isSelected ? '#FF5500' : '#0F172A' }}>
                            {offer.category}
                          </Text>
                          {offer.category === 'Hatchback' && (
                            <View style={{ backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 5 }}>
                              <Text style={{ fontSize: 8, fontWeight: '800', color: '#059669' }}>Best Value</Text>
                            </View>
                          )}
                          {offer.category === 'Sedan' && (
                            <View style={{ backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 5 }}>
                              <Text style={{ fontSize: 8, fontWeight: '800', color: '#2563EB' }}>Popular</Text>
                            </View>
                          )}
                        </View>
                        <Text style={{ fontSize: 9.5, fontWeight: '500', color: '#64748B' }} numberOfLines={1}>
                          {offer.vehicleName}
                        </Text>
                      </View>
                    </View>

                    {/* Price & Check Radio Indicator */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 6 }}>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 15, fontWeight: '900', color: '#0F172A' }}>
                          ₹{offer.totalAmount.toLocaleString('en-IN')}
                        </Text>
                        {isRateCardOffer(offer) ? (
                          <Text style={{ fontSize: 8.5, fontWeight: '600', color: '#64748B' }}>
                            {offer.fare.billableKm} km × ₹{offer.fare.ratePerKm}
                          </Text>
                        ) : (
                          <Text style={{ fontSize: 8.5, fontWeight: '600', color: '#94A3B8', textDecorationLine: 'line-through' }}>
                            ₹{Math.round(offer.totalAmount * 1.12).toLocaleString('en-IN')}
                          </Text>
                        )}
                      </View>

                      <View style={{
                        width: 18,
                        height: 18,
                        borderRadius: 9,
                        borderWidth: isSelected ? 0 : 1.5,
                        borderColor: '#CBD5E1',
                        backgroundColor: isSelected ? '#FF5500' : '#FFFFFF',
                        alignItems: 'center',
                        justify: 'center'
                      }}>
                        {isSelected && <Check size={11} color="#FFFFFF" />}
                      </View>
                    </View>

                  </View>

                  {/* Middle Row: Feature Badges (Seats, Bags, AC) */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingTop: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 }}>
                      <Users size={9} color="#475569" />
                      <Text style={{ fontSize: 8.5, fontWeight: '700', color: '#475569' }}>{offer.seatingCapacity} Seats</Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 }}>
                      <Briefcase size={9} color="#475569" />
                      <Text style={{ fontSize: 8.5, fontWeight: '700', color: '#475569' }}>{offer.category === 'SUV' ? '4 Bags' : '2 Bags'}</Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 }}>
                      <Snowflake size={9} color="#059669" />
                      <Text style={{ fontSize: 8.5, fontWeight: '700', color: '#059669' }}>AC Vehicle</Text>
                    </View>
                  </View>

                  {/* Card Bottom Footer Strip */}
                  <View style={{ borderTopWidth: 1, borderTopColor: '#F8FAFC', paddingTop: 4, marginTop: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    {isRateCardOffer(offer) ? (
                      <Text style={{ fontSize: 8.5, fontWeight: '700', color: '#059669' }}>
                        • Fuel & Driver Included  <Text style={{ color: '#64748B', fontWeight: '500' }}>• Tolls/Parking extra</Text>
                      </Text>
                    ) : (
                      <Text style={{ fontSize: 8.5, fontWeight: '700', color: '#059669' }}>
                        • Tolls & Fuel Included  <Text style={{ color: '#64748B', fontWeight: '500' }}>• No Hidden Charges</Text>
                      </Text>
                    )}
                    <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                      <Text style={{ fontSize: 9, fontWeight: '800', color: '#FF5500' }}>Fare Breakup</Text>
                      <ChevronDown size={10} color="#FF5500" />
                    </TouchableOpacity>
                  </View>

                </TouchableOpacity>
              );
            })}

            {firstRateCardOffer && <TrustStrip />}
          </View>

        </View>
      </ScrollView>

      {/* Sticky Continue Bar */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12, zIndex: 40 }}>
        <TouchableOpacity
          onPress={handleContinue}
          disabled={!selectedOffer}
          style={{
            width: '100%',
            height: 50,
            backgroundColor: selectedOffer ? '#FF5500' : '#CBD5E1',
            borderRadius: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 12,
            gap: 6
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' }}>
            {selectedOffer ? `Continue with ${selectedOffer.category} • ₹${selectedOffer.totalAmount.toLocaleString('en-IN')}` : 'Select a vehicle to continue'}
          </Text>
          <ArrowRight size={15} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

    </View>
  );
}
