import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { mobileClient } from "@/src/features/mobile-client";
import { colors, type } from "@/src/theme/tokens";

type Mode = "login" | "invite";
const fields = { login: ["E-mail", "Senha"], invite: ["E-mail"] } as const;

export default function WelcomeScreen() {
  const [mode, setMode] = useState<Mode>("login"); const [values, setValues] = useState<Record<string, string>>({}); const [error, setError] = useState(""); const [success, setSuccess] = useState(""); const [loading, setLoading] = useState(false);
  const submit = async () => {
    setError(""); setSuccess(""); setLoading(true);
    try {
      if (mode === "login") {
        await mobileClient.signIn(values["E-mail"] ?? "", values.Senha ?? "");
      } else {
        await mobileClient.requestPasswordReset(values["E-mail"] ?? "");
        setSuccess("Se este e-mail já foi convidado, enviaremos o link seguro para definir a senha.");
        return;
      }
      router.replace("/(tabs)/cases");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível continuar."); } finally { setLoading(false); }
  };
  return <View style={styles.page}>
    <View style={styles.orbitOne} /><View style={styles.orbitTwo} />
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.brand}><View style={styles.mark}><Text style={styles.markText}>K</Text></View><View><Text style={styles.brandName}>KÓS</Text><Text style={styles.brandSub}>COOPERA</Text></View></View>
      <View style={styles.intro}><Text style={styles.title}>Raciocínio clínico,{"\n"}<Text style={styles.titleAccent}>feito em conjunto.</Text></Text><Text style={styles.copy}>Um ambiente educacional supervisionado para compartilhar casos clínicos anonimizados com sua turma.</Text></View>
      <View style={styles.switch}>
        <Pressable style={[styles.switchItem, mode === "login" && styles.switchActive]} onPress={() => { setMode("login"); setError(""); }}><Text style={[styles.switchText, mode === "login" && styles.switchTextActive]}>Entrar</Text></Pressable>
        <Pressable style={[styles.switchItem, mode === "invite" && styles.switchActive]} onPress={() => { setMode("invite"); setError(""); setSuccess(""); }}><Text style={[styles.switchText, mode === "invite" && styles.switchTextActive]}>Definir senha</Text></Pressable>
      </View>
      <View style={styles.form}>
        {fields[mode].map((label) => <View key={label}><Text style={styles.label}>{label}</Text><View style={styles.inputRow}><Feather name={label === "Senha" ? "lock" : "mail"} size={17} color={colors.gold} /><TextInput value={values[label] ?? ""} onChangeText={(value) => setValues((old) => ({ ...old, [label]: value }))} style={styles.input} placeholderTextColor="#A9A59C" placeholder={label} autoCapitalize="none" keyboardType={label === "E-mail" ? "email-address" : "default"} secureTextEntry={label === "Senha"} /></View></View>)}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {success ? <Text style={styles.success}>{success}</Text> : null}
        <Pressable accessibilityRole="button" style={[styles.cta, loading && styles.disabled]} disabled={loading} onPress={() => void submit()}><Text style={styles.ctaText}>{loading ? "Validando acesso…" : mode === "login" ? "Entrar na comunidade" : "Enviar link seguro"}</Text><Feather name="arrow-right" size={17} color={colors.ink} /></Pressable>
      </View>
      <View style={styles.disclaimer}><Feather name="shield" size={14} color={colors.gold} /><Text style={styles.disclaimerText}>Dados anonimizados obrigatórios · Uso educacional supervisionado</Text></View>
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({ page:{flex:1,backgroundColor:colors.ink},content:{padding:28,paddingTop:68,paddingBottom:40,flexGrow:1},orbitOne:{position:"absolute",width:430,height:430,borderRadius:215,borderWidth:1,borderColor:"rgba(219,190,109,.25)",right:-245,top:-120},orbitTwo:{position:"absolute",width:250,height:250,borderRadius:125,borderWidth:1,borderColor:"rgba(219,190,109,.18)",left:-155,bottom:-85},brand:{flexDirection:"row",alignItems:"center",gap:10,marginBottom:62},mark:{width:32,height:32,borderRadius:16,borderWidth:1,borderColor:colors.gold,alignItems:"center",justifyContent:"center"},markText:{fontFamily:type.display,fontWeight:"700",color:colors.ivory,fontSize:17},brandName:{color:colors.ivory,fontFamily:type.display,fontSize:18,letterSpacing:3},brandSub:{color:colors.gold,fontSize:9,fontWeight:"700",letterSpacing:3,marginTop:3},intro:{maxWidth:340},title:{fontFamily:type.display,color:"white",fontWeight:"700",fontSize:38,lineHeight:40,letterSpacing:-1.2},titleAccent:{color:colors.gold,fontStyle:"italic"},copy:{color:"#D4D0C7",fontSize:14,lineHeight:22,marginTop:20},switch:{flexDirection:"row",marginTop:40,borderBottomWidth:1,borderBottomColor:"rgba(252,240,206,.25)"},switchItem:{flex:1,paddingVertical:13},switchActive:{borderBottomWidth:2,borderBottomColor:colors.gold},switchText:{color:"#BDB8AA",fontWeight:"700",fontSize:13},switchTextActive:{color:"white"},form:{gap:16,marginTop:25},label:{color:"#F1EDDF",fontWeight:"600",fontSize:12,marginBottom:7},inputRow:{height:51,borderWidth:1,borderColor:"rgba(252,240,206,.28)",backgroundColor:"rgba(255,255,255,.04)",flexDirection:"row",alignItems:"center",gap:10,paddingHorizontal:14},input:{flex:1,color:"white",fontSize:14},error:{color:"#F4C8BB",fontSize:12},success:{color:"#CDE8D4",fontSize:12,lineHeight:18},cta:{height:53,backgroundColor:colors.gold,alignItems:"center",justifyContent:"center",flexDirection:"row",gap:9,marginTop:4},disabled:{opacity:.65},ctaText:{color:colors.ink,fontSize:13,fontWeight:"800"},disclaimer:{flexDirection:"row",gap:8,alignItems:"center",marginTop:34},disclaimerText:{color:"#99958C",fontSize:10,flex:1,lineHeight:15} });
