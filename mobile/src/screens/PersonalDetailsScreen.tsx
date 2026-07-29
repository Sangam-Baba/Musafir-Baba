import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { OnboardingStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

// Import our new refactored form components
import { PersonalDetailsForm } from '../components/ProfileForms/PersonalDetailsForm';
import { BankDetailsForm } from '../components/ProfileForms/BankDetailsForm';
import { KYCDocumentsForm } from '../components/ProfileForms/KYCDocumentsForm';
import { Ionicons } from '@expo/vector-icons';

type NavigationProp = StackNavigationProp<OnboardingStackParamList, 'PersonalDetails'>;

export const PersonalDetailsScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [activeSection, setActiveSection] = useState<number>(0);

  const sections = [
    {
      title: "Basic Information",
      subtitle: "Update your personal details",
      component: <PersonalDetailsForm onSaveSuccess={() => setActiveSection(1)} />
    },
    {
      title: "Bank Account Setup",
      subtitle: "Enter your settlement bank details",
      component: <BankDetailsForm onSaveSuccess={() => setActiveSection(2)} />
    },
    {
      title: "Identity Verification",
      subtitle: "Provide scanning files of legal state identity credentials",
      component: <KYCDocumentsForm onSaveSuccess={() => navigation.navigate('FleetRegistry')} />
    }
  ];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.headerTitle}>Personal Details</Text>
      <Text style={styles.headerSubtitle}>Complete your profile setup to get verified faster.</Text>
      
      {sections.map((section, index) => {
        const isActive = activeSection === index;
        return (
          <View key={index} style={[styles.accordionItem, isActive && styles.accordionItemActive]}>
            <TouchableOpacity 
              style={styles.accordionHeader} 
              onPress={() => setActiveSection(index)}
              activeOpacity={0.7}
            >
              <View style={styles.headerLeft}>
                <View style={[styles.stepCircle, isActive && styles.stepCircleActive]}>
                  <Text style={[styles.stepText, isActive && styles.stepTextActive]}>{index + 1}</Text>
                </View>
                <View>
                  <Text style={[styles.accordionTitle, isActive && styles.accordionTitleActive]}>
                    {section.title}
                  </Text>
                  <Text style={styles.accordionSubtitle}>{section.subtitle}</Text>
                </View>
              </View>
              <Ionicons 
                name={isActive ? "chevron-up" : "chevron-down"} 
                size={20} 
                color={isActive ? colors.primary : colors.textSecondary} 
              />
            </TouchableOpacity>
            
            {isActive && (
              <View style={styles.accordionContent}>
                {section.component}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f8fafc',
    flexGrow: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 24,
  },
  accordionItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  accordionItemActive: {
    borderColor: colors.primary + '40',
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepCircleActive: {
    backgroundColor: colors.primary + '20',
  },
  stepText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
  },
  stepTextActive: {
    color: colors.primary,
  },
  accordionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
  },
  accordionTitleActive: {
    color: colors.primary,
  },
  accordionSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  accordionContent: {
    paddingTop: 0,
  }
});
