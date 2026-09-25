import React, { useEffect, useState } from "react";
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
import { useRouter } from "expo-router";
import { supabase } from "../services/supabaseClient";

export default function HistoryScreen() {
  const router = useRouter();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from("user_library")
        .select("id, created_at, games(title, price, image_url)")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setHistory(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Purchase History</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#3b82f6" size="large" />
        </View>
      ) : history.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ color: "#6b7280" }}>ยังไม่มีประวัติการซื้อ</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Image
                source={{ uri: item.games.image_url }}
                style={styles.image}
              />
              <View style={styles.info}>
                <Text style={styles.title}>{item.games.title}</Text>
                <Text style={styles.price}>ราคา: ฿{item.games.price}</Text>
                <Text style={styles.date}>
                  วันที่ซื้อ: {new Date(item.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a1a" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1a1a2e",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  card: {
    flexDirection: "row",
    backgroundColor: "#1a1a2e",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  image: { width: 80, height: 60, borderRadius: 8, marginRight: 15 },
  info: { flex: 1, justifyContent: "center" },
  title: { color: "#fff", fontWeight: "bold", fontSize: 16, marginBottom: 5 },
  price: { color: "#10b981", fontSize: 14 },
  date: { color: "#6b7280", fontSize: 12, marginTop: 5 },
});
