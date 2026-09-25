import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";

export default function SeeAllScreen() {
  const router = useRouter();
  const { category: initialCategory } = useLocalSearchParams();

  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  const [platform, setPlatform] = useState("all");
  const [category, setCategory] = useState(initialCategory || "");
  const [sortBy, setSortBy] = useState("popularity");

  // เพิ่ม Mobile เข้าไปในตัวเลือก
  const platforms = [
    { id: "all", name: "All Platforms" },
    { id: "windows", name: "PC (Windows)" },
    { id: "browser", name: "Web Browser" },
    { id: "mobile", name: "Mobile" }, // หมวดหมู่ใหม่
  ];

  const sortOptions = [
    { id: "popularity", name: "ยอดนิยม" },
    { id: "release-date", name: "มาใหม่" },
    { id: "alphabetical", name: "A-Z" },
  ];
  const categories = [
    "mmorpg",
    "shooter",
    "strategy",
    "moba",
    "racing",
    "sports",
    "survival",
    "open-world",
    "zombie",
    "anime",
  ];

  useEffect(() => {
    fetchFilteredGames();
  }, [platform, category, sortBy]);

  const fetchFilteredGames = async () => {
    try {
      setLoading(true);

      // ดักจับเคส Mobile เพราะ API ไม่มีข้อมูลเกมมือถือ
      if (platform === "mobile") {
        setGames([]);
        setLoading(false);
        return;
      }

      let queryParams = [];
      if (platform !== "all") queryParams.push(`platform=${platform}`);
      if (
        category &&
        category !== "กำลังฮิต (Trending)" &&
        category !== "เกมมาใหม่ (New Releases)" &&
        category !== "ลดราคาพิเศษ (Deals)"
      ) {
        queryParams.push(`category=${category.toLowerCase()}`);
      }
      if (sortBy) queryParams.push(`sort-by=${sortBy}`);

      const queryString =
        queryParams.length > 0 ? `?${queryParams.join("&")}` : "";
      const apiUrl = `https://www.freetogame.com/api/games${queryString}`;

      const response = await fetch(apiUrl);
      const data = await response.json();

      if (data.status === 0) {
        setGames([]);
        return;
      }

      const formattedGames = data.map((game) => ({
        id: game.id,
        title: game.title,
        image_url: game.thumbnail,
        tag: game.genre,
        platform: game.platform,
        price: game.id % 4 === 0 ? 0 : ((game.id % 5) + 1) * 150,
      }));

      setGames(formattedGames.slice(0, 100));
    } catch (error) {
      console.error("API Error:", error);
      setGames([]);
    } finally {
      setLoading(false);
    }
  };

  const renderGridCard = ({ item }) => (
    <TouchableOpacity
      onPress={() => router.push(`/game/${item.id}`)}
      style={styles.gridCard}
    >
      <Image source={{ uri: item.image_url }} style={styles.cardImage} />
      <View style={styles.cardInfo}>
        <Text numberOfLines={1} style={styles.cardTitle}>
          {item.title}
        </Text>
        <Text style={styles.cardTag}>
          {item.tag} • {item.platform === "Web Browser" ? "Web" : "PC"}
        </Text>
        <Text style={styles.cardPrice}>
          {item.price === 0 ? "Free" : `฿${item.price}`}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Advanced Browse</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.filterSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
        >
          {platforms.map((p) => (
            <TouchableOpacity
              key={p.id}
              onPress={() => setPlatform(p.id)}
              style={[styles.chip, platform === p.id && styles.chipActive]}
            >
              <Text
                style={[
                  styles.chipText,
                  platform === p.id && styles.chipTextActive,
                ]}
              >
                {p.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
        >
          <TouchableOpacity
            onPress={() => setCategory("")}
            style={[styles.chip, category === "" && styles.chipActive]}
          >
            <Text
              style={[
                styles.chipText,
                category === "" && styles.chipTextActive,
              ]}
            >
              All Genres
            </Text>
          </TouchableOpacity>
          {categories.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => setCategory(c)}
              style={[styles.chip, category === c && styles.chipActive]}
            >
              <Text
                style={[
                  styles.chipText,
                  category === c && styles.chipTextActive,
                ]}
              >
                {c.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.sortContainer}>
          <Ionicons name="filter" size={16} color="#9ca3af" />
          <Text style={styles.sortLabel}>เรียงตาม:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {sortOptions.map((s) => (
              <TouchableOpacity
                key={s.id}
                onPress={() => setSortBy(s.id)}
                style={[
                  styles.sortChip,
                  sortBy === s.id && styles.sortChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.sortChipText,
                    sortBy === s.id && styles.sortChipTextActive,
                  ]}
                >
                  {s.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#3b82f6" size="large" />
        </View>
      ) : games.length === 0 ? (
        <View style={styles.center}>
          <Ionicons
            name={
              platform === "mobile"
                ? "phone-portrait-outline"
                : "search-outline"
            }
            size={50}
            color="#6b7280"
          />
          {/* ปรับเปลี่ยนข้อความให้สอดคล้องกับหมวด Mobile */}
          <Text style={{ color: "#6b7280", marginTop: 10, fontSize: 16 }}>
            {platform === "mobile"
              ? "กำลังอัปเดตฐานข้อมูลเกมมือถือเร็วๆ นี้!"
              : "ไม่พบเกมที่ตรงกับเงื่อนไขนี้"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={games}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderGridCard}
          numColumns={2}
          contentContainerStyle={{ padding: 10, paddingBottom: 30 }}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={() => (
            <TouchableOpacity
              onPress={() => Linking.openURL("https://www.freetogame.com")}
              style={styles.creditContainer}
            >
              <Text style={styles.creditText}>
                Data provided by FreeToGame.com
              </Text>
            </TouchableOpacity>
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
    paddingBottom: 10,
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
  filterSection: {
    backgroundColor: "#0f0f1a",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a2e",
  },
  filterRow: { paddingHorizontal: 15, marginBottom: 10 },
  chip: {
    backgroundColor: "#1a1a2e",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  chipActive: { backgroundColor: "#3b82f6" },
  chipText: { color: "#9ca3af", fontWeight: "bold", fontSize: 13 },
  chipTextActive: { color: "#ffffff" },
  sortContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 5,
  },
  sortLabel: { color: "#9ca3af", fontSize: 13, marginLeft: 5, marginRight: 10 },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 15,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#2a2a4a",
  },
  sortChipActive: {
    borderColor: "#10b981",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
  },
  sortChipText: { color: "#6b7280", fontSize: 12 },
  sortChipTextActive: { color: "#10b981", fontWeight: "bold" },
  gridCard: {
    flex: 1,
    margin: 8,
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    overflow: "hidden",
  },
  cardImage: { width: "100%", height: 120 },
  cardInfo: { padding: 12 },
  cardTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 5,
  },
  cardTag: { color: "#6b7280", fontSize: 11, marginBottom: 5 },
  cardPrice: { color: "#10b981", fontSize: 14, fontWeight: "bold" },
  creditContainer: { marginTop: 20, marginBottom: 10, alignItems: "center" },
  creditText: {
    color: "#6b7280",
    fontSize: 12,
    textDecorationLine: "underline",
  },
});
