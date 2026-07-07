import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native'
import { useState } from 'react'
import { useRouter } from 'expo-router'
import { Check, Zap, Star, ArrowRight } from 'lucide-react-native'
import * as SecureStore from 'expo-secure-store'
import { createOrder, activateFree } from './services/payment'

const FREE_FEATURES = [
  '1 active event',
  'Up to 2 capturers',
  'Basic scoreboard',
  'Standard support',
]

const PAID_FEATURES = [
  'Unlimited events',
  'Unlimited capturers',
  'All scoreboards',
  'YouTube Live integration',
  'Priority support',
]

const PAID_AMOUNT = 999 // ₹999

export default function SubscriptionSelect() {
  const router = useRouter()
  const [loading, setLoading] = useState<'free' | 'paid' | null>(null)
  const [error, setError] = useState('')

  const handleFree = async () => {
    setError('')
    setLoading('free')
    try {
      const adminId = await SecureStore.getItemAsync('adminId')
      if (!adminId) { setError('Session expired. Please register again.'); return }
      await activateFree(Number(adminId))
      router.push('/controlPanelRegister')
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Something went wrong.')
    } finally {
      setLoading(null)
    }
  }

  const handlePaid = async () => {
    setError('')
    setLoading('paid')
    try {
      const adminId = await SecureStore.getItemAsync('adminId')
      if (!adminId) { setError('Session expired. Please register again.'); return }
      const order = await createOrder(Number(adminId), PAID_AMOUNT)
      router.push({
        pathname: '/razorpayCheckout',
        params: {
          orderId: order.orderId,
          amount: String(order.amount),
          currency: order.currency,
          keyId: order.keyId,
        },
      })
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Could not initiate payment. Try again.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <View className="flex-1 bg-[#0A0E16]">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 52, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center mb-10">
          <View className="flex-row items-center gap-2 mb-3">
            <View className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            <Text className="text-orange-500 text-xs font-black tracking-[3px] uppercase">
              Step 2 of 3
            </Text>
          </View>
          <Text className="text-white text-4xl font-black text-center">Choose your plan</Text>
          <Text className="text-white/40 text-sm mt-2 text-center leading-relaxed px-4">
            Pick the plan that fits your needs. You can upgrade anytime.
          </Text>
        </View>

        {error !== '' && (
          <View className="bg-red-500/10 border border-red-500/25 rounded-2xl px-4 py-3 mb-4">
            <Text className="text-red-400 text-xs font-semibold">{error}</Text>
          </View>
        )}

        {/* Free Tier */}
        <View className="bg-white/[0.05] border border-white/10 rounded-3xl p-6 mb-4">
          <View className="flex-row items-center gap-3 mb-1">
            <View className="w-9 h-9 rounded-xl bg-slate-700 items-center justify-center">
              <Zap size={18} color="#94a3b8" />
            </View>
            <View>
              <Text className="text-white text-lg font-black">Free</Text>
              <Text className="text-white/40 text-xs">Forever free</Text>
            </View>
            <View className="ml-auto">
              <Text className="text-white text-2xl font-black">₹0</Text>
            </View>
          </View>

          <View className="h-px bg-white/5 my-4" />

          <View className="gap-2.5 mb-6">
            {FREE_FEATURES.map(f => (
              <View key={f} className="flex-row items-center gap-2.5">
                <View className="w-4 h-4 rounded-full bg-slate-700 items-center justify-center">
                  <Check size={10} color="#94a3b8" strokeWidth={3} />
                </View>
                <Text className="text-white/50 text-sm">{f}</Text>
              </View>
            ))}
          </View>

          <Pressable
            onPress={handleFree}
            disabled={loading !== null}
            className={`border border-white/15 rounded-2xl py-3.5 items-center justify-center flex-row gap-2 ${loading !== null ? 'opacity-50' : ''}`}
          >
            {loading === 'free' ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text className="text-white/70 text-sm font-bold">Continue with Free</Text>
            )}
          </Pressable>
        </View>

        {/* Paid Tier */}
        <View className="bg-orange-500/10 border border-orange-500/30 rounded-3xl p-6">
          <View className="flex-row items-center gap-3 mb-1">
            <View className="w-9 h-9 rounded-xl bg-orange-500/20 items-center justify-center">
              <Star size={18} color="#f97316" />
            </View>
            <View>
              <Text className="text-white text-lg font-black">Pro</Text>
              <Text className="text-orange-400 text-xs font-semibold">Most popular</Text>
            </View>
            <View className="ml-auto items-end">
              <Text className="text-white text-2xl font-black">₹{PAID_AMOUNT}</Text>
              <Text className="text-white/40 text-xs">one-time</Text>
            </View>
          </View>

          <View className="h-px bg-orange-500/20 my-4" />

          <View className="gap-2.5 mb-6">
            {PAID_FEATURES.map(f => (
              <View key={f} className="flex-row items-center gap-2.5">
                <View className="w-4 h-4 rounded-full bg-orange-500/20 items-center justify-center">
                  <Check size={10} color="#f97316" strokeWidth={3} />
                </View>
                <Text className="text-white/80 text-sm">{f}</Text>
              </View>
            ))}
          </View>

          <Pressable
            onPress={handlePaid}
            disabled={loading !== null}
            className={`bg-orange-500 active:bg-orange-600 rounded-2xl py-3.5 flex-row items-center justify-center gap-2 ${loading !== null ? 'opacity-60' : ''}`}
          >
            {loading === 'paid' ? (
              <ActivityIndicator color="#0A0E16" size="small" />
            ) : (
              <>
                <Text className="text-[#0A0E16] text-sm font-black">Pay ₹{PAID_AMOUNT} & Continue</Text>
                <ArrowRight size={16} color="#0A0E16" />
              </>
            )}
          </Pressable>
        </View>

        <Text className="text-white/20 text-xs text-center mt-6 leading-relaxed">
          Secured by Razorpay · Card payments only
        </Text>
      </ScrollView>
    </View>
  )
}
