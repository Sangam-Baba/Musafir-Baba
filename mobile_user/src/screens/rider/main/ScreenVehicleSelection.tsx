import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import React from 'react';
import { ArrowLeft, ArrowRight, Car, Bus, Users, ShieldCheck, Check, MapPin, Snowflake, Navigation, Calendar, Briefcase, ChevronDown, ChevronUp, Info } from 'lucide-react-native';
import { useRideStore } from '../../../store/useRideStore';
import { isRateCardOffer, type RideOffer, type RideFareBreakdown } from '../../../api/ride.api';
import { inr, plural, formatDisplayDate, AddressLine, MetaChip, RATE_CARD_TINT } from './rideUi';


// Trip-level summary shown above admin rate-card offers, so riders see why
// round trips are billed the way they are.
function RateCardTripSummary({ fare, routeKm }: { fare: RideFareBreakdown; routeKm: number }) {
  const isRoundTrip = fare.tripType === 'ROUND_TRIP';
  return (
    <View style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
      <Info size={16} color="#475569" strokeWidth={2} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#0F172A' }}>
          {isRoundTrip
            ? `${plural(fare.days, 'day')} • ${Math.round(fare.actualKm).toLocaleString('en-IN')} km total driving`
            : `${Math.round(routeKm).toLocaleString('en-IN')} km one way`}
        </Text>
        <Text style={{ fontSize: 11, fontWeight: '400', color: '#64748B', lineHeight: 16 }}>
          {isRoundTrip
            ? 'Charged on actual km or the daily minimum km, whichever is higher.'
            : 'Charged on the route distance.'}
        </Text>
      </View>
    </View>
  );
}

function BreakupRow({ label, detail, amount, bold }: { label: string; detail?: string; amount: number; bold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: bold ? 13 : 12, fontWeight: bold ? '600' : '500', color: bold ? '#0F172A' : '#334155' }}>{label}</Text>
        {!!detail && <Text style={{ fontSize: 11, fontWeight: '400', color: '#94A3B8', marginTop: 1 }}>{detail}</Text>}
      </View>
      <Text style={{ fontSize: bold ? 14 : 12, fontWeight: bold ? '700' : '500', color: '#0F172A' }}>{inr(amount)}</Text>
    </View>
  );
}


// Vehicle card for offers priced from the admin rate card. The original card
// (further below) is still used, unchanged, for any other quote.
function RateCardOfferCard({
  offer,
  isSelected,
  isExpanded,
  onSelect,
  onToggleBreakup,
}: {
  offer: RideOffer & { fare: RideFareBreakdown };
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: () => void;
  onToggleBreakup: () => void;
}) {
  const { fare } = offer;
  const tint = RATE_CARD_TINT[offer.partnerCategory || ''] || RATE_CARD_TINT.Sedan;
  const VehicleIcon = offer.partnerCategory === 'Tempo Traveller' ? Bus : Car;
  const minApplied = fare.billableKm > fare.actualKm;
  const minPerDay = fare.days > 0 ? Math.round(fare.billableKm / fare.days) : 0;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onSelect}
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: isSelected ? 1.5 : 1,
        borderColor: isSelected ? '#FF5500' : '#EEF2F6',
        padding: 14,
        gap: 12,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isSelected ? 0.08 : 0.03,
        shadowRadius: 8,
      }}
    >
      {/* Icon, name, capacity, price */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: tint.bg, alignItems: 'center', justifyContent: 'center' }}>
          <VehicleIcon size={22} color={tint.icon} strokeWidth={1.75} />
        </View>

        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#0F172A', letterSpacing: -0.2 }} numberOfLines={2}>
            {offer.category}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Users size={12} color="#64748B" strokeWidth={2} />
              <Text style={{ fontSize: 12, fontWeight: '500', color: '#64748B' }}>{offer.seatingCapacity} seats</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Snowflake size={12} color="#64748B" strokeWidth={2} />
              <Text style={{ fontSize: 12, fontWeight: '500', color: '#64748B' }}>AC</Text>
            </View>
          </View>
        </View>

        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A', letterSpacing: -0.3 }}>{inr(offer.totalAmount)}</Text>
          <Text style={{ fontSize: 11, fontWeight: '500', color: '#94A3B8' }}>Total fare</Text>
        </View>
      </View>

      {/* How it's billed */}
      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
        <View style={{ backgroundColor: '#F1F5F9', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 }}>
          <Text style={{ fontSize: 11, fontWeight: '500', color: '#334155' }}>
            ₹{fare.ratePerKm}/km × {fare.billableKm.toLocaleString('en-IN')} km
          </Text>
        </View>
        {minApplied && (
          <View style={{ backgroundColor: '#FFFBEB', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: '500', color: '#B45309' }}>
              Min {minPerDay} km/day × {plural(fare.days, 'day')}
            </Text>
          </View>
        )}
      </View>

      {/* Footer: inclusions + breakup toggle */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 10, gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 }}>
          <ShieldCheck size={13} color="#059669" strokeWidth={2} />
          <Text style={{ fontSize: 11, fontWeight: '500', color: '#475569' }} numberOfLines={1}>
            Fuel & driver included<Text style={{ color: '#94A3B8' }}>  •  Tolls extra</Text>
          </Text>
        </View>
        <TouchableOpacity onPress={onToggleBreakup} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#FF5500' }}>{isExpanded ? 'Hide breakup' : 'Fare breakup'}</Text>
          {isExpanded ? <ChevronUp size={14} color="#FF5500" strokeWidth={2} /> : <ChevronDown size={14} color="#FF5500" strokeWidth={2} />}
        </TouchableOpacity>
      </View>

      {isExpanded && (
        <View style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, gap: 9 }}>
          <BreakupRow label="Vehicle fare" detail={`${fare.billableKm.toLocaleString('en-IN')} km × ₹${fare.ratePerKm}/km`} amount={fare.vehicleFare} />
          {fare.driverAllowance > 0 && <BreakupRow label="Driver allowance" detail={plural(fare.days, 'day')} amount={fare.driverAllowance} />}
          {fare.nightAllowance > 0 && <BreakupRow label="Night allowance" detail={plural(fare.nights, 'night')} amount={fare.nightAllowance} />}
          {fare.platformCharges > 0 && <BreakupRow label="Platform charges" amount={fare.platformCharges} />}
          {fare.taxes > 0 && <BreakupRow label="Taxes" amount={fare.taxes} />}
          <View style={{ borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 9 }}>
            <BreakupRow label="Total fare" amount={offer.totalAmount} bold />
          </View>
          <Text style={{ fontSize: 11, fontWeight: '400', color: '#94A3B8' }}>Tolls, parking and state taxes are paid on the trip.</Text>
        </View>
      )}
    </TouchableOpacity>
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

  // Which rate-card card has its fare breakup open (only used by RateCardOfferCard).
  const [expandedCategory, setExpandedCategory] = React.useState<string | null>(null);
  const firstRateCardOffer = offersToDisplay.find(isRateCardOffer);

  const handleContinue = () => {
    if (!selectedOffer) return;
    onNavigate('32');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 72 }} showsVerticalScrollIndicator={false}>
        <View style={{ padding: 12, gap: 10 }}>
          
          {/* Header Bar */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4, paddingBottom: 2 }}>
            <TouchableOpacity
              onPress={() => (onBack ? onBack() : onNavigate('31'))}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' }}
            >
              <ArrowLeft size={18} color="#0F172A" strokeWidth={2} />
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#0F172A', letterSpacing: -0.2 }}>Choose a vehicle</Text>
            <View style={{ width: 36 }} />
          </View>

          {/* Trip Summary Card */}
          <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEF2F6', borderRadius: 16, padding: 14, gap: 12, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 }}>
            {/* Route timeline */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ alignItems: 'center', paddingTop: 5, width: 12 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981', borderWidth: 2, borderColor: '#D1FAE5' }} />
                <View style={{ flex: 1, width: 1.5, backgroundColor: '#E2E8F0', marginVertical: 4, borderRadius: 1 }} />
                <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#FF5500', borderWidth: 2, borderColor: '#FFE4D5' }} />
              </View>
              <View style={{ flex: 1, gap: 14 }}>
                <AddressLine label="Pickup" address={pickup || 'New Delhi, Delhi'} />
                <AddressLine label="Drop" address={drop || 'Jaipur, Rajasthan'} />
              </View>
            </View>

            {/* Trip meta */}
            <View style={{ borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <View style={{ flex: 1, gap: 8 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  <MetaChip highlight label={tripType === 'ROUND_TRIP' ? 'Round trip' : 'One way'} />
                  <MetaChip icon={<Navigation size={11} color="#64748B" strokeWidth={2} />} label={`${Math.round(quote?.distanceKm ?? 298.4).toLocaleString('en-IN')} km`} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Calendar size={13} color="#64748B" strokeWidth={2} />
                  <Text style={{ fontSize: 12, fontWeight: '500', color: '#334155' }}>
                    {formatDisplayDate(rideDate || '2026-08-13')}, {rideTime || '02:34 PM'}
                  </Text>
                </View>
                {tripType === 'ROUND_TRIP' && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Calendar size={13} color="#64748B" strokeWidth={2} />
                    <Text style={{ fontSize: 12, fontWeight: '500', color: '#334155' }}>
                      Return {returnDate ? formatDisplayDate(returnDate) : '-'}, {returnTime || '-'}
                    </Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                onPress={() => (onBack ? onBack() : onNavigate('31'))}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#FFF5EF' }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#FF5500' }}>Edit</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Vehicle Offers List */}
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2, paddingTop: 4 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>
                {offersToDisplay.length} vehicles available
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' }} />
                <Text style={{ fontSize: 11, fontWeight: '500', color: '#059669' }}>Instant confirmation</Text>
              </View>
            </View>

            {firstRateCardOffer && (
              <RateCardTripSummary fare={firstRateCardOffer.fare} routeKm={quote?.distanceKm ?? 0} />
            )}

            {offersToDisplay.map((offer) => {
              const isSelected = selectedOffer?.category === offer.category;
              if (isRateCardOffer(offer)) {
                return (
                  <RateCardOfferCard
                    key={offer.category}
                    offer={offer}
                    isSelected={isSelected}
                    isExpanded={expandedCategory === offer.category}
                    onSelect={() => handleSelect(offer)}
                    onToggleBreakup={() => setExpandedCategory((cur) => (cur === offer.category ? null : offer.category))}
                  />
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
          </View>

        </View>
      </ScrollView>

      {/* Sticky Continue Bar */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F1F5F9', padding: 10, zIndex: 40 }}>
        <TouchableOpacity
          onPress={handleContinue}
          disabled={!selectedOffer}
          style={{
            width: '100%',
            height: 40,
            backgroundColor: selectedOffer ? '#FF5500' : '#CBD5E1',
            borderRadius: 10,
            flexDirection: 'row',
            alignItems: 'center',
            justify: 'center',
            paddingHorizontal: 12,
            gap: 6
          }}
        >
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' }}>
            {selectedOffer ? `Continue with ${selectedOffer.category} • ₹${selectedOffer.totalAmount.toLocaleString('en-IN')}` : 'Select a vehicle to continue'}
          </Text>
          <ArrowRight size={15} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

    </View>
  );
}
