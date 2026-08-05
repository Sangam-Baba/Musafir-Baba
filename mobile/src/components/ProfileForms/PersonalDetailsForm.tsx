import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Image, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { personalDetailsSchema, PersonalDetailsFormData } from '../../validation/profileSchema';
import { InputField } from '../InputField';
import { SelectDropdown, SelectOption } from '../SelectDropdown';
import { Button } from '../Button';

import * as ImagePicker from 'expo-image-picker';
import { API_BASE_URL } from '../../utils/config';
import { useAuthStore } from '../../store/useAuthStore';
import { colors } from '../../theme/colors';

interface PersonalDetailsFormProps {
  onSaveSuccess?: () => void;
}

export const PersonalDetailsForm = ({ onSaveSuccess }: PersonalDetailsFormProps) => {
  const [stateOptions, setStateOptions] = useState<SelectOption[]>([]);
  const [cityOptions, setCityOptions] = useState<SelectOption[]>([]);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const token = useAuthStore((state) => state.token);

  const { control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<PersonalDetailsFormData>({
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

  useEffect(() => {
    const loadProfileData = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/partner/profile/dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const result = await res.json();
        if (result.success && result.data) {
          const { profile, address } = result.data;
          if (profile) setProfilePicture(profile.profilePicture || null);
          
          reset({
            fullName: profile?.fullName || '',
            mobileNumber: profile?.mobileNumber || '',
            partnerType: profile?.partnerType || 'Individual',
            agencyName: profile?.agencyName || '',
            addressLine: address?.addressLine || '',
            state: address?.state || '',
            city: address?.city || '',
            pincode: address?.pincode || '',
          });
        }
      } catch (e) {
        console.error("Error loading profile data", e);
      } finally {
        setLoading(false);
      }
    };
    
    if (token) {
      loadProfileData();
    }
  }, [token, reset]);

  const selectedState = watch('state');
  const partnerType = watch('partnerType');

  useEffect(() => {
    try {
      const { State } = require('country-state-city');
      const states = State.getStatesOfCountry('IN').map((s: any) => ({
        label: s.name,
        value: s.isoCode
      }));
      setStateOptions(states);
    } catch (e) {
      console.warn("Failed to load states", e);
    }
  }, []);

  useEffect(() => {
    if (selectedState) {
      try {
        const { City } = require('country-state-city');
        const cities = City.getCitiesOfState('IN', selectedState).map((c: any) => ({
          label: c.name,
          value: c.name
        }));
        setCityOptions(cities);
      } catch (e) {
        console.warn("Failed to load cities", e);
      }
    } else {
      setCityOptions([]);
    }
  }, [selectedState]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setProfilePicture(result.assets[0].uri);
    }
  };

  const uploadProfileImage = async (uri: string): Promise<string | null> => {
    try {
      // Basic implementation for presigned URL (similar to web)
      const presignRes = await fetch(`${API_BASE_URL}/upload/cloudflare-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: `profile_${Date.now()}.jpg`,
          fileType: 'image/jpeg',
          folder: 'partner-documents',
        }),
      });

      if (!presignRes.ok) return null;
      
      const { uploadUrl, fileUrl } = await presignRes.json();
      
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': 'image/jpeg' },
      });

      return uploadRes.ok ? fileUrl : null;
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  const onSubmit = async (data: PersonalDetailsFormData) => {
    setUploading(true);
    let uploadedImageUrl = profilePicture;
    
    // If it's a local file (starts with file://), upload it
    if (profilePicture && profilePicture.startsWith('file://')) {
      const url = await uploadProfileImage(profilePicture);
      if (url) uploadedImageUrl = url;
    }

    const profileData = {
      fullName: data.fullName,
      mobileNumber: data.mobileNumber,
      partnerType: data.partnerType,
      agencyName: data.agencyName || "",
      profilePicture: uploadedImageUrl,
    };
    
    const addressData = {
      addressLine: data.addressLine,
      city: data.city,
      state: data.state,
      pincode: data.pincode,
    };

    try {
      const res = await fetch(`${API_BASE_URL}/partner/profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ profileData, addressData }),
      });

      if (res.ok) {
        Alert.alert("Success", "Personal details saved successfully!");
        if (onSaveSuccess) onSaveSuccess();
      } else {
        Alert.alert("Error", "Failed to save profile details.");
      }
    } catch (error) {
      Alert.alert("Error", "Could not connect to server.");
    } finally {
      setUploading(false);
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
      
      <View style={styles.imagePickerContainer}>
        <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
          {profilePicture ? (
            <Image source={{ uri: profilePicture }} style={styles.profileImage} />
          ) : (
            <Text style={styles.imagePickerText}>Add Photo</Text>
          )}
        </TouchableOpacity>
      </View>
      
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
              { label: 'Travel Agency', value: 'Travel Agency' },
              { label: 'Fleet Owner', value: 'Fleet Owner' },
              { label: 'Driver', value: 'Driver' },
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 16,
    color: '#333',
  },
  imagePickerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  imagePicker: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  imagePickerText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 20,
    marginBottom: 40,
  }
});
