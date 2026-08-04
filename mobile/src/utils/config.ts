import { Platform } from 'react-native';

// Local IP of the host machine (allows emulators and physical devices on the same Wi-Fi to connect)
const LOCAL_IP = '192.168.29.111';

// Local Backend API URL for development/testing (backend runs on port 8000)
const LOCAL_API_URL = `http://${LOCAL_IP}:8000/api`;

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || LOCAL_API_URL;
