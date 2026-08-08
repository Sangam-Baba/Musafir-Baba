import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const setItem = async (key: string, value: string) => {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    console.error('Error setting item in SecureStore:', error);
  }
};

export const getItem = async (key: string): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.error('Error getting item from SecureStore:', error);
    return null;
  }
};

export const removeItem = async (key: string) => {
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.error('Error removing item from SecureStore:', error);
  }
};
