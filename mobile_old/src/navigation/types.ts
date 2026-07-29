export type AuthStackParamList = {
  Login: undefined;
  OTPVerification: { phone: string };
};

export type AppStackParamList = {
  Home: undefined;
  ProfileSetup: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
};
