import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Animated,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { supabase } from "../../services/supabaseClient";
import { AvatarWithFrame, useUserAppTheme } from "../../utils/gaymMarketConfig";

export default function PublicUserProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [session, setSession] = useState(null);
  const [targetProfile, setTargetProfile] = useState(null);
  const [userGames, setUserGames] = useState([]);
  const [isFriend, setIsFriend] = useState(false);
  const [loading, setLoading] = useState(true);

  // ✅ ใช้ Theme ของเจ้าของโปรไฟล์ที่เรากำลังกดเข้ามาดู!
  const { theme, isRgbTheme, animatedRgbColor } = useUserAppTheme(
    targetProfile?.equipped_theme || "default",
  );

  useFocusEffect(
    useCallback(() => {
      if (id) fetchUserProfile();
    }, [id]),
  );

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      setSession(currentSession);

      const { data: pData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setTargetProfile(pData);

      const { data: libData } = await supabase
        .from("user_library")
        .select("id, game_id, games(id, title, image_url)")
        .eq("user_id", id);
      setUserGames(libData || []);

      if (currentSession) {
        const { data: fData } = await supabase
          .from("friends")
          .select("id")
          .eq("user_id", currentSession.user.id)
          .eq("friend_id", id)
          .maybeSingle();
        setIsFriend(!!fData);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFriend = async () => {
    if (!session) return;
    try {
      if (isFriend) {
        await supabase
          .from("friends")
          .delete()
          .match({ user_id: session.user.id, friend_id: id });
        setIsFriend(false);
      } else {
        await supabase
          .from("friends")
          .insert({ user_id: session.user.id, friend_id: id });
        setIsFriend(true);
      }
    } catch (error) {
      Alert.alert("เกิดข้อผิดพลาด", error.message);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: "#0a0a1a" }]}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!targetProfile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: "#0a0a1a" }]}>
        <View style={styles.center}>
          <Text style={{ color: "#9ca3af" }}>ไม่พบโปรไฟล์ผู้ใช้นี้</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
        <View style={styles.coverContainer}>
          {targetProfile.cover_url ? (
            <Image
              source={{ uri: targetProfile.cover_url }}
              style={styles.coverImage}
            />
          ) : (
            <View
              style={[styles.defaultCover, { backgroundColor: theme.card }]}
            />
          )}
          <View style={styles.coverOverlay} />

          <SafeAreaView style={styles.headerIcons}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.themeBadgePill}>
              <Text style={styles.themeBadgeText}>
                {theme.emoji} {theme.name}
              </Text>
            </View>
          </SafeAreaView>
        </View>

        <View style={styles.profileSection}>
          {/* ✅ แสดงกรอบรูปโปรไฟล์ (พร้อม Animation) ของเจ้าของโปรไฟล์ */}
          <AvatarWithFrame
            avatarUrl={targetProfile.avatar_url}
            username={targetProfile.username}
            frameId={targetProfile.equipped_frame || "none"}
            size={96}
          />

          <View style={styles.usernameRow}>
            <Text style={[styles.username, { color: theme.text }]}>
              {targetProfile.username}
            </Text>
            {targetProfile.is_dev && (
              <View style={styles.devBadge}>
                <Text style={styles.devBadgeText}>DEV</Text>
              </View>
            )}
            {targetProfile.is_admin && (
              <View style={[styles.devBadge, { backgroundColor: "#ef4444" }]}>
                <Text style={styles.devBadgeText}>ADMIN</Text>
              </View>
            )}
          </View>

          <Text style={[styles.bioText, { color: theme.subText }]}>
            {targetProfile.bio || "ผู้เล่นคนนี้ยังไม่ได้ระบุคำบรรยายตัวเอง"}
          </Text>

          {/* ปุ่มเพิ่มเพื่อน และ ส่งข้อความแชทส่วนตัว */}
          {session?.user?.id !== id && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  { backgroundColor: isFriend ? "#374151" : theme.accent },
                ]}
                onPress={handleToggleFriend}
              >
                <Ionicons
                  name={isFriend ? "person-remove" : "person-add"}
                  size={18}
                  color="#fff"
                />
                <Text style={styles.actionBtnText}>
                  {isFriend ? "เลิกเป็นเพื่อน" : "เพิ่มเพื่อน"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: "#10b981" }]}
                onPress={() => router.push(`/chat/${id}`)}
              >
                <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
                <Text style={styles.actionBtnText}>ส่งข้อความ</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* การ์ดสถิติตาม Theme ของเจ้าของโปรไฟล์ */}
          <Animated.View
            style={[
              styles.statsCard,
              {
                backgroundColor: theme.card,
                borderColor: isRgbTheme ? animatedRgbColor : theme.border,
              },
            ]}
          >
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: theme.text }]}>
                LV.{targetProfile.level || 1}
              </Text>
              <Text style={[styles.statLabel, { color: theme.subText }]}>
                ระดับเลเวล
              </Text>
            </View>
            <View
              style={[styles.statDivider, { backgroundColor: theme.border }]}
            />
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: theme.text }]}>
                {userGames.length}
              </Text>
              <Text style={[styles.statLabel, { color: theme.subText }]}>
                เกมที่สะสม
              </Text>
            </View>
          </Animated.View>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            คลังเกมของ {targetProfile.username} ({userGames.length})
          </Text>
          {userGames.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {userGames.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.gameCard, { borderColor: theme.border }]}
                  onPress={() => router.push(`/game/${item.game_id}`)}
                >
                  <Image
                    source={{ uri: item.games?.image_url }}
                    style={styles.gameImage}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <Text style={{ color: theme.subText, fontStyle: "italic" }}>
              ยังไม่มีเกมในคลัง
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  coverContainer: { width: "100%", height: 230, position: "relative" },
  coverImage: { width: "100%", height: "100%" },
  defaultCover: { width: "100%", height: "100%" },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  headerIcons: {
    position: "absolute",
    top: 10,
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  themeBadgePill: {
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  themeBadgeText: { color: "#fff", fontSize: 12, fontWeight: "bold" },

  profileSection: { padding: 20, marginTop: -50, alignItems: "center" },
  usernameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 8,
  },
  username: { fontSize: 24, fontWeight: "bold" },
  devBadge: {
    backgroundColor: "#10b981",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  devBadgeText: { color: "#fff", fontSize: 11, fontWeight: "bold" },
  bioText: {
    fontSize: 14,
    textAlign: "center",
    marginVertical: 12,
    paddingHorizontal: 20,
  },

  actionRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  actionBtnText: { color: "#fff", fontWeight: "bold", fontSize: 14 },

  statsCard: {
    flexDirection: "row",
    width: "100%",
    borderRadius: 16,
    paddingVertical: 15,
    justifyContent: "space-evenly",
    borderWidth: 1.5,
  },
  statItem: { alignItems: "center" },
  statNum: { fontSize: 20, fontWeight: "bold" },
  statLabel: { fontSize: 12, marginTop: 4 },
  statDivider: { width: 1 },

  sectionContainer: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 15 },
  gameCard: {
    marginRight: 15,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
  },
  gameImage: { width: 120, height: 160 },
});
