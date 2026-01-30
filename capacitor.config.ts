import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hausnote.app',
  appName: 'Haus Note',
  webDir: 'build',
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'Haus Note',
  },
  server: {
    // Allow navigation to Supabase auth and external listing URLs
    allowNavigation: ['*.supabase.co'],
  },
};

export default config;
