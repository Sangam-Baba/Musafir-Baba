import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { bankDetailsSchema, BankDetailsFormData } from '../validation/bankSchema';
import { InputField } from '../components/InputField';
import { Button } from '../components/Button';

export const BankDetailsScreen = () => {
  const { control, handleSubmit, formState: { errors } } = useForm<BankDetailsFormData>({
    resolver: zodResolver(bankDetailsSchema),
    defaultValues: {
      accountHolderName: '',
      bankName: '',
      branchName: '',
      accountNumber: '',
      ifsc: '',
    }
  });

  const onSubmit = (data: BankDetailsFormData) => {
    console.log('Valid Bank Data:', data);
    // TODO: Wire up TanStack Query mutation to POST /partner/bank
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Bank Details</Text>
      <Text style={styles.subtitle}>Enter your settlement bank account details.</Text>
      
      <Controller
        control={control}
        name="accountHolderName"
        render={({ field: { onChange, value } }) => (
          <InputField label="Account Holder Name" value={value} onChangeText={onChange} error={errors.accountHolderName?.message} />
        )}
      />
      
      <Controller
        control={control}
        name="bankName"
        render={({ field: { onChange, value } }) => (
          <InputField label="Bank Name" value={value} onChangeText={onChange} error={errors.bankName?.message} />
        )}
      />

      <Controller
        control={control}
        name="branchName"
        render={({ field: { onChange, value } }) => (
          <InputField label="Branch Name" value={value} onChangeText={onChange} error={errors.branchName?.message} />
        )}
      />

      <Controller
        control={control}
        name="accountNumber"
        render={({ field: { onChange, value } }) => (
          <InputField label="Account Number" value={value} onChangeText={onChange} keyboardType="number-pad" error={errors.accountNumber?.message} secureTextEntry={true} />
        )}
      />

      <Controller
        control={control}
        name="ifsc"
        render={({ field: { onChange, value } }) => (
          <InputField label="IFSC Code" value={value} onChangeText={(text) => onChange(text.toUpperCase())} autoCapitalize="characters" error={errors.ifsc?.message} />
        )}
      />

      <View style={styles.footer}>
        <Button title="Save Bank Details" onPress={handleSubmit(onSubmit)} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
    flexGrow: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  footer: {
    marginTop: 20,
    marginBottom: 40,
  }
});
