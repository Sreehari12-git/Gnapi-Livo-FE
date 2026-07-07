import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useState } from 'react'
import { useRouter } from 'expo-router'
import { ShieldCheck, Mail, Lock, User, EyeOff, Eye, ArrowRight, AtSign } from 'lucide-react-native'
import { controlPanelRegister } from './services/auth'
import * as SecureStore from "expo-secure-store";


export default function ControlPanelRegister() {
  const router = useRouter()
  const [name, setName] = useState('')
  // const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validate = () => {
    if (!name.trim()) return 'Enter your full name.'
    // if (!username.trim()) return 'Choose a username.'
    if (!email.trim()) return 'Enter your email address.'
    if (!password.trim()) return 'Enter a password.'
    if (password !== confirmPassword) return "Passwords don't match."
    return null
  }

  const handleRegister = async () => {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    setLoading(true)
    try {
      const adminId = await SecureStore.getItemAsync("adminId");
      if (!adminId) {
        setError("Admin not found. Please log in again.");
        return;
      }
      const data = await controlPanelRegister(name,email,password, Number(adminId));
      console.log(data);
      router.push('/organisers')
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#0A0E16]"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 60 }}
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
          <Text className="text-white text-3xl font-black tracking-tight text-center">
            Create Account
          </Text>
          <Text className="text-white/40 text-sm mt-2 text-center leading-relaxed px-6">
            Step 3 of 3: Setup your security credentials
          </Text>
        </View>

        <View className="mx-6 gap-3.5">
          <View className="bg-white/[0.06] rounded-2xl border border-white/10 px-4 flex-row items-center">
            <User size={16} color="rgba(255,255,255,0.3)" />
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Full name"
              placeholderTextColor="rgba(255,255,255,0.3)"
              autoCapitalize="words"
              className="flex-1 text-white py-4 pl-2.5 text-base"
            />
          </View>

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

          <View className="bg-white/[0.06] rounded-2xl border border-white/10 px-4 flex-row items-center">
            <Lock size={16} color="rgba(255,255,255,0.3)" />
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm password"
              placeholderTextColor="rgba(255,255,255,0.3)"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              className="flex-1 text-white py-4 pl-2.5 text-base"
            />
          </View>

          {error && (
            <Text className="text-red-400 text-xs font-medium">{error}</Text>
          )}

          <Pressable
            onPress={handleRegister}
            disabled={loading}
            className="bg-orange-500 active:bg-orange-600 rounded-2xl py-4 flex-row items-center justify-center gap-2 mt-1 disabled:opacity-50"
          >
            {loading ? (
              <ActivityIndicator color="#0A0E16" />
            ) : (
              <>
                <Text className="text-[#0A0E16] text-base font-black">
                  Continue
                </Text>
                <ArrowRight size={18} color="#0A0E16" />
              </>
            )}
          </Pressable>
        </View>

        <View className="flex-row items-center justify-center gap-1.5 mt-8">
          <Text className="text-white/35 text-sm">Already have an account?</Text>
          <Pressable onPress={() => router.dismissTo('/')}>
            <Text className="text-orange-400 text-sm font-bold">Sign In</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

