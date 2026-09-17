import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { colors } from "@/src/theme/tokens";

const icon = (name: keyof typeof Feather.glyphMap) => ({ color, size }: { color: string; size: number }) => <Feather name={name} color={color} size={size} />;
export default function TabLayout() { return <Tabs screenOptions={{ headerStyle:{backgroundColor:colors.paper}, headerShadowVisible:false, headerTitleStyle:{color:colors.ink,fontSize:15,fontWeight:"700"}, tabBarActiveTintColor:colors.goldDark, tabBarInactiveTintColor:"#89857C", tabBarStyle:{backgroundColor:colors.ink,borderTopColor:"rgba(219,190,109,.25)",height:62,paddingTop:7}, tabBarLabelStyle:{fontSize:10,fontWeight:"700"} }}><Tabs.Screen name="cases" options={{ title:"Casos", tabBarIcon:icon("book-open") }} /><Tabs.Screen name="messages" options={{ title:"Mensagens", tabBarIcon:icon("message-circle") }} /><Tabs.Screen name="alerts" options={{ title:"Alertas", tabBarIcon:icon("bell") }} /><Tabs.Screen name="profile" options={{ title:"Perfil", tabBarIcon:icon("user") }} /></Tabs>; }
