import { View, Text, Pressable, FlatList, ActivityIndicator, TextInput, Alert, ScrollView } from 'react-native'
import { useState, useCallback } from 'react'
import { useRouter } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import * as Clipboard from 'expo-clipboard'
import * as SecureStore from 'expo-secure-store'
import { getAllEvents, updateEvent, deleteEvent } from './services/event'
import { getPlans, getCurrentSubscription, createOrder, SubscriptionPlan, CurrentSubscription } from './services/payment'
import {
  Plus,
  ChevronLeft,
  Shield,
  CalendarPlus,
  AlertTriangle,
  Pencil,
  Trash2,
  Check,
  X,
  Hash,
  Copy,
  CopyCheck,
  ArrowUpCircle,
  Zap,
} from 'lucide-react-native'

type EventItem = {
  id: string
  name: string
  createdBy?: number
}

function CopyIdRow({ id }: { id: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await Clipboard.setStringAsync(id)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const shortId = id.length > 8 ? `${id.slice(0, 8)}…` : id

  return (
    <Pressable
      onPress={handleCopy}
      className="flex-row items-center gap-1.5 mt-1 self-start max-w-full active:opacity-60"
    >
      <Hash size={11} color="rgba(255,255,255,0.3)" />
      <Text className="text-white/30 text-xs shrink" numberOfLines={1}>
        {shortId}
      </Text>
      {copied ? (
        <CopyCheck size={12} color="#fb923c" />
      ) : (
        <Copy size={12} color="rgba(255,255,255,0.3)" />
      )}
    </Pressable>
  )
}

function EventCard({
  event,
  onUpdated,
  onDeleted,
}: {
  event: EventItem
  onUpdated: (updated: EventItem) => void
  onDeleted: (id: string) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(event.name)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleSave = async () => {
    const trimmed = name.trim()
    if (!trimmed || trimmed === event.name) {
      setIsEditing(false)
      setName(event.name)
      return
    }
    setSaving(true)
    try {
      await updateEvent(event.id, trimmed)
      onUpdated({ ...event, name: trimmed })
      setIsEditing(false)
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Failed to update event.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = () => {
    Alert.alert('Delete event', `Delete "${event.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true)
          try {
            await deleteEvent(event.id)
            onDeleted(event.id)
          } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message ?? 'Failed to delete event.')
            setDeleting(false)
          }
        },
      },
    ])
  }

  return (
    <View className="bg-[#111623] rounded-2xl px-5 py-4 border border-white/5 mb-3 flex-row items-center gap-2">
      {isEditing ? (
        <>
          <TextInput
            value={name}
            onChangeText={setName}
            autoFocus
            editable={!saving}
            placeholderTextColor="rgba(255,255,255,0.25)"
            className="flex-1 text-white text-base bg-[#0A0E16] rounded-xl px-3 py-2 border border-white/10"
          />
          <Pressable
            onPress={handleSave}
            disabled={saving}
            className="w-9 h-9 rounded-xl bg-orange-500 items-center justify-center active:opacity-70"
          >
            <Check size={16} color="#0A0E16" />
          </Pressable>
          <Pressable
            onPress={() => {
              setName(event.name)
              setIsEditing(false)
            }}
            disabled={saving}
            className="w-9 h-9 rounded-xl bg-white/5 items-center justify-center active:opacity-70"
          >
            <X size={16} color="rgba(255,255,255,0.5)" />
          </Pressable>
        </>
      ) : (
        <>
          <View className="flex-1">
            <Text className="text-white text-base font-bold">{event.name}</Text>
            <CopyIdRow id={event.id} />
          </View>
          <Pressable
            onPress={() => setIsEditing(true)}
            className="w-9 h-9 rounded-xl bg-white/5 items-center justify-center active:opacity-70"
          >
            <Pencil size={15} color="rgba(255,255,255,0.5)" />
          </Pressable>
          <Pressable
            onPress={handleDelete}
            disabled={deleting}
            className="w-9 h-9 rounded-xl bg-red-500/10 items-center justify-center active:opacity-70"
          >
            <Trash2 size={15} color="#f87171" />
          </Pressable>
        </>
      )}
    </View>
  )
}

function SubscriptionSection() {
  const router = useRouter()
  const [current, setCurrent] = useState<CurrentSubscription>(null)
  const [upgradePlans, setUpgradePlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const adminId = await SecureStore.getItemAsync('adminId')
      if (!adminId) return
      const [sub, all] = await Promise.all([
        getCurrentSubscription(Number(adminId)),
        getPlans(),
      ])
      setCurrent(sub)
      // Only paid plans that are strictly higher amount than current
      const currentAmount = sub?.plan?.amount ?? 0
      setUpgradePlans(all.filter(p => p.amount > currentAmount))
    } catch {
      // silent — section just won't show
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const handleUpgrade = async (plan: SubscriptionPlan) => {
    setUpgrading(plan.id)
    try {
      const adminId = await SecureStore.getItemAsync('adminId')
      if (!adminId) return
      const order = await createOrder(Number(adminId), plan.id)
      router.push({
        pathname: '/razorpayCheckout',
        params: {
          orderId: order.orderId,
          amount: String(order.amount),
          currency: order.currency,
          keyId: order.keyId,
          planId: plan.id,
          mode: 'upgrade',
          successRedirect: '/adminDashboard',
        },
      })
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Could not initiate upgrade.')
    } finally {
      setUpgrading(null)
    }
  }

  if (loading) return null

  return (
    <View className="mb-6">
      <View className="flex-row items-center gap-2 mb-3">
        <Zap size={14} color="#fb923c" />
        <Text className="text-orange-500 text-xs font-black tracking-widest uppercase">Subscription</Text>
      </View>

      {/* Current plan */}
      {current?.plan && (
        <View className="bg-[#111623] border border-white/5 rounded-2xl px-5 py-4 mb-3">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-white/40 text-xs mb-0.5">Current plan</Text>
              <Text className="text-white text-base font-black">{current.plan.name}</Text>
            </View>
            <View className="items-end">
              <Text className="text-white/40 text-xs mb-0.5">Usage limit</Text>
              <Text className="text-orange-400 text-sm font-bold">{current.plan.usageLimitMinutes} min</Text>
            </View>
          </View>
          <View className="flex-row items-center gap-1.5 mt-2">
            <View className="w-1.5 h-1.5 rounded-full bg-green-400" />
            <Text className="text-green-400 text-xs font-semibold capitalize">{current.status}</Text>
          </View>
        </View>
      )}

      {/* Upgrade options */}
      {upgradePlans.length > 0 && (
        <View>
          <Text className="text-white/30 text-xs font-semibold mb-2">Upgrade to</Text>
          {upgradePlans.map(plan => (
            <View key={plan.id} className="bg-orange-500/10 border border-orange-500/20 rounded-2xl px-5 py-4 mb-2 flex-row items-center gap-3">
              <View className="flex-1">
                <Text className="text-white text-sm font-black">{plan.name}</Text>
                <Text className="text-orange-400 text-xs mt-0.5">{plan.usageLimitMinutes} min</Text>
              </View>
              <Pressable
                onPress={() => handleUpgrade(plan)}
                disabled={upgrading !== null}
                className={`bg-orange-500 active:bg-orange-600 rounded-xl px-4 py-2.5 flex-row items-center gap-1.5 ${upgrading !== null ? 'opacity-50' : ''}`}
              >
                {upgrading === plan.id ? (
                  <ActivityIndicator size="small" color="#0A0E16" />
                ) : (
                  <>
                    <ArrowUpCircle size={14} color="#0A0E16" />
                    <Text className="text-[#0A0E16] text-xs font-black">₹{plan.amount}</Text>
                  </>
                )}
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <View className="h-px bg-white/5 mt-3 mb-6" />
    </View>
  )
}

function EmptyState() {
  return (
    <View className="items-center justify-center py-24">
      <CalendarPlus size={32} color="rgba(255,255,255,0.15)" />
      <Text className="text-white/30 text-sm font-semibold mt-4">
        No events yet
      </Text>
      <Text className="text-white/20 text-xs mt-1">
        Tap the + button to create one
      </Text>
    </View>
  )
}

export default function AdminDashboard() {
  const router = useRouter()
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadEvents = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getAllEvents()
      setEvents(data.events ?? data)
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Failed to load events.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadEvents()
    }, [loadEvents])
  )

  return (
    <View className="flex-1 bg-[#0A0E16]">
      <View style={{ paddingHorizontal: 24, paddingTop: 24 }}>
        <View className="flex-row items-center justify-between mb-6">
          <Pressable
            onPress={() => router.push("/organisers")}
            className="flex-row items-center gap-1 active:opacity-60"
          >
            <ChevronLeft size={16} color="rgba(255,255,255,0.4)" />
            <Text className="text-white/40 text-sm font-semibold">Back</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/CreateEventPanel')}
            className="w-10 h-10 rounded-xl bg-orange-500 active:bg-orange-600 items-center justify-center"
          >
            <Plus size={20} color="#0A0E16" />
          </Pressable>
        </View>

        <View className="flex-row items-center gap-2 mb-1">
          <Shield size={18} color="#fb923c" />
          <Text className="text-orange-500 text-xs font-black tracking-[3px] uppercase">
            Admin Session
          </Text>
        </View>
        <Text className="text-white text-5xl font-black mb-2">Events</Text>
        <Text className="text-white/40 text-base mb-6">
          All events created under your account.
        </Text>

        <View className="h-px bg-white/5 mb-6" />

        {error ? (
          <View className="rounded-2xl px-4 py-3 mb-4 flex-row items-center gap-2 border bg-red-500/10 border-red-500/25">
            <AlertTriangle size={14} color="#f87171" />
            <Text className="text-xs font-semibold flex-1 text-red-400">
              {error}
            </Text>
          </View>
        ) : null}
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#fb923c" />
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <EventCard
              event={item}
              onUpdated={(updated) =>
                setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
              }
              onDeleted={(id) => setEvents((prev) => prev.filter((e) => e.id !== id))}
            />
          )}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingBottom: 40,
            flexGrow: 1,
          }}
          ListHeaderComponent={<SubscriptionSection />}
          ListEmptyComponent={<EmptyState />}
          onRefresh={loadEvents}
          refreshing={loading}
        />
      )}
    </View>
  )
}

