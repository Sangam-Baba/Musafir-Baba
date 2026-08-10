import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import React from 'react';
import { ArrowLeft, ArrowRight, Car, Users, ShieldCheck, Check, MapPin, Snowflake, Navigation, Calendar, Briefcase, ChevronDown } from 'lucide-react-native';
import { useRideStore } from '../../../store/useRideStore';
import type { RideOffer } from '../../../api/ride.api';

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

  const handleContinue = () => {
    if (!selectedOffer) return;
    onNavigate('32');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 72 }} showsVerticalScrollIndicator={false}>
        <View style={{ padding: 12, gap: 10 }}>
          
          {/* Header Bar */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
            <TouchableOpacity onPress={() => (onBack ? onBack() : onNavigate('31'))} style={{ padding: 4, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F1F5F9' }}>
              <ArrowLeft size={18} color="#0F172A" />
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>Choose a Vehicle</Text>
            <View style={{ width: 28 }} />
          </View>

          {/* Trip Summary Strip Card */}
          <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F1F5F9', borderRadius: 16, padding: 12, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6 }}>
            
            {/* Top Row: Trip type badge & Distance */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10 }}>
              <View style={{ backgroundColor: '#FFF5EF', borderWidth: 1, borderColor: '#FFE8D9', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 }}>
                <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#FF5500', letterSpacing: 0.5 }}>{tripType === 'ROUND_TRIP' ? 'ROUND TRIP' : 'ONE-WAY TRIP'}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Navigation size={13} color="#475569" />
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#475569' }}>{quote?.distanceKm ?? 298.4} km</Text>
              </View>
            </View>

            {/* Middle Section: Pickup & Drop Timeline with Region Tags */}
            <View style={{ gap: 12, paddingVertical: 2, position: 'relative' }}>
              
              {/* Pickup Location */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1 }}>
                  <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#10B981', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                    <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#10B981' }} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.5 }}>PICKUP LOCATION</Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A', marginTop: 1 }} numberOfLines={1}>
                      {pickup || 'New Delhi, Delhi'}
                    </Text>
                  </View>
                </View>
                <View style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                  <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#64748B' }}>Delhi NCR</Text>
                </View>
              </View>

              {/* Vertical Dashed Line */}
              <View style={{ position: 'absolute', left: 6, top: 16, bottom: 20, width: 1, borderStyle: 'dashed', borderWidth: 0.5, borderColor: '#CBD5E1' }} />

              {/* Drop Location */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1 }}>
                  <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#FF5500', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                    <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#FF5500' }} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.5 }}>DROP LOCATION</Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A', marginTop: 1 }} numberOfLines={1}>
                      {drop || 'Jaipur, Rajasthan'}
                    </Text>
                  </View>
                </View>
                <View style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                  <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#64748B' }}>Pink City</Text>
                </View>
              </View>

            </View>

            {/* Bottom Footer Row: Date, Time & Edit Link */}
            <View style={{ borderTopWidth: 1, borderTopColor: '#F8FAFC', paddingTop: 8, marginTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Calendar size={13} color="#0F172A" />
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#0F172A' }}>
                  {rideDate || '2026-08-13'}  <Text style={{ color: '#94A3B8' }}>•</Text>  {rideTime || '02:34 PM'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => onNavigate('31')}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#FF5500' }}>Edit</Text>
              </TouchableOpacity>
            </View>

            {tripType === 'ROUND_TRIP' && (
              <View style={{ borderTopWidth: 1, borderTopColor: '#F8FAFC', paddingTop: 8, marginTop: 4, flexDirection: 'row', alignItems: 'center' }}>
                <Calendar size={13} color="#0F172A" />
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#0F172A', marginLeft: 6 }}>
                  Return: {returnDate || '-'}  <Text style={{ color: '#94A3B8' }}>•</Text>  {returnTime || '-'}
                </Text>
              </View>
            )}

          </View>

          {/* Vehicle Offers List */}
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2 }}>
              <Text style={{ fontSize: 9, fontWeight: '700', color: '#64748B', letterSpacing: 0.5 }}>
                AVAILABLE VEHICLES ({offersToDisplay.length})
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#10B981' }} />
                <Text style={{ fontSize: 9, fontWeight: '700', color: '#059669' }}>Instant Confirmation</Text>
              </View>
            </View>

            {offersToDisplay.map((offer) => {
              const isSelected = selectedOffer?.category === offer.category;
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
                        <Text style={{ fontSize: 8.5, fontWeight: '600', color: '#94A3B8', textDecorationLine: 'line-through' }}>
                          ₹{Math.round(offer.totalAmount * 1.12).toLocaleString('en-IN')}
                        </Text>
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
                    <Text style={{ fontSize: 8.5, fontWeight: '700', color: '#059669' }}>
                      • Tolls & Fuel Included  <Text style={{ color: '#64748B', fontWeight: '500' }}>• No Hidden Charges</Text>
                    </Text>
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
