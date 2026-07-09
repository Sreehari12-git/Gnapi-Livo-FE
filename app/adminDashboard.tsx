import { View, Text, Pressable, FlatList, ActivityIndicator, TextInput, Alert, ScrollView } from 'react-native'
import { useState, useCallback } from 'react'
import { useRouter } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import * as Clipboard from 'expo-clipboard'
import * as SecureStore from 'expo-secure-store'
import { getEventsByAdmin, updateEvent, deleteEvent } from './services/event'
import { getPlans, getCurrentSubscription, createOrder, SubscriptionPlan, CurrentSubscription } from './services/payment'
import { fetchUsageStats, UsageStats } from './services/livekit'
import { changeAdminPassword } from './services/auth'
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
  Lock,
  Eye,
  EyeOff,
  BarChart2,
} from 'lucide-react-native'

type Tab = 'events' | 'subscription' | 'password'

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

function SubscriptionTab() {
  const router = useRouter()
  const [current, setCurrent] = useState<CurrentSubscription>(null)
  const [upgradePlans, setUpgradePlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState<number | null>(null)
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const adminId = await SecureStore.getItemAsync('adminId')
      if (!adminId) return
      const [sub, all, stats] = await Promise.all([
        getCurrentSubscription(Number(adminId)),
        getPlans(),
        fetchUsageStats(Number(adminId)).catch(() => null),
      ])
      console.log(sub)
      console.log(all)
      setCurrent(sub)
      const currentAmount = sub?.plan?.amount ?? 0
      setUpgradePlans(all.filter(p => p.amount > currentAmount))
      setUsageStats(stats)
      console.log(stats);
    } catch {
      // silent
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

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color="#fb923c" />
      </View>
    )
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
      <View className="flex-row items-center gap-2 mb-3">
        <Zap size={14} color="#fb923c" />
        <Text className="text-orange-500 text-xs font-black tracking-widest uppercase">Subscription</Text>
      </View>

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

      {usageStats && usageStats.limitMinutes > 0 && (
        <View className="bg-[#111623] border border-white/5 rounded-2xl px-5 py-4 mb-3">
          <View className="flex-row items-center gap-2 mb-3">
            <BarChart2 size={14} color="#fb923c" />
            <Text className="text-white font-bold text-sm">Streaming Usage</Text>
          </View>
          <View className="h-2 bg-slate-700 rounded-full overflow-hidden mb-2">
            <View
              className="h-full rounded-full bg-orange-500"
              style={{ width: `${Math.min(100, (usageStats.usedMinutes / usageStats.limitMinutes) * 100)}%` }}
            />
          </View>
          <View className="flex-row justify-between">
            <Text className="text-white/40 text-xs">{Math.round(usageStats.usedMinutes)} min used</Text>
            <Text className="text-white/60 text-xs font-semibold">
              {Math.round(usageStats.remainingMinutes)} min left / {usageStats.limitMinutes} min total
            </Text>
          </View>
          {usageStats.remainingMinutes <= 0 && (
            <View className="mt-3 bg-red-500/15 border border-red-500/30 rounded-xl px-3 py-2 flex-row items-center gap-2">
              <AlertTriangle size={13} color="#f87171" />
              <Text className="text-red-400 text-xs font-semibold flex-1">
                Usage limit reached. Upgrade your plan to continue streaming.
              </Text>
            </View>
          )}
          {usageStats.remainingMinutes > 0 && usageStats.remainingMinutes <= usageStats.limitMinutes * 0.1 && (
            <View className="mt-3 bg-yellow-500/15 border border-yellow-500/30 rounded-xl px-3 py-2 flex-row items-center gap-2">
              <AlertTriangle size={13} color="#facc15" />
              <Text className="text-yellow-400 text-xs font-semibold flex-1">
                Less than {Math.round(usageStats.remainingMinutes)} minutes remaining. Consider upgrading.
              </Text>
            </View>
          )}
        </View>
      )}

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
    </ScrollView>
  )
}

function PasswordField({
  label,
  value,
  onChangeText,
  placeholder,
  editable,
}: {
  label: string
  value: string
  onChangeText: (v: string) => void
  placeholder: string
  editable: boolean
}) {
  const [visible, setVisible] = useState(false)
  return (
    <View>
      <Text className="text-white/40 text-xs mb-1.5">{label}</Text>
      <View className="flex-row items-center bg-[#0A0E16] rounded-xl border border-white/10">
        <TextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!visible}
          editable={editable}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.2)"
          className="flex-1 text-white text-sm px-4 py-3"
        />
        <Pressable
          onPress={() => setVisible(v => !v)}
          className="pr-4 active:opacity-60"
        >
          {visible
            ? <EyeOff size={16} color="rgba(255,255,255,0.3)" />
            : <Eye size={16} color="rgba(255,255,255,0.3)" />
          }
        </Pressable>
      </View>
    </View>
  )
}

function PasswordTab() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const handleChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields.')
      return
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match.')
      return
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters.')
      return
    }
    setSaving(true)
    try {
      const adminId = await SecureStore.getItemAsync('adminId')
      if (!adminId) return
      await changeAdminPassword(Number(adminId), currentPassword, newPassword)
      Alert.alert('Success', 'Password changed successfully.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Failed to change password.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
      <View className="flex-row items-center gap-2 mb-3">
        <Lock size={14} color="#fb923c" />
        <Text className="text-orange-500 text-xs font-black tracking-widest uppercase">Change Password</Text>
      </View>

      <View className="bg-[#111623] border border-white/5 rounded-2xl px-5 py-5 gap-4">
        <PasswordField
          label="Current password"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Enter current password"
          editable={!saving}
        />
        <PasswordField
          label="New password"
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="Enter new password"
          editable={!saving}
        />
        <PasswordField
          label="Confirm new password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Re-enter new password"
          editable={!saving}
        />

        <Pressable
          onPress={handleChange}
          disabled={saving}
          className={`bg-orange-500 active:bg-orange-600 rounded-xl py-3.5 items-center mt-1 ${saving ? 'opacity-50' : ''}`}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#0A0E16" />
          ) : (
            <Text className="text-[#0A0E16] text-sm font-black">Update Password</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  )
}

function EmptyState() {
  return (
    <View className="items-center justify-center py-24">
      <CalendarPlus size={32} color="rgba(255,255,255,0.15)" />
      <Text className="text-white/30 text-sm font-semibold mt-4">No events yet</Text>
      <Text className="text-white/20 text-xs mt-1">Tap the + button to create one</Text>
    </View>
  )
}

export default function AdminDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('events')
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadEvents = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const adminId = await SecureStore.getItemAsync('adminId')
      if (!adminId) return
      const data = await getEventsByAdmin(Number(adminId))
      setEvents(data.events ?? data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load events.')
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadEvents()
    }, [loadEvents])
  )

  const tabs: { key: Tab; label: string }[] = [
    { key: 'events', label: 'Events' },
    { key: 'subscription', label: 'Subscription' },
    { key: 'password', label: 'Password' },
  ]

  return (
    <View className="flex-1 bg-[#0A0E16]">
      {/* Header */}
      <View style={{ paddingHorizontal: 24, paddingTop: 24 }}>
        <View className="flex-row items-center justify-between mb-6">
          <Pressable
            onPress={() => router.push('/organisers')}
            className="flex-row items-center gap-1 active:opacity-60"
          >
            <ChevronLeft size={16} color="rgba(255,255,255,0.4)" />
            <Text className="text-white/40 text-sm font-semibold">Back</Text>
          </Pressable>

          {activeTab === 'events' && (
            <Pressable
              onPress={() => router.push('/CreateEventPanel')}
              className="w-10 h-10 rounded-xl bg-orange-500 active:bg-orange-600 items-center justify-center"
            >
              <Plus size={20} color="#0A0E16" />
            </Pressable>
          )}
        </View>

        <View className="flex-row items-center gap-2 mb-1">
          <Shield size={18} color="#fb923c" />
          <Text className="text-orange-500 text-xs font-black tracking-[3px] uppercase">
            Admin Session
          </Text>
        </View>
        <Text className="text-white text-5xl font-black mb-6">Dashboard</Text>

        {/* Tab bar */}
        <View className="flex-row gap-2 mb-6">
          {tabs.map(tab => (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 rounded-xl items-center ${activeTab === tab.key ? 'bg-orange-500' : 'bg-white/5'}`}
            >
              <Text
                className={`text-xs font-black ${activeTab === tab.key ? 'text-[#0A0E16]' : 'text-white/40'}`}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View className="h-px bg-white/5 mb-0" />
      </View>

      {/* Tab content */}
      {activeTab === 'events' && (
        <>
          {error ? (
            <View style={{ paddingHorizontal: 24, paddingTop: 16 }}>
              <View className="rounded-2xl px-4 py-3 mb-4 flex-row items-center gap-2 border bg-red-500/10 border-red-500/25">
                <AlertTriangle size={14} color="#f87171" />
                <Text className="text-xs font-semibold flex-1 text-red-400">{error}</Text>
              </View>
            </View>
          ) : null}

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
                paddingTop: 24,
                paddingBottom: 40,
                flexGrow: 1,
              }}
              ListEmptyComponent={<EmptyState />}
              onRefresh={loadEvents}
              refreshing={loading}
            />
          )}
        </>
      )}

      {activeTab === 'subscription' && <SubscriptionTab />}
      {activeTab === 'password' && <PasswordTab />}
    </View>
  )
}
