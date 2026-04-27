import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.qz1ii.metronome',
  appName: 'Metronome',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
}

export default config