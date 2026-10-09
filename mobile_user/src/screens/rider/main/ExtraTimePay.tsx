// "Extra time" banner + PayU payment for city round trips (shown on the My
// Trips cab card). The amount is computed by the server when the driver
// completes the trip; this only displays it and opens the PayU checkout.
import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { Clock, Lock, CheckCircle2 } from 'lucide-react-native';
import { getRideById, payRideExtraTime } from '../../../api/ride.api';
import { buildPayUAutoSubmitHtml } from '../../../api/payment.api';

const inr = (n: number) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

export interface RideExtraTime {
  extraMinutes?: number;
  totalAmount?: number;
  status?: 'NONE' | 'DUE' | 'PAID';
}

export default function ExtraTimePay({
  rideId,
  extraTime,
  onUpdated,
  onMessage,
}: {
  rideId: string;
  extraTime?: RideExtraTime | null;
  onUpdated: (ride: any) => void;
  onMessage: (msg: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [html, setHtml] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState<string | null>(null);
  const handled = useRef(false);

  if (!extraTime || (extraTime.status !== 'DUE' && extraTime.status !== 'PAID')) return null;

  if (extraTime.status === 'PAID') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#ECFDF3', borderRadius: 10, padding: 10 }}>
        <CheckCircle2 size={15} color="#16A34A" strokeWidth={2.2} />
        <Text style={{ flex: 1, fontSize: 12.5, color: '#166534' }}>
          Extra time ({extraTime.extraMinutes} min) · {inr(extraTime.totalAmount || 0)} paid
        </Text>
      </View>
    );
  }

  const pay = async () => {
    setLoading(true);
    try {
      const res = await payRideExtraTime(rideId);
      handled.current = false;
      setBaseUrl(new URL(res.data.payuUrl).origin);
      setHtml(buildPayUAutoSubmitHtml(res.data));
    } catch (e: any) {
      onMessage(e?.response?.data?.message || 'Could not start payment, please try again');
    } finally {
      setLoading(false);
    }
  };

  const onNav = async ({ url }: { url: string }) => {
    const terminal = url.includes('/ride/extra-payment/') || url.includes('/payment/success') || url.includes('/payment/failed') || url.includes('/payment/failure');
    if (!terminal || handled.current) return;
    handled.current = true;
    setHtml(null);
    try {
      const res = await getRideById(rideId);
      const ride = res.data?.data;
      if (ride) onUpdated(ride);
      onMessage(ride?.extraTime?.status === 'PAID' ? 'Payment received. Thank you!' : 'Payment was not completed. You can try again.');
    } catch {
      onMessage('Could not confirm payment status');
    }
  };

  return (
    <View style={{ backgroundColor: '#FFF7ED', borderRadius: 12, borderWidth: 1, borderColor: '#FED7AA', padding: 12, gap: 10 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Clock size={16} color="#C2410C" strokeWidth={2.2} style={{ marginTop: 1 }} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#9A3412' }}>Extra time charges due</Text>
          <Text style={{ fontSize: 12, color: '#9A3412', marginTop: 2, lineHeight: 17 }}>
            Your return started {extraTime.extraMinutes} min after the free waiting time.
          </Text>
        </View>
        <Text style={{ fontSize: 15, fontWeight: '800', color: '#9A3412' }}>{inr(extraTime.totalAmount || 0)}</Text>
      </View>
      <TouchableOpacity onPress={pay} disabled={loading} activeOpacity={0.85} style={{ height: 42, borderRadius: 10, backgroundColor: loading ? '#FDA584' : '#FF4500', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        {loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Lock size={14} color="#FFFFFF" strokeWidth={2.2} />}
        <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#FFFFFF' }}>{loading ? 'Please wait' : `Pay ${inr(extraTime.totalAmount || 0)} (incl. GST)`}</Text>
      </TouchableOpacity>

      <Modal visible={!!html} animationType="slide" onRequestClose={() => setHtml(null)}>
        <View style={{ flex: 1, paddingTop: 40, backgroundColor: '#FFFFFF' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Lock size={14} color="#059669" strokeWidth={2} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>Secure payment</Text>
            </View>
            <TouchableOpacity onPress={() => setHtml(null)}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#FF4500' }}>Close</Text>
            </TouchableOpacity>
          </View>
          {html && (
            <WebView
              source={{ html, baseUrl: baseUrl ?? undefined }}
              onNavigationStateChange={onNav}
              startInLoadingState
              renderLoading={() => (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator size="large" color="#FF4500" />
                </View>
              )}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}
