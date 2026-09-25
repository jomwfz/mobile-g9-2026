import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

// หมวดหมู่สำหรับเป็นปุ่ม Filter เลื่อนได้
const CATEGORIES = [
  "All",
  "Shooter",
  "MMORPG",
  "Strategy",
  "Sports",
  "Racing",
  "MOBA",
  "Action",
];

export default function SearchScreen() {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const [allGames, setAllGames] = useState([]); // เก็บเกมที่โหลดจาก API ตามหมวด
  const [filteredGames, setFilteredGames] = useState([]); // เกมที่ผ่านการกรองชื่อแล้ว
  const [loading, setLoading] = useState(false);

  // ดึงข้อมูลเกมใหม่ทุกครั้งที่ผู้ใช้กดเปลี่ยนหมวดหมู่
  useEffect(() => {
    fetchGamesFromAPI(selectedCategory);
  }, [selectedCategory]);

  // ระบบกรองแบบ Real-time (ทำงานทันทีที่พิมพ์)
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredGames(allGames);
    } else {
      const lowerCaseQuery = searchQuery.toLowerCase();
      const filtered = allGames.filter((game) =>
        game.title.toLowerCase().includes(lowerCaseQuery),
      );
      setFilteredGames(filtered);
    }
  }, [searchQuery, allGames]);

  // ฟังก์ชันดึงข้อมูลจาก FreeToGame API
  const fetchGamesFromAPI = async (category) => {
    try {
      setLoading(true);

      let url = "https://www.freetogame.com/api/games";
      if (category !== "All") {
        url = `https://www.freetogame.com/api/games?category=${category.toLowerCase()}`;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch games");

      const data = await response.json();

      setAllGames(data);
      setFilteredGames(data);
    } catch (error) {
      console.error("Error fetching FreeToGame API:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderGameCard = ({ item }) => (
    <TouchableOpacity
      style={styles.gameCard}
      onPress={() => router.push(`/game/${item.id}`)}
      activeOpacity={0.8}
    >
      <Image source={{ uri: item.thumbnail }} style={styles.gameImage} />
      <View style={styles.gameInfo}>
        <Text style={styles.gameTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.gameCategory}>
          {item.genre} • {item.platform === "PC (Windows)" ? "PC" : "Web"}
        </Text>
        <View style={styles.priceTag}>
          <Text style={styles.gamePrice}>FREE</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* 1. ส่วนหัวและช่องพิมพ์ค้นหา */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#6b7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="ค้นหาชื่อเกมที่นี่..."
            placeholderTextColor="#6b7280"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus // แป้นพิมพ์เด้งทันทีที่เข้ามาหน้านี้
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 2. แถบปุ่ม Filter หมวดหมู่ (เลื่อนแนวนอนได้) */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterBtn,
                selectedCategory === item && styles.filterBtnActive,
              ]}
              onPress={() => {
                setSelectedCategory(item);
                setSearchQuery(""); // ล้างคำค้นหาเดิมทิ้งเมื่อเปลี่ยนหมวดใหม่
              }}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedCategory === item && styles.filterTextActive,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* 3. ส่วนแสดงผลลัพธ์เกม */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      ) : filteredGames.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="game-controller-outline" size={60} color="#1a1a2e" />
          <Text style={styles.emptyText}>ไม่พบเกมที่คุณค้นหา</Text>
        </View>
      ) : (
        <FlatList
          data={filteredGames}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderGameCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
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
    alignItems: "center",
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 15,
    backgroundColor: "#0a0a1a",
  },
  backBtn: { marginRight: 15 },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 45,
    borderWidth: 1,
    borderColor: "#2a2a4a",
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    paddingHorizontal: 10,
  },

  filterContainer: {
    paddingLeft: 15,
    paddingBottom: 15,
  },
  filterBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#1a1a2e",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#2a2a4a",
  },
  filterBtnActive: {
    backgroundColor: "#0000ff",
    borderColor: "#0000ff",
  },
  filterText: { color: "#9ca3af", fontWeight: "bold", fontSize: 14 },
  filterTextActive: { color: "#fff" },

  listContent: { paddingHorizontal: 15, paddingBottom: 20 },
  gameCard: {
    flexDirection: "row",
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    marginBottom: 15,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#2a2a4a",
  },
  gameImage: { width: 120, height: 110, resizeMode: "cover" },
  gameInfo: {
    flex: 1,
    padding: 15,
    justifyContent: "space-between",
  },
  gameTitle: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  gameCategory: { color: "#9ca3af", fontSize: 12, marginTop: 4 },
  priceTag: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
  },
  gamePrice: { color: "#10b981", fontSize: 13, fontWeight: "bold" },

  emptyText: { color: "#6b7280", fontSize: 16, marginTop: 15 },
});
