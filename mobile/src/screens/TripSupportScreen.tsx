import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Button } from '../components/Button';

export const TripSupportScreen = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<'FAQ' | 'Tickets' | 'Emergency'>('FAQ');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');

  const handleSOS = () => {
    Alert.alert(
      "EMERGENCY SOS ALERT",
      "Are you sure you want to trigger emergency SOS? MB Connect safety team and local authorities will be alerted immediately with your live GPS location.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "TRIGGER SOS", style: "destructive", onPress: () => Alert.alert("SOS Triggered", "Emergency team notified. Help is on the way.") }
      ]
    );
  };

  const handleRaiseTicket = () => {
    if (!ticketSubject || !ticketDescription) {
      Alert.alert("Error", "Please fill in ticket subject and description.");
      return;
    }
    Alert.alert("Support Ticket Submitted", "Ticket #TK-89241 created. Our partner support executive will contact you within 15 minutes.");
    setTicketSubject('');
    setTicketDescription('');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      {/* Top Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help Center & Support</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Header Info */}
        <View style={styles.header}>
          <Text style={styles.title}>Trip Support & Help</Text>
          <Text style={styles.subtitle}>24/7 Partner helpline, dispute resolution & emergency assistance.</Text>
        </View>

      {/* Emergency SOS Banner */}
      <TouchableOpacity style={styles.sosCard} onPress={handleSOS} activeOpacity={0.85}>
        <View style={styles.sosIconBox}>
          <Ionicons name="warning" size={24} color="#ffffff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.sosTitle}>EMERGENCY SOS ASSISTANCE</Text>
          <Text style={styles.sosSub}>Tap for immediate safety team & live GPS intervention</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#ffffff" />
      </TouchableOpacity>

      {/* Tab Switcher */}
      <View style={styles.tabBar}>
        {(['FAQ', 'Tickets', 'Emergency'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'FAQ' && (
        <View style={styles.faqSection}>
          <Text style={styles.sectionTitle}>FREQUENTLY ASKED QUESTIONS</Text>
          {[
            { q: "How are trip payouts settled?", a: "Trip earnings first appear as a pending balance in your wallet, then our team reviews and releases them to your available balance, which you can withdraw to your registered bank account." },
            { q: "What should I do if a passenger cancels?", a: "Report it through the trip screen or contact partner support -- any applicable cancellation charge is reviewed and credited to your wallet manually." },
            { q: "How to renew expired vehicle RC/Insurance?", a: "Go to Profile -> KYCDocuments -> Vehicle Documents and upload the new digital PDF." },
          ].map((item, idx) => (
            <View key={idx} style={styles.faqCard}>
              <Text style={styles.faqQ}>Q: {item.q}</Text>
              <Text style={styles.faqA}>{item.a}</Text>
            </View>
          ))}
        </View>
      )}

      {activeTab === 'Tickets' && (
        <View style={styles.ticketSection}>
          <Text style={styles.sectionTitle}>RAISE A SUPPORT TICKET</Text>
          <View style={styles.formCard}>
            <Text style={styles.label}>Ticket Issue / Subject</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Fare discrepancy in trip #MB-89240"
              value={ticketSubject}
              onChangeText={setTicketSubject}
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
              placeholder="Describe the issue in detail..."
              multiline
              value={ticketDescription}
              onChangeText={setTicketDescription}
            />

            <Button title="Submit Support Ticket" onPress={handleRaiseTicket} style={{ marginTop: 10 }} />
          </View>
        </View>
      )}

      {activeTab === 'Emergency' && (
        <View style={styles.emergencySection}>
          <Text style={styles.sectionTitle}>DIRECT HELPLINE NUMBERS</Text>
          <TouchableOpacity style={styles.callCard} onPress={() => Alert.alert("Calling Support", "Dialing +91 1800-123-4567...")}>
            <Ionicons name="call" size={20} color="#FE5300" style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.callTitle}>Partner Support Desk (Toll Free)</Text>
              <Text style={styles.callSub}>+91 1800-123-4567 • Available 24/7</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  container: { flex: 1, backgroundColor: '#f8fafc' },
  contentContainer: { padding: 16, paddingBottom: 40 },
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#64748b' },
  sosCard: { backgroundColor: '#dc2626', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 20, shadowColor: '#dc2626', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 4 },
  sosIconBox: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  sosTitle: { fontSize: 14, fontWeight: '800', color: '#ffffff' },
  sosSub: { fontSize: 11, color: '#fef2f2', marginTop: 2 },
  tabBar: { flexDirection: 'row', backgroundColor: '#ffffff', padding: 4, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16 },
  tabItem: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  tabItemActive: { backgroundColor: '#FE5300' },
  tabText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  tabTextActive: { color: '#ffffff' },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#94a3b8', letterSpacing: 0.8, marginBottom: 12, marginLeft: 4 },
  faqSection: {},
  faqCard: { backgroundColor: '#ffffff', borderRadius: 18, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#f1f5f9' },
  faqQ: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  faqA: { fontSize: 12, color: '#64748b', lineHeight: 18 },
  ticketSection: {},
  formCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#f1f5f9' },
  label: { fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 6 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, fontSize: 13, marginBottom: 14, color: '#0f172a' },
  emergencySection: {},
  callCard: { backgroundColor: '#ffffff', borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
  callTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  callSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
});
