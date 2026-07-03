import { api } from "./api";

export const createEvent = async (
  name: string,
  adminId: number
) => {
  const response = await api.post("/event/create", {
    name,
    adminId,
  });

  return response.data;
};

export const getAllEvents = async() => {
    const response = await api.get("/event/all");
    return response.data;
}

export const getEventById = async (id: string) => {
    const response = await api.get(`/event/${id}`);
    return response.data;
}

export const updateEvent = async (id: string, name: string) => {
  const response = await api.patch(`/event/${id}`, {
    name,
  });

  return response.data;
};

export const deleteEvent = async(id: string) => {
    const response = await api.delete(`/event/${id}`);
    return response.data;
}

export const validateSession = async (
  adminId: number,
  eventId: string
) => {
  const response = await api.post("/event/validate", {
    adminId,
    eventId,
  });

  return response.data;
};


