import { Platform } from 'react-native';

// Using your machine's local IP address so physical devices on the same WiFi can connect to the backend
const LOCAL_API_URL = 'http://192.168.29.111:8000/api';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || LOCAL_API_URL;
