import { api } from './api'

export type Match = {
  id: string
  eventId: string
  sport: string
  name: string
  liveStatus: string
  liveCapturerIdentity: string | null
  liveCommentatorIdentity: string | null
  createdAt: string
  updatedAt: string
}

export type FinalScore = {
  teamAName: string
  teamBName: string
  teamAScore: number
  teamBScore: number
}

export const createMatch = async (payload: { eventId: string; sport: string; name: string }) => {
  const response = await api.post('/matches', payload)
  return response.data as Match
}

export const listMatches = async (eventId: string, forViewer: boolean) => {
  const path = forViewer ? `/matches/event/${eventId}` : `/matches/event/${eventId}/all`
  const response = await api.get(path)
  return response.data as Match[]
}

export const getMatch = async (id: string) => {
  const response = await api.get(`/matches/${id}`)
  return response.data as Match
}

export const updateMatch = async (
  id: string,
  payload: { name?: string; liveStatus?: string; finalScore?: FinalScore }
) => {
  const response = await api.patch(`/matches/${id}`, payload)
  return response.data as Match
}

export const deleteMatch = async (id: string) => {
  const response = await api.delete(`/matches/${id}`)
  return response.data as { message: string }
}

export const setMatchLiveSelection = async (
  id: string,
  payload: { liveCapturerIdentity?: string | null; liveCommentatorIdentity?: string | null }
) => {
  const response = await api.post(`/matches/${id}/live-selection`, payload)
  return response.data as Match
}
