import { api } from "./api";

export const adminRegister = async (
  email: string,
  password: string,
) => {
  const response = await api.post("/auth/admin/register", {
    email,
    password,
  });

  return response.data;
};

export const adminLogin = async (
  email: string,
  password: string
) => {
  const response = await api.post("/auth/admin/login", {
    email,
    password,
  });

  return response.data;
};

export const controlPanelRegister = async (
  name: string,
  email: string,
  password: string,
  adminId: number

) => {
  const response = await api.post("/auth/control-panel/register", {
    name,
    email,
    password,
    adminId
  });

  return response.data;
};

export const changeAdminPassword = async (
  adminId: number,
  currentPassword: string,
  newPassword: string,
) => {
  const response = await api.post('/auth/admin/change-password', {
    adminId,
    currentPassword,
    newPassword,
  });
  return response.data;
};

export const controlPanelLogin = async (
  email: string,
  password: string
) => {
  const response = await api.post("/auth/control-panel/login", {
    email,
    password,
  });

  return response.data;
};


