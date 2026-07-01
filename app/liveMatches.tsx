import { View, Text, Pressable, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { Radio, LogOut, Mic } from 'lucide-react-native'

export default function LiveMatches() {
  const router = useRouter()

  const liveMatchCount: number = 0

  const handleLeave = () => {
    router.back()
  }

  return (
    <ScrollView
      className="flex-1 bg-emerald-950"
      contentContainerStyle={{ paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="px-6 pt-14">
        <View className="self-start flex-row items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-900/60 border border-yellow-400/40 mb-5">
          <Radio size={13} color="#facc15" />
          <Text className="text-yellow-400 font-black text-xs tracking-widest">
            BADMINTON LIVE
          </Text>
        </View>

        <Text className="text-white text-4xl font-black">Match Viewer</Text>
        <Text className="text-emerald-200/70 text-sm mt-2">
          Pick a live match and watch with optional commentary.
        </Text>
      </View>

      <View className="px-6 mt-8 flex-row items-end justify-between">
        <View>
          <Text className="text-white text-lg font-black">Live matches</Text>
          <Text className="text-emerald-200/50 text-sm mt-1">
            {liveMatchCount} match{liveMatchCount === 1 ? '' : 'es'} in this room
          </Text>
        </View>

        <Pressable
          onPress={handleLeave}
          className="flex-row items-center gap-1.5 px-4 py-2 rounded-lg border border-white/15 active:bg-white/10"
        >
          <LogOut size={14} color="#ffffff" />
          <Text className="text-white text-sm font-bold">Leave</Text>
        </Pressable>
      </View>

      <View className="px-6 mt-4">
        <View className="bg-black/20 rounded-2xl border border-white/10 border-dashed py-10 items-center justify-center">
          <View className="flex-row items-center gap-2">
            <Mic size={16} color="rgba(255,255,255,0.5)" />
            <Text className="text-white/50 text-sm">
              Waiting for the broadcaster to start a match…
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  )
}

