export type AuthStackParamList = {
  Login: undefined;
  OTPVerification: { phone: string };
  Register: undefined;
  ForgotPassword: { initialEmail?: string } | undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Bookings: undefined;
  Earnings: undefined;
  Inbox: undefined;
  Menu: undefined;
};

export type HomeStackParamList = {
  HomeScreen: undefined;
  BackgroundCheck: undefined;
  TripSupport: undefined;
  Inbox: undefined;
};

export type BookingsStackParamList = {
  BookingsList: undefined;
  BookingDetails: { bookingId: string } | undefined;
};

export type EarningsStackParamList = {
  EarningsMain: undefined;
  PayoutHistory: undefined;
  EarningsTrend: undefined;
};

export type ProfileStackParamList = {
  ProfileMenu: undefined;
  PersonalDetails: undefined;
  KYCDocuments: undefined;
  BankDetails: undefined;
  FleetRegistry: undefined;
  VehicleSettings: undefined;
  VehiclesList: undefined;
  VehicleDetails: { vehicleId?: string; model?: string; regNo?: string; type?: string } | undefined;
  AddVehicle: undefined;
  UpdateVehicle: { vehicle: any; vehicleId: string };
  ServiceAreaPricing: undefined;
  IdentityProof: undefined;
  VerifiedPartner: undefined;
  ProfilePhoto: undefined;
  BackgroundCheck: undefined;
  TripSupport: undefined;
  Inbox: undefined;
  PayoutHistory: undefined;
  EarningsTrend: undefined;
};

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
