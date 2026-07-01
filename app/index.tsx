import { View, Text, Pressable, ScrollView, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { useState } from 'react'
import { Link, useRouter, type Href } from 'expo-router'
import { Search, Plus, Circle, History, Trophy, X, Eye, ShieldCheck, Mail, Lock, EyeOff, ArrowRight } from 'lucide-react-native'
import { controlPanelLogin } from './services/auth'

type Match = {
  id: string
  court: string
  playerA: string
  playerB: string
  score?: string
  finalScore?: string
}

type EventData = {
  id: string
  name: string
  liveMatches: Match[]
  pastMatches: Match[]
}

type RoleKey = 'viewer' | 'control-panel'

type Role = {
  key: RoleKey
  label: string
  Icon: typeof Eye
}

const ROLES: Role[] = [
  { key: 'viewer', label: 'Viewer', Icon: Eye },
  { key: 'control-panel', label: 'Control Panel', Icon: ShieldCheck },
]

// Replace with your real data layer
async function findEvent(_eventId: string): Promise<EventData | null> {
  return null
}

async function createEvent(eventId: string): Promise<EventData> {
  return { id: eventId, name: `Event ${eventId}`, liveMatches: [], pastMatches: [] }
}

export default function Home() {
  const [activeRole, setActiveRole] = useState<RoleKey>('viewer')

  return (
    <View className="flex-1 bg-[#0A0E16]">
      {activeRole === 'viewer' ? <ViewerScreen /> : <ControlPanelScreen />}

      {/* Tab bar - switches local state, no navigation */}
      <View className="absolute bottom-0 left-0 right-0 bg-[#0D1220] border-t border-white/10 px-3 pt-2.5 pb-7">
        <View className="flex-row items-center justify-center gap-10">
          {ROLES.map((role) => {
            const isActive = role.key === activeRole
            const { Icon } = role
            return (
              <Pressable
                key={role.key}
                onPress={() => setActiveRole(role.key)}
                className="items-center py-1.5 active:opacity-60"
                style={{ width: 96 }}
              >
                <View
                  className={`w-10 h-10 rounded-xl items-center justify-center mb-1 ${
                    isActive ? 'bg-orange-500' : 'bg-transparent'
                  }`}
                >
                  <Icon size={18} color={isActive ? '#0A0E16' : 'rgba(255,255,255,0.4)'} />
                </View>
                <Text
                  className={`text-[10px] font-bold tracking-wide ${
                    isActive ? 'text-orange-400' : 'text-white/35'
                  }`}
                >
                  {role.label}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </View>
    </View>
  )
}

function ViewerScreen() {
  const [eventId, setEventId] = useState('')
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [event, setEvent] = useState<EventData | null>(null)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async () => {
    if (!eventId.trim()) return
    setSearching(true)
    setSearched(false)
    setError(null)
    try {
      const result = await findEvent(eventId.trim())
      setEvent(result)
      setSearched(true)
    } catch {
      setError("Couldn't reach the server. Try again.")
    } finally {
      setSearching(false)
    }
  }

  const handleAdd = async () => {
    if (!eventId.trim()) return
    setAdding(true)
    setError(null)
    try {
      const created = await createEvent(eventId.trim())
      setEvent(created)
    } catch {
      setError("Couldn't add that event. Try again.")
    } finally {
      setAdding(false)
    }
  }

  const handleReset = () => {
    setEventId('')
    setEvent(null)
    setSearched(false)
    setError(null)
  }

  const clearInput = () => {
    setEventId('')
    setSearched(false)
    setEvent(null)
    setError(null)
  }

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View className="px-6 pt-6 pb-5">
          <View className="flex-row items-center gap-2 mb-2">
            <View className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            <Text className="text-orange-500 text-xs font-extrabold tracking-[3px] uppercase">
              Live Coverage
            </Text>
          </View>
          <Text className="text-white text-4xl font-black tracking-tight">
            Find an Event
          </Text>
          <Text className="text-white/40 text-sm mt-2 leading-relaxed">
            Enter the event ID to pull up live scores and match history.
          </Text>
        </View>

        {/* Search bar */}
        <View className="mx-6 mb-2 flex-row gap-2.5">
          <View className="flex-1 bg-white/[0.06] rounded-2xl border border-white/10 px-4 flex-row items-center">
            <Search size={16} color="rgba(255,255,255,0.3)" />
            <TextInput
              value={eventId}
              onChangeText={(t: string) => {
                setEventId(t)
                setSearched(false)
                setEvent(null)
                setError(null)
              }}
              onSubmitEditing={handleSearch}
              placeholder="Event ID"
              placeholderTextColor="rgba(255,255,255,0.3)"
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="search"
              editable={!searching && !adding}
              className="flex-1 text-white py-4 pl-2.5 text-base font-semibold tracking-wide"
            />
            {eventId.length > 0 && (
              <Pressable
                onPress={clearInput}
                hitSlop={10}
                className="w-6 h-6 rounded-full bg-white/10 items-center justify-center"
              >
                <X size={12} color="rgba(255,255,255,0.5)" />
              </Pressable>
            )}
          </View>
          <Pressable
            onPress={handleSearch}
            disabled={!eventId.trim() || searching}
            className="bg-orange-500 active:bg-orange-600 rounded-2xl w-14 items-center justify-center disabled:opacity-30"
          >
            {searching ? (
              <ActivityIndicator color="#0A0E16" />
            ) : (
              <Search size={20} color="#0A0E16" />
            )}
          </Pressable>
        </View>

        {error && (
          <Text className="text-red-400 text-xs font-medium mx-6 mb-3">
            {error}
          </Text>
        )}

        {/* Not found -> offer to add */}
        {searched && !event && !searching && !error && (
          <View className="mx-6 mt-3 mb-2 bg-white/[0.05] rounded-3xl p-6 border border-white/10 items-center">
            <View className="w-12 h-12 rounded-full bg-white/10 items-center justify-center mb-4">
              <Search size={20} color="rgba(255,255,255,0.4)" />
            </View>
            <Text className="text-white font-bold text-base mb-1.5 text-center">
              No event found
            </Text>
            <Text className="text-white/40 text-sm text-center leading-relaxed mb-5 px-2">
              Nothing matches ID "{eventId.trim()}". Double-check it, or add it as a new event.
            </Text>
            <Pressable
              onPress={handleAdd}
              disabled={adding}
              className="bg-orange-500 active:bg-orange-600 rounded-2xl px-6 py-3.5 flex-row items-center gap-2 disabled:opacity-30"
            >
              {adding ? (
                <ActivityIndicator color="#0A0E16" />
              ) : (
                <>
                  <Plus size={18} color="#0A0E16" />
                  <Text className="text-[#0A0E16] font-black text-sm">
                    Add Event
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        )}

        {event && (
          <View className="mx-6 mt-3">
            <View className="flex-row items-center justify-between mb-5">
              <View>
                <Text className="text-white text-xl font-black">
                  {event.name}
                </Text>
                <Text className="text-white/35 text-xs mt-0.5 font-medium tracking-wide">
                  ID: {event.id}
                </Text>
              </View>
              <Pressable
                onPress={handleReset}
                className="bg-white/[0.06] active:bg-white/15 rounded-full px-3.5 py-2 border border-white/10"
              >
                <Text className="text-white/60 text-xs font-bold">
                  Change
                </Text>
              </Pressable>
            </View>

            <View className="flex-row items-center gap-1.5 mb-3">
              <Circle size={8} color="#ef4444" fill="#ef4444" />
              <Text className="text-white/40 text-xs font-extrabold tracking-[2px] uppercase">
                Live Matches
              </Text>
              {event.liveMatches.length > 0 && (
                <View className="bg-white/10 rounded-full px-1.5 py-0.5 ml-0.5">
                  <Text className="text-white/50 text-[10px] font-bold">
                    {event.liveMatches.length}
                  </Text>
                </View>
              )}
            </View>

            {event.liveMatches.length > 0 ? (
              <View className="gap-3 mb-7">
                {event.liveMatches.map((match: Match) => (
                  <Link key={match.id} href={`/viewer/${match.id}` as Href} asChild>
                    <Pressable className="bg-white/[0.06] active:bg-white/[0.12] rounded-2xl p-4 border border-orange-500/20">
                      <View className="flex-row items-center justify-between mb-2.5">
                        <View className="bg-red-500/15 rounded-full px-2.5 py-1 flex-row items-center gap-1.5">
                          <Circle size={6} color="#ef4444" fill="#ef4444" />
                          <Text className="text-red-400 text-[10px] font-black tracking-wide">
                            LIVE
                          </Text>
                        </View>
                        <Text className="text-white/35 text-xs font-bold tracking-wide uppercase">
                          {match.court}
                        </Text>
                      </View>
                      <Text className="text-white font-bold text-base mb-1.5">
                        {match.playerA} vs {match.playerB}
                      </Text>
                      <Text className="text-orange-400 text-lg font-black tracking-wide">
                        {match.score}
                      </Text>
                    </Pressable>
                  </Link>
                ))}
              </View>
            ) : (
              <View className="bg-white/[0.04] rounded-2xl p-6 mb-7 items-center border border-white/5">
                <Text className="text-white/35 text-sm text-center">
                  No live matches right now.{'\n'}Check back once play begins.
                </Text>
              </View>
            )}

            <View className="flex-row items-center gap-1.5 mb-3">
              <History size={13} color="rgba(255,255,255,0.4)" />
              <Text className="text-white/40 text-xs font-extrabold tracking-[2px] uppercase">
                Match History
              </Text>
              {event.pastMatches.length > 0 && (
                <View className="bg-white/10 rounded-full px-1.5 py-0.5 ml-0.5">
                  <Text className="text-white/50 text-[10px] font-bold">
                    {event.pastMatches.length}
                  </Text>
                </View>
              )}
            </View>

            {event.pastMatches.length > 0 ? (
              <View className="gap-3">
                {event.pastMatches.map((match: Match) => (
                  <Link key={match.id} href={`/viewer/${match.id}` as Href} asChild>
                    <Pressable className="bg-white/[0.03] active:bg-white/[0.08] rounded-2xl p-4 border border-white/8">
                      <View className="flex-row items-center justify-between mb-2.5">
                        <View className="flex-row items-center gap-1.5">
                          <Trophy size={12} color="rgba(255,255,255,0.3)" />
                          <Text className="text-white/35 text-[10px] font-black tracking-wide">
                            FINISHED
                          </Text>
                        </View>
                        <Text className="text-white/35 text-xs font-bold tracking-wide uppercase">
                          {match.court}
                        </Text>
                      </View>
                      <Text className="text-white/80 font-bold text-base mb-1">
                        {match.playerA} vs {match.playerB}
                      </Text>
                      <Text className="text-white/40 text-sm font-semibold">
                        {match.finalScore}
                      </Text>
                    </Pressable>
                  </Link>
                ))}
              </View>
            ) : (
              <View className="bg-white/[0.04] rounded-2xl p-6 mb-2 items-center border border-white/5">
                <Text className="text-white/35 text-sm text-center">
                  No finished matches yet.
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function ControlPanelScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validate = () => {
    if (!email.trim() || !password.trim()) return 'Enter your email and password.'
    return null
  }

  const handleSubmit = async () => {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    setLoading(true)
    try {
      const data = await controlPanelLogin(email,password);
      router.push('/organisers')
    }  catch (error: any) {
        if (error.response) {
          setError(error.response.data.message);
        } else {
          setError('Unable to connect to the server.');
      }
    }
    finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 140 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-6 pt-16 pb-10 items-center">
          <View className="w-16 h-16 rounded-2xl bg-orange-500/15 border-2 border-orange-500 items-center justify-center mb-5">
            <ShieldCheck size={28} color="#f97316" />
          </View>
          <View className="flex-row items-center gap-2 mb-2">
            <View className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            <Text className="text-orange-500 text-xs font-extrabold tracking-[3px] uppercase">
              Control Panel
            </Text>
          </View>
          <Text className="text-white text-3xl font-black tracking-tight">
            Welcome Back
          </Text>
          <Text className="text-white/40 text-sm mt-2 text-center leading-relaxed px-6">
            Sign in to manage organisers and run the event from the control room.
          </Text>
        </View>

        <View className="mx-6 gap-3.5">
          <View className="bg-white/[0.06] rounded-2xl border border-white/10 px-4 flex-row items-center">
            <Mail size={16} color="rgba(255,255,255,0.3)" />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor="rgba(255,255,255,0.3)"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              className="flex-1 text-white py-4 pl-2.5 text-base"
            />
          </View>

          <View className="bg-white/[0.06] rounded-2xl border border-white/10 px-4 flex-row items-center">
            <Lock size={16} color="rgba(255,255,255,0.3)" />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor="rgba(255,255,255,0.3)"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              className="flex-1 text-white py-4 pl-2.5 text-base"
            />
            <Pressable onPress={() => setShowPassword((s) => !s)} hitSlop={10}>
              {showPassword ? (
                <EyeOff size={16} color="rgba(255,255,255,0.35)" />
              ) : (
                <Eye size={16} color="rgba(255,255,255,0.35)" />
              )}
            </Pressable>
          </View>

          <Pressable className="self-end" hitSlop={8}>
            <Text className="text-orange-400 text-xs font-bold">
              Forgot password?
            </Text>
          </Pressable>

          {error && (
            <Text className="text-red-400 text-xs font-medium">
              {error}
            </Text>
          )}

          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            className="bg-orange-500 active:bg-orange-600 rounded-2xl py-4 flex-row items-center justify-center gap-2 mt-1 disabled:opacity-50"
          >
            {loading ? (
              <ActivityIndicator color="#0A0E16" />
            ) : (
              <>
                <Text className="text-[#0A0E16] text-base font-black">
                  Sign In
                </Text>
                <ArrowRight size={18} color="#0A0E16" />
              </>
            )}
          </Pressable>
        </View>

<View className="flex-row items-center justify-center gap-1.5 mt-8">
  <Text className="text-white/35 text-sm">
    Don't have an account?
  </Text>
  <Pressable onPress={() => router.push('/adminRegister')}>
    <Text className="text-orange-400 text-sm font-bold">
      Sign Up
    </Text>
  </Pressable>
</View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
