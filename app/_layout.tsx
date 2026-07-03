import '../global.css'
import { registerGlobals } from '@livekit/react-native'
import { Stack } from 'expo-router'

registerGlobals()

export default function RootLayout() {
  return <Stack />
}
