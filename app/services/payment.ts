import { api } from './api';

export const createOrder = async (adminId: number, amount: number) => {
  const response = await api.post('/payment/create-order', { adminId, amount });
  return response.data as {
    orderId: string;
    amount: number;
    currency: string;
    keyId: string;
  };
};

export const verifyPayment = async (
  adminId: number,
  orderId: string,
  paymentId: string,
  signature: string,
) => {
  const response = await api.post('/payment/verify', { adminId, orderId, paymentId, signature });
  return response.data as { success: boolean };
};

export const failPayment = async (adminId: number, orderId?: string) => {
  const response = await api.post('/payment/fail', { adminId, orderId });
  return response.data as { success: boolean };
};

export const activateFree = async (adminId: number) => {
  const response = await api.post('/payment/free', { adminId });
  return response.data as { success: boolean };
};
