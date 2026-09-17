import { useEffect, useState } from "react";
import { Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { colors, type } from "@/src/theme/tokens";
import { mobileClient } from "@/src/features/mobile-client";
import type { ActiveMember } from "@/src/features/models";

export default function ProfileScreen(){
  const [member, setMember] = useState<ActiveMember | null>(null);
  useEffect(() => { void mobileClient.currentMember().then(setMember); }, []);
  const logout = async () => { try { await mobileClient.logout(); } finally { router.replace("/welcome"); } };
  const requestDeletion = async () => {
    try { await mobileClient.requestAccountDeletion(); Alert.alert("Solicitação registrada", "A equipe Kós processará a solicitação conforme a política de privacidade e retenção aplicável."); }
    catch (cause) { Alert.alert("Não foi possível solicitar", cause instanceof Error ? cause.message : "Tente novamente em instantes."); }
  };
  const name = member?.name ?? "Participante Kós";
  const serverUrl = process.env.EXPO_PUBLIC_COOPERA_SERVER_URL || "https://coopera-kos.vercel.app";
  return <View style={styles.page}><View style={styles.avatar}><Text style={styles.avatarText}>{member?.initials ?? "CK"}</Text></View><Text style={styles.name}>{name}</Text><Text style={styles.role}>{member ? `${member.role} · ${member.cohortName}` : "Acesso por convite"}</Text><View style={styles.card}><Row icon="shield" title="Ambiente supervisionado" detail="Dados anonimizados obrigatórios"/><Row icon="users" title="Participação fechada" detail="Apenas turma ativa por convite"/><Pressable onPress={() => void Linking.openURL(`${serverUrl}/termos`)}><Row icon="file-text" title="Termos e privacidade" detail="Ler documentos vigentes"/></Pressable><Pressable onPress={() => void Linking.openURL("mailto:suporte@institutokos.com.br?subject=Coopera%20K%C3%B3s") }><Row icon="help-circle" title="Suporte" detail="Falar com a equipe Kós"/></Pressable></View><Pressable onPress={() => void requestDeletion()} style={styles.secondary}><Feather name="trash-2" size={17} color={colors.danger}/><Text style={styles.secondaryText}>Solicitar exclusão de conta</Text></Pressable><Pressable onPress={() => void logout()} style={styles.logout}><Feather name="log-out" size={17} color={colors.danger}/><Text style={styles.logoutText}>Sair da conta</Text></Pressable></View>;
}
function Row({icon,title,detail}:{icon:keyof typeof Feather.glyphMap;title:string;detail:string}){return <View style={styles.row}><Feather name={icon} size={18} color={colors.goldDark}/><View><Text style={styles.rowTitle}>{title}</Text><Text style={styles.rowDetail}>{detail}</Text></View></View>;}
const styles=StyleSheet.create({page:{flex:1,backgroundColor:colors.paper,padding:20},avatar:{width:66,height:66,borderRadius:33,backgroundColor:"#DED2B7",alignItems:"center",justifyContent:"center",marginTop:16},avatarText:{fontFamily:type.display,fontSize:19,fontWeight:"700",color:colors.ink},name:{fontFamily:type.display,fontSize:28,fontWeight:"700",letterSpacing:-.7,color:colors.ink,marginTop:17},role:{fontSize:12,color:colors.muted,marginTop:5,textTransform:"capitalize"},card:{marginTop:30,borderTopWidth:1,borderTopColor:colors.line},row:{flexDirection:"row",gap:12,paddingVertical:17,borderBottomWidth:1,borderBottomColor:colors.line},rowTitle:{fontSize:12,fontWeight:"800",color:colors.ink},rowDetail:{fontSize:11,color:colors.muted,marginTop:4},secondary:{marginTop:28,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:7,height:47,borderWidth:1,borderColor:"#E4C6C1"},secondaryText:{fontSize:12,fontWeight:"800",color:colors.danger},logout:{marginTop:12,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:7,height:47,borderWidth:1,borderColor:"#E4C6C1"},logoutText:{fontSize:12,fontWeight:"800",color:colors.danger}});
