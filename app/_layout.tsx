import '../global.css'
import { registerGlobals } from '@livekit/react-native'
import { Stack } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'

registerGlobals()

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { paddingTop: 0 } }} />
    </SafeAreaProvider>
  )
}
