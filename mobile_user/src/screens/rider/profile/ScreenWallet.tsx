// MB Wallet: balance + history. Money comes from Refer & Earn and can be
// used on cab bills (Fare Summary → "Use MB Wallet"). Not withdrawable.
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { ChevronLeft, Wallet, Gift, ArrowDownLeft, ArrowUpRight, Info } from 'lucide-react-native';
import { getMyRiderWallet, type RiderWallet, type RiderWalletTxn } from '../../../api/riderReferral.api';

const INK = '#0B1B3F';
const BODY = '#475467';
const MUTED = '#8A94A6';
const ORANGE = '#FF4500';
const CARD = {
  backgroundColor: '#FFFFFF',
  borderRadius: 20,
  borderWidth: 1,
  borderColor: '#EEF2F6',
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.05,
  shadowRadius: 12,
  elevation: 2,
} as const;

const inr = (n?: number) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const fmt = (d?: string) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '');
const DEBIT: RiderWalletTxn['type'][] = ['ride_wallet_payment', 'referral_reversal', 'admin_debit'];
const LABEL: Record<RiderWalletTxn['type'], string> = {
  referral_reward: 'Referral reward',
  referral_joining_bonus: 'Joining bonus',
  ride_wallet_payment: 'Used on a ride',
  ride_wallet_refund: 'Returned to wallet',
  referral_reversal: 'Reward reversed',
  admin_credit: 'Added by MBGO',
  admin_debit: 'Adjusted by MBGO',
};

export default function ScreenWallet({ onNavigate, onBack }: { onNavigate: (screen: string) => void; onBack: () => void }) {
  const [data, setData] = useState<RiderWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setData((await getMyRiderWallet()).data.data);
    } catch {
      // keeps the previous data / shows the retry message
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <View style={{ height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#EEF2F6' }}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="Back">
          <ChevronLeft size={26} color={INK} strokeWidth={2.4} />
        </TouchableOpacity>
        <Text style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: INK, marginRight: 40 }}>MB Wallet</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={ORANGE} /></View>
      ) : !data ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: BODY, fontSize: 14 }}>Couldn't load your wallet.</Text>
          <TouchableOpacity onPress={() => { setLoading(true); load(); }} style={{ marginTop: 10 }}><Text style={{ color: ORANGE, fontWeight: '700' }}>Try again</Text></TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14, width: '100%', maxWidth: 520, alignSelf: 'center' }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[ORANGE]} />}
        >
          {/* Balance */}
          <View style={{ ...CARD, backgroundColor: '#0B1B3F', borderColor: '#0B1B3F', padding: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
                <Wallet size={18} color="#FFFFFF" />
              </View>
              <Text style={{ color: '#CBD5E1', fontSize: 13, fontWeight: '600' }}>Available balance</Text>
            </View>
            <Text style={{ color: '#FFFFFF', fontSize: 34, fontWeight: '900', marginTop: 10, letterSpacing: -0.5 }}>{inr(data.balance)}</Text>
            <Text style={{ color: '#94A3B8', fontSize: 12.5, marginTop: 4, lineHeight: 18 }}>
              Use it on your cab bill at checkout{data.maxPerRide > 0 ? ` (up to ${inr(data.maxPerRide)} per ride)` : ''}. Wallet money can't be withdrawn.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity onPress={() => onNavigate('31')} activeOpacity={0.85} style={{ flex: 1, height: 44, borderRadius: 12, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>Book a cab</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onNavigate('refer-earn')} activeOpacity={0.85} style={{ flex: 1, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
                <Gift size={16} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>Refer & Earn</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* History */}
          <View style={{ ...CARD, padding: 16 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: INK }}>Wallet history</Text>
            {data.transactions.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <Info size={22} color={MUTED} />
                <Text style={{ fontSize: 13.5, fontWeight: '700', color: INK, marginTop: 6 }}>No wallet activity yet</Text>
                <Text style={{ fontSize: 12.5, color: MUTED, marginTop: 2, textAlign: 'center' }}>Invite friends with Refer & Earn to add money here.</Text>
              </View>
            ) : (
              data.transactions.map((t, i) => {
                const debit = DEBIT.includes(t.type);
                const Icon = debit ? ArrowUpRight : ArrowDownLeft;
                return (
                  <View key={t._id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderTopWidth: i ? 1 : 0, borderTopColor: '#F1F5F9', marginTop: i ? 0 : 8 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: debit ? '#FEF2F2' : '#ECFDF3', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                      <Icon size={17} color={debit ? '#DC2626' : '#16A34A'} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: INK }}>{LABEL[t.type] || 'Wallet'}</Text>
                      <Text style={{ fontSize: 11.5, color: MUTED, marginTop: 1 }} numberOfLines={1}>{fmt(t.createdAt)}{t.note ? ` · ${t.note}` : ''}</Text>
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: debit ? '#DC2626' : '#16A34A' }}>{debit ? '−' : '+'}{inr(t.amount)}</Text>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
