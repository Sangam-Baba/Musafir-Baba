import { Platform } from 'react-native';

// Live Server API URL for production APK builds
const PROD_API_URL = 'https://musafir-baba-backend.onrender.com/api';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || PROD_API_URL;
