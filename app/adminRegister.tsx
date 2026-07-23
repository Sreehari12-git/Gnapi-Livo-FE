
import { View, Text, Pressable, ScrollView, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native'
import { useState } from 'react'
import { useRouter } from 'expo-router'
import { ArrowRight, ShieldCheck, Mail, Lock, Eye, EyeOff } from 'lucide-react-native'
import { adminRegister } from './services/auth'
import * as SecureStore from "expo-secure-store"

export default function AdminRegister() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

const handleContinue = async () => {
  if (!email.trim() || !password.trim()) {
    setError("Enter your admin email and password.");
    return;
  }

  if (password !== confirmPassword) {
    setError("Passwords don't match.");
    return;
  }

  setError(null);
  setLoading(true);

  try {
    const data = await adminRegister(email, password);
    await SecureStore.setItemAsync("adminId", data.user.id.toString());
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    router.push("/subscriptionSelect");
  } catch (err: any) {
    if (err.response) {
      setError(err.response.data.message);
    } else {
      setError("Unable to connect to the server.");
    }
  } finally {
    setLoading(false);
  }
};

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#0A0E16]"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View className="px-6 pt-20 pb-10 items-center">
          <View className="w-16 h-16 rounded-2xl bg-orange-500/15 border-2 border-orange-500 items-center justify-center mb-5">
            <ShieldCheck size={28} color="#f97316" />
          </View>
          <View className="flex-row items-center gap-2 mb-2">
            <View className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            <Text className="text-orange-500 text-xs font-extrabold tracking-[3px] uppercase">
              Step 1 of 3
            </Text>
          </View>
          <Text className="text-white text-3xl font-black tracking-tight text-center">
            Register as Admin
          </Text>
          <Text className="text-white/40 text-sm mt-2 text-center leading-relaxed px-6">
            Tell us about your organisation and set your admin login.
          </Text>
        </View>

        {/* Form */}
         <View className="mx-6 gap-3.5"> 
          {/* <View className="bg-white/[0.06] rounded-2xl border border-white/10 px-4 flex-row items-center">
            <Building2 size={16} color="rgba(255,255,255,0.3)" />
            <TextInput
              value={orgName}
              onChangeText={setOrgName}
              placeholder="Organisation / tournament name"
              placeholderTextColor="rgba(255,255,255,0.3)"
              autoCapitalize="words"
              className="flex-1 text-white py-4 pl-2.5 text-base"
            />
          </View> */} 

          {/* <View className="bg-white/[0.06] rounded-2xl border border-white/10 px-4 flex-row items-center">
            <Badge size={16} color="rgba(255,255,255,0.3)" />
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Your title (e.g. Tournament Director)"
              placeholderTextColor="rgba(255,255,255,0.3)"
              autoCapitalize="words"
              className="flex-1 text-white py-4 pl-2.5 text-base"
            />
          </View> */}

          {/* <View className="bg-white/[0.06] rounded-2xl border border-white/10 px-4 flex-row items-center">
            <Phone size={16} color="rgba(255,255,255,0.3)" />
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="Phone number (optional)"
              placeholderTextColor="rgba(255,255,255,0.3)"
              keyboardType="phone-pad"
              className="flex-1 text-white py-4 pl-2.5 text-base"
            />
          </View> */}

          <View className="bg-white/[0.06] rounded-2xl border border-white/10 px-4 flex-row items-center">
            <Mail size={16} color="rgba(255,255,255,0.3)" />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Admin email"
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
            <Text className="text-red-400 text-xs font-medium">
              {error}
            </Text>
          )}

          <Pressable
            onPress={handleContinue}
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
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

