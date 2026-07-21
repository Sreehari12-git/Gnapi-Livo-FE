import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native'
import { useEffect, useState } from 'react'
import { useRouter } from 'expo-router'
import { Check, Zap, Star, ArrowRight, RefreshCw } from 'lucide-react-native'
import * as SecureStore from 'expo-secure-store'
import { getPlans, createOrder, activateFree, SubscriptionPlan } from './services/payment'

const PLAN_ICONS: Record<string, React.ReactNode> = {
  free: <Zap size={18} color="#94a3b8" />,
  pro: <Star size={18} color="#f97316" />,
}

const PLAN_FEATURES: Record<string, string[]> = {
  free: ['1 active event', 'Up to 2 capturers', 'Basic scoreboard', 'Standard support'],
  pro: ['Unlimited events', 'Unlimited capturers', 'All scoreboards', 'YouTube Live integration', 'Priority support'],
}

function getPlanKey(plan: SubscriptionPlan) {
  return plan.name.toLowerCase()
}

export default function SubscriptionSelect() {
  const router = useRouter()
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [fetchLoading, setFetchLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [actionLoading, setActionLoading] = useState<number | null>(null) // planId being acted on
  const [actionError, setActionError] = useState('')

  const loadPlans = async () => {
    setFetchLoading(true)
    setFetchError('')
    try {
      const data = await getPlans()
      setPlans(data)
    } catch {
      setFetchError('Could not load plans. Check your connection.')
    } finally {
      setFetchLoading(false)
    }
  }

  useEffect(() => { loadPlans() }, [])

  const handleSelect = async (plan: SubscriptionPlan) => {
    setActionError('')
    setActionLoading(plan.id)
    try {
      const rawAdminId = await SecureStore.getItemAsync('adminId')
      if (!rawAdminId) { setActionError('Session expired. Please register again.'); return }
      const adminId = Number(rawAdminId)

      if (plan.amount === 0) {
        await activateFree(adminId, plan.id)
        router.push('/controlPanelRegister')
      } else {
        const order = await createOrder(adminId, plan.id)
        router.push({
          pathname: '/razorpayCheckout',
          params: {
            orderId: order.orderId,
            amount: String(order.amount),
            currency: order.currency,
            keyId: order.keyId,
            planId: plan.id,
            mode: 'register',
            successRedirect: '/controlPanelRegister',
          },
        })
      }
    } catch (err: any) {
      setActionError(err.response?.data?.message ?? 'Something went wrong. Try again.')
    } finally {
      setActionLoading(null)
    }
  }

  const isFree = (plan: SubscriptionPlan) => plan.amount === 0
  const isLastPlan = (idx: number) => idx === plans.length - 1

  return (
    <View className="flex-1 bg-[#0A0E16]">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 52, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
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

        {/* Error banners */}
        {(fetchError || actionError) !== '' && (
          <View className="bg-red-500/10 border border-red-500/25 rounded-2xl px-4 py-3 mb-4">
            <Text className="text-red-400 text-xs font-semibold">{fetchError || actionError}</Text>
          </View>
        )}

        {/* Loading plans */}
        {fetchLoading && (
          <View className="items-center py-16 gap-3">
            <ActivityIndicator color="#f97316" size="large" />
            <Text className="text-white/40 text-sm">Loading plans…</Text>
          </View>
        )}

        {/* Fetch failed */}
        {!fetchLoading && fetchError !== '' && (
          <Pressable
            onPress={loadPlans}
            className="flex-row items-center justify-center gap-2 bg-white/5 border border-white/10 rounded-2xl py-4"
          >
            <RefreshCw size={14} color="#f97316" />
            <Text className="text-orange-400 text-sm font-semibold">Retry</Text>
          </Pressable>
        )}

        {/* Plan cards */}
        {!fetchLoading && fetchError === '' && plans.map((plan, idx) => {
          const key = getPlanKey(plan)
          const free = isFree(plan)
          const features = PLAN_FEATURES[key] ?? []
          const isLoading = actionLoading === plan.id
          const anyLoading = actionLoading !== null

          return (
            <View
              key={plan.id}
              className={`rounded-3xl p-6 ${!isLastPlan(idx) ? 'mb-4' : ''} ${
                free
                  ? 'bg-white/[0.05] border border-white/10'
                  : 'bg-orange-500/10 border border-orange-500/30'
              }`}
            >
              {/* Plan header */}
              <View className="flex-row items-center gap-3 mb-1">
                <View className={`w-9 h-9 rounded-xl items-center justify-center ${free ? 'bg-slate-700' : 'bg-orange-500/20'}`}>
                  {PLAN_ICONS[key] ?? <Star size={18} color="#f97316" />}
                </View>
                <View>
                  <Text className="text-white text-lg font-black">{plan.name}</Text>
                  {!free && <Text className="text-orange-400 text-xs font-semibold">Most popular</Text>}
                  {free && <Text className="text-white/40 text-xs">Forever free</Text>}
                </View>
                <View className="ml-auto items-end">
                  <Text className="text-white text-2xl font-black">
                    {plan.amount === 0 ? '₹0' : `₹${plan.amount}`}
                  </Text>
                  {!free && <Text className="text-white/40 text-xs">one-time</Text>}
                </View>
              </View>

              {/* Usage limit badge */}
              <View className={`self-start mt-2 rounded-full px-3 py-1 ${free ? 'bg-slate-700/60' : 'bg-orange-500/20'}`}>
                <Text className={`text-xs font-semibold ${free ? 'text-white/50' : 'text-orange-300'}`}>
                  {plan.usageLimitMinutes} min 
                </Text>
              </View>

              <View className={`h-px my-4 ${free ? 'bg-white/5' : 'bg-orange-500/20'}`} />

              {/* Features */}
              {features.length > 0 && (
                <View className="gap-2.5 mb-6">
                  {features.map(f => (
                    <View key={f} className="flex-row items-center gap-2.5">
                      <View className={`w-4 h-4 rounded-full items-center justify-center ${free ? 'bg-slate-700' : 'bg-orange-500/20'}`}>
                        <Check size={10} color={free ? '#94a3b8' : '#f97316'} strokeWidth={3} />
                      </View>
                      <Text className={`text-sm ${free ? 'text-white/50' : 'text-white/80'}`}>{f}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* CTA button */}
              <Pressable
                onPress={() => handleSelect(plan)}
                disabled={anyLoading}
                className={`rounded-2xl py-3.5 flex-row items-center justify-center gap-2 ${
                  anyLoading ? 'opacity-50' : ''
                } ${
                  free
                    ? 'border border-white/15'
                    : 'bg-orange-500 active:bg-orange-600'
                }`}
              >
                {isLoading ? (
                  <ActivityIndicator color={free ? '#ffffff' : '#0A0E16'} size="small" />
                ) : free ? (
                  <Text className="text-white/70 text-sm font-bold">Continue with Free</Text>
                ) : (
                  <>
                    <Text className="text-[#0A0E16] text-sm font-black">Pay ₹{plan.amount} & Continue</Text>
                    <ArrowRight size={16} color="#0A0E16" />
                  </>
                )}
              </Pressable>
            </View>
          )
        })}

        <Text className="text-white/20 text-xs text-center mt-6 leading-relaxed">
          Secured by Razorpay · Card payments only
        </Text>
      </ScrollView>
    </View>
  )
}
