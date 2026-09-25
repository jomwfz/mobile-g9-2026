import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { supabase } from "../../services/supabaseClient";
import {
  MARKET_FRAMES,
  MARKET_THEMES,
  AvatarWithFrame,
  useUserAppTheme,
  getRankName,
} from "../../utils/gaymMarketConfig";

export default function ProfileScreen() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [myGames, setMyGames] = useState([]);
  const [uploadedGames, setUploadedGames] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);

  const [editForm, setEditForm] = useState({
    username: "",
    bio: "",
    avatar_url: "",
    cover_url: "",
    equipped_frame: "none",
    equipped_theme: "default",
  });

  const { theme, isRgbTheme, animatedRgbColor } = useUserAppTheme(
    profile?.equipped_theme,
  );

  useFocusEffect(
    useCallback(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        if (session) {
          fetchProfileData(session.user.id);
        } else {
          setLoading(false);
        }
      });
    }, []),
  );

  const fetchProfileData = async (userId) => {
    try {
      setLoading(true);

      // ✅ 1. ใช้ .maybeSingle() แทน .single() เพื่อไม่ให้เกิด Error เวลาหาแถวไม่เจอ
      let { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) throw profileError;

      // ✅ 2. ถ้าไอดีนี้ยังไม่มีข้อมูลในตาราง profiles ให้สร้างให้อัตโนมัติทันที (เริ่มต้น 0 Coin, LV.1)
      if (!profileData) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const fallbackUsername =
          user?.user_metadata?.username ||
          (user?.email ? user.email.split("@")[0] : "Gamer");

        const newProfilePayload = {
          id: userId,
          email: user?.email || "",
          username: fallbackUsername,
          level: 1,
          gaym_coins: 0,
        };

        const { data: createdProfile, error: createError } = await supabase
          .from("profiles")
          .upsert(newProfilePayload)
          .select("*")
          .maybeSingle();

        if (createError) throw createError;
        profileData = createdProfile || newProfilePayload;
      }

      setProfile(profileData);
      setEditForm({
        username: profileData.username || "",
        bio: profileData.bio || "",
        avatar_url: profileData.avatar_url || "",
        cover_url: profileData.cover_url || "",
        equipped_frame: profileData.equipped_frame || "none",
        equipped_theme: profileData.equipped_theme || "default",
      });

      // ดึงเกมในคลังของผู้ใช้
      const { data: libraryData } = await supabase
        .from("user_library")
        .select(`id, game_id, games ( id, title, image_url, is_reviewed )`)
        .eq("user_id", userId)
        .limit(10);
      setMyGames(libraryData || []);

      // หากมียศ DEV ให้ดึงรายการ "เกมของฉัน" ที่ตัวเองอัปโหลด
      if (profileData?.is_dev) {
        const { data: devGamesData } = await supabase
          .from("games")
          .select("*")
          .eq("developer_id", userId)
          .order("id", { ascending: false });
        setUploadedGames(devGamesData || []);
      } else {
        setUploadedGames([]);
      }

      // ดึงรายชื่อเพื่อน
      const { data: friendsData } = await supabase
        .from("friends")
        .select("friend_id")
        .eq("user_id", userId);

      if (friendsData && friendsData.length > 0) {
        const friendIds = friendsData.map((f) => f.friend_id);
        const { data: friendProfiles } = await supabase
          .from("profiles")
          .select("id, username, avatar_url, equipped_frame")
          .in("id", friendIds);
        setFriends(friendProfiles || []);
      } else {
        setFriends([]);
      }
    } catch (error) {
      console.error("Error fetching profile:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async (type) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: type === "avatar" ? [1, 1] : [16, 9],
        quality: 0.8,
      });

      if (!result.canceled) {
        const imageUri = result.assets[0].uri;
        if (type === "avatar") {
          setEditForm({ ...editForm, avatar_url: imageUri });
        } else {
          setEditForm({ ...editForm, cover_url: imageUri });
        }
      }
    } catch (error) {
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถเข้าถึงคลังรูปภาพได้");
    }
  };

  const handleDeleteImage = (type) => {
    if (type === "avatar") {
      setEditForm({ ...editForm, avatar_url: "" });
    } else {
      setEditForm({ ...editForm, cover_url: "" });
    }
  };

  const uploadIfLocalUri = async (uri, folder) => {
    if (!uri) return "";
    if (uri.startsWith("http://") || uri.startsWith("https://")) {
      return uri;
    }
    const fileExt = uri.substring(uri.lastIndexOf(".") + 1) || "jpeg";
    const fileName = `${folder}/${session.user.id}-${Date.now()}.${fileExt}`;
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: "base64",
    });

    const { error: uploadError } = await supabase.storage
      .from("images")
      .upload(fileName, decode(base64), {
        contentType: `image/${fileExt}`,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from("images")
      .getPublicUrl(fileName);
    return publicUrlData.publicUrl;
  };

  const handleSaveProfile = async () => {
    if (!session) return;
    setSavingProfile(true);
    try {
      const finalAvatarUrl = await uploadIfLocalUri(
        editForm.avatar_url.trim(),
        "avatars",
      );
      const finalCoverUrl = await uploadIfLocalUri(
        editForm.cover_url.trim(),
        "covers",
      );

      const { error } = await supabase
        .from("profiles")
        .update({
          username: editForm.username.trim(),
          bio: editForm.bio.trim(),
          avatar_url: finalAvatarUrl,
          cover_url: finalCoverUrl,
          equipped_frame: editForm.equipped_frame,
          equipped_theme: editForm.equipped_theme,
        })
        .eq("id", session.user.id);

      if (error) throw error;

      setIsEditModalVisible(false);
      fetchProfileData(session.user.id);
      Alert.alert(
        "สำเร็จ",
        "บันทึกการตกแต่งโปรไฟล์ กรอบรูป และ Theme เรียบร้อยแล้ว!",
      );
    } catch (error) {
      Alert.alert("เกิดข้อผิดพลาด", error.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/(auth)/login");
  };

  if (loading)
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <ActivityIndicator color={theme.accent} size="large" />
      </View>
    );

  if (!session) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={styles.centerGuest}>
          <Ionicons name="person-circle-outline" size={80} color="#6b7280" />
          <Text style={styles.guestText}>คุณยังไม่ได้เข้าสู่ระบบ</Text>
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => router.push("/(auth)/login")}
          >
            <Text style={styles.loginBtnText}>เข้าสู่ระบบ / สมัครสมาชิก</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const ownedItems = Array.isArray(profile?.owned_items)
    ? profile.owned_items
    : [];
  const myOwnedFrames = MARKET_FRAMES.filter((f) => ownedItems.includes(f.id));
  const myOwnedThemes = MARKET_THEMES.filter((t) => ownedItems.includes(t.id));
  const playerLevel = profile?.level || 1;
  const playerRank = getRankName(playerLevel);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
        <View style={styles.coverContainer}>
          {profile?.cover_url ? (
            <Image
              source={{ uri: profile.cover_url }}
              style={styles.coverImage}
            />
          ) : (
            <View
              style={[styles.defaultCover, { backgroundColor: theme.card }]}
            />
          )}
          <View style={styles.coverOverlay} />

          <SafeAreaView style={styles.headerIcons}>
            <Text style={styles.headerTitle}>Profile {theme.emoji}</Text>
            <TouchableOpacity
              onPress={() => router.push("/settings")}
              style={styles.iconBtn}
            >
              <Ionicons name="settings-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </SafeAreaView>
        </View>

        <View style={styles.profileSection}>
          <View style={{ marginTop: -5, marginBottom: 5 }}>
            <AvatarWithFrame
              avatarUrl={profile?.avatar_url}
              username={profile?.username}
              frameId={profile?.equipped_frame || "none"}
              size={94}
            />
          </View>

          <TouchableOpacity
            style={[styles.editBtn, { backgroundColor: theme.accent }]}
            onPress={() => setIsEditModalVisible(true)}
          >
            <Ionicons name="color-wand" size={15} color="#fff" />
            <Text style={styles.editBtnText}>ตกแต่งโปรไฟล์</Text>
          </TouchableOpacity>

          {/* ✅ แสดงชื่อผู้ใช้ พร้อมป้ายยศ DEV, ADMIN และป้ายระดับเลเวล LV. */}
          <View style={styles.usernameRow}>
            <Text style={[styles.username, { color: theme.text }]}>
              {profile?.username || "Gamer"}
            </Text>
            {profile?.is_dev && (
              <View style={styles.devBadge}>
                <Text style={styles.devBadgeText}>DEV</Text>
              </View>
            )}
            {profile?.is_admin && (
              <View style={[styles.devBadge, { backgroundColor: "#ef4444" }]}>
                <Text style={styles.devBadgeText}>ADMIN</Text>
              </View>
            )}
            <View style={styles.levelBadge}>
              <Ionicons name="trophy" size={12} color="#ffaa00" />
              <Text style={styles.levelBadgeText}>
                LV.{playerLevel} {playerRank}
              </Text>
            </View>
          </View>

          <Text style={[styles.bioText, { color: theme.subText }]}>
            {profile?.bio ||
              "ยังไม่มีคำบรรยายตัวเอง แตะตกแต่งโปรไฟล์เพื่อเพิ่มเลย!"}
          </Text>

          {/* ✅ แถบแสดงสถิติ: LV. ของผู้เล่น, เกมในคลัง, เพื่อน และ GAYM Coin */}
          <Animated.View
            style={[
              styles.statsRow,
              {
                backgroundColor: theme.card,
                borderColor: isRgbTheme ? animatedRgbColor : theme.border,
              },
            ]}
          >
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: "#ffaa00" }]}>
                LV.{playerLevel}
              </Text>
              <Text style={[styles.statLabel, { color: theme.subText }]}>
                {playerRank}
              </Text>
            </View>
            <View
              style={[styles.statDivider, { backgroundColor: theme.border }]}
            />
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: theme.text }]}>
                {myGames.length}
              </Text>
              <Text style={[styles.statLabel, { color: theme.subText }]}>
                เกมในคลัง
              </Text>
            </View>
            <View
              style={[styles.statDivider, { backgroundColor: theme.border }]}
            />
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: theme.text }]}>
                {friends.length}
              </Text>
              <Text style={[styles.statLabel, { color: theme.subText }]}>
                เพื่อน
              </Text>
            </View>
            <View
              style={[styles.statDivider, { backgroundColor: theme.border }]}
            />
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: "#facc15" }]}>
                {profile?.gaym_coins ?? 0}
              </Text>
              <Text style={[styles.statLabel, { color: theme.subText }]}>
                GAYM Coin
              </Text>
            </View>
          </Animated.View>

          {/* กล่องแนะนำวิธีเพิ่ม LV. */}
          <View
            style={[
              styles.lvGuideCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginBottom: 4,
              }}
            >
              <Ionicons name="flash" size={16} color="#ffaa00" />
              <Text
                style={{ color: "#ffaa00", fontWeight: "bold", fontSize: 13 }}
              >
                ช่องทางการเพิ่มระดับ LV. ของคุณ
              </Text>
            </View>
            <Text
              style={{ color: theme.subText, fontSize: 11, lineHeight: 17 }}
            >
              • ซื้อเกม (+1 LV./เกม) • ซื้อของใน GAYM Market (+1 LV.) • ซื้อ
              GAYM Coin (+1 LV./แพ็ก) • โพสต์ในแชทโลก (+1 LV.) •
              อัปโหลดเกมสำเร็จ (+2 LV.)
            </Text>
          </View>

          {profile?.is_dev && profile?.donate_qr_url ? (
            <TouchableOpacity
              style={styles.donateProfileCard}
              activeOpacity={0.85}
              onPress={() => setQrModalVisible(true)}
            >
              <Image
                source={{ uri: profile.donate_qr_url }}
                style={styles.donateQrThumb}
              />
              <View style={{ flex: 1, marginLeft: 14 }}>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <Ionicons name="heart-circle" size={20} color="#f59e0b" />
                  <Text style={styles.donateCardTitle}>
                    สนับสนุนนักพัฒนา (Donate)
                  </Text>
                </View>
                <Text style={styles.donateCardSub}>
                  แตะเพื่อแสดง QR Code สำหรับโดเนทสนับสนุนผลงานของ DEV
                </Text>
              </View>
              <Ionicons name="qr-code-outline" size={24} color="#f59e0b" />
            </TouchableOpacity>
          ) : null}
        </View>

        {profile?.is_dev && (
          <View style={styles.sectionContainer}>
            <View style={styles.devSectionHeader}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Ionicons name="code-working" size={20} color="#10b981" />
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: theme.text, marginBottom: 0 },
                  ]}
                >
                  เกมของฉัน ({uploadedGames.length})
                </Text>
              </View>
              <TouchableOpacity
                style={styles.quickUploadChip}
                onPress={() => router.push("/upload-game")}
              >
                <Ionicons name="add-circle" size={16} color="#fff" />
                <Text style={styles.quickUploadChipText}>อัปโหลดเพิ่ม</Text>
              </TouchableOpacity>
            </View>

            {uploadedGames.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.horizontalScroll}
              >
                {uploadedGames.map((gameItem) => (
                  <TouchableOpacity
                    key={gameItem.id}
                    style={[
                      styles.devUploadedCard,
                      { backgroundColor: theme.card },
                    ]}
                    activeOpacity={0.85}
                    onPress={() => router.push(`/game/${gameItem.id}`)}
                  >
                    <Image
                      source={{ uri: gameItem.image_url || gameItem.thumbnail }}
                      style={styles.devUploadedImage}
                    />
                    <View style={styles.devUploadedInfo}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Text
                          style={[
                            styles.devUploadedTitle,
                            { color: theme.text },
                          ]}
                          numberOfLines={1}
                        >
                          {gameItem.title}
                        </Text>
                        {gameItem.is_reviewed && (
                          <Ionicons
                            name="checkmark-circle"
                            size={14}
                            color="#10b981"
                          />
                        )}
                      </View>
                      <Text style={styles.devUploadedPrice}>
                        {gameItem.price > 0 ? `฿${gameItem.price}` : "เล่นฟรี"}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <Text style={[styles.emptyText, { color: theme.subText }]}>
                คุณยังไม่ได้อัปโหลดเกมของคุณ
              </Text>
            )}
          </View>
        )}

        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            เพื่อนของฉัน ({friends.length})
          </Text>
          {friends.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.horizontalScroll}
            >
              {friends.map((friend) => (
                <TouchableOpacity
                  key={friend.id}
                  style={styles.friendCard}
                  onPress={() => router.push(`/user/${friend.id}`)}
                >
                  <AvatarWithFrame
                    avatarUrl={friend.avatar_url}
                    username={friend.username}
                    frameId={friend.equipped_frame || "none"}
                    size={54}
                  />
                  <Text
                    style={[styles.friendName, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    {friend.username}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <Text style={[styles.emptyText, { color: theme.subText }]}>
              คุณยังไม่มีเพื่อน ค้นหาเพื่อนใหม่ใน Community สิ!
            </Text>
          )}
        </View>

        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            คอลเลกชันเกมของฉัน (My Games)
          </Text>
          {myGames.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.horizontalScroll}
            >
              {myGames.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.gameCard, { borderColor: theme.border }]}
                  onPress={() => router.push(`/library/${item.game_id}`)}
                >
                  <Image
                    source={{ uri: item.games?.image_url }}
                    style={styles.gameImage}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <Text style={[styles.emptyText, { color: theme.subText }]}>
              คุณยังไม่มีเกมในคลัง
            </Text>
          )}
        </View>

        <View style={{ padding: 20 }}>
          <TouchableOpacity
            style={styles.marketBtn}
            onPress={() => router.push("/gaym-market")}
          >
            <Ionicons
              name="sparkles"
              size={22}
              color="#facc15"
              style={{ marginRight: 15 }}
            />
            <Text style={styles.marketBtnTitle}>
              ร้านค้าของตกแต่ง GAYM Market
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#facc15" />
          </TouchableOpacity>

          {profile?.is_admin && (
            <TouchableOpacity
              style={styles.adminPanelBtn}
              onPress={() => router.push("/admin")}
            >
              <Ionicons
                name="shield-half"
                size={22}
                color="#ef4444"
                style={{ marginRight: 15 }}
              />
              <Text style={styles.adminPanelTitle}>
                ระบบจัดการแอดมิน (Admin Mode)
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#ef4444" />
            </TouchableOpacity>
          )}

          {profile?.is_dev && (
            <TouchableOpacity
              style={styles.devDashboardBtn}
              onPress={() => router.push("/dev-dashboard")}
            >
              <Ionicons
                name="analytics"
                size={22}
                color="#f59e0b"
                style={{ marginRight: 15 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.devDashboardTitle}>
                  DEV Dashboard (สถิติ & รายได้)
                </Text>
                <Text style={styles.devDashboardSub}>
                  ดูยอดดาวน์โหลด รายได้จากการขายเกม และสถิติผู้เล่น
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#f59e0b" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.devProgramBtn}
            onPress={() => router.push("/dev-subscription")}
          >
            <Ionicons
              name="shield-checkmark"
              size={22}
              color="#10b981"
              style={{ marginRight: 15 }}
            />
            <Text style={styles.devProgramTitle}>
              สมัคร / จัดการสถานะ DEV Program
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          {profile?.is_dev && (
            <TouchableOpacity
              style={[
                styles.uploadStudioBtn,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
              onPress={() => router.push("/upload-game")}
            >
              <Ionicons
                name="cloud-upload"
                size={22}
                color="#3b82f6"
                style={{ marginRight: 15 }}
              />
              <Text style={[styles.uploadStudioTitle, { color: theme.text }]}>
                Studio อัปโหลดเกม
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>ออกจากระบบ</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal แสดง QR Code โดเนท */}
      <Modal visible={qrModalVisible} transparent={true} animationType="fade">
        <View style={styles.qrModalOverlay}>
          <View style={[styles.qrModalBox, { backgroundColor: theme.card }]}>
            <Text style={styles.qrModalTitle}>
              สนับสนุนนักพัฒนา {profile?.username}
            </Text>
            {profile?.donate_qr_url && (
              <Image
                source={{ uri: profile.donate_qr_url }}
                style={styles.qrModalImage}
              />
            )}
            <TouchableOpacity
              style={styles.qrCloseBtn}
              onPress={() => setQrModalVisible(false)}
            >
              <Text style={styles.qrCloseText}>ปิดหน้าต่าง</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal ตกแต่งโปรไฟล์ */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View
              style={[styles.modalHeader, { borderBottomColor: theme.border }]}
            >
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                <Text style={styles.cancelText}>ยกเลิก</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitleText, { color: theme.text }]}>
                ตกแต่งโปรไฟล์
              </Text>
              <TouchableOpacity
                onPress={handleSaveProfile}
                disabled={savingProfile}
              >
                {savingProfile ? (
                  <ActivityIndicator color="#10b981" size="small" />
                ) : (
                  <Text style={styles.saveText}>บันทึก</Text>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 50 }}
            >
              <View style={styles.cosmeticHeaderRow}>
                <Text
                  style={[styles.label, { color: theme.text, marginBottom: 0 }]}
                >
                  เลือกกรอบรูปโปรไฟล์ (Avatar Frame)
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setIsEditModalVisible(false);
                    router.push("/gaym-market");
                  }}
                >
                  <Text
                    style={{
                      color: "#facc15",
                      fontSize: 12,
                      fontWeight: "bold",
                    }}
                  >
                    + ซื้อเพิ่มที่ Market
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginVertical: 12 }}
              >
                <TouchableOpacity
                  style={[
                    styles.cosmeticOptionCard,
                    editForm.equipped_frame === "none" &&
                      styles.cosmeticSelected,
                  ]}
                  onPress={() =>
                    setEditForm({ ...editForm, equipped_frame: "none" })
                  }
                >
                  <AvatarWithFrame
                    avatarUrl={editForm.avatar_url}
                    username={editForm.username}
                    frameId="none"
                    size={50}
                  />
                  <Text style={styles.cosmeticOptionText}>ไม่มีกรอบ</Text>
                </TouchableOpacity>

                {myOwnedFrames.map((fItem) => (
                  <TouchableOpacity
                    key={fItem.id}
                    style={[
                      styles.cosmeticOptionCard,
                      editForm.equipped_frame === fItem.id &&
                        styles.cosmeticSelected,
                    ]}
                    onPress={() =>
                      setEditForm({ ...editForm, equipped_frame: fItem.id })
                    }
                  >
                    <AvatarWithFrame
                      avatarUrl={editForm.avatar_url}
                      username={editForm.username}
                      frameId={fItem.id}
                      size={50}
                    />
                    <Text style={styles.cosmeticOptionText} numberOfLines={1}>
                      {fItem.badge}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={[styles.cosmeticHeaderRow, { marginTop: 10 }]}>
                <Text
                  style={[styles.label, { color: theme.text, marginBottom: 0 }]}
                >
                  เลือก Theme พิเศษของแอป & โปรไฟล์
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setIsEditModalVisible(false);
                    router.push("/gaym-market");
                  }}
                >
                  <Text
                    style={{
                      color: "#facc15",
                      fontSize: 12,
                      fontWeight: "bold",
                    }}
                  >
                    + ซื้อเพิ่มที่ Market
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginVertical: 12 }}
              >
                <TouchableOpacity
                  style={[
                    styles.cosmeticOptionCard,
                    editForm.equipped_theme === "default" &&
                      styles.cosmeticSelected,
                  ]}
                  onPress={() =>
                    setEditForm({ ...editForm, equipped_theme: "default" })
                  }
                >
                  <Text style={{ fontSize: 24 }}>🎮</Text>
                  <Text style={styles.cosmeticOptionText}>ค่าเริ่มต้น</Text>
                </TouchableOpacity>

                {myOwnedThemes.map((tItem) => (
                  <TouchableOpacity
                    key={tItem.id}
                    style={[
                      styles.cosmeticOptionCard,
                      { backgroundColor: tItem.bg },
                      editForm.equipped_theme === tItem.id &&
                        styles.cosmeticSelected,
                    ]}
                    onPress={() =>
                      setEditForm({ ...editForm, equipped_theme: tItem.id })
                    }
                  >
                    <Text style={{ fontSize: 24 }}>{tItem.emoji}</Text>
                    <Text
                      style={[styles.cosmeticOptionText, { color: tItem.text }]}
                      numberOfLines={1}
                    >
                      {tItem.name.replace("Theme ", "")}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text
                style={[styles.label, { color: theme.subText, marginTop: 10 }]}
              >
                รูปโปรไฟล์ (Avatar)
              </Text>
              <View style={styles.imageEditRow}>
                <View style={{ marginRight: 20 }}>
                  <AvatarWithFrame
                    avatarUrl={editForm.avatar_url}
                    username={editForm.username}
                    frameId={editForm.equipped_frame}
                    size={68}
                  />
                </View>
                <View style={styles.imageEditActions}>
                  <TouchableOpacity
                    style={styles.uploadActionBtn}
                    onPress={() => pickImage("avatar")}
                  >
                    <Ionicons
                      name="image-outline"
                      size={16}
                      color="#fff"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.uploadActionText}>เปลี่ยนรูปภาพ</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteActionBtn}
                    onPress={() => handleDeleteImage("avatar")}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={16}
                      color="#ef4444"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.deleteActionText}>
                      ลบ / คืนค่าเริ่มต้น
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={[styles.label, { color: theme.subText }]}>
                รูปปกหลัง (Cover)
              </Text>
              <View style={styles.imageEditRow}>
                <View style={styles.imagePreviewRect}>
                  {editForm.cover_url ? (
                    <Image
                      source={{ uri: editForm.cover_url }}
                      style={styles.previewCover}
                    />
                  ) : (
                    <Ionicons name="image" size={40} color="#6b7280" />
                  )}
                </View>
                <View style={styles.imageEditActions}>
                  <TouchableOpacity
                    style={styles.uploadActionBtn}
                    onPress={() => pickImage("cover")}
                  >
                    <Ionicons
                      name="image-outline"
                      size={16}
                      color="#fff"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.uploadActionText}>เปลี่ยนรูปปก</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteActionBtn}
                    onPress={() => handleDeleteImage("cover")}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={16}
                      color="#ef4444"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.deleteActionText}>
                      ลบ / คืนค่าเริ่มต้น
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={[styles.label, { color: theme.subText }]}>
                ชื่อผู้ใช้ (Username)
              </Text>
              <TextInput
                style={styles.input}
                value={editForm.username}
                onChangeText={(text) =>
                  setEditForm({ ...editForm, username: text })
                }
                placeholderTextColor="#6b7280"
              />

              <Text style={[styles.label, { color: theme.subText }]}>
                คำบรรยายตัวเอง (Bio)
              </Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: "top" }]}
                value={editForm.bio}
                onChangeText={(text) => setEditForm({ ...editForm, bio: text })}
                multiline
                placeholderTextColor="#6b7280"
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  centerGuest: { flex: 1, justifyContent: "center", alignItems: "center" },
  guestText: { color: "#9ca3af", fontSize: 16, marginVertical: 15 },
  loginBtn: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 12,
  },
  loginBtnText: { color: "#fff", fontWeight: "bold", fontSize: 15 },

  coverContainer: { width: "100%", height: 250, position: "relative" },
  coverImage: { width: "100%", height: "100%" },
  defaultCover: { width: "100%", height: "100%" },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  headerIcons: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    position: "absolute",
    width: "100%",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },

  profileSection: {
    padding: 20,
    marginTop: -50,
    alignItems: "center",
    position: "relative",
  },
  editBtn: {
    position: "absolute",
    top: 20,
    right: 20,
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    alignItems: "center",
    gap: 5,
  },
  editBtnText: { color: "#fff", fontSize: 12, fontWeight: "bold" },

  usernameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: 10,
    marginBottom: 5,
    gap: 8,
  },
  username: { fontSize: 24, fontWeight: "bold" },
  devBadge: {
    backgroundColor: "#10b981",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  devBadgeText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  levelBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 170, 0, 0.18)",
    borderWidth: 1,
    borderColor: "#ffaa00",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  levelBadgeText: { color: "#ffaa00", fontSize: 12, fontWeight: "bold" },

  bioText: {
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
  },

  statsRow: {
    flexDirection: "row",
    borderRadius: 16,
    paddingVertical: 15,
    width: "100%",
    justifyContent: "space-evenly",
    borderWidth: 1.5,
  },
  statBox: { alignItems: "center" },
  statNumber: { fontSize: 18, fontWeight: "bold" },
  statLabel: { fontSize: 11, marginTop: 4 },
  statDivider: { width: 1 },

  lvGuideCard: {
    width: "100%",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },

  donateProfileCard: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.4)",
    borderRadius: 16,
    padding: 14,
    marginTop: 16,
  },
  donateQrThumb: {
    width: 55,
    height: 55,
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  donateCardTitle: { color: "#f59e0b", fontSize: 15, fontWeight: "bold" },
  donateCardSub: { color: "#e5e7eb", fontSize: 12, marginTop: 3 },

  qrModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  qrModalBox: {
    width: "100%",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2a2a4a",
  },
  qrModalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
  },
  qrModalImage: {
    width: 260,
    height: 260,
    borderRadius: 14,
    backgroundColor: "#fff",
    marginBottom: 20,
  },
  qrCloseBtn: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 12,
  },
  qrCloseText: { color: "#fff", fontWeight: "bold", fontSize: 15 },

  sectionContainer: { marginTop: 10, paddingLeft: 20, marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 15 },
  horizontalScroll: { paddingRight: 20 },

  devSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingRight: 20,
    marginBottom: 15,
  },
  quickUploadChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10b981",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  quickUploadChipText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  devUploadedCard: {
    width: 155,
    borderRadius: 12,
    marginRight: 15,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#10b981",
  },
  devUploadedImage: { width: "100%", height: 95, resizeMode: "cover" },
  devUploadedInfo: { padding: 10 },
  devUploadedTitle: { fontSize: 14, fontWeight: "bold", flexShrink: 1 },
  devUploadedPrice: {
    color: "#10b981",
    fontSize: 13,
    fontWeight: "bold",
    marginTop: 3,
  },

  friendCard: { alignItems: "center", marginRight: 15, width: 76 },
  friendName: { fontSize: 12, textAlign: "center", marginTop: 5 },

  gameCard: {
    marginRight: 15,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
  },
  gameImage: { width: 120, height: 160 },
  emptyText: { fontStyle: "italic", marginBottom: 15, paddingRight: 20 },

  marketBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(250, 204, 21, 0.14)",
    padding: 16,
    borderRadius: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#facc15",
  },
  marketBtnTitle: {
    color: "#facc15",
    fontSize: 15,
    fontWeight: "bold",
    flex: 1,
  },

  adminPanelBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    padding: 16,
    borderRadius: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ef4444",
  },
  adminPanelTitle: {
    color: "#ef4444",
    fontSize: 15,
    fontWeight: "bold",
    flex: 1,
  },

  devDashboardBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    padding: 16,
    borderRadius: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.45)",
  },
  devDashboardTitle: { color: "#f59e0b", fontSize: 15, fontWeight: "bold" },
  devDashboardSub: { color: "#9ca3af", fontSize: 12, marginTop: 2 },

  devProgramBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    padding: 16,
    borderRadius: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  devProgramTitle: {
    color: "#10b981",
    fontSize: 15,
    fontWeight: "bold",
    flex: 1,
  },

  uploadStudioBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    marginBottom: 15,
    borderWidth: 1,
  },
  uploadStudioTitle: { fontSize: 15, fontWeight: "bold", flex: 1 },
  logoutBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    marginBottom: 30,
  },
  logoutText: { color: "#ef4444", fontSize: 15, fontWeight: "bold" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  modalContent: {
    height: "92%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  cancelText: { color: "#ef4444", fontSize: 16 },
  modalTitleText: { fontSize: 18, fontWeight: "bold" },
  saveText: { color: "#10b981", fontSize: 16, fontWeight: "bold" },
  label: { marginBottom: 8, fontSize: 14, fontWeight: "bold" },
  input: {
    backgroundColor: "#0a0a1a",
    color: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#2a2a4a",
  },

  cosmeticHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cosmeticOptionCard: {
    width: 95,
    height: 100,
    backgroundColor: "#0a0a1a",
    borderRadius: 14,
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#2a2a4a",
    padding: 6,
  },
  cosmeticSelected: {
    borderColor: "#10b981",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
  },
  cosmeticOptionText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
    marginTop: 6,
  },

  imageEditRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 25,
    backgroundColor: "#0f0f1a",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2a2a4a",
  },
  imagePreviewRect: {
    width: 120,
    height: 70,
    borderRadius: 8,
    backgroundColor: "#1a1a2e",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    marginRight: 20,
  },
  previewCover: { width: "100%", height: "100%", borderRadius: 8 },
  imageEditActions: { flex: 1, gap: 10 },
  uploadActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3b82f6",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    justifyContent: "center",
  },
  uploadActionText: { color: "#fff", fontSize: 13, fontWeight: "bold" },
  deleteActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  deleteActionText: { color: "#ef4444", fontSize: 13, fontWeight: "bold" },
});
