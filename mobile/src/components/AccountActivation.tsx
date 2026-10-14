// Account activation status for partners who aren't approved yet: which
// steps are left, and where each one is done. Approved partners never see it.
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type ChecklistItem = { key: string; label: string; done: boolean };

export type Activation = {
  // 'approved' = normal Go Online / Offline toggle.
  state: 'approved' | 'incomplete' | 'ready' | 'review' | 'hold' | 'rejected';
  checklist: ChecklistItem[];
  missing: ChecklistItem[];
  title: string;
  subtitle: string;
  actionLabel: string;
  // Menu-stack screen the action opens.
  actionScreen: string;
};

// Where each checklist step is completed in the app.
export const STEP_SCREEN: Record<string, string> = {
  name: 'PersonalDetails',
  mobile: 'PersonalDetails',
  address: 'PersonalDetails',
  aadhaar: 'IdentityProof',
  pan: 'IdentityProof',
  photo: 'IdentityProof',
  bank: 'BankDetails',
  vehicle: 'VehiclesList',
  driver: 'VehiclesList',
  serviceArea: 'ServiceAreaPricing',
};

export function getActivation(data: any): Activation {
  const status: string = data?.auth?.status || '';
  const checklist: ChecklistItem[] = Array.isArray(data?.submissionChecklist) ? data.submissionChecklist : [];
  const missing = checklist.filter((item) => !item.done);
  const base = { checklist, missing };

  // Older servers don't send isApproved -- keep the app exactly as before.
  if (data?.isApproved === undefined || data?.isApproved === true) {
    return { ...base, state: 'approved', title: '', subtitle: '', actionLabel: '', actionScreen: '' };
  }
  if (status === 'Hold' || status === 'Rejected') {
    const next = missing[0];
    return {
      ...base,
      state: status === 'Hold' ? 'hold' : 'rejected',
      title: status === 'Hold' ? 'Account on hold' : 'Application not approved',
      subtitle: 'Update your details and send for approval again',
      actionLabel: 'Fix now',
      actionScreen: next ? STEP_SCREEN[next.key] || 'PersonalDetails' : 'PersonalDetails',
    };
  }
  if (data?.profile?.isSubmittedForApproval) {
    return {
      ...base,
      state: 'review',
      title: 'Account under review',
      subtitle: "We'll notify you once it's approved",
      actionLabel: 'View',
      actionScreen: 'VerifiedPartner',
    };
  }
  if (checklist.length && missing.length === 0) {
    return {
      ...base,
      state: 'ready',
      title: 'Ready to submit',
      subtitle: 'Send your profile for approval to go online',
      actionLabel: 'Submit',
      actionScreen: 'PersonalDetails',
    };
  }
  const next = missing[0];
  // Same 5 grouped steps as the Home card.
  const stepsLeft = buildSteps(checklist).filter((step) => !step.done);
  return {
    ...base,
    state: 'incomplete',
    title: 'Account not activated',
    subtitle: stepsLeft.length
      ? `${stepsLeft.length} step${stepsLeft.length === 1 ? '' : 's'} left · Next: ${stepsLeft[0].title}`
      : 'Complete your profile to go online',
    actionLabel: 'Complete',
    actionScreen: next ? STEP_SCREEN[next.key] || 'PersonalDetails' : 'PersonalDetails',
  };
}

const TONE: Record<Activation['state'], { accent: string; soft: string; label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  approved: { accent: '#16a34a', soft: '#ecfdf5', label: 'Active', icon: 'shield-checkmark' },
  incomplete: { accent: '#FE5300', soft: '#fff4ed', label: 'Setup pending', icon: 'flash-outline' },
  ready: { accent: '#16a34a', soft: '#ecfdf5', label: 'Ready', icon: 'paper-plane-outline' },
  review: { accent: '#2563eb', soft: '#eff6ff', label: 'In review', icon: 'time-outline' },
  hold: { accent: '#d97706', soft: '#fffbeb', label: 'On hold', icon: 'alert-circle-outline' },
  rejected: { accent: '#dc2626', soft: '#fef2f2', label: 'Not approved', icon: 'close-circle-outline' },
};

// The 10 checklist items grouped into 5 steps, each finished on one screen.
const STEP_GROUPS: { title: string; keys: string[]; icon: keyof typeof Ionicons.glyphMap }[] = [
  { title: 'Personal details', keys: ['name', 'mobile', 'address'], icon: 'person-outline' },
  { title: 'Identity documents', keys: ['aadhaar', 'pan', 'photo'], icon: 'id-card-outline' },
  { title: 'Bank account', keys: ['bank'], icon: 'business-outline' },
  { title: 'Vehicle & driver', keys: ['vehicle', 'driver'], icon: 'car-sport-outline' },
  { title: 'Service area', keys: ['serviceArea'], icon: 'location-outline' },
];

// Short names for the "still needed" caption.
const SHORT_LABEL: Record<string, string> = {
  name: 'full name', mobile: 'mobile number', address: 'address', aadhaar: 'Aadhaar', pan: 'PAN',
  photo: 'profile photo', bank: 'bank account', vehicle: 'a vehicle', driver: 'a driver', serviceArea: 'your city',
};

function buildSteps(checklist: ChecklistItem[]) {
  return STEP_GROUPS.map((group) => {
    const items = checklist.filter((i) => group.keys.includes(i.key));
    const missing = items.filter((i) => !i.done);
    return { ...group, items, missing, done: items.length > 0 && missing.length === 0 };
  }).filter((step) => step.items.length > 0);
}

// Home card: a 5-step setup guide (tap a step to go and finish it).
export function ActivationCard({ activation, onOpen }: { activation: Activation; onOpen: (screen: string) => void }) {
  if (activation.state === 'approved') return null;
  const tone = TONE[activation.state];
  const steps = buildSteps(activation.checklist);
  const doneCount = steps.filter((s) => s.done).length;
  const currentIndex = steps.findIndex((s) => !s.done);
  const locked = activation.state === 'review';
  const intro =
    activation.state === 'incomplete'
      ? `Finish ${steps.length - doneCount} more step${steps.length - doneCount === 1 ? '' : 's'} to start taking rides.`
      : activation.subtitle;

  return (
    <View style={{ marginHorizontal: 16, marginTop: 16, backgroundColor: '#ffffff', borderRadius: 20, borderWidth: 1, borderColor: '#eef2f6', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 3, overflow: 'hidden' }}>
      {/* Header */}
      <View style={{ backgroundColor: tone.soft, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Ionicons name={tone.icon} size={12} color={tone.accent} />
            <Text style={{ marginLeft: 4, fontSize: 10.5, fontWeight: '800', color: tone.accent, letterSpacing: 0.3 }}>{tone.label.toUpperCase()}</Text>
          </View>
          {steps.length > 0 && (
            <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#64748b' }}>
              <Text style={{ color: '#0f172a', fontWeight: '800' }}>{doneCount}</Text> of {steps.length} steps
            </Text>
          )}
        </View>
        <Text style={{ fontSize: 17, fontWeight: '800', color: '#0f172a', marginTop: 10, letterSpacing: -0.3 }}>{activation.title}</Text>
        <Text style={{ fontSize: 12.5, color: '#475569', marginTop: 2, lineHeight: 17 }}>{intro}</Text>
        {steps.length > 0 && (
          <View style={{ flexDirection: 'row', gap: 4, marginTop: 12 }}>
            {steps.map((step, i) => (
              <View key={step.title} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: step.done ? tone.accent : i === currentIndex && !locked ? `${tone.accent}55` : '#e2e8f0' }} />
            ))}
          </View>
        )}
      </View>

      {/* Steps */}
      <View style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10 }}>
        {steps.map((step, i) => {
          const isCurrent = i === currentIndex && !locked;
          const isLast = i === steps.length - 1;
          const screen = STEP_SCREEN[step.missing[0]?.key || step.items[0].key] || 'PersonalDetails';
          const caption = step.done
            ? 'Completed'
            : `Add ${step.missing.map((m) => SHORT_LABEL[m.key] || m.label).join(', ')}`;
          return (
            <TouchableOpacity
              key={step.title}
              disabled={step.done || locked}
              onPress={() => onOpen(screen)}
              activeOpacity={0.7}
              style={{ flexDirection: 'row' }}
            >
              {/* Marker + connector */}
              <View style={{ width: 28, alignItems: 'center' }}>
                <View style={{ height: 10, width: 2, backgroundColor: i === 0 ? 'transparent' : steps[i - 1].done ? tone.accent : '#e2e8f0' }} />
                <View
                  style={{
                    width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: step.done ? tone.accent : isCurrent ? '#ffffff' : '#f8fafc',
                    borderWidth: step.done ? 0 : 2,
                    borderColor: isCurrent ? tone.accent : '#e2e8f0',
                  }}
                >
                  {step.done ? (
                    <Ionicons name="checkmark" size={14} color="#ffffff" />
                  ) : (
                    <Text style={{ fontSize: 11, fontWeight: '800', color: isCurrent ? tone.accent : '#94a3b8' }}>{i + 1}</Text>
                  )}
                </View>
                {!isLast && <View style={{ flex: 1, width: 2, minHeight: 10, backgroundColor: step.done ? tone.accent : '#e2e8f0' }} />}
              </View>

              {/* Text */}
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingLeft: 10, marginTop: 4 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: step.done ? '600' : '800', color: step.done ? '#64748b' : '#0f172a' }}>{step.title}</Text>
                  <Text style={{ fontSize: 12, color: step.done ? '#16a34a' : '#64748b', marginTop: 1 }} numberOfLines={1}>{caption}</Text>
                </View>
                {isCurrent ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: tone.accent, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#ffffff' }}>Start</Text>
                    <Ionicons name="arrow-forward" size={12} color="#ffffff" style={{ marginLeft: 3 }} />
                  </View>
                ) : !step.done && !locked ? (
                  <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
                ) : null}
              </View>
            </TouchableOpacity>
          );
        })}

        {activation.state !== 'incomplete' && activation.state !== 'review' && (
          <TouchableOpacity
            onPress={() => onOpen(activation.actionScreen)}
            activeOpacity={0.85}
            style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: tone.accent, borderRadius: 12, paddingVertical: 11 }}
          >
            <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#ffffff' }}>{activation.state === 'ready' ? 'Send for approval' : activation.actionLabel}</Text>
            <Ionicons name="arrow-forward" size={14} color="#ffffff" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        )}
        {locked && (
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: tone.soft, borderRadius: 12, padding: 10, marginTop: 6 }}>
            <Ionicons name="notifications-outline" size={16} color={tone.accent} />
            <Text style={{ flex: 1, marginLeft: 8, fontSize: 12, color: '#334155' }}>We'll notify you as soon as your account is approved.</Text>
          </View>
        )}
      </View>
    </View>
  );
}
