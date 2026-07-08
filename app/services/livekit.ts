import { api } from './api'

export type LiveKitRole = 'capturer' | 'commentator' | 'broadcaster' | 'viewer'

export type LiveSelection = {
  room: string
  liveCapturerIdentity: string | null
  liveCommentatorIdentity: string | null
}

export type LiveKitParticipantInfo = {
  identity: string
  name?: string
  metadata?: string
}

export type UsageStats = {
  usedMinutes: number
  limitMinutes: number
  remainingMinutes: number
}

export const fetchLiveKitToken = async (identity: string, room: string, role: LiveKitRole) => {
  try {
    const response = await api.post('/livekit/token', { identity, room, role })
    return response.data as { token: string; url: string }
  } catch (err: any) {
    if (err?.response?.status === 403 && err?.response?.data?.code === 'USAGE_LIMIT_EXCEEDED') {
      throw { code: 'USAGE_LIMIT_EXCEEDED' }
    }
    throw err
  }
}

export const fetchLiveSelection = async (room: string) => {
  const response = await api.get(`/livekit/live-selection/${room}`)
  return response.data as LiveSelection
}

export const postLiveSelection = async (
  room: string,
  payload: { liveCapturerIdentity?: string | null; liveCommentatorIdentity?: string | null }
) => {
  const response = await api.post('/livekit/live-selection', { room, ...payload })
  return response.data as LiveSelection
}

export const fetchParticipants = async (room: string) => {
  const response = await api.get(`/livekit/participants/${room}`)
  return response.data as LiveKitParticipantInfo[]
}

export const fetchUsageStats = async (adminId: number): Promise<UsageStats> => {
  const response = await api.get(`/livekit/usage?adminId=${adminId}`)
  return response.data as UsageStats
}

export const parseParticipantRole = (metadata?: string): LiveKitRole | undefined => {
  if (!metadata) return undefined
  try {
    return JSON.parse(metadata).role
  } catch {
    return undefined
  }
}
