import { apiClient } from './axios';

export const updateRiderPushToken = (pushToken: string) =>
  apiClient.patch('/rider/profile/push-token', { pushToken });
