import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Dimensions,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { supabase } from "../../services/supabaseClient";
import { useUserAppTheme } from "../../utils/gaymMarketConfig";

const { width } = Dimensions.get("window");

export default function HomeScreen() {
  const router = useRouter();
  const { theme, isRgbTheme, animatedRgbColor } = useUserAppTheme();
  const [session, setSession] = useState(null);
  const [gaymCoins, setGaymCoins] = useState(0);

  const [highlightGames, setHighlightGames] = useState([]);
  const [newGames, setNewGames] = useState([]);
  const [trendingGames, setTrendingGames] = useState([]);
  const [recommendedGames, setRecommendedGames] = useState([]);
  const [topGenreText, setTopGenreText] = useState("เกมยอดฮิต");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const genres = [
    { id: "mobile", name: "Mobile", icon: "phone-portrait", color: "#10b981" },
    { id: "action", name: "Action", icon: "flash", color: "#ef4444" },
    { id: "mmorpg", name: "MMORPG", icon: "earth", color: "#3b82f6" },
    { id: "shooter", name: "Shooter", icon: "locate", color: "#f59e0b" },
    { id: "racing", name: "Racing", icon: "car", color: "#8b5cf6" },
    {
      id: "strategy",
      name: "Strategy",
      icon: "extension-puzzle",
      color: "#ec4899",
    },
  ];

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  const loadData = async () => {
    setLoading(true);
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();
    setSession(currentSession);

    if (currentSession) {
      const { data: pData } = await supabase
        .from("profiles")
        .select("gaym_coins")
        .eq("id", currentSession.user.id)
        .maybeSingle();
      setGaymCoins(pData?.gaym_coins ?? 0);
    }

    await Promise.all([
      fetchStoreGames(),
      fetchNewGames(),
      currentSession
        ? generateRecommendations(currentSession.user.id)
        : fetchGamesByCategory("action", "แนะนำสำหรับคุณ"),
    ]);

    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const fetchStoreGames = async () => {
    try {
      const { data: dbGames } = await supabase
        .from("games")
        .select("*")
        .neq("tag", "GAYM_COIN")
        .order("id", { ascending: false });

      const response = await fetch(
        "https://www.freetogame.com/api/games?sort-by=popularity",
      );
      const apiData = await response.json();

      const mergedData = apiData.map((apiGame) => {
        const matched = dbGames?.find(
          (g) =>
            String(g.id) === String(apiGame.id) || g.title === apiGame.title,
        );
        return matched ? { ...apiGame, ...matched } : apiGame;
      });

      const customGames = (dbGames || []).filter(
        (g) => !apiData.some((a) => String(a.id) === String(g.id)),
      );

      const allStoreGames = [...customGames, ...mergedData];
      setHighlightGames(allStoreGames.slice(0, 3));
      setTrendingGames(allStoreGames.slice(3, 13));
    } catch (error) {
      console.error("Error fetching store games:", error);
    }
  };

  const fetchNewGames = async () => {
    try {
      const { data: dbGames } = await supabase
        .from("games")
        .select("*")
        .neq("tag", "GAYM_COIN")
        .order("id", { ascending: false });

      const response = await fetch(
        "https://www.freetogame.com/api/games?sort-by=release-date",
      );
      const data = await response.json();

      const mergedNew = data.slice(0, 10).map((apiGame) => {
        const matched = dbGames?.find(
          (g) =>
            String(g.id) === String(apiGame.id) || g.title === apiGame.title,
        );
        return matched ? { ...apiGame, ...matched } : apiGame;
      });

      const customGames = (dbGames || []).filter(
        (g) => !data.some((a) => String(a.id) === String(g.id)),
      );

      setNewGames([...customGames, ...mergedNew].slice(0, 10));
    } catch (error) {
      console.error("Error fetching new games:", error);
    }
  };

  const generateRecommendations = async (userId) => {
    try {
      const { data: library } = await supabase
        .from("user_library")
        .select("games(tag)")
        .eq("user_id", userId);
      const { data: likes } = await supabase
        .from("user_likes")
        .select("games(tag)")
        .eq("user_id", userId);

      const genreCounts = {};
      const countGenres = (items) => {
        items?.forEach((item) => {
          const tag = item.games?.tag;
          if (tag) genreCounts[tag] = (genreCounts[tag] || 0) + 1;
        });
      };

      countGenres(library);
      countGenres(likes);

      const sortedGenres = Object.keys(genreCounts).sort(
        (a, b) => genreCounts[b] - genreCounts[a],
      );

      let targetGenre = "action";
      let headerText = "แนะนำสำหรับคุณ";

      if (sortedGenres.length > 0) {
        targetGenre = sortedGenres[0].toLowerCase();
        headerText = `เพราะคุณชอบแนว ${sortedGenres[0]}`;
      }

      await fetchGamesByCategory(targetGenre, headerText);
    } catch (error) {
      await fetchGamesByCategory("shooter", "เกมแนะนำวันนี้");
    }
  };

  const fetchGamesByCategory = async (category, headerTitle) => {
    try {
      const { data: dbGames } = await supabase.from("games").select("*");
      const response = await fetch(
        `https://www.freetogame.com/api/games?category=${category}&sort-by=relevance`,
      );
      const data = await response.json();
      if (data.status !== 0) {
        const mergedRec = data.slice(0, 10).map((apiGame) => {
          const matched = dbGames?.find(
            (g) =>
              String(g.id) === String(apiGame.id) || g.title === apiGame.title,
          );
          return matched ? { ...apiGame, ...matched } : apiGame;
        });
        setRecommendedGames(mergedRec);
        setTopGenreText(headerTitle);
      }
    } catch (error) {
      console.error("Error fetching recommended:", error);
    }
  };

  const renderHighlightCard = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.highlightCard,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
      onPress={() => router.push(`/game/${item.id}`)}
    >
      <Image
        source={{ uri: item.thumbnail || item.image_url }}
        style={styles.highlightImage}
      />
      <View style={styles.highlightOverlay}>
        <View
          style={[styles.highlightTagBox, { backgroundColor: theme.accent }]}
        >
          <Text style={styles.highlightTagText}>HIGHLIGHT</Text>
        </View>
        <View style={styles.titleVerifiedRow}>
          <Text style={styles.highlightTitle} numberOfLines={1}>
            {item.title}
          </Text>
          {item.is_reviewed && (
            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
          )}
        </View>
        <Text style={styles.highlightGenre}>{item.genre || item.tag}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderGameCard = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.gameCard,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
      onPress={() => router.push(`/game/${item.id}`)}
    >
      <Image
        source={{ uri: item.thumbnail || item.image_url }}
        style={styles.gameImage}
      />
      <View style={styles.gameInfo}>
        <View style={styles.titleVerifiedRow}>
          <Text
            style={[styles.gameTitle, { color: theme.text }]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          {item.is_reviewed && (
            <Ionicons name="checkmark-circle" size={15} color="#10b981" />
          )}
        </View>
        <Text style={[styles.gameGenre, { color: theme.subText }]}>
          {item.genre || item.tag}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* ส่วน Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: theme.subText }]}>
            ยินดีต้อนรับ, {theme.emoji}
          </Text>
          <Text style={[styles.appName, { color: theme.text }]}>
            GAYM Store
          </Text>
        </View>

        <View style={styles.headerRight}>
          {/* ✅ ปุ่มเข้า GAYM Market ที่หน้าแรก */}
          <TouchableOpacity
            onPress={() => router.push("/gaym-market")}
            style={[
              styles.iconBtn,
              { backgroundColor: theme.card, borderColor: "#facc15" },
            ]}
          >
            <Ionicons name="sparkles" size={20} color="#facc15" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/cart")}
            style={[
              styles.iconBtn,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Ionicons name="cart" size={20} color={theme.text} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/search")}
            style={[
              styles.iconBtn,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Ionicons name="search" size={20} color={theme.text} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/(tabs)/profile")}
            style={[
              styles.iconBtn,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Ionicons name="person" size={20} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#fff"
            />
          }
        >
          {/* ✅ แบนเนอร์ GAYM MARKET บนหน้าแรกของแอป */}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => router.push("/gaym-market")}
          >
            <Animated.View
              style={[
                styles.marketBanner,
                {
                  backgroundColor: theme.card,
                  borderColor: isRgbTheme ? animatedRgbColor : "#facc15",
                },
              ]}
            >
              <View style={styles.marketIconCircle}>
                <Ionicons name="color-wand" size={26} color="#facc15" />
              </View>
              <View style={{ flex: 1, marginHorizontal: 12 }}>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <Text
                    style={[styles.marketBannerTitle, { color: theme.text }]}
                  >
                    GAYM Market
                  </Text>
                  <View style={styles.coinBadgeMini}>
                    <Ionicons name="logo-bitcoin" size={12} color="#facc15" />
                    <Text style={styles.coinBadgeMiniText}>
                      {gaymCoins} Coin
                    </Text>
                  </View>
                </View>
                <Text
                  style={[styles.marketBannerSub, { color: theme.subText }]}
                >
                  ช้อปกรอบรูป Animation (RGB/Flash/Rainbow/Shark) & ธีมพิเศษ!
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color="#facc15" />
            </Animated.View>
          </TouchableOpacity>

          {/* Section: เกมแนวต่างๆ */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.genresContainer}
          >
            {genres.map((g) => (
              <TouchableOpacity
                key={g.id}
                style={[
                  styles.genrePill,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    borderLeftColor: g.color,
                    borderLeftWidth: 3,
                  },
                ]}
                onPress={() =>
                  router.push({
                    pathname: "/see-all",
                    params: { category: g.id },
                  })
                }
              >
                <Ionicons
                  name={g.icon}
                  size={16}
                  color={g.color}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.genrePillText, { color: theme.text }]}>
                  {g.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Section: ไฮไลต์ */}
          <FlatList
            horizontal
            data={highlightGames}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderHighlightCard}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.flatListContent}
            pagingEnabled
            snapToInterval={width - 25}
            decelerationRate="fast"
          />

          {/* Section: เกมใหม่ */}
          <View style={[styles.sectionHeader, { marginTop: 20 }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              มาใหม่ไฟแรง (New Releases)
            </Text>
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/see-all",
                  params: { sort: "release-date" },
                })
              }
            >
              <Text style={[styles.seeAllText, { color: theme.accent }]}>
                ดูทั้งหมด
              </Text>
            </TouchableOpacity>
          </View>
          <FlatList
            horizontal
            data={newGames}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderGameCard}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.flatListContent}
          />

          {/* Section: แนะนำสำหรับคุณ */}
          <View style={[styles.sectionHeader, { marginTop: 20 }]}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                {topGenreText}
              </Text>
              <Ionicons name="sparkles" size={20} color="#f59e0b" />
            </View>
          </View>
          {recommendedGames.length > 0 ? (
            <FlatList
              horizontal
              data={recommendedGames}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderGameCard}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.flatListContent}
            />
          ) : (
            <Text style={[styles.emptyText, { color: theme.subText }]}>
              เล่นเกมเพิ่มเพื่อให้เราแนะนำได้แม่นยำขึ้น!
            </Text>
          )}

          {/* Section: กำลังฮิต */}
          <View style={[styles.sectionHeader, { marginTop: 20 }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              กำลังฮิต (Trending)
            </Text>
            <TouchableOpacity onPress={() => router.push("/see-all")}>
              <Text style={[styles.seeAllText, { color: theme.accent }]}>
                ดูทั้งหมด
              </Text>
            </TouchableOpacity>
          </View>
          <FlatList
            horizontal
            data={trendingGames}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderGameCard}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.flatListContent,
              { paddingBottom: 40 },
            ]}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 15,
  },
  greeting: { fontSize: 14, marginBottom: 2 },
  appName: { fontSize: 26, fontWeight: "bold" },
  headerRight: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },

  marketBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  marketIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(250, 204, 21, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  marketBannerTitle: { fontSize: 16, fontWeight: "bold" },
  marketBannerSub: { fontSize: 12, marginTop: 3 },
  coinBadgeMini: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(250, 204, 21, 0.18)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
  },
  coinBadgeMiniText: { color: "#facc15", fontSize: 11, fontWeight: "bold" },

  genresContainer: {
    paddingHorizontal: 20,
    marginBottom: 25,
    gap: 10,
    paddingRight: 30,
  },
  genrePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  genrePillText: { fontSize: 13, fontWeight: "bold" },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  sectionTitle: { fontSize: 19, fontWeight: "bold" },
  seeAllText: { fontSize: 14, fontWeight: "bold" },

  highlightCard: {
    width: width - 40,
    height: 200,
    marginRight: 15,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
  },
  highlightImage: { width: "100%", height: "100%" },
  highlightOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 15,
    paddingTop: 40,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  highlightTagBox: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginBottom: 5,
  },
  highlightTagText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  highlightTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    flexShrink: 1,
  },
  highlightGenre: { color: "#cbd5e1", fontSize: 13 },

  flatListContent: { paddingLeft: 20, paddingRight: 5 },
  gameCard: {
    width: 160,
    marginRight: 15,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
  },
  gameImage: { width: "100%", height: 100 },
  gameInfo: { padding: 12 },
  titleVerifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 4,
  },
  gameTitle: { fontSize: 14, fontWeight: "bold", flexShrink: 1 },
  gameGenre: { fontSize: 12 },
  emptyText: {
    fontSize: 14,
    fontStyle: "italic",
    paddingHorizontal: 20,
    marginBottom: 10,
  },
});
