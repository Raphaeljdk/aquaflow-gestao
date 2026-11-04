import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { portalUrl, type PortalRoute } from "./src/config";

const colors = {
  ink: "#101820",
  muted: "#647184",
  yellow: "#facc15",
  paper: "#f5f7fa",
  white: "#ffffff",
  line: "#e4e8ee",
  navy: "#071734",
};

const destinations: { path: PortalRoute; title: string; description: string }[] = [
  { path: "/comandas", title: "Comandas", description: "Acompanhe lavagens e serviços" },
  { path: "/agendamentos", title: "Agendamentos", description: "Consulte a agenda do estabelecimento" },
  { path: "/dashboard", title: "Painel de gestão", description: "Indicadores e visão geral do ERP" },
];

export default function App() {
  const [opening, setOpening] = useState<string | null>(null);
  const configured = portalUrl("/login") !== null;

  async function openRoute(route: PortalRoute) {
    const url = portalUrl(route);
    if (!url) {
      Alert.alert("Configuração necessária", "Defina EXPO_PUBLIC_AQUAFLOW_URL com a origem HTTPS do AquaFlow.");
      return;
    }
    setOpening(route);
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) throw new Error("Nenhum navegador compatível.");
      await Linking.openURL(url);
    } catch {
      Alert.alert("Não foi possível abrir", "Verifique a conexão e o endereço do AquaFlow.");
    } finally {
      setOpening(null);
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.navy} />
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.hero}>
          <Text style={s.brand}>AQUAFLOW</Text>
          <Text style={s.headline}>Gestão do seu lava-rápido</Text>
          <Text style={s.heroCopy}>Tudo começa com um atendimento organizado.</Text>
          <View style={s.preview}><Text style={s.previewText}>PRÉVIA INTERNA • NÃO PUBLICAR</Text></View>
        </View>
        <View style={s.content}>
          <Text style={s.section}>Acesso ao sistema</Text>
          <Text style={s.description}>
            Esta é a primeira estrutura nativa para Android e iPhone. O acesso operacional
            continua no portal seguro até concluirmos autenticação e APIs nativas.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => openRoute("/login")}
            disabled={opening !== null}
            style={[s.mainButton, !configured && s.disabled]}
          >
            {opening === "/login" ? <ActivityIndicator color={colors.ink} /> :
              <Text style={s.mainButtonText}>Entrar no AquaFlow</Text>}
          </Pressable>
          {!configured && (
            <Text style={s.warning}>Configure EXPO_PUBLIC_AQUAFLOW_URL para habilitar os acessos.</Text>
          )}
          <Text style={[s.section, s.secondSection]}>Acesso rápido</Text>
          {destinations.map((destination) => (
            <Pressable
              key={destination.path}
              accessibilityRole="button"
              onPress={() => openRoute(destination.path)}
              disabled={opening !== null}
              style={s.card}
            >
              <View style={s.cardBody}>
                <Text style={s.cardTitle}>{destination.title}</Text>
                <Text style={s.cardCopy}>{destination.description}</Text>
              </View>
              <Text style={s.chevron}>›</Text>
            </Pressable>
          ))}
          <View style={s.notice}>
            <Text style={s.noticeTitle}>Seus dados continuam protegidos</Text>
            <Text style={s.noticeBody}>
              Nenhum dado operacional é gravado no aplicativo nesta versão. Os bancos
              dos lava-rápidos permanecem isolados no servidor. Não armazenamos senhas.
            </Text>
          </View>
        </View>
        <Text style={s.footer}>Ducha Elitte • AquaFlow Gestão • versão de estrutura inicial</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  scroll: { flexGrow: 1 },
  hero: { backgroundColor: colors.navy, paddingTop: 42, paddingHorizontal: 24, paddingBottom: 34 },
  brand: { color: colors.yellow, fontSize: 16, letterSpacing: 3.3, fontWeight: "900" },
  headline: { color: colors.white, fontSize: 29, fontWeight: "800", marginTop: 12 },
  heroCopy: { color: "#c1ccd9", fontSize: 15, marginTop: 8 },
  preview: { alignSelf: "flex-start", borderRadius: 6, backgroundColor: "#2c3d54", marginTop: 22, padding: 8 },
  previewText: { color: "#f9dd69", fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  content: { paddingHorizontal: 20, paddingTop: 25 },
  section: { color: colors.ink, fontSize: 19, fontWeight: "800" },
  secondSection: { marginTop: 27, marginBottom: 12 },
  description: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 10, marginBottom: 19 },
  mainButton: { backgroundColor: colors.yellow, borderRadius: 13, minHeight: 52, alignItems: "center", justifyContent: "center" },
  mainButtonText: { fontWeight: "800", fontSize: 16, color: colors.ink },
  disabled: { opacity: 0.65 },
  warning: { marginTop: 10, fontSize: 13, color: "#9b5729" },
  card: { backgroundColor: colors.white, minHeight: 79, borderWidth: 1, borderColor: colors.line, borderRadius: 13, paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", marginBottom: 10 },
  cardBody: { flex: 1 },
  cardTitle: { fontWeight: "800", color: colors.ink, fontSize: 16 },
  cardCopy: { color: colors.muted, fontSize: 13, marginTop: 4 },
  chevron: { color: colors.muted, fontSize: 27, marginLeft: 10 },
  notice: { backgroundColor: "#fff9df", borderRadius: 14, padding: 16, marginTop: 16 },
  noticeTitle: { fontSize: 14, fontWeight: "800", color: colors.ink },
  noticeBody: { marginTop: 6, color: "#625c4b", lineHeight: 20, fontSize: 13 },
  footer: { textAlign: "center", color: colors.muted, fontSize: 11, padding: 24, marginTop: "auto" },
});
