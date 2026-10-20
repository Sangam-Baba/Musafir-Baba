import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { WebView } from 'react-native-webview';

// Opens a musafirbaba.com page (Terms & Conditions, Privacy Policy) inside the
// app. Links to other sites open in the phone's browser instead.

export const LEGAL_PAGES = {
  terms: { title: 'Terms & Conditions', url: 'https://musafirbaba.com/mbconnect/terms-and-conditions' },
  privacy: { title: 'Privacy Policy', url: 'https://musafirbaba.com/mbconnect/privacy-policy' },
} as const;

const isOwnSite = (url: string) => /^https:\/\/(www\.)?musafirbaba\.com(\/|$)/i.test(url);

export const LegalPageScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const title: string = route.params?.title || 'MBConnect';
  const url: string = route.params?.url || LEGAL_PAGES.terms.url;
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const openInBrowser = () => Linking.openURL(url).catch(() => {});

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <TouchableOpacity onPress={openInBrowser} style={styles.iconBtn} accessibilityLabel="Open in browser">
          <Ionicons name="open-outline" size={20} color="#475569" />
        </TouchableOpacity>
      </View>

      {failed ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={40} color="#94a3b8" />
          <Text style={styles.failTitle}>Couldn't load this page</Text>
          <Text style={styles.failSub}>Check your internet connection and try again.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => { setFailed(false); setLoading(true); setReloadKey((k) => k + 1); }}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={openInBrowser} style={{ marginTop: 12 }}>
            <Text style={styles.linkText}>Open in browser</Text>
          </TouchableOpacity>
        </View>
      ) : Platform.OS === 'web' ? (
        // Web preview only (the phone app uses the WebView below).
        React.createElement('iframe', { src: url, title, style: { flex: 1, width: '100%', height: '100%', border: 0 } })
      ) : (
        <View style={{ flex: 1 }}>
          <WebView
            key={reloadKey}
            source={{ uri: url }}
            onLoadEnd={() => setLoading(false)}
            onError={() => { setLoading(false); setFailed(true); }}
            onHttpError={(e) => { if (e.nativeEvent.statusCode >= 500) { setLoading(false); setFailed(true); } }}
            onShouldStartLoadWithRequest={(req) => {
              if (isOwnSite(req.url) || req.url === 'about:blank') return true;
              Linking.openURL(req.url).catch(() => {});
              return false;
            }}
            setSupportMultipleWindows={false}
            style={{ flex: 1 }}
          />
          {loading && (
            <View style={styles.loading} pointerEvents="none">
              <ActivityIndicator size="large" color="#FE5300" />
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: '#ffffff' },
  iconBtn: { padding: 6, width: 40, alignItems: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: '#0f172a' },
  loading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.6)' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  failTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginTop: 10 },
  failSub: { fontSize: 13, color: '#64748b', marginTop: 4, textAlign: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: '#FE5300', borderRadius: 12, paddingHorizontal: 22, paddingVertical: 11 },
  retryText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  linkText: { color: '#FE5300', fontSize: 13, fontWeight: '700' },
});
