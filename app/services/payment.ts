import { api } from './api';

export type SubscriptionPlan = {
  id: number;
  name: string;
  amount: number;
  usageLimitMinutes: number;
};

export const getPlans = async (): Promise<SubscriptionPlan[]> => {
  const response = await api.get('/payment/plans');
  return response.data;
};

export type CurrentSubscription = {
  id: string;
  status: string;
  planId: number;
  plan: SubscriptionPlan;
} | null;

export const getCurrentSubscription = async (adminId: number): Promise<CurrentSubscription> => {
  const response = await api.get(`/payment/subscription/${adminId}`);
  return response.data;
};

export const createOrder = async (adminId: number, planId: number) => {
  const response = await api.post('/payment/create-order', { adminId, planId });
  return response.data as {
    orderId: string;
    amount: number;
    currency: string;
    keyId: string;
  };
};

export const verifyPayment = async (
  adminId: number,
  planId: number,
  orderId: string,
  paymentId: string,
  signature: string,
) => {
  const response = await api.post('/payment/verify', { adminId, planId, orderId, paymentId, signature });
  return response.data as { success: boolean };
};

export const failPayment = async (adminId: number, orderId?: string) => {
  const response = await api.post('/payment/fail', { adminId, orderId });
  return response.data as { success: boolean };
};

export const activateFree = async (adminId: number, planId: number) => {
  const response = await api.post('/payment/free', { adminId, planId });
  return response.data as { success: boolean };
};
