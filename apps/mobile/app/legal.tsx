import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { colors, type } from "@/src/theme/tokens";
import { mobileClient, type LegalStatus } from "@/src/features/mobile-client";

const serverUrl = process.env.EXPO_PUBLIC_COOPERA_SERVER_URL || "https://coopera-kos.vercel.app";

export default function LegalConsentScreen() {
  const [status, setStatus] = useState<LegalStatus | null>(null);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    void mobileClient.legalStatus()
      .then((value) => {
        if (!mounted) return;
        setStatus(value);
        if (value.accepted) router.replace("/(tabs)/cases");
      })
      .catch((cause) => {
        if (!mounted) return;
        setError(cause instanceof Error ? cause.message : "Não foi possível carregar os documentos.");
      })
      .finally(() => {
        if (mounted) setBusy(false);
      });
    return () => { mounted = false; };
  }, []);

  const accept = async () => {
    if (!checked || !status?.documents.length) return;
    setBusy(true); setError("");
    try {
      await mobileClient.acceptLegal();
      router.replace("/(tabs)/cases");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível registrar o aceite.");
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    try { await mobileClient.logout(); } finally { router.replace("/welcome"); }
  };

  return <View style={styles.page}>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.badge}><Feather name="shield" size={16} color={colors.goldDark} /><Text style={styles.badgeText}>Acesso por convite</Text></View>
      <Text style={styles.title}>Antes de entrar, confirme as regras da comunidade.</Text>
      <Text style={styles.copy}>O Coopera Kós é um ambiente educacional supervisionado. Publique apenas conteúdo anonimizado e com base legal.</Text>

      <View style={styles.card}>
        {busy && !status ? <View style={styles.loading}><ActivityIndicator color={colors.goldDark} /><Text style={styles.muted}>Carregando documentos vigentes…</Text></View> : null}
        {status?.documents.map((document) => <View key={`${document.slug}-${document.version}`} style={styles.document}>
          <Feather name="file-text" size={18} color={colors.goldDark} />
          <View style={styles.documentBody}>
            <Text style={styles.documentTitle}>{document.title}</Text>
            <Text style={styles.documentMeta}>Versão {document.version}</Text>
          </View>
        </View>)}
        {!busy && !status?.documents.length ? <Text style={styles.error}>Documentos legais indisponíveis. Contate o suporte antes de usar a comunidade.</Text> : null}
        <View style={styles.links}>
          <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(`${serverUrl}/termos`)} style={styles.linkButton}><Text style={styles.linkText}>Ler termos</Text></Pressable>
          <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(`${serverUrl}/privacidade`)} style={styles.linkButton}><Text style={styles.linkText}>Ler privacidade</Text></Pressable>
        </View>
      </View>

      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={() => setChecked((value) => !value)} style={styles.consent}>
        <Feather name={checked ? "check-square" : "square"} size={22} color={checked ? colors.goldDark : colors.muted} />
        <Text style={styles.consentText}>Li e aceito os documentos vigentes. Entendo que a discussão é educacional e que a responsabilidade clínica permanece com o médico assistente.</Text>
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable accessibilityRole="button" disabled={busy || !checked || !status?.documents.length} onPress={() => void accept()} style={[styles.cta, (busy || !checked || !status?.documents.length) && styles.disabled]}>
        <Text style={styles.ctaText}>{busy ? "Registrando…" : "Aceitar e entrar"}</Text>
        <Feather name="arrow-right" size={17} color="white" />
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => void logout()} style={styles.secondary}><Text style={styles.secondaryText}>Sair e voltar ao login</Text></Pressable>
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 22, paddingTop: 64, paddingBottom: 38 },
  badge: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: colors.softGold, borderWidth: 1, borderColor: "#EAD89E", paddingHorizontal: 12, minHeight: 34 },
  badgeText: { color: "#6A5729", fontSize: 11, fontWeight: "800", letterSpacing: .6, textTransform: "uppercase" },
  title: { fontFamily: type.display, color: colors.ink, fontSize: 34, lineHeight: 37, fontWeight: "700", letterSpacing: -1, marginTop: 28 },
  copy: { color: colors.muted, fontSize: 14, lineHeight: 22, marginTop: 14 },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, marginTop: 26, padding: 16, gap: 14 },
  loading: { flexDirection: "row", alignItems: "center", gap: 10 },
  muted: { color: colors.muted, fontSize: 12 },
  document: { flexDirection: "row", gap: 11, alignItems: "center", paddingBottom: 13, borderBottomWidth: 1, borderBottomColor: colors.line },
  documentBody: { flex: 1 },
  documentTitle: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  documentMeta: { color: colors.muted, fontSize: 11, marginTop: 3 },
  links: { flexDirection: "row", gap: 10 },
  linkButton: { minHeight: 44, flex: 1, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#D8C280", backgroundColor: colors.softGold },
  linkText: { color: "#5C4B20", fontSize: 12, fontWeight: "800" },
  consent: { minHeight: 58, marginTop: 22, flexDirection: "row", gap: 11, alignItems: "flex-start" },
  consentText: { flex: 1, color: "#4D473F", fontSize: 13, lineHeight: 20 },
  error: { color: colors.danger, fontSize: 12, lineHeight: 18, marginTop: 14 },
  cta: { minHeight: 52, marginTop: 24, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  ctaText: { color: "white", fontSize: 13, fontWeight: "900" },
  disabled: { opacity: .45 },
  secondary: { minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: 10 },
  secondaryText: { color: colors.muted, fontSize: 12, fontWeight: "800" },
});
