import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { supabase } from "../../services/supabaseClient";

export default function LibraryScreen() {
  const router = useRouter();
  const [myGames, setMyGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => setSession(session));
  }, []);

  // ใช้ useFocusEffect เพื่อให้โหลดข้อมูลใหม่ทุกครั้งที่เปิดหน้านี้ (เผื่อเพิ่งซื้อเกมเสร็จ)
  useFocusEffect(
    useCallback(() => {
      if (session) fetchMyLibrary();
    }, [session]),
  );

  const fetchMyLibrary = async () => {
    try {
      setLoading(true);
      // ดึงข้อมูลเกมในคลัง เชื่อมกับตาราง games ที่เรา Upsert ข้อมูลไว้
      const { data, error } = await supabase
        .from("user_library")
        .select(`id, game_id, games ( id, title, image_url, tag )`)
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMyGames(data);
    } catch (error) {
      console.error("Error fetching library:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderGameItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => router.push(`/game/${item.game_id}`)}
      style={styles.card}
    >
      <Image source={{ uri: item.games.image_url }} style={styles.image} />
      <View style={styles.info}>
        <Text numberOfLines={1} style={styles.title}>
          {item.games.title}
        </Text>
        <Text style={styles.tag}>{item.games.tag}</Text>
      </View>
      <TouchableOpacity style={styles.playBtn}>
        <Ionicons name="play" size={20} color="#fff" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Library</Text>
        <TouchableOpacity onPress={() => router.push("/settings")}>
          <Ionicons name="settings-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#3b82f6" size="large" />
        </View>
      ) : myGames.length === 0 ? (
        <View style={styles.center}>
          <Ionicons
            name="sad-outline"
            size={60}
            color="#3b82f6"
            style={{ marginBottom: 10 }}
          />
          <Text style={styles.emptyText}>คุณยังไม่มีเกมในคลังเลย</Text>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)")}
            style={{ marginTop: 15 }}
          >
            <Text style={{ color: "#3b82f6", fontWeight: "bold" }}>
              ไปเลือกซื้อเกมกันเถอะ!
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={myGames}
          keyExtractor={(item) => item.id}
          renderItem={renderGameItem}
          contentContainerStyle={{ padding: 20 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a1a" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: "#9ca3af", fontSize: 16 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a2e",
  },
  headerTitle: { color: "#fff", fontSize: 24, fontWeight: "bold" },
  card: {
    flexDirection: "row",
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    alignItems: "center",
  },
  image: { width: 80, height: 60, borderRadius: 8, marginRight: 15 },
  info: { flex: 1 },
  title: { color: "#fff", fontWeight: "bold", fontSize: 16, marginBottom: 5 },
  tag: { color: "#6b7280", fontSize: 12 },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
  },
});
