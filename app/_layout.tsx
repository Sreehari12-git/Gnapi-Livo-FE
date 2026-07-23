import '../global.css'
import { registerGlobals } from '@livekit/react-native'
import { Stack } from 'expo-router'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'

import { View } from 'react-native'

registerGlobals()

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: '#000000' }}>
        <SafeAreaView style={{ flex: 1, maxWidth: 430, width: '100%', marginHorizontal: 'auto', backgroundColor: '#0F172A', overflow: 'hidden' }}>
          <Stack screenOptions={{ headerShown: false, contentStyle: { paddingTop: 0, backgroundColor: '#0F172A' } }} />
        </SafeAreaView>
      </View>
    </SafeAreaProvider>
  )
}
