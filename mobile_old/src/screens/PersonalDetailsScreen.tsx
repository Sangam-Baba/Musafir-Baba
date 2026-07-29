import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { personalDetailsSchema, PersonalDetailsFormData } from '../validation/profileSchema';
import { InputField } from '../components/InputField';
import { SelectDropdown, SelectOption } from '../components/SelectDropdown';
import { Button } from '../components/Button';
import { State, City } from 'country-state-city';

export const PersonalDetailsScreen = () => {
  const [stateOptions, setStateOptions] = useState<SelectOption[]>([]);
  const [cityOptions, setCityOptions] = useState<SelectOption[]>([]);

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<PersonalDetailsFormData>({
    resolver: zodResolver(personalDetailsSchema),
    defaultValues: {
      fullName: '',
      mobileNumber: '',
      partnerType: 'Individual',
      agencyName: '',
      addressLine: '',
      state: '',
      city: '',
      pincode: '',
    }
  });

  const selectedState = watch('state');
  const partnerType = watch('partnerType');

  useEffect(() => {
    const states = State.getStatesOfCountry('IN').map(s => ({
      label: s.name,
      value: s.isoCode
    }));
    setStateOptions(states);
  }, []);

  useEffect(() => {
    if (selectedState) {
      const cities = City.getCitiesOfState('IN', selectedState).map(c => ({
        label: c.name,
        value: c.name
      }));
      setCityOptions(cities);
    } else {
      setCityOptions([]);
    }
  }, [selectedState]);

  const onSubmit = (data: PersonalDetailsFormData) => {
    console.log('Valid Form Data:', data);
    // TODO: Wire up TanStack Query mutation to POST /partner/profile
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Personal Details</Text>
      
      <Controller
        control={control}
        name="fullName"
        render={({ field: { onChange, value } }) => (
          <InputField label="Full Name" value={value} onChangeText={onChange} error={errors.fullName?.message} />
        )}
      />
      
      <Controller
        control={control}
        name="mobileNumber"
        render={({ field: { onChange, value } }) => (
          <InputField label="Mobile Number" value={value} onChangeText={onChange} keyboardType="phone-pad" error={errors.mobileNumber?.message} />
        )}
      />

      <Controller
        control={control}
        name="partnerType"
        render={({ field: { onChange, value } }) => (
          <SelectDropdown
            label="Partner Type"
            selectedValue={value}
            onValueChange={onChange}
            options={[
              { label: 'Individual', value: 'Individual' },
              { label: 'Travel Agency', value: 'Agency' }
            ]}
            error={errors.partnerType?.message}
          />
        )}
      />

      {partnerType === 'Agency' && (
        <Controller
          control={control}
          name="agencyName"
          render={({ field: { onChange, value } }) => (
            <InputField label="Agency Name" value={value} onChangeText={onChange} error={errors.agencyName?.message} />
          )}
        />
      )}

      <Text style={styles.sectionTitle}>Address</Text>
      
      <Controller
        control={control}
        name="addressLine"
        render={({ field: { onChange, value } }) => (
          <InputField label="Address Line" value={value} onChangeText={onChange} error={errors.addressLine?.message} />
        )}
      />

      <Controller
        control={control}
        name="state"
        render={({ field: { onChange, value } }) => (
          <SelectDropdown 
            label="State" 
            selectedValue={value} 
            onValueChange={(val) => {
              onChange(val);
              setValue('city', ''); // Reset city on state change
            }} 
            options={stateOptions} 
            error={errors.state?.message} 
          />
        )}
      />

      <Controller
        control={control}
        name="city"
        render={({ field: { onChange, value } }) => (
          <SelectDropdown label="City" selectedValue={value} onValueChange={onChange} options={cityOptions} error={errors.city?.message} />
        )}
      />

      <Controller
        control={control}
        name="pincode"
        render={({ field: { onChange, value } }) => (
          <InputField label="Pincode" value={value} onChangeText={onChange} keyboardType="number-pad" error={errors.pincode?.message} />
        )}
      />

      <View style={styles.footer}>
        <Button title="Save & Continue" onPress={handleSubmit(onSubmit)} />
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
    marginBottom: 20,
    color: '#000',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 16,
    color: '#333',
  },
  footer: {
    marginTop: 20,
    marginBottom: 40,
  }
});
