import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../store/useAuthStore';
import { API_BASE_URL } from '../utils/config';

export const AddVehicleScreen = () => {
  const navigation = useNavigation<any>();
  const token = useAuthStore((state) => state.token);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);

  // Tab 1 State: Vehicle Specs
  const [regNo, setRegNo] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('2023');
  const [fuel, setFuel] = useState<'Diesel' | 'CNG' | 'Petrol' | 'EV'>('Diesel');
  const [category, setCategory] = useState<'SUV' | 'Sedan' | 'Hatchback' | 'Tempo Traveller'>('SUV');
  const [seats, setSeats] = useState('7');
  const [showSeatDropdown, setShowSeatDropdown] = useState(false);
  const [color, setColor] = useState('White');

  // Tab 1 State: 6 Vehicle Inspection Images (real URI strings)
  const [frontImage, setFrontImage] = useState('');
  const [backImage, setBackImage] = useState('');
  const [leftSideImage, setLeftSideImage] = useState('');
  const [rightSideImage, setRightSideImage] = useState('');
  const [interiorFrontImage, setInteriorFrontImage] = useState('');
  const [interiorBackImage, setInteriorBackImage] = useState('');

  // Tab 2 State: Vehicle Documents (real URI strings)
  const [rcUri, setRcUri] = useState('');
  const [insuranceUri, setInsuranceUri] = useState('');
  const [pucUri, setPucUri] = useState('');
  const [permitUri, setPermitUri] = useState('');

  // Tab 3 State: Associated Driver Data
  const [driverName, setDriverName] = useState('');
  const [driverMobile, setDriverMobile] = useState('');
  const [driverLicense, setDriverLicense] = useState('');
  const [driverLicenceUri, setDriverLicenceUri] = useState('');

  // Real device image picker with web browser fallback
  const pickImage = (setter: (uri: string) => void): void => {
    const tryExpo = async () => {
      try {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          quality: 0.7,
          base64: true,
        });
        if (!result.canceled && result.assets && result.assets.length > 0) {
          const asset = result.assets[0];
          setter(asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri);
          return;
        }
      } catch (e) {
        console.warn('Expo ImagePicker failed, using web fallback:', e);
      }
      // Web/Expo Go fallback
      if (typeof document !== 'undefined') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e: any) => {
          const file = e.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = () => { if (reader.result) setter(reader.result as string); };
            reader.readAsDataURL(file);
          }
        };
        input.click();
      }
    };
    tryExpo();
  };

  // Step Navigators
  const handleNextStep1 = () => {
    if (!regNo || !make || !model) {
      Alert.alert("Missing Details", "Please fill in Registration Number, Vehicle Make, and Model.");
      return;
    }
    const seatNum = parseInt(seats, 10);
    if (isNaN(seatNum) || seatNum < 4 || seatNum > 50) {
      Alert.alert("Invalid Seating Capacity", "Seating capacity must be a number between 4 and 50 seats.");
      return;
    }
    if (!frontImage || !backImage || !leftSideImage || !rightSideImage || !interiorFrontImage || !interiorBackImage) {
      Alert.alert("Missing Photos", "Please upload all 6 required vehicle photos (1 Front, 1 Back, 2 Side views, 2 Interior views).");
      return;
    }
    setCurrentStep(2);
  };

  const handleNextStep2 = () => {
    if (!rcUri || !insuranceUri) {
      Alert.alert("Missing Documents", "Please upload RC Certificate and Commercial Vehicle Insurance.");
      return;
    }
    setCurrentStep(3);
  };

  const handleSubmitVehicle = async () => {
    if (!driverName || !driverMobile || !driverLicense) {
      Alert.alert("Missing Driver Info", "Please fill in Driver Name, Mobile Number, and License Number.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/partner/vehicle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          vehicleData: {
            registrationNumber: regNo.toUpperCase().trim(),
            brand: make.trim(),
            model: model.trim(),
            vehicleName: `${make.trim()} ${model.trim()}`,
            category: category,
            seatingCapacity: Number(seats) || 4,
            manufacturingYear: Number(year) || 2023,
            color: color,
            rcImageUrl: rcUri,
            insuranceFileUrl: insuranceUri,
            pucImageUrl: pucUri || undefined,
            permitFileUrl: permitUri || undefined,
            frontImageUrl: frontImage,
            rearImageUrl: backImage,
            leftSideImageUrl: leftSideImage,
            rightSideImageUrl: rightSideImage,
            interiorImageUrl: interiorFrontImage,
            otherImageUrl: interiorBackImage,
            driver: {
              name: driverName.trim(),
              mobile: driverMobile.trim(),
              licenseNo: driverLicense.trim(),
              licenceImageUrl: driverLicenceUri || undefined,
            }
          }
        })
      });

      const result = await res.json();

      if (res.ok && result.success) {
        Alert.alert(
          "Vehicle Submitted!",
          `Vehicle ${regNo.toUpperCase()} (${make} ${model}) with driver "${driverName}" has been submitted for audit.`,
          [
            {
              text: "View My Vehicles",
              onPress: () => navigation.navigate('VehiclesList'),
            }
          ]
        );
      } else {
        Alert.alert("Submission Failed", result.message || "Failed to submit vehicle details.");
      }
    } catch (error) {
      console.error("Error submitting vehicle:", error);
      Alert.alert("Network Error", "Unable to connect to the server.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      {/* Top Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Vehicle</Text>
        <TouchableOpacity 
          style={styles.helpBtn}
          onPress={() => navigation.navigate('TripSupport')}
        >
          <Ionicons name="help-circle-outline" size={16} color="#0f172a" style={{ marginRight: 2 }} />
          <Text style={styles.helpText}>Help</Text>
        </TouchableOpacity>
      </View>

      {/* Progress Bar (3 Tabs) */}
      <View style={styles.progressContainer}>
        <View style={styles.progressRow}>
          <View style={[styles.stepDot, currentStep >= 1 && styles.stepDotActive]}>
            <Text style={[styles.stepDotText, currentStep >= 1 && styles.stepDotTextActive]}>1</Text>
          </View>
          <View style={[styles.progressLine, currentStep >= 2 && styles.progressLineActive]} />
          <View style={[styles.stepDot, currentStep >= 2 && styles.stepDotActive]}>
            <Text style={[styles.stepDotText, currentStep >= 2 && styles.stepDotTextActive]}>2</Text>
          </View>
          <View style={[styles.progressLine, currentStep >= 3 && styles.progressLineActive]} />
          <View style={[styles.stepDot, currentStep >= 3 && styles.stepDotActive]}>
            <Text style={[styles.stepDotText, currentStep >= 3 && styles.stepDotTextActive]}>3</Text>
          </View>
        </View>

        <View style={styles.progressLabelsRow}>
          <Text style={[styles.progressLabel, currentStep === 1 && styles.progressLabelActive]}>1. Vehicle & Photos</Text>
          <Text style={[styles.progressLabel, currentStep === 2 && styles.progressLabelActive]}>2. Documents</Text>
          <Text style={[styles.progressLabel, currentStep === 3 && styles.progressLabelActive]}>3. Driver Data</Text>
        </View>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* TAB 1: VEHICLE SPECIFICATIONS & 6 IMAGES */}
        {currentStep === 1 && (
          <>
            <Text style={styles.sectionHeader}>A. Vehicle Specifications</Text>
            <View style={styles.formCard}>
              <Text style={styles.fieldLabel}>Registration Number *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. DL01AB1234"
                placeholderTextColor="#94a3b8"
                autoCapitalize="characters"
                value={regNo}
                onChangeText={setRegNo}
              />

              <Text style={styles.fieldLabel}>Vehicle Make / Brand *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Toyota, Maruti Suzuki, Hyundai"
                placeholderTextColor="#94a3b8"
                value={make}
                onChangeText={setMake}
              />

              <Text style={styles.fieldLabel}>Vehicle Model *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Innova Crysta, Dzire, Ertiga"
                placeholderTextColor="#94a3b8"
                value={model}
                onChangeText={setModel}
              />

              <View style={styles.twoColRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.fieldLabel}>Year</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="2023"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    value={year}
                    onChangeText={setYear}
                  />
                </View>

                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.fieldLabel}>Body Color</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="White"
                    placeholderTextColor="#94a3b8"
                    value={color}
                    onChangeText={setColor}
                  />
                </View>
              </View>

              {/* Seating Capacity Dropdown (Range: 4 to 50 Seats) */}
              <Text style={styles.fieldLabel}>Seating Capacity *</Text>
              <TouchableOpacity 
                style={styles.dropdownBtn}
                onPress={() => setShowSeatDropdown(!showSeatDropdown)}
                activeOpacity={0.8}
              >
                <Ionicons name="people-outline" size={18} color="#FE5300" style={{ marginRight: 8 }} />
                <Text style={styles.dropdownBtnText}>{seats} Seats</Text>
                <Ionicons name={showSeatDropdown ? "chevron-up" : "chevron-down"} size={18} color="#64748b" style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>

              {showSeatDropdown && (
                <View style={styles.dropdownMenuCard}>
                  <Text style={styles.dropdownMenuHeader}>Select Seating Capacity (4 to 50 Seats):</Text>
                  <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled showsVerticalScrollIndicator={true}>
                    {Array.from({ length: 47 }, (_, i) => i + 4).map((num) => {
                      const isSelected = seats === String(num);
                      return (
                        <TouchableOpacity
                          key={num}
                          style={[styles.dropdownItemRow, isSelected && styles.dropdownItemRowSelected]}
                          onPress={() => {
                            setSeats(String(num));
                            setShowSeatDropdown(false);
                          }}
                        >
                          <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextSelected]}>
                            {num} Seats {num === 4 ? '(Sedan/Hatchback)' : num === 5 ? '(Sedan)' : num === 7 ? '(SUV/Innova)' : num === 12 ? '(Tempo Traveller)' : num === 26 ? '(Mini Bus)' : num === 50 ? '(Bus/Coach)' : ''}
                          </Text>
                          {isSelected && <Ionicons name="checkmark" size={16} color="#FE5300" />}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              <Text style={styles.fieldLabel}>Vehicle Category</Text>
              <View style={styles.pillSelectionRow}>
                {(['SUV', 'Sedan', 'Hatchback', 'Tempo Traveller'] as const).map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.selectPill, category === cat && styles.selectPillActive]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={[styles.selectPillText, category === cat && styles.selectPillTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Fuel Type</Text>
              <View style={styles.pillSelectionRow}>
                {(['Diesel', 'CNG', 'Petrol', 'EV'] as const).map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.selectPill, fuel === f && styles.selectPillActive]}
                    onPress={() => setFuel(f)}
                  >
                    <Text style={[styles.selectPillText, fuel === f && styles.selectPillTextActive]}>{f}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* B. Vehicle Images (6 Inspection Photos) */}
            <Text style={styles.sectionHeader}>B. Vehicle Photos (6 Inspection Images)</Text>
            <Text style={styles.sectionSubNotice}>
              Please upload 6 photos: 1 Front, 1 Back, 2 Side views, and 2 Interior views.
            </Text>

            <View style={styles.photoGridCard}>
              {/* Photo 1: Front */}
              <View style={styles.photoUploadItem}>
                <View style={styles.photoLeftInfo}>
                  {frontImage ? (
                    <Image source={{ uri: frontImage }} style={styles.thumbImg} />
                  ) : (
                    <View style={[styles.photoIconBox, { backgroundColor: '#e0f2fe' }]}>
                      <Ionicons name="camera-outline" size={18} color="#0284c7" />
                    </View>
                  )}
                  <View style={{ marginLeft: 10 }}>
                    <Text style={styles.photoTitle}>1. Front View Image *</Text>
                    <Text style={styles.photoSub}>{frontImage ? 'Attached ✓  Tap to change' : 'Clear front view with reg plate'}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.uploadPillBtn, frontImage && styles.uploadPillBtnSuccess]}
                  onPress={() => pickImage(setFrontImage)}
                >
                  <Ionicons name={frontImage ? 'checkmark-circle' : 'cloud-upload-outline'} size={14} color={frontImage ? '#16a34a' : '#FE5300'} />
                  <Text style={[styles.uploadPillText, frontImage && { color: '#16a34a' }]}>{frontImage ? 'Done' : 'Choose'}</Text>
                </TouchableOpacity>
              </View>

              {/* Photo 2: Back */}
              <View style={styles.photoUploadItem}>
                <View style={styles.photoLeftInfo}>
                  {backImage ? (
                    <Image source={{ uri: backImage }} style={styles.thumbImg} />
                  ) : (
                    <View style={[styles.photoIconBox, { backgroundColor: '#e0f2fe' }]}>
                      <Ionicons name="camera-outline" size={18} color="#0284c7" />
                    </View>
                  )}
                  <View style={{ marginLeft: 10 }}>
                    <Text style={styles.photoTitle}>2. Back / Rear View Image *</Text>
                    <Text style={styles.photoSub}>{backImage ? 'Attached ✓  Tap to change' : 'Clear rear view showing rear reg plate'}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.uploadPillBtn, backImage && styles.uploadPillBtnSuccess]}
                  onPress={() => pickImage(setBackImage)}
                >
                  <Ionicons name={backImage ? 'checkmark-circle' : 'cloud-upload-outline'} size={14} color={backImage ? '#16a34a' : '#FE5300'} />
                  <Text style={[styles.uploadPillText, backImage && { color: '#16a34a' }]}>{backImage ? 'Done' : 'Choose'}</Text>
                </TouchableOpacity>
              </View>

              {/* Photo 3: Left Side */}
              <View style={styles.photoUploadItem}>
                <View style={styles.photoLeftInfo}>
                  {leftSideImage ? (
                    <Image source={{ uri: leftSideImage }} style={styles.thumbImg} />
                  ) : (
                    <View style={[styles.photoIconBox, { backgroundColor: '#fff7ed' }]}>
                      <Ionicons name="image-outline" size={18} color="#d97706" />
                    </View>
                  )}
                  <View style={{ marginLeft: 10 }}>
                    <Text style={styles.photoTitle}>3. Left Side Full View *</Text>
                    <Text style={styles.photoSub}>{leftSideImage ? 'Attached ✓  Tap to change' : 'Full left exterior side profile'}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.uploadPillBtn, leftSideImage && styles.uploadPillBtnSuccess]}
                  onPress={() => pickImage(setLeftSideImage)}
                >
                  <Ionicons name={leftSideImage ? 'checkmark-circle' : 'cloud-upload-outline'} size={14} color={leftSideImage ? '#16a34a' : '#FE5300'} />
                  <Text style={[styles.uploadPillText, leftSideImage && { color: '#16a34a' }]}>{leftSideImage ? 'Done' : 'Choose'}</Text>
                </TouchableOpacity>
              </View>

              {/* Photo 4: Right Side */}
              <View style={styles.photoUploadItem}>
                <View style={styles.photoLeftInfo}>
                  {rightSideImage ? (
                    <Image source={{ uri: rightSideImage }} style={styles.thumbImg} />
                  ) : (
                    <View style={[styles.photoIconBox, { backgroundColor: '#fff7ed' }]}>
                      <Ionicons name="image-outline" size={18} color="#d97706" />
                    </View>
                  )}
                  <View style={{ marginLeft: 10 }}>
                    <Text style={styles.photoTitle}>4. Right Side Full View *</Text>
                    <Text style={styles.photoSub}>{rightSideImage ? 'Attached ✓  Tap to change' : 'Full right exterior side profile'}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.uploadPillBtn, rightSideImage && styles.uploadPillBtnSuccess]}
                  onPress={() => pickImage(setRightSideImage)}
                >
                  <Ionicons name={rightSideImage ? 'checkmark-circle' : 'cloud-upload-outline'} size={14} color={rightSideImage ? '#16a34a' : '#FE5300'} />
                  <Text style={[styles.uploadPillText, rightSideImage && { color: '#16a34a' }]}>{rightSideImage ? 'Done' : 'Choose'}</Text>
                </TouchableOpacity>
              </View>

              {/* Photo 5: Interior Front */}
              <View style={styles.photoUploadItem}>
                <View style={styles.photoLeftInfo}>
                  {interiorFrontImage ? (
                    <Image source={{ uri: interiorFrontImage }} style={styles.thumbImg} />
                  ) : (
                    <View style={[styles.photoIconBox, { backgroundColor: '#f3e8ff' }]}>
                      <Ionicons name="car-outline" size={18} color="#7c3aed" />
                    </View>
                  )}
                  <View style={{ marginLeft: 10 }}>
                    <Text style={styles.photoTitle}>5. Front Interior / Dashboard *</Text>
                    <Text style={styles.photoSub}>{interiorFrontImage ? 'Attached ✓  Tap to change' : 'Front dashboard & steering wheel'}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.uploadPillBtn, interiorFrontImage && styles.uploadPillBtnSuccess]}
                  onPress={() => pickImage(setInteriorFrontImage)}
                >
                  <Ionicons name={interiorFrontImage ? 'checkmark-circle' : 'cloud-upload-outline'} size={14} color={interiorFrontImage ? '#16a34a' : '#FE5300'} />
                  <Text style={[styles.uploadPillText, interiorFrontImage && { color: '#16a34a' }]}>{interiorFrontImage ? 'Done' : 'Choose'}</Text>
                </TouchableOpacity>
              </View>

              {/* Photo 6: Interior Rear */}
              <View style={[styles.photoUploadItem, { borderBottomWidth: 0 }]}>
                <View style={styles.photoLeftInfo}>
                  {interiorBackImage ? (
                    <Image source={{ uri: interiorBackImage }} style={styles.thumbImg} />
                  ) : (
                    <View style={[styles.photoIconBox, { backgroundColor: '#f3e8ff' }]}>
                      <Ionicons name="people-outline" size={18} color="#7c3aed" />
                    </View>
                  )}
                  <View style={{ marginLeft: 10 }}>
                    <Text style={styles.photoTitle}>6. Rear Passenger Seating *</Text>
                    <Text style={styles.photoSub}>{interiorBackImage ? 'Attached ✓  Tap to change' : 'Clean passenger seating area'}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.uploadPillBtn, interiorBackImage && styles.uploadPillBtnSuccess]}
                  onPress={() => pickImage(setInteriorBackImage)}
                >
                  <Ionicons name={interiorBackImage ? 'checkmark-circle' : 'cloud-upload-outline'} size={14} color={interiorBackImage ? '#16a34a' : '#FE5300'} />
                  <Text style={[styles.uploadPillText, interiorBackImage && { color: '#16a34a' }]}>{interiorBackImage ? 'Done' : 'Choose'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={handleNextStep1} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Proceed to Step 2: Documents</Text>
              <Ionicons name="arrow-forward" size={18} color="#ffffff" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </>
        )}

        {/* TAB 2: VEHICLE DOCUMENTS */}
        {currentStep === 2 && (
          <>
            <Text style={styles.sectionHeader}>Step 2: Mandatory Vehicle Documents</Text>
            <View style={styles.formCard}>
              {/* Document 1: RC */}
              <View style={styles.docUploadRow}>
                {rcUri ? (
                  <Image source={{ uri: rcUri }} style={styles.thumbImg} />
                ) : (
                  <View style={[styles.docIconBox, { backgroundColor: '#e0f2fe' }]}>
                    <Ionicons name="car-outline" size={20} color="#0284c7" />
                  </View>
                )}
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.docTitle}>RC Certificate (Registration) *</Text>
                  <Text style={styles.docSub}>{rcUri ? 'Image attached ✓  Tap to change' : 'Upload clear photo/scan of Vehicle RC'}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.uploadBtn, rcUri && styles.uploadBtnSuccess]}
                  onPress={() => pickImage(setRcUri)}
                >
                  <Ionicons name={rcUri ? 'checkmark-circle' : 'cloud-upload-outline'} size={16} color={rcUri ? '#16a34a' : '#FE5300'} />
                  <Text style={[styles.uploadBtnText, rcUri && { color: '#16a34a' }]}>{rcUri ? 'Done' : 'Upload'}</Text>
                </TouchableOpacity>
              </View>

              {/* Document 2: Insurance */}
              <View style={styles.docUploadRow}>
                {insuranceUri ? (
                  <Image source={{ uri: insuranceUri }} style={styles.thumbImg} />
                ) : (
                  <View style={[styles.docIconBox, { backgroundColor: '#f3e8ff' }]}>
                    <Ionicons name="shield-checkmark-outline" size={20} color="#7c3aed" />
                  </View>
                )}
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.docTitle}>Commercial Vehicle Insurance *</Text>
                  <Text style={styles.docSub}>{insuranceUri ? 'Image attached ✓  Tap to change' : 'Valid comprehensive commercial policy'}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.uploadBtn, insuranceUri && styles.uploadBtnSuccess]}
                  onPress={() => pickImage(setInsuranceUri)}
                >
                  <Ionicons name={insuranceUri ? 'checkmark-circle' : 'cloud-upload-outline'} size={16} color={insuranceUri ? '#16a34a' : '#FE5300'} />
                  <Text style={[styles.uploadBtnText, insuranceUri && { color: '#16a34a' }]}>{insuranceUri ? 'Done' : 'Upload'}</Text>
                </TouchableOpacity>
              </View>

              {/* Document 3: PUC */}
              <View style={styles.docUploadRow}>
                {pucUri ? (
                  <Image source={{ uri: pucUri }} style={styles.thumbImg} />
                ) : (
                  <View style={[styles.docIconBox, { backgroundColor: '#fff7ed' }]}>
                    <Ionicons name="leaf-outline" size={20} color="#d97706" />
                  </View>
                )}
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.docTitle}>PUC Emission Certificate</Text>
                  <Text style={styles.docSub}>{pucUri ? 'Image attached ✓  Tap to change' : 'Pollution under control certificate'}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.uploadBtn, pucUri && styles.uploadBtnSuccess]}
                  onPress={() => pickImage(setPucUri)}
                >
                  <Ionicons name={pucUri ? 'checkmark-circle' : 'cloud-upload-outline'} size={16} color={pucUri ? '#16a34a' : '#FE5300'} />
                  <Text style={[styles.uploadBtnText, pucUri && { color: '#16a34a' }]}>{pucUri ? 'Done' : 'Upload'}</Text>
                </TouchableOpacity>
              </View>

              {/* Document 4: Permit */}
              <View style={[styles.docUploadRow, { borderBottomWidth: 0 }]}>
                {permitUri ? (
                  <Image source={{ uri: permitUri }} style={styles.thumbImg} />
                ) : (
                  <View style={[styles.docIconBox, { backgroundColor: '#f0fdf4' }]}>
                    <Ionicons name="document-text-outline" size={20} color="#16a34a" />
                  </View>
                )}
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.docTitle}>RTO Commercial Permit</Text>
                  <Text style={styles.docSub}>{permitUri ? 'Image attached ✓  Tap to change' : 'All India / State Tourist Permit'}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.uploadBtn, permitUri && styles.uploadBtnSuccess]}
                  onPress={() => pickImage(setPermitUri)}
                >
                  <Ionicons name={permitUri ? 'checkmark-circle' : 'cloud-upload-outline'} size={16} color={permitUri ? '#16a34a' : '#FE5300'} />
                  <Text style={[styles.uploadBtnText, permitUri && { color: '#16a34a' }]}>{permitUri ? 'Done' : 'Upload'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setCurrentStep(1)}>
                <Ionicons name="arrow-back" size={16} color="#0f172a" style={{ marginRight: 4 }} />
                <Text style={styles.secondaryBtnText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.primaryBtn, { flex: 2 }]} onPress={handleNextStep2} activeOpacity={0.85}>
                <Text style={styles.primaryBtnText}>Proceed to Step 3: Driver Data</Text>
                <Ionicons name="arrow-forward" size={18} color="#ffffff" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* TAB 3: ASSOCIATED DRIVER DATA */}
        {currentStep === 3 && (
          <>
            <Text style={styles.sectionHeader}>Step 3: Associated Driver Data</Text>
            <View style={styles.formCard}>
              <Text style={styles.fieldLabel}>Assigned Driver Full Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Ramesh Kumar"
                placeholderTextColor="#94a3b8"
                value={driverName}
                onChangeText={setDriverName}
              />

              <Text style={styles.fieldLabel}>Driver Mobile Number</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. +91 98765 43210"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                value={driverMobile}
                onChangeText={setDriverMobile}
              />

              <Text style={styles.fieldLabel}>Driver Commercial License (DL) Number</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. DL-1420110012345"
                placeholderTextColor="#94a3b8"
                autoCapitalize="characters"
                value={driverLicense}
                onChangeText={setDriverLicense}
              />

              {/* Driver Licence Image */}
              <Text style={styles.fieldLabel}>Driver Licence Photo (Optional)</Text>
              <TouchableOpacity
                style={[styles.docUploadRow, { borderBottomWidth: 0, borderWidth: 1, borderColor: driverLicenceUri ? '#16a34a' : '#e2e8f0', borderRadius: 12, padding: 10, backgroundColor: driverLicenceUri ? '#f0fdf4' : '#f8fafc' }]}
                onPress={() => pickImage(setDriverLicenceUri)}
              >
                {driverLicenceUri ? (
                  <Image source={{ uri: driverLicenceUri }} style={styles.thumbImg} />
                ) : (
                  <View style={[styles.docIconBox, { backgroundColor: '#f3e8ff' }]}>
                    <Ionicons name="id-card-outline" size={20} color="#7c3aed" />
                  </View>
                )}
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.docTitle}>{driverLicenceUri ? 'Licence Photo Attached' : 'Upload Licence Photo'}</Text>
                  <Text style={styles.docSub}>{driverLicenceUri ? 'Tap to change' : 'Clear photo of driving licence'}</Text>
                </View>
                <Ionicons
                  name={driverLicenceUri ? 'checkmark-circle' : 'cloud-upload-outline'}
                  size={20}
                  color={driverLicenceUri ? '#16a34a' : '#94a3b8'}
                />
              </TouchableOpacity>
            </View>

            {/* Audit Guidelines */}
            <View style={styles.guidelinesCard}>
              <Text style={styles.guideTitle}>RTO Audit Verification Note</Text>
              <Text style={styles.guideText}>
                Our RTO verification team will audit your vehicle specs, 6 inspection images, commercial documents, and driver credentials within 24 hours.
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setCurrentStep(2)}>
                <Ionicons name="arrow-back" size={16} color="#0f172a" style={{ marginRight: 4 }} />
                <Text style={styles.secondaryBtnText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.primaryBtn, { flex: 2 }]} 
                onPress={handleSubmitVehicle} 
                activeOpacity={0.85}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Submit Vehicle for Audit</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  contentContainer: { padding: 16, paddingBottom: 40 },
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
  helpBtn: { flexDirection: 'row', alignItems: 'center' },
  helpText: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  progressContainer: { backgroundColor: '#ffffff', paddingHorizontal: 24, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  stepDotActive: { backgroundColor: '#FE5300' },
  stepDotText: { fontSize: 12, fontWeight: '800', color: '#64748b' },
  stepDotTextActive: { color: '#ffffff' },
  progressLine: { width: 44, height: 3, backgroundColor: '#f1f5f9', marginHorizontal: 4 },
  progressLineActive: { backgroundColor: '#FE5300' },
  progressLabelsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, paddingHorizontal: 8 },
  progressLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '600' },
  progressLabelActive: { color: '#FE5300', fontWeight: '800' },
  sectionHeader: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 8, marginLeft: 4 },
  sectionSubNotice: { fontSize: 11, color: '#64748b', marginBottom: 12, marginLeft: 4 },
  formCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 6, marginTop: 10 },
  textInput: { backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#e2e8f0', fontSize: 13, color: '#0f172a' },
  twoColRow: { flexDirection: 'row' },
  pillSelectionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  selectPill: { backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#e2e8f0' },
  selectPillActive: { backgroundColor: '#fff7ed', borderColor: '#FE5300' },
  selectPillText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  selectPillTextActive: { color: '#FE5300' },
  photoGridCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 14, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 16 },
  photoUploadItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  photoLeftInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  photoIconBox: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  thumbImg: { width: 34, height: 34, borderRadius: 8 },
  photoTitle: { fontSize: 12, fontWeight: '800', color: '#0f172a' },
  photoSub: { fontSize: 10, color: '#64748b', marginTop: 1 },
  uploadPillBtn: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#FE5300', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, flexDirection: 'row', alignItems: 'center' },
  uploadPillBtnSuccess: { borderColor: '#16a34a', backgroundColor: '#f0fdf4' },
  uploadPillText: { fontSize: 10, fontWeight: '800', color: '#FE5300', marginLeft: 3 },
  docUploadRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  docIconBox: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  docTitle: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  docSub: { fontSize: 11, color: '#64748b', marginTop: 1 },
  uploadBtn: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#FE5300', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, flexDirection: 'row', alignItems: 'center' },
  uploadBtnSuccess: { borderColor: '#16a34a', backgroundColor: '#f0fdf4' },
  uploadBtnText: { fontSize: 11, fontWeight: '800', color: '#FE5300', marginLeft: 4 },
  guidelinesCard: { backgroundColor: '#f4fbf7', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#dcfce7', marginBottom: 16 },
  guideTitle: { fontSize: 13, fontWeight: '800', color: '#16a34a', marginBottom: 4 },
  guideText: { fontSize: 11, color: '#334155', lineHeight: 16 },
  primaryBtn: { backgroundColor: '#FE5300', borderRadius: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  secondaryBtn: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  secondaryBtnText: { color: '#0f172a', fontSize: 13, fontWeight: '800' },
  dropdownBtn: { backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#FE5300', flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  dropdownBtnText: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  dropdownMenuCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 10, borderWidth: 1, borderColor: '#FE5300', marginBottom: 12 },
  dropdownMenuHeader: { fontSize: 11, fontWeight: '800', color: '#64748b', marginBottom: 8, marginLeft: 4 },
  dropdownItemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8 },
  dropdownItemRowSelected: { backgroundColor: '#fff7ed' },
  dropdownItemText: { fontSize: 12, color: '#334155', fontWeight: '600' },
  dropdownItemTextSelected: { color: '#FE5300', fontWeight: '800' },
});
