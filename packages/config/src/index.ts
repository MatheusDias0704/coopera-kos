export const appConfig = {
  name: "Coopera Kós",
  publicName: "Coopera Kós",
  bundleIdentifier: "br.com.institutokos.cooperakos",
  supportEmail: "suporte@institutokos.com.br",
  healthPath: "/api/health",
} as const;

export const featureFlags = {
  inviteOnlyAccess: true,
  publicSignup: false,
  pushNotifications: false,
  clinicalAiRecommendations: false,
} as const;

export const requiredEnvironment = {
  webServer: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
  privilegedServer: ["SUPABASE_SERVICE_ROLE_KEY"],
  mobilePublic: ["EXPO_PUBLIC_SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_ANON_KEY"],
} as const;
