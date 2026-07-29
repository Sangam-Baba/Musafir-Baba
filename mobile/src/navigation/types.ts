export type AuthStackParamList = {
  Login: undefined;
  OTPVerification: { phone: string };
};

export type MainTabParamList = {
  Dashboard: undefined;
  Profile: undefined;
  Fleet: undefined;
};

export type ProfileStackParamList = {
  ProfileMenu: undefined;
  PersonalDetails: undefined;
  KYCDocuments: undefined;
  BankDetails: undefined;
  FleetRegistry: undefined;
  VehicleSettings: undefined;
};

// Kept for backward compatibility if needed temporarily, but we'll phase it out
export type OnboardingStackParamList = {
  PersonalDetails: undefined;
  KYCDocuments: undefined;
  BankDetails: undefined;
  FleetRegistry: undefined;
  VehicleSettings: undefined;
};

export type AppStackParamList = {
  Home: undefined;
  ProfileSetup: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};
