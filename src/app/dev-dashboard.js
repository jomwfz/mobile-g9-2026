import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { supabase } from "../services/supabaseClient";

export default function DevDashboardScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isDev, setIsDev] = useState(false);

  // ข้อมูลสถิติรวมของ DEV
  const [stats, setStats] = useState({
    totalGames: 0,
    verifiedGames: 0,
    totalDownloads: 0,
    totalRevenue: 0,
    totalInCarts: 0,
    totalLikes: 0,
  });

  // ข้อมูลสถิติแยกรายเกม
  const [gameBreakdown, setGameBreakdown] = useState([]);

  useFocusEffect(
    useCallback(() => {
      loadDevDashboard();
    }, []),
  );

  const loadDevDashboard = async () => {
    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/(auth)/login");
        return;
      }

      // 1. ตรวจสอบสิทธิ์ยศ DEV
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_dev, username")
        .eq("id", session.user.id)
        .single();

      if (!profile?.is_dev) {
        setIsDev(false);
        setLoading(false);
        return;
      }
      setIsDev(true);

      // 2. ดึงเกมทั้งหมดที่ DEV คนนี้เป็นคนอัปโหลด
      const { data: myGames, error: gamesError } = await supabase
        .from("games")
        .select("*")
        .eq("developer_id", session.user.id)
        .order("id", { ascending: false });

      if (gamesError) throw gamesError;

      const uploadedList = myGames || [];
      if (uploadedList.length === 0) {
        setStats({
          totalGames: 0,
          verifiedGames: 0,
          totalDownloads: 0,
          totalRevenue: 0,
          totalInCarts: 0,
          totalLikes: 0,
        });
        setGameBreakdown([]);
        setLoading(false);
        return;
      }

      const gameIds = uploadedList.map((g) => g.id);

      // 3. ดึงยอดดาวน์โหลด/ยอดซื้อ (จาก user_library), ยอดในตะกร้า (user_cart) และยอดถูกใจ (user_likes)
      const [libraryRes, cartRes, likesRes] = await Promise.all([
        supabase.from("user_library").select("game_id").in("game_id", gameIds),
        supabase.from("user_cart").select("game_id").in("game_id", gameIds),
        supabase.from("user_likes").select("game_id").in("game_id", gameIds),
      ]);

      const libraryData = libraryRes.data || [];
      const cartData = cartRes.data || [];
      const likesData = likesRes.data || [];

      let sumDownloads = 0;
      let sumRevenue = 0;
      let sumCarts = 0;
      let sumLikes = 0;

      // 4. คำนวณรายได้และยอดดาวน์โหลดแยกรายเกม
      const detailedGames = uploadedList.map((game) => {
        const downloads = libraryData.filter(
          (l) => String(l.game_id) === String(game.id),
        ).length;
        const inCarts = cartData.filter(
          (c) => String(c.game_id) === String(game.id),
        ).length;
        const likes = likesData.filter(
          (lk) => String(lk.game_id) === String(game.id),
        ).length;

        const discount = game.discount_percent || 0;
        const netPrice = Math.round((game.price || 0) * (1 - discount / 100));
        const revenue = downloads * netPrice;

        sumDownloads += downloads;
        sumRevenue += revenue;
        sumCarts += inCarts;
        sumLikes += likes;

        return {
          ...game,
          downloads,
          inCarts,
          likes,
          netPrice,
          revenue,
        };
      });

      // เรียงลำดับจากเกมที่ทำรายได้สูงสุดลงมา
      detailedGames.sort(
        (a, b) => b.revenue - a.revenue || b.downloads - a.downloads,
      );

      setStats({
        totalGames: uploadedList.length,
        verifiedGames: uploadedList.filter((g) => g.is_reviewed).length,
        totalDownloads: sumDownloads,
        totalRevenue: sumRevenue,
        totalInCarts: sumCarts,
        totalLikes: sumLikes,
      });

      setGameBreakdown(detailedGames);
    } catch (error) {
      console.error("Error loading DEV dashboard:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDevDashboard();
    setRefreshing(false);
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  // กรณีไม่ได้มียศ DEV
  if (!isDev) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>DEV Dashboard</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Ionicons name="lock-closed" size={60} color="#ef4444" />
          <Text
            style={{
              color: "#fff",
              fontSize: 20,
              fontWeight: "bold",
              marginTop: 15,
            }}
          >
            สำหรับสมาชิกยศ DEV เท่านั้น
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name="analytics" size={22} color="#10b981" />
          <Text style={styles.headerTitle}>DEV DASHBOARD</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.backBtn}>
          <Ionicons name="refresh" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#10b981"
          />
        }
      >
        {/* การ์ดแสดงรายได้รวมทั้งหมดจากการขายเกม */}
        <View style={styles.revenueHeroCard}>
          <View style={styles.revenueHeaderRow}>
            <View>
              <Text style={styles.revenueLabel}>
                รายได้จากการขายเกมทั้งหมด (Total Revenue)
              </Text>
              <Text style={styles.revenueAmount}>
                ฿{stats.totalRevenue.toLocaleString()}
              </Text>
            </View>
            <View style={styles.revenueIconBox}>
              <Ionicons name="cash-outline" size={32} color="#10b981" />
            </View>
          </View>
          <Text style={styles.revenueSub}>
            คำนวณจากยอดซื้อเกมของคุณเข้าคลังผู้เล่นทั้งหมด{" "}
            {stats.totalDownloads.toLocaleString()} ครั้ง
          </Text>
        </View>

        {/* ตารางสรุปข้อมูลภาพรวม 4 ช่อง */}
        <Text style={styles.sectionTitle}>ภาพรวมผลงานของคุณ (Overview)</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="cloud-download" size={26} color="#3b82f6" />
            <Text style={styles.statValue}>
              {stats.totalDownloads.toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>ยอดโหลด / ซื้อรวม</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="game-controller" size={26} color="#10b981" />
            <Text style={styles.statValue}>{stats.totalGames}</Text>
            <Text style={styles.statLabel}>เกมที่อัปโหลด</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="cart" size={26} color="#f59e0b" />
            <Text style={styles.statValue}>{stats.totalInCarts}</Text>
            <Text style={styles.statLabel}>อยู่ในตะกร้าผู้เล่น</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="checkmark-done-circle" size={26} color="#8b5cf6" />
            <Text style={styles.statValue}>
              {stats.verifiedGames}/{stats.totalGames}
            </Text>
            <Text style={styles.statLabel}>ผ่านการตรวจ (ติ๊กถูก)</Text>
          </View>
        </View>

        {/* รายละเอียดสถิติแยกรายเกม */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>
            สถิติแยกรายเกม (Game Performance)
          </Text>
          <TouchableOpacity
            style={styles.uploadNewBtn}
            onPress={() => router.push("/upload-game")}
          >
            <Ionicons name="add-circle" size={16} color="#fff" />
            <Text style={styles.uploadNewBtnText}>อัปโหลดเกมเพิ่ม</Text>
          </TouchableOpacity>
        </View>

        {gameBreakdown.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="bar-chart-outline" size={54} color="#6b7280" />
            <Text style={styles.emptyText}>คุณยังไม่มีเกมที่อัปโหลดในระบบ</Text>
            <TouchableOpacity
              style={styles.goStudioBtn}
              onPress={() => router.push("/upload-game")}
            >
              <Text style={{ color: "#fff", fontWeight: "bold" }}>
                ไปที่ Studio อัปโหลดเกมแรกของคุณ
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          gameBreakdown.map((item) => {
            const sharePercent =
              stats.totalRevenue > 0
                ? Math.round((item.revenue / stats.totalRevenue) * 100)
                : 0;

            return (
              <TouchableOpacity
                key={item.id}
                style={styles.gameStatCard}
                activeOpacity={0.85}
                onPress={() => router.push(`/game/${item.id}`)}
              >
                <View style={styles.gameTopRow}>
                  <Image
                    source={{ uri: item.image_url || item.thumbnail }}
                    style={styles.gameThumb}
                  />
                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Text style={styles.gameTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      {item.is_reviewed && (
                        <Ionicons
                          name="checkmark-circle"
                          size={16}
                          color="#10b981"
                        />
                      )}
                    </View>
                    <Text style={styles.gameMeta}>
                      ราคาขายสุทธิ:{" "}
                      {item.netPrice > 0 ? `฿${item.netPrice}` : "เล่นฟรี"} •
                      หมวด: {item.tag || "Action"}
                    </Text>
                    <Text style={styles.gameMeta}>
                      รูปแบบไฟล์:{" "}
                      {item.download_type === "apk" ? "ไฟล์ .APK" : "ลิงก์ URL"}
                    </Text>
                  </View>
                </View>

                {/* ตัวเลขสถิติของเกมนี้ */}
                <View style={styles.metricsRow}>
                  <View style={styles.metricBox}>
                    <Text style={styles.metricLabel}>ยอดดาวน์โหลด/ซื้อ</Text>
                    <Text style={[styles.metricVal, { color: "#3b82f6" }]}>
                      {item.downloads} ครั้ง
                    </Text>
                  </View>

                  <View style={styles.metricDivider} />

                  <View style={styles.metricBox}>
                    <Text style={styles.metricLabel}>ในตะกร้า</Text>
                    <Text style={[styles.metricVal, { color: "#f59e0b" }]}>
                      {item.inCarts} คน
                    </Text>
                  </View>

                  <View style={styles.metricDivider} />

                  <View style={styles.metricBox}>
                    <Text style={styles.metricLabel}>รายได้จากเกมนี้</Text>
                    <Text style={[styles.metricVal, { color: "#10b981" }]}>
                      ฿{item.revenue.toLocaleString()}
                    </Text>
                  </View>
                </View>

                {/* แถบสัดส่วนรายได้ */}
                {stats.totalRevenue > 0 && (
                  <View style={{ marginTop: 12 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginBottom: 4,
                      }}
                    >
                      <Text style={{ color: "#9ca3af", fontSize: 11 }}>
                        สัดส่วนรายได้เทียบกับทุกเกมของคุณ
                      </Text>
                      <Text
                        style={{
                          color: "#10b981",
                          fontSize: 11,
                          fontWeight: "bold",
                        }}
                      >
                        {sharePercent}%
                      </Text>
                    </View>
                    <View style={styles.progressBg}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${sharePercent}%` },
                        ]}
                      />
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a1a" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0a0a1a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a2e",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1a1a2e",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 0.8,
  },
  content: { padding: 20, paddingBottom: 50 },

  revenueHeroCard: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.4)",
    marginBottom: 24,
  },
  revenueHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  revenueLabel: { color: "#a7f3d0", fontSize: 13, fontWeight: "600" },
  revenueAmount: {
    color: "#10b981",
    fontSize: 36,
    fontWeight: "bold",
    marginTop: 6,
  },
  revenueIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  revenueSub: { color: "#9ca3af", fontSize: 12, marginTop: 10 },

  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
  },
  uploadNewBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3b82f6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 5,
    marginBottom: 12,
  },
  uploadNewBtnText: { color: "#fff", fontSize: 12, fontWeight: "bold" },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: "48%",
    backgroundColor: "#1a1a2e",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2a2a4a",
  },
  statValue: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    marginVertical: 6,
  },
  statLabel: { color: "#9ca3af", fontSize: 12 },

  gameStatCard: {
    backgroundColor: "#1a1a2e",
    borderRadius: 16,
    padding: 15,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#2a2a4a",
  },
  gameTopRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  gameThumb: {
    width: 70,
    height: 70,
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: "#0a0a1a",
  },
  gameTitle: { color: "#fff", fontSize: 16, fontWeight: "bold", flexShrink: 1 },
  gameMeta: { color: "#9ca3af", fontSize: 12, marginTop: 3 },

  metricsRow: {
    flexDirection: "row",
    backgroundColor: "#0a0a1a",
    borderRadius: 12,
    paddingVertical: 12,
    justifyContent: "space-evenly",
    borderWidth: 1,
    borderColor: "#2a2a4a",
  },
  metricBox: { alignItems: "center", flex: 1 },
  metricLabel: { color: "#9ca3af", fontSize: 11, marginBottom: 4 },
  metricVal: { fontSize: 15, fontWeight: "bold" },
  metricDivider: { width: 1, backgroundColor: "#2a2a4a" },

  progressBg: {
    height: 6,
    backgroundColor: "#0a0a1a",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: "#10b981", borderRadius: 3 },

  emptyBox: {
    backgroundColor: "#1a1a2e",
    borderRadius: 16,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2a2a4a",
  },
  emptyText: {
    color: "#9ca3af",
    fontSize: 14,
    marginTop: 10,
    marginBottom: 16,
  },
  goStudioBtn: {
    backgroundColor: "#10b981",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
});
