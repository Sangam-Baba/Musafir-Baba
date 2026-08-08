import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import React from 'react';
import { ArrowLeft, Car, Users, ShieldCheck, Check, MapPin } from 'lucide-react-native';
import { useRideStore } from '../../../store/useRideStore';
import type { RideOffer } from '../../../api/ride.api';

const CATEGORY_STYLE: Record<string, { bg: string; icon: string }> = {
  Hatchback: { bg: 'bg-blue-100', icon: 'text-blue-600' },
  Sedan: { bg: 'bg-orange-100', icon: 'text-[#FF3B00]' },
  SUV: { bg: 'bg-emerald-100', icon: 'text-emerald-600' },
  'Tempo Traveller': { bg: 'bg-purple-100', icon: 'text-purple-600' },
};

export default function ScreenVehicleSelection({ onNavigate }: { onNavigate: (screen: string) => void }) {
  const pickup = useRideStore((s) => s.pickup);
  const drop = useRideStore((s) => s.drop);
  const rideDate = useRideStore((s) => s.rideDate);
  const rideTime = useRideStore((s) => s.rideTime);
  const quote = useRideStore((s) => s.quote);
  const selectedOffer = useRideStore((s) => s.selectedOffer);
  const setSelectedOffer = useRideStore((s) => s.setSelectedOffer);

  const handleSelect = (offer: RideOffer) => {
    setSelectedOffer(offer);
  };

  const handleContinue = () => {
    if (!selectedOffer) return;
    onNavigate('32');
  };

  return (
    <View className="flex-1 bg-[#F8FAFC]">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View className="p-4 space-y-4">
          {/* Header Bar */}
          <View className="flex items-center justify-between pt-1 flex-row">
            <TouchableOpacity onPress={() => onNavigate('31')} className="p-1 hover:bg-slate-100 rounded-full">
              <ArrowLeft className="w-5 h-5"/>
            </TouchableOpacity>
            <Text className="text-base font-black text-slate-900">Choose a Vehicle</Text>
            <View className="w-5"></View>
          </View>

          {/* Trip Summary Strip */}
          <View className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-sm space-y-2">
            <View className="flex items-start gap-2 flex-row">
              <View className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0"></View>
              <Text className="text-xs font-bold text-slate-900 flex-1" numberOfLines={1}>{pickup}</Text>
            </View>
            <View className="flex items-start gap-2 flex-row">
              <MapPin className="w-3 h-3 text-[#FF3B00] mt-0.5 shrink-0"/>
              <Text className="text-xs font-bold text-slate-900 flex-1" numberOfLines={1}>{drop}</Text>
            </View>
            <View className="border-t border-slate-100 pt-2">
              <Text className="text-[10px] font-bold text-slate-400">{rideDate} • {rideTime} • {quote?.distanceKm ?? 0} km</Text>
            </View>
          </View>

          {/* Vehicle Offers List */}
          <View className="space-y-3">
            <Text className="text-xs font-black text-slate-900 uppercase tracking-wider">Available Vehicles</Text>

            {!quote && (
              <View className="items-center py-10">
                <ActivityIndicator color="#FF3B00" />
              </View>
            )}

            {quote && quote.offers.length === 0 && (
              <View className="bg-white border border-slate-200/80 rounded-3xl p-6 items-center">
                <Text className="text-xs font-bold text-slate-500">No vehicles available for this route right now</Text>
              </View>
            )}

            {quote?.offers.map((offer) => {
              const style = CATEGORY_STYLE[offer.category] || { bg: 'bg-slate-100', icon: 'text-slate-600' };
              const isSelected = selectedOffer?.category === offer.category;
              return (
                <TouchableOpacity
                  key={offer.category}
                  onPress={() => handleSelect(offer)}
                  className={`bg-white rounded-3xl p-4 shadow-sm flex items-center justify-between flex-row border-2 ${
                    isSelected ? 'border-[#FF3B00]' : 'border-slate-200/80'
                  }`}
                >
                  <View className="flex items-center gap-3 flex-row flex-1 min-w-0">
                    <View className={`w-14 h-14 rounded-2xl ${style.bg} flex items-center justify-center shrink-0`}>
                      <Car className={`w-7 h-7 ${style.icon}`}/>
                    </View>
                    <View className="flex-1 min-w-0">
                      <Text className="text-sm font-black text-slate-900">{offer.category}</Text>
                      <Text className="text-[10px] text-slate-500 font-bold" numberOfLines={1}>{offer.vehicleName}</Text>
                      <View className="flex items-center gap-3 pt-1 flex-row">
                        <Text className="flex items-center gap-0.5 text-[10px] text-slate-500 font-bold">
                          <Users className="w-3 h-3 text-slate-400"/> {offer.seatingCapacity} Seats
                        </Text>
                        <Text className="flex items-center gap-0.5 text-[10px] text-emerald-600 font-bold">
                          <ShieldCheck className="w-3 h-3 text-emerald-600"/> AC
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View className="items-end shrink-0 ml-2">
                    <Text className="text-base font-black text-slate-900">₹{offer.totalAmount.toLocaleString('en-IN')}</Text>
                    <View className={`w-5 h-5 rounded-full border-2 mt-1 flex items-center justify-center ${
                      isSelected ? 'border-[#FF3B00] bg-[#FF3B00]' : 'border-slate-300'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-white"/>}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Sticky Continue Bar */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200/80 p-4">
        <TouchableOpacity
          onPress={handleContinue}
          disabled={!selectedOffer}
          className={`w-full py-3.5 rounded-2xl shadow-lg flex items-center justify-center flex-row ${
            selectedOffer ? 'bg-[#FF3B00]' : 'bg-slate-200'
          }`}
        >
          <Text className={`font-extrabold text-sm text-center ${selectedOffer ? 'text-white' : 'text-slate-400'}`}>
            {selectedOffer ? `Continue with ${selectedOffer.category} • ₹${selectedOffer.totalAmount.toLocaleString('en-IN')}` : 'Select a vehicle to continue'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
