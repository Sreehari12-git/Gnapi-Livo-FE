import { api } from "./api";

export type LiveKitRole = 'capturer' | 'commentator' | 'broadcaster' | 'viewer';

export interface LiveKitTokenResponse {
  token: string;
  url: string;
}

/**
 * Get a LiveKit access token from the backend.
 * @param identity  Unique participant name (e.g. "capturer-john")
 * @param room      Room name — always use the Event ID (e.g. "event-abc123")
 * @param role      One of: capturer | commentator | broadcaster | viewer
 */
export const getLiveKitToken = async (
  identity: string,
  room: string,
  role: LiveKitRole,
): Promise<LiveKitTokenResponse> => {
  const response = await api.post('/livekit/token', { identity, room, role });
  return response.data;
};
