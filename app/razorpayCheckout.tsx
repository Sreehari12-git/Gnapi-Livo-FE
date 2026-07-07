import { View, Text, Pressable, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { WebView } from 'react-native-webview'
import { useRef, useState } from 'react'
import * as SecureStore from 'expo-secure-store'
import { verifyPayment, failPayment } from './services/payment'
import { AlertTriangle, RefreshCw } from 'lucide-react-native'

export default function RazorpayCheckout() {
  const router = useRouter()
  const { orderId, amount, currency, keyId } = useLocalSearchParams<{
    orderId: string
    amount: string
    currency: string
    keyId: string
  }>()
  const webViewRef = useRef<WebView>(null)
  const [pageError, setPageError] = useState(false)
  const [status, setStatus] = useState<'idle' | 'verifying' | 'cleaning'>('idle')

  const handleFail = async (reason: string) => {
    setStatus('cleaning')
    try {
      const adminId = await SecureStore.getItemAsync('adminId')
      if (adminId) {
        await failPayment(Number(adminId), orderId)
        await SecureStore.deleteItemAsync('adminId')
      }
    } catch {
      // best-effort cleanup
    }
    router.replace('/adminRegister')
  }

  const handleMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data)
      if (data.success) {
        setStatus('verifying')
        try {
          const adminId = await SecureStore.getItemAsync('adminId')
          if (!adminId) throw new Error('No adminId')
          await verifyPayment(
            Number(adminId),
            data.razorpay_order_id,
            data.razorpay_payment_id,
            data.razorpay_signature,
          )
          router.replace('/controlPanelRegister')
        } catch {
          await handleFail('verify_failed')
        }
      } else {
        await handleFail(data.reason ?? 'dismissed')
      }
    } catch {
      await handleFail('parse_error')
    }
  }

  const checkoutHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0A0E16; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .loading { color: rgba(255,255,255,0.5); font-family: sans-serif; font-size: 14px; text-align: center; }
  </style>
</head>
<body>
  <p class="loading">Opening payment...</p>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <script>
    window.onload = function() {
      var options = {
        key: "${keyId}",
        amount: "${amount}",
        currency: "${currency}",
        order_id: "${orderId}",
        name: "Gnapi Livo",
        description: "Pro Plan",
        method: {
          card: true,
          upi: false,
          netbanking: false,
          wallet: false,
          emi: false,
          paylater: false
        },
        config: {
          display: {
            blocks: {
              banks: { name: "Pay via Card", instruments: [{ method: "card" }] }
            },
            sequence: ["block.banks"],
            preferences: { show_default_blocks: false }
          }
        },
        handler: function(response) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            success: true,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature
          }));
        },
        modal: {
          ondismiss: function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({ success: false, reason: "dismissed" }));
          },
          escape: false
        },
        theme: { color: "#f97316" }
      };
      var rzp = new Razorpay(options);
      rzp.on("payment.failed", function(response) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          success: false,
          reason: response.error.description || "Payment failed"
        }));
      });
      rzp.open();
    };
  </script>
</body>
</html>
`

  if (status === 'verifying') {
    return (
      <View className="flex-1 bg-[#0A0E16] items-center justify-center gap-3">
        <ActivityIndicator color="#f97316" size="large" />
        <Text className="text-white/50 text-sm">Verifying payment…</Text>
      </View>
    )
  }

  if (status === 'cleaning') {
    return (
      <View className="flex-1 bg-[#0A0E16] items-center justify-center gap-3">
        <ActivityIndicator color="#94a3b8" size="large" />
        <Text className="text-white/50 text-sm">Cleaning up…</Text>
      </View>
    )
  }

  if (pageError) {
    return (
      <View className="flex-1 bg-[#0A0E16] items-center justify-center px-8 gap-4">
        <AlertTriangle size={32} color="#f97316" />
        <Text className="text-white text-lg font-black text-center">Couldn't load payment</Text>
        <Text className="text-white/40 text-sm text-center">Check your internet connection and try again.</Text>
        <View className="flex-row gap-3 mt-2">
          <Pressable
            onPress={() => { setPageError(false); webViewRef.current?.reload() }}
            className="bg-orange-500 rounded-2xl px-5 py-3 flex-row items-center gap-2"
          >
            <RefreshCw size={14} color="#0A0E16" />
            <Text className="text-[#0A0E16] font-black text-sm">Retry</Text>
          </Pressable>
          <Pressable
            onPress={() => handleFail('page_error')}
            className="border border-white/15 rounded-2xl px-5 py-3"
          >
            <Text className="text-white/60 text-sm font-semibold">Cancel</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-[#0A0E16]">
      <WebView
        ref={webViewRef}
        source={{ html: checkoutHtml }}
        onMessage={handleMessage}
        onError={() => setPageError(true)}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        style={{ flex: 1, backgroundColor: '#0A0E16' }}
      />
    </View>
  )
}
