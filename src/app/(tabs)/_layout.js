import React, { useEffect } from "react";
import { Alert } from "react-native";
import { Tabs, useRouter, useSegments } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../services/supabaseClient";

export default function TabLayout() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    checkIfUserBanned();
  }, [segments]);

  const checkIfUserBanned = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("banned_until")
      .eq("id", session.user.id)
      .maybeSingle();

    // ถ้าพบว่าถูกแบนและยังไม่หมดเวลา ให้บังคับ Log out ทันที
    if (profile?.banned_until && new Date(profile.banned_until) > new Date()) {
      await supabase.auth.signOut();
      Alert.alert(
        "บัญชีถูกระงับการใช้งาน",
        `คุณถูกแอดมินระงับการใช้งานชั่วคราว\nสามารถเข้าใช้งานได้อีกครั้งเมื่อ:\n${new Date(
          profile.banned_until,
        ).toLocaleString("th-TH")}`,
      );
      router.replace("/(auth)/login");
    }
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: "#0a0a1a", borderTopColor: "#1a1a2e" },
        tabBarActiveTintColor: "#3b82f6",
        tabBarInactiveTintColor: "#6b7280",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Store",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="storefront-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: "Library",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="game-controller-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: "Discover",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="flame-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ai-advisor"
        options={{
          title: "AI Advisor",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sparkles-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: "Community",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="globe-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
      {/* ซ่อนเมนู search ออกจากแถบด้านล่าง */}
      <Tabs.Screen
        name="search"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
