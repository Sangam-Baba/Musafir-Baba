import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { bankDetailsSchema, BankDetailsFormData } from '../../validation/bankSchema';
import { InputField } from '../InputField';
import { Button } from '../Button';

import { API_BASE_URL } from '../../utils/config';
import { useAuthStore } from '../../store/useAuthStore';
import { colors } from '../../theme/colors';

interface BankDetailsFormProps {
  onSaveSuccess?: () => void;
}

export const BankDetailsForm = ({ onSaveSuccess }: BankDetailsFormProps) => {
  const token = useAuthStore((state) => state.token);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  
  const { control, handleSubmit, reset, formState: { errors } } = useForm<BankDetailsFormData>({
    resolver: zodResolver(bankDetailsSchema),
    defaultValues: {
      accountHolderName: '',
      bankName: '',
      branchName: '',
      accountNumber: '',
      ifsc: '',
    }
  });

  useEffect(() => {
    const loadBankData = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/partner/profile/dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const result = await res.json();
        if (result.success && result.data) {
          const profile = result.data.profile;
          const auth = result.data.auth;
          setIsLocked(profile?.isSubmittedForApproval || auth?.status === 'Approved');

          if (result.data.bank) {
            const bank = result.data.bank;
          reset({
            accountHolderName: bank.accountHolderName || '',
            bankName: bank.bankName || '',
            branchName: bank.branchName || '',
            accountNumber: bank.accountNumber || '',
            ifsc: bank.ifsc || '',
          });
          }
        }
      } catch (e) {
        console.error("Error loading bank data", e);
      } finally {
        setLoading(false);
      }
    };
    
    if (token) {
      loadBankData();
    }
  }, [token, reset]);

  const onSubmit = async (data: BankDetailsFormData) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/partner/bank`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ bankData: data })
      });

      if (res.ok) {
        Alert.alert("Success", "Bank details saved successfully!");
        if (onSaveSuccess) onSaveSuccess();
      } else {
        const resData = await res.json();
        Alert.alert("Error", resData.message || "Failed to save bank details.");
      }
    } catch (error) {
      Alert.alert("Error", "Could not connect to server.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      
      <Controller
        control={control}
        name="accountHolderName"
        render={({ field: { onChange, value } }) => (
          <InputField label="Account Holder Name" value={value} onChangeText={onChange} error={errors.accountHolderName?.message} editable={!isLocked} />
        )}
      />
      
      <Controller
        control={control}
        name="bankName"
        render={({ field: { onChange, value } }) => (
          <InputField label="Bank Name" value={value} onChangeText={onChange} error={errors.bankName?.message} editable={!isLocked} />
        )}
      />

      <Controller
        control={control}
        name="branchName"
        render={({ field: { onChange, value } }) => (
          <InputField label="Branch Name" value={value} onChangeText={onChange} error={errors.branchName?.message} editable={!isLocked} />
        )}
      />

      <Controller
        control={control}
        name="accountNumber"
        render={({ field: { onChange, value } }) => (
          <InputField label="Account Number" value={value} onChangeText={onChange} keyboardType="number-pad" error={errors.accountNumber?.message} secureTextEntry={true} editable={!isLocked} />
        )}
      />

      <Controller
        control={control}
        name="ifsc"
        render={({ field: { onChange, value } }) => (
          <InputField label="IFSC Code" value={value} onChangeText={(text) => onChange(text.toUpperCase())} autoCapitalize="characters" error={errors.ifsc?.message} editable={!isLocked} />
        )}
      />

      {!isLocked && (
        <View style={styles.footer}>
          <Button title="Save Bank Details" onPress={handleSubmit(onSubmit)} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
    flexGrow: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    marginTop: 20,
    marginBottom: 40,
  }
});
