import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, type } from "@/src/theme/tokens";
import { mobileClient } from "@/src/features/mobile-client";
import type { AppNotification } from "@/src/features/models";

export default function AlertsScreen(){
  const [alerts, setAlerts] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { void mobileClient.listNotifications().then(setAlerts).finally(() => setLoading(false)); }, []);
  return <View style={styles.page}><Text style={styles.title}>Atualizações</Text><Text style={styles.copy}>O que mudou nas discussões que você acompanha.</Text>{loading ? <ActivityIndicator color={colors.goldDark} /> : <View style={styles.list}>{alerts.length ? alerts.map((alert)=><Pressable key={alert.id} style={styles.item}><View style={styles.icon}><Feather name="bell" size={17} color={colors.goldDark}/></View><View style={styles.itemCopy}><Text style={styles.itemTitle}>{alert.title}</Text><Text style={styles.detail}>{alert.body}</Text><Text style={styles.time}>{alert.createdAt}</Text></View></Pressable>) : <View style={styles.empty}><Feather name="bell" size={24} color={colors.goldDark}/><Text style={styles.emptyTitle}>Sem atualizações</Text><Text style={styles.detail}>Comentários, sínteses e mensagens aparecerão aqui.</Text></View>}</View>}</View>;
}
const styles=StyleSheet.create({page:{flex:1,backgroundColor:colors.paper,padding:20},title:{fontFamily:type.display,fontSize:32,fontWeight:"700",letterSpacing:-1,color:colors.ink},copy:{fontSize:13,color:colors.muted,marginTop:7,marginBottom:26},list:{borderTopWidth:1,borderTopColor:colors.line},item:{flexDirection:"row",gap:11,paddingVertical:17,borderBottomWidth:1,borderBottomColor:colors.line},icon:{width:34,height:34,borderRadius:17,backgroundColor:"#F8EED0",alignItems:"center",justifyContent:"center"},itemCopy:{flex:1},itemTitle:{fontSize:12,fontWeight:"800",color:colors.ink},detail:{fontSize:11,lineHeight:16,color:colors.muted,marginTop:4},time:{fontSize:10,color:"#8F887C",marginTop:7},empty:{paddingVertical:40,alignItems:"center",gap:8},emptyTitle:{fontFamily:type.display,fontSize:21,fontWeight:"700",color:colors.ink}});
