import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Swiper from "react-native-deck-swiper";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../services/supabaseClient";

export default function DiscoverScreen() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const swiperRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      fetchGames();
    });
  }, []);

  const fetchGames = async () => {
    try {
      setLoading(true);
      // ดึงข้อมูลจาก API แล้วนำมาสุ่ม (Shuffle) เพื่อให้เจอเกมไม่ซ้ำกัน
      const response = await fetch(
        "https://www.freetogame.com/api/games?sort-by=relevance",
      );
      const data = await response.json();

      // สุ่มลำดับเกม และดึงมาแสดงรอบละ 30 เกม
      const shuffled = data.sort(() => 0.5 - Math.random()).slice(0, 30);

      // จัดรูปแบบข้อมูลเตรียมไว้
      const formattedGames = shuffled.map((game) => ({
        id: game.id,
        title: game.title,
        image_url: game.thumbnail,
        tag: game.genre,
        description: game.short_description,
        platform: game.platform,
        price: game.id % 4 === 0 ? 0 : ((game.id % 5) + 1) * 150,
      }));

      setGames(formattedGames);
    } catch (error) {
      console.error("Error fetching games:", error);
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชันเมื่อผู้ใช้ "ปัดขวา (ถูกใจ)"
  const handleSwipeRight = async (cardIndex) => {
    if (!session) return;

    const likedGame = games[cardIndex];
    try {
      // 1. บันทึกเกมลงตารางหลักก่อน (เผื่อเกมนี้ยังไม่เคยถูกใครโหลดเข้าแอปเราเลย)
      await supabase.from("games").upsert({
        id: likedGame.id,
        title: likedGame.title,
        description: likedGame.description,
        price: likedGame.price,
        image_url: likedGame.image_url,
        tag: likedGame.tag,
        platform: likedGame.platform === "Web Browser" ? "Web" : "PC",
      });

      // 2. บันทึกลงตารางสิ่งที่ฉันถูกใจ (user_likes)
      const { error } = await supabase.from("user_likes").insert({
        user_id: session.user.id,
        game_id: likedGame.id,
      });

      if (error && error.code !== "23505") throw error; // ข้าม error ถ้ารหัสคือซ้ำ (23505)
    } catch (error) {
      console.error("Like error:", error.message);
    }
  };

  const renderCard = (card) => {
    if (!card) return <View style={styles.card} />;
    return (
      <View style={styles.card}>
        <Image source={{ uri: card.image_url }} style={styles.cardImage} />
        <View style={styles.cardInfo}>
          <View style={styles.tagContainer}>
            <Text style={styles.tagText}>{card.tag}</Text>
          </View>
          <Text style={styles.title} numberOfLines={2}>
            {card.title}
          </Text>
          <Text style={styles.platform}>{card.platform}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator color="#0000ff" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discover</Text>
        <Text style={styles.headerSubtitle}>ชอบปัดขวา ไม่ชอบปัดซ้าย!</Text>
      </View>

      <View style={styles.swiperContainer}>
        {games.length > 0 ? (
          <Swiper
            ref={swiperRef}
            cards={games}
            renderCard={renderCard}
            onSwipedRight={handleSwipeRight}
            onSwipedAll={() => fetchGames()} // ถ้าปัดหมดให้โหลดล็อตใหม่
            cardIndex={0}
            backgroundColor="transparent"
            stackSize={3}
            cardVerticalMargin={20}
            cardHorizontalMargin={20}
            animateOverlayLabelsOpacity
            overlayLabels={{
              left: {
                title: "NOPE",
                style: {
                  label: {
                    backgroundColor: "#ef4444",
                    color: "#fff",
                    fontSize: 24,
                    borderWidth: 0,
                    borderRadius: 10,
                    overflow: "hidden",
                  },
                  wrapper: {
                    flexDirection: "column",
                    alignItems: "flex-end",
                    justifyContent: "flex-start",
                    marginTop: 30,
                    marginLeft: -30,
                  },
                },
              },
              right: {
                title: "LIKE",
                style: {
                  label: {
                    backgroundColor: "#10b981",
                    color: "#fff",
                    fontSize: 24,
                    borderWidth: 0,
                    borderRadius: 10,
                    overflow: "hidden",
                  },
                  wrapper: {
                    flexDirection: "column",
                    alignItems: "flex-start",
                    justifyContent: "flex-start",
                    marginTop: 30,
                    marginLeft: 30,
                  },
                },
              },
            }}
          />
        ) : (
          <View style={styles.center}>
            <Text style={{ color: "#6b7280" }}>ไม่พบข้อมูลเกม</Text>
          </View>
        )}
      </View>

      {/* ปุ่มกดสำหรับคนที่ไม่ถนัดปัดนิ้ว */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.btn, styles.nopeBtn]}
          onPress={() => swiperRef.current.swipeLeft()}
        >
          <Ionicons name="close" size={32} color="#ef4444" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.likeBtn]}
          onPress={() => swiperRef.current.swipeRight()}
        >
          <Ionicons name="heart" size={30} color="#10b981" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a1a" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { padding: 20, alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 24, fontWeight: "bold" },
  headerSubtitle: {
    color: "#3b82f6",
    fontSize: 14,
    marginTop: 5,
    fontWeight: "bold",
  },
  swiperContainer: { flex: 1, position: "relative" },

  // สไตล์การ์ด
  card: {
    flex: 0.85,
    borderRadius: 20,
    backgroundColor: "#1a1a2e",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
    borderWidth: 1,
    borderColor: "#2a2a4a",
  },
  cardImage: {
    width: "100%",
    height: "75%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  cardInfo: { padding: 20, justifyContent: "center" },
  tagContainer: {
    backgroundColor: "rgba(59, 130, 246, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  tagText: { color: "#3b82f6", fontSize: 12, fontWeight: "bold" },
  title: { fontSize: 22, color: "#fff", fontWeight: "bold", marginBottom: 5 },
  platform: { fontSize: 14, color: "#9ca3af" },

  // สไตล์ปุ่มด้านล่าง
  actionButtons: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 30,
    gap: 30,
  },
  btn: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a1a2e",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  nopeBtn: { borderWidth: 1, borderColor: "rgba(239, 68, 68, 0.3)" },
  likeBtn: { borderWidth: 1, borderColor: "rgba(16, 185, 129, 0.3)" },
});
