import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TextInput,
  Modal,
  Alert,
  Image,
  ActivityIndicator,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { supabase } from "../services/supabaseClient";

export default function AdminScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [savingGame, setSavingGame] = useState(false);
  const [currentAdminId, setCurrentAdminId] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard"); // dashboard | games | inbox | chats | users

  // ข้อมูลทั้งหมดในระบบ
  const [profiles, setProfiles] = useState([]);
  const [games, setGames] = useState([]);
  const [posts, setPosts] = useState([]);
  const [privateMsgs, setPrivateMsgs] = useState([]);

  // State สำหรับค้นหาและแบนผู้ใช้ (User / DEV)
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [banModalVisible, setBanModalVisible] = useState(false);
  const [targetBanUser, setTargetBanUser] = useState(null);
  const [banDuration, setBanDuration] = useState("1");
  const [banUnit, setBanUnit] = useState("days");

  const timeUnits = [
    { key: "seconds", label: "วินาที" },
    { key: "minutes", label: "นาที" },
    { key: "hours", label: "ชั่วโมง" },
    { key: "days", label: "วัน" },
    { key: "months", label: "เดือน" },
    { key: "years", label: "ปี" },
  ];

  // ✅ Modal แก้ไขข้อมูลเกมครบทุกฟิลด์ใน Game Detail
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [coverEditMode, setCoverEditMode] = useState("url"); // 'url' | 'device'
  const [editGameForm, setEditGameForm] = useState({
    title: "",
    publisher: "",
    release_date: "",
    price: "0",
    discount_percent: "0",
    tag: "Action",
    image_url: "",
    description: "",
    download_type: "url",
    download_url: "",
    donate_qr_url: "",
    gallery_media: [],
    is_reviewed: false,
  });

  // Modal สำหรับเพิ่มเกมใหม่โดย Admin
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newCoverMode, setNewCoverMode] = useState("url");
  const [newGameForm, setNewGameForm] = useState({
    title: "",
    publisher: "GAYM Official",
    release_date: new Date().toLocaleDateString("th-TH"),
    price: "0",
    discount_percent: "0",
    tag: "Action",
    image_url: "",
    description: "",
    download_type: "url",
    download_url: "",
  });

  useFocusEffect(
    useCallback(() => {
      checkAdminAndFetchData();
    }, []),
  );

  const checkAdminAndFetchData = async () => {
    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/(auth)/login");
        return;
      }
      setCurrentAdminId(session.user.id);

      const { data: myProfile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", session.user.id)
        .single();

      if (!myProfile?.is_admin) {
        Alert.alert(
          "ปฏิเสธการเข้าถึง",
          "พื้นที่นี้สำหรับผู้ดูแลระบบ (Admin) เท่านั้น",
        );
        router.back();
        return;
      }

      await supabase
        .from("profiles")
        .update({ last_seen: new Date().toISOString() })
        .eq("id", session.user.id);

      await fetchAllAdminData();
    } catch (error) {
      console.error("Admin check error:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllAdminData = async () => {
    const [profilesRes, gamesRes, postsRes, msgsRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .order("username", { ascending: true }),
      supabase.from("games").select("*").order("id", { ascending: false }),
      supabase
        .from("community_posts")
        .select("*, profiles(username)")
        .order("created_at", { ascending: false }),
      supabase
        .from("private_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    setProfiles(profilesRes.data || []);
    setGames(gamesRes.data || []);
    setPosts(postsRes.data || []);
    setPrivateMsgs(msgsRes.data || []);
  };

  // ฟังก์ชันช่วยอัปโหลดไฟล์จากเครื่องขึ้น Supabase Storage
  const uploadFileIfLocal = async (uri, folder, customMime = null) => {
    if (!uri) return null;
    if (uri.startsWith("http://") || uri.startsWith("https://")) {
      return uri;
    }
    const ext =
      uri.substring(uri.lastIndexOf(".") + 1)?.toLowerCase() || "jpeg";
    const fileName = `${folder}/admin-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: "base64",
    });

    let contentType = customMime;
    if (!contentType) {
      const isVideo = ["mp4", "mov", "avi", "mkv", "webm"].includes(ext);
      contentType = isVideo ? "video/mp4" : `image/${ext}`;
    }

    const { error: uploadError } = await supabase.storage
      .from("images")
      .upload(fileName, decode(base64), { contentType, upsert: true });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from("images")
      .getPublicUrl(fileName);
    return publicUrlData.publicUrl;
  };

  // ==========================================
  // ระบบแบนและปลดแบนผู้ใช้ (User & DEV)
  // ==========================================
  const openBanModal = (user) => {
    if (user.id === currentAdminId) {
      Alert.alert("แจ้งเตือน", "คุณไม่สามารถแบนบัญชีแอดมินของตัวเองได้");
      return;
    }
    setTargetBanUser(user);
    setBanDuration("1");
    setBanUnit("days");
    setBanModalVisible(true);
  };

  const handleConfirmBan = async () => {
    if (!targetBanUser) return;
    const amount = parseInt(banDuration, 10);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("แจ้งเตือน", "กรุณาระบุตัวเลขระยะเวลาให้ถูกต้อง (มากกว่า 0)");
      return;
    }

    try {
      const expireDate = new Date();
      if (banUnit === "seconds")
        expireDate.setSeconds(expireDate.getSeconds() + amount);
      else if (banUnit === "minutes")
        expireDate.setMinutes(expireDate.getMinutes() + amount);
      else if (banUnit === "hours")
        expireDate.setHours(expireDate.getHours() + amount);
      else if (banUnit === "days")
        expireDate.setDate(expireDate.getDate() + amount);
      else if (banUnit === "months")
        expireDate.setMonth(expireDate.getMonth() + amount);
      else if (banUnit === "years")
        expireDate.setFullYear(expireDate.getFullYear() + amount);

      const { error } = await supabase
        .from("profiles")
        .update({ banned_until: expireDate.toISOString() })
        .eq("id", targetBanUser.id);

      if (error) throw error;

      const unitLabel = timeUnits.find((u) => u.key === banUnit)?.label || "";
      setBanModalVisible(false);
      fetchAllAdminData();
      Alert.alert(
        "แบนผู้ใช้สำเร็จ",
        `แบน "${targetBanUser.username}" เป็นเวลา ${amount} ${unitLabel}\n(ปลดแบนอัตโนมัติ: ${expireDate.toLocaleString("th-TH")})`,
      );
    } catch (error) {
      Alert.alert("เกิดข้อผิดพลาด", error.message);
    }
  };

  const handleUnbanUser = (user) => {
    Alert.alert(
      "ยืนยันการปลดแบน",
      `ต้องการปลดแบนให้ "${user.username}" สามารถกลับมาใช้งานได้ทันทีใช่หรือไม่?`,
      [
        { text: "ยกเลิก", style: "cancel" },
        {
          text: "ปลดแบนทันที",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("profiles")
                .update({ banned_until: null })
                .eq("id", user.id);

              if (error) throw error;
              fetchAllAdminData();
              Alert.alert("สำเร็จ", `ปลดแบน "${user.username}" เรียบร้อยแล้ว`);
            } catch (error) {
              Alert.alert("เกิดข้อผิดพลาด", error.message);
            }
          },
        },
      ],
    );
  };

  // ==========================================
  // ✅ ระบบเปิดแก้ไขข้อมูลเกมทุกอย่างใน Game Detail
  // ==========================================
  const openEditGameModal = (game) => {
    setSelectedGame(game);
    setCoverEditMode("url");
    setEditGameForm({
      title: game.title || "",
      publisher: game.publisher || "Indie Studio",
      release_date: game.release_date || new Date().toLocaleDateString("th-TH"),
      price: String(game.price ?? 0),
      discount_percent: String(game.discount_percent ?? 0),
      tag: game.tag || game.genre || "Action",
      image_url: game.image_url || game.thumbnail || "",
      description: game.description || "",
      download_type: game.download_type || "url",
      download_url: game.download_url || game.game_url || "",
      donate_qr_url: game.donate_qr_url || "",
      gallery_media: Array.isArray(game.gallery_media)
        ? game.gallery_media
        : [],
      is_reviewed: !!game.is_reviewed,
    });
    setEditModalVisible(true);
  };

  // เลือกรูปปกจากเครื่องในโหมดแก้ไขของ Admin
  const handlePickEditCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled) {
      setEditGameForm((prev) => ({ ...prev, image_url: result.assets[0].uri }));
    }
  };

  // เลือกรูปปกจากเครื่องในโหมดเพิ่มเกมใหม่ของ Admin
  const handlePickNewCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled) {
      setNewGameForm((prev) => ({ ...prev, image_url: result.assets[0].uri }));
    }
  };

  // เพิ่มรูป/วิดีโอเข้า Gallery ในโหมดแก้ไขของ Admin
  const handleAddEditGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets) {
      const added = result.assets.map((a) => ({
        url: a.uri,
        type: a.type === "video" ? "video" : "image",
      }));
      setEditGameForm((prev) => ({
        ...prev,
        gallery_media: [...(prev.gallery_media || []), ...added],
      }));
    }
  };

  const handleRemoveEditGallery = (idx) => {
    setEditGameForm((prev) => ({
      ...prev,
      gallery_media: prev.gallery_media.filter((_, i) => i !== idx),
    }));
  };

  // เลือกไฟล์ .APK ในโหมดแก้ไขของ Admin
  const handlePickEditApk = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/vnd.android.package-archive", "*/*"],
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets?.length > 0) {
      setEditGameForm((prev) => ({
        ...prev,
        download_type: "apk",
        download_url: result.assets[0].uri,
      }));
    }
  };

  // เลือกรูป QR โดเนทในโหมดแก้ไขของ Admin
  const handlePickEditQr = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (!result.canceled) {
      setEditGameForm((prev) => ({
        ...prev,
        donate_qr_url: result.assets[0].uri,
      }));
    }
  };

  const handleSaveGameEdit = async () => {
    if (!selectedGame) return;
    setSavingGame(true);
    try {
      const priceNum = parseFloat(editGameForm.price) || 0;
      const discountNum = Math.min(
        100,
        Math.max(0, parseInt(editGameForm.discount_percent) || 0),
      );

      // อัปโหลดไฟล์หากแอดมินเลือกไฟล์ใหม่จากเครื่อง
      const finalCoverUrl = await uploadFileIfLocal(
        editGameForm.image_url.trim(),
        "games/covers",
      );
      const finalDownloadUrl =
        editGameForm.download_type === "apk"
          ? await uploadFileIfLocal(
              editGameForm.download_url,
              "apks",
              "application/vnd.android.package-archive",
            )
          : editGameForm.download_url.trim();
      const finalQrUrl = editGameForm.donate_qr_url
        ? await uploadFileIfLocal(editGameForm.donate_qr_url, "qrs")
        : null;

      // อัปโหลด Gallery ที่เพิ่มเข้ามาใหม่
      const finalGallery = [];
      for (const item of editGameForm.gallery_media || []) {
        const uploadedUrl = await uploadFileIfLocal(
          item.url,
          "games/gallery",
          item.type === "video" ? "video/mp4" : null,
        );
        finalGallery.push({ url: uploadedUrl, type: item.type || "image" });
      }

      const { error } = await supabase
        .from("games")
        .update({
          title: editGameForm.title.trim(),
          publisher: editGameForm.publisher.trim() || "Indie Studio",
          release_date: editGameForm.release_date.trim() || "-",
          price: priceNum,
          discount_percent: discountNum,
          tag: editGameForm.tag.trim(),
          image_url: finalCoverUrl,
          description: editGameForm.description.trim(),
          download_type: editGameForm.download_type,
          download_url: finalDownloadUrl,
          donate_qr_url: finalQrUrl,
          gallery_media: finalGallery,
          is_reviewed: editGameForm.is_reviewed, // ✅ บันทึกสถานะติ๊กถูก / เอาติ๊กถูกออก
        })
        .eq("id", selectedGame.id);

      if (error) throw error;
      setEditModalVisible(false);
      fetchAllAdminData();
      Alert.alert("สำเร็จ", "อัปเดตข้อมูลเกมทั้งหมดเรียบร้อยแล้ว");
    } catch (error) {
      Alert.alert("เกิดข้อผิดพลาด", error.message);
    } finally {
      setSavingGame(false);
    }
  };

  // ✅ ฟังก์ชันสลับสถานะการตรวจสอบ (กดอนุมัติ หรือ กดยกเลิกการตรวจสอบ/เอาติ๊กถูกออก)
  const handleToggleVerifyGame = async (game) => {
    const nextState = !game.is_reviewed;
    try {
      const { error } = await supabase
        .from("games")
        .update({ is_reviewed: nextState })
        .eq("id", game.id);

      if (error) throw error;
      fetchAllAdminData();
      Alert.alert(
        nextState ? "ตรวจสอบแล้ว (ติดติ๊กถูก)" : "ยกเลิกการตรวจสอบแล้ว",
        nextState
          ? `เพิ่มสัญลักษณ์ติ๊กถูกให้เกม "${game.title}" เรียบร้อยแล้ว`
          : `นำสัญลักษณ์ติ๊กถูกออกจากเกม "${game.title}" เรียบร้อยแล้ว`,
      );
    } catch (error) {
      Alert.alert("เกิดข้อผิดพลาด", error.message);
    }
  };

  const handleDeleteGame = (gameId, gameTitle) => {
    Alert.alert(
      "ยืนยันการลบเกม",
      `คุณต้องการลบเกม "${gameTitle}" ออกจากระบบถาวรใช่หรือไม่?`,
      [
        { text: "ยกเลิก", style: "cancel" },
        {
          text: "ลบเกมทันที",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("games")
                .delete()
                .eq("id", gameId);
              if (error) throw error;
              fetchAllAdminData();
              Alert.alert("ลบสำเร็จ", "เกมถูกลบออกจากระบบแล้ว");
            } catch (error) {
              Alert.alert("เกิดข้อผิดพลาด", error.message);
            }
          },
        },
      ],
    );
  };

  const handleAddGameByAdmin = async () => {
    if (!newGameForm.title.trim()) {
      Alert.alert("แจ้งเตือน", "กรุณากรอกชื่อเกม");
      return;
    }
    setSavingGame(true);
    try {
      const priceNum = parseFloat(newGameForm.price) || 0;
      const discountNum = Math.min(
        100,
        Math.max(0, parseInt(newGameForm.discount_percent) || 0),
      );

      const uploadedCover = newGameForm.image_url
        ? await uploadFileIfLocal(newGameForm.image_url.trim(), "games/covers")
        : "https://via.placeholder.com/400x225.png?text=GAYM+Store";

      const { error } = await supabase.from("games").insert({
        title: newGameForm.title.trim(),
        publisher: newGameForm.publisher.trim() || "GAYM Official",
        release_date:
          newGameForm.release_date.trim() ||
          new Date().toLocaleDateString("th-TH"),
        price: priceNum,
        discount_percent: discountNum,
        tag: newGameForm.tag.trim() || "Action",
        image_url: uploadedCover,
        description: newGameForm.description.trim(),
        download_type: newGameForm.download_type || "url",
        download_url: newGameForm.download_url.trim(),
        is_reviewed: true,
      });

      if (error) throw error;
      setAddModalVisible(false);
      setNewGameForm({
        title: "",
        publisher: "GAYM Official",
        release_date: new Date().toLocaleDateString("th-TH"),
        price: "0",
        discount_percent: "0",
        tag: "Action",
        image_url: "",
        description: "",
        download_type: "url",
        download_url: "",
      });
      fetchAllAdminData();
      Alert.alert("สำเร็จ", "เพิ่มเกมใหม่เข้าสู่ร้านค้าเรียบร้อยแล้ว");
    } catch (error) {
      Alert.alert("เกิดข้อผิดพลาด", error.message);
    } finally {
      setSavingGame(false);
    }
  };

  const handleDeletePost = (postId) => {
    Alert.alert("ลบโพสต์แชทโลก", "ต้องการลบโพสต์นี้ใช่หรือไม่?", [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ลบ",
        style: "destructive",
        onPress: async () => {
          await supabase.from("community_posts").delete().eq("id", postId);
          fetchAllAdminData();
        },
      },
    ]);
  };

  const handleDeletePrivateMsg = (msgId) => {
    Alert.alert("ลบข้อความแชท", "ต้องการลบข้อความนี้ใช่หรือไม่?", [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ลบ",
        style: "destructive",
        onPress: async () => {
          await supabase.from("private_messages").delete().eq("id", msgId);
          fetchAllAdminData();
        },
      },
    ]);
  };

  // สถิติ Dashboard
  const totalUsers = profiles.length;
  const totalDevs = profiles.filter((p) => p.is_dev).length;
  const totalStandardUsers = totalUsers - totalDevs;
  const totalAdmins = profiles.filter((p) => p.is_admin).length;

  const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
  const onlineUsersCount =
    profiles.filter(
      (p) => p.last_seen && new Date(p.last_seen) >= fifteenMinsAgo,
    ).length || 1;

  const ageUnder18 = profiles.filter((p) => (p.age || 20) < 18).length;
  const age18to24 = profiles.filter(
    (p) => (p.age || 20) >= 18 && (p.age || 20) <= 24,
  ).length;
  const age25to34 = profiles.filter(
    (p) => (p.age || 20) >= 25 && (p.age || 20) <= 34,
  ).length;
  const age35Plus = profiles.filter((p) => (p.age || 20) >= 35).length;

  const unreviewedGames = games.filter((g) => !g.is_reviewed);
  const filteredUsers = profiles.filter((u) =>
    (u.username || "")
      .toLowerCase()
      .includes(userSearchQuery.trim().toLowerCase()),
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#ef4444" />
      </View>
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
          <Ionicons name="shield-half" size={22} color="#ef4444" />
          <Text style={styles.headerTitle}>ADMIN CONTROL</Text>
        </View>
        <TouchableOpacity onPress={fetchAllAdminData} style={styles.backBtn}>
          <Ionicons name="refresh" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* แถบเมนู 5 โหมดหลัก */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[
            styles.tabBtn,
            activeTab === "dashboard" && styles.tabBtnActive,
          ]}
          onPress={() => setActiveTab("dashboard")}
        >
          <Ionicons
            name="stats-chart"
            size={14}
            color={activeTab === "dashboard" ? "#fff" : "#9ca3af"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "dashboard" && styles.tabTextActive,
            ]}
          >
            สถิติ
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "games" && styles.tabBtnActive]}
          onPress={() => setActiveTab("games")}
        >
          <Ionicons
            name="game-controller"
            size={14}
            color={activeTab === "games" ? "#fff" : "#9ca3af"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "games" && styles.tabTextActive,
            ]}
          >
            จัดการเกม
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "inbox" && styles.tabBtnActive]}
          onPress={() => setActiveTab("inbox")}
        >
          <Ionicons
            name="mail-unread"
            size={14}
            color={activeTab === "inbox" ? "#fff" : "#9ca3af"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "inbox" && styles.tabTextActive,
            ]}
          >
            ตรวจ({unreviewedGames.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "chats" && styles.tabBtnActive]}
          onPress={() => setActiveTab("chats")}
        >
          <Ionicons
            name="chatbubbles"
            size={14}
            color={activeTab === "chats" ? "#fff" : "#9ca3af"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "chats" && styles.tabTextActive,
            ]}
          >
            ลบแชท
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "users" && styles.tabBtnActive]}
          onPress={() => setActiveTab("users")}
        >
          <Ionicons
            name="ban"
            size={14}
            color={activeTab === "users" ? "#fff" : "#9ca3af"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "users" && styles.tabTextActive,
            ]}
          >
            แบนผู้ใช้
          </Text>
        </TouchableOpacity>
      </View>

      {/* ========================================== */}
      {/* TAB 1: DASHBOARD */}
      {/* ========================================== */}
      {activeTab === "dashboard" && (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 50 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.onlineBanner}>
            <View style={styles.onlineDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.onlineTitle}>ผู้เล่นกำลังออนไลน์ขณะนี้</Text>
              <Text style={styles.onlineSub}>อัปเดตสถานะแบบ Real-time</Text>
            </View>
            <Text style={styles.onlineCount}>{onlineUsersCount} คน</Text>
          </View>

          <Text style={styles.sectionTitle}>
            สถิติบัญชีผู้ใช้งาน (Users & Roles)
          </Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="people" size={26} color="#3b82f6" />
              <Text style={styles.statNum}>{totalUsers}</Text>
              <Text style={styles.statLabel}>ผู้ใช้ทั้งหมด</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="person" size={26} color="#9ca3af" />
              <Text style={styles.statNum}>{totalStandardUsers}</Text>
              <Text style={styles.statLabel}>User ทั่วไป</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="code-slash" size={26} color="#10b981" />
              <Text style={styles.statNum}>{totalDevs}</Text>
              <Text style={styles.statLabel}>นักพัฒนา (DEV)</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="shield-checkmark" size={26} color="#ef4444" />
              <Text style={styles.statNum}>{totalAdmins}</Text>
              <Text style={styles.statLabel}>Admin</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>
            ช่วงอายุของผู้ใช้งาน (Age Demographics)
          </Text>
          <View style={styles.ageCard}>
            {[
              {
                label: "ต่ำกว่า 18 ปี (<18)",
                count: ageUnder18,
                color: "#f59e0b",
              },
              {
                label: "18 - 24 ปี (วัยเรียน/มหาลัย)",
                count: age18to24,
                color: "#3b82f6",
              },
              {
                label: "25 - 34 ปี (วัยทำงาน)",
                count: age25to34,
                color: "#10b981",
              },
              {
                label: "35 ปีขึ้นไป (35+)",
                count: age35Plus,
                color: "#8b5cf6",
              },
            ].map((group, idx) => {
              const percent =
                totalUsers > 0
                  ? Math.round((group.count / totalUsers) * 100)
                  : 0;
              return (
                <View key={idx} style={{ marginBottom: 14 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginBottom: 6,
                    }}
                  >
                    <Text style={{ color: "#e5e7eb", fontSize: 13 }}>
                      {group.label}
                    </Text>
                    <Text
                      style={{
                        color: "#fff",
                        fontWeight: "bold",
                        fontSize: 13,
                      }}
                    >
                      {group.count} คน ({percent}%)
                    </Text>
                  </View>
                  <View style={styles.progressBg}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${percent}%`, backgroundColor: group.color },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* ========================================== */}
      {/* TAB 2: จัดการเกม (แก้ไขทุกอย่าง + ยกเลิกติ๊กถูกได้) */}
      {/* ========================================== */}
      {activeTab === "games" && (
        <View style={{ flex: 1 }}>
          <View style={{ padding: 15, paddingBottom: 5 }}>
            <TouchableOpacity
              style={styles.addGameBtn}
              onPress={() => setAddModalVisible(true)}
            >
              <Ionicons name="add-circle" size={22} color="#fff" />
              <Text style={styles.addGameBtnText}>
                เพิ่มเกมใหม่ (สิทธิ์ Admin ไม่ต้องใช้ยศ DEV)
              </Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={games}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ padding: 15, paddingBottom: 80 }}
            renderItem={({ item }) => {
              const discount = item.discount_percent || 0;
              const originalPrice = item.price || 0;
              const finalPrice = Math.round(
                originalPrice * (1 - discount / 100),
              );

              return (
                <View style={styles.itemCard}>
                  <Image
                    source={{ uri: item.image_url || item.thumbnail }}
                    style={styles.gameThumb}
                  />
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <View style={styles.titleRow}>
                      <Text style={styles.itemTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      {item.is_reviewed && (
                        <Ionicons
                          name="checkmark-circle"
                          size={18}
                          color="#10b981"
                        />
                      )}
                    </View>
                    <Text style={styles.itemSub}>
                      ค่าย: {item.publisher || "Indie Studio"} • อัปโหลด:{" "}
                      {item.release_date || "-"}
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        marginTop: 4,
                      }}
                    >
                      <Text style={styles.priceText}>฿{finalPrice}</Text>
                      {discount > 0 && (
                        <>
                          <Text style={styles.oldPriceText}>
                            ฿{originalPrice}
                          </Text>
                          <View style={styles.discountBadge}>
                            <Text style={styles.discountBadgeText}>
                              -{discount}%
                            </Text>
                          </View>
                        </>
                      )}
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", gap: 6 }}>
                    {/* ✅ ปุ่มกดสลับติ๊กถูก / ยกเลิกการตรวจสอบ (เอาติ๊กออก) */}
                    <TouchableOpacity
                      style={[
                        styles.verifyToggleBtn,
                        item.is_reviewed
                          ? { backgroundColor: "rgba(16, 185, 129, 0.18)" }
                          : { backgroundColor: "rgba(156, 163, 175, 0.15)" },
                      ]}
                      onPress={() => handleToggleVerifyGame(item)}
                    >
                      <Ionicons
                        name={
                          item.is_reviewed
                            ? "checkmark-circle"
                            : "checkmark-circle-outline"
                        }
                        size={20}
                        color={item.is_reviewed ? "#10b981" : "#9ca3af"}
                      />
                    </TouchableOpacity>

                    {/* ปุ่มแก้ไขข้อมูลทั้งหมด */}
                    <TouchableOpacity
                      style={styles.editIconBtn}
                      onPress={() => openEditGameModal(item)}
                    >
                      <Ionicons
                        name="create-outline"
                        size={20}
                        color="#3b82f6"
                      />
                    </TouchableOpacity>

                    {/* ปุ่มลบเกม */}
                    <TouchableOpacity
                      style={styles.deleteIconBtn}
                      onPress={() => handleDeleteGame(item.id, item.title)}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color="#ef4444"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />
        </View>
      )}

      {/* ========================================== */}
      {/* TAB 3: กล่องข้อความตรวจเกมใหม่ */}
      {/* ========================================== */}
      {activeTab === "inbox" && (
        <FlatList
          data={unreviewedGames}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 15, paddingBottom: 80 }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons
                name="checkmark-done-circle-outline"
                size={60}
                color="#10b981"
              />
              <Text style={styles.emptyText}>
                ตรวจสอบเกมใหม่ครบทั้งหมดแล้ว!
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.inboxCard}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <Image
                  source={{ uri: item.image_url || item.thumbnail }}
                  style={styles.gameThumb}
                />
                <View style={{ flex: 1 }}>
                  <View style={styles.newUploadBadge}>
                    <Text style={styles.newUploadText}>
                      อัปโหลดเข้ามาใหม่ รอตรวจสอบ
                    </Text>
                  </View>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemSub}>
                    ค่าย: {item.publisher || "Indie Studio"} • วันที่:{" "}
                    {item.release_date || "-"}
                  </Text>
                  <Text style={styles.itemSub}>
                    ราคา: ฿{item.price || 0} • หมวด: {item.tag || "General"}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity
                  style={[
                    styles.inboxActionBtn,
                    { backgroundColor: "#10b981" },
                  ]}
                  onPress={() => handleToggleVerifyGame(item)}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                  <Text style={styles.inboxActionText}>
                    อนุมัติ (ติดติ๊กถูก)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.inboxActionBtn,
                    { backgroundColor: "#3b82f6" },
                  ]}
                  onPress={() => openEditGameModal(item)}
                >
                  <Ionicons name="create" size={18} color="#fff" />
                  <Text style={styles.inboxActionText}>แก้ไขข้อมูล</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.inboxActionBtn,
                    { backgroundColor: "#ef4444" },
                  ]}
                  onPress={() => handleDeleteGame(item.id, item.title)}
                >
                  <Ionicons name="trash" size={18} color="#fff" />
                  <Text style={styles.inboxActionText}>ลบออก</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* ========================================== */}
      {/* TAB 4: ลบแชท */}
      {/* ========================================== */}
      {activeTab === "chats" && (
        <ScrollView contentContainerStyle={{ padding: 15, paddingBottom: 80 }}>
          <Text style={styles.sectionTitle}>
            โพสต์ในแชทโลก ({posts.length})
          </Text>
          {posts.map((post) => (
            <View key={`post_${post.id}`} style={styles.itemCard}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text
                  style={{ color: "#3b82f6", fontWeight: "bold", fontSize: 13 }}
                >
                  ผู้โพสต์: {post.profiles?.username || "Unknown"}
                </Text>
                <Text
                  style={{ color: "#fff", fontSize: 14, marginTop: 4 }}
                  numberOfLines={2}
                >
                  {post.content || "[ส่งรูปภาพ]"}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.deleteIconBtn}
                onPress={() => handleDeletePost(post.id)}
              >
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))}

          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
            ข้อความแชทส่วนตัวล่าสุด ({privateMsgs.length})
          </Text>
          {privateMsgs.map((msg) => (
            <View key={`msg_${msg.id}`} style={styles.itemCard}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={{ color: "#9ca3af", fontSize: 11 }}>
                  จาก ID: {msg.sender_id?.slice(0, 8)}... ถึง:{" "}
                  {msg.receiver_id?.slice(0, 8)}...
                </Text>
                <Text
                  style={{ color: "#fff", fontSize: 14, marginTop: 4 }}
                  numberOfLines={2}
                >
                  {msg.message || "[ส่งรูปภาพ]"}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.deleteIconBtn}
                onPress={() => handleDeletePrivateMsg(msg.id)}
              >
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* ========================================== */}
      {/* TAB 5: ค้นหาและแบน/ปลดแบนผู้ใช้ */}
      {/* ========================================== */}
      {activeTab === "users" && (
        <View style={{ flex: 1, paddingHorizontal: 15 }}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color="#9ca3af" />
            <TextInput
              style={styles.searchInput}
              placeholder="ค้นหาชื่อ username เพื่อแบน หรือ ปลดแบน..."
              placeholderTextColor="#6b7280"
              value={userSearchQuery}
              onChangeText={setUserSearchQuery}
              autoCapitalize="none"
            />
            {userSearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setUserSearchQuery("")}>
                <Ionicons name="close-circle" size={20} color="#6b7280" />
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={filteredUsers}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 80 }}
            renderItem={({ item }) => {
              const isBanned =
                item.banned_until && new Date(item.banned_until) > new Date();

              return (
                <View
                  style={[
                    styles.itemCard,
                    isBanned && {
                      borderColor: "#ef4444",
                      backgroundColor: "rgba(239, 68, 68, 0.08)",
                    },
                  ]}
                >
                  <View style={styles.userAvatar}>
                    {item.avatar_url ? (
                      <Image
                        source={{ uri: item.avatar_url }}
                        style={{ width: "100%", height: "100%" }}
                      />
                    ) : (
                      <Text
                        style={{
                          color: "#fff",
                          fontWeight: "bold",
                          fontSize: 18,
                        }}
                      >
                        {item.username?.[0]?.toUpperCase() || "U"}
                      </Text>
                    )}
                  </View>

                  <View style={{ flex: 1, marginRight: 10 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 6,
                      }}
                    >
                      <Text style={styles.itemTitle}>
                        {item.username || "Unknown"}
                      </Text>
                      {item.is_dev ? (
                        <View
                          style={[
                            styles.roleBadge,
                            { backgroundColor: "#10b981" },
                          ]}
                        >
                          <Text style={styles.roleBadgeText}>DEV</Text>
                        </View>
                      ) : (
                        <View
                          style={[
                            styles.roleBadge,
                            { backgroundColor: "#3b82f6" },
                          ]}
                        >
                          <Text style={styles.roleBadgeText}>USER</Text>
                        </View>
                      )}
                    </View>

                    {isBanned ? (
                      <Text
                        style={{
                          color: "#ef4444",
                          fontSize: 12,
                          marginTop: 4,
                          fontWeight: "bold",
                        }}
                      >
                        ถูกแบนถึง:{" "}
                        {new Date(item.banned_until).toLocaleString("th-TH")}
                      </Text>
                    ) : (
                      <Text
                        style={{ color: "#10b981", fontSize: 12, marginTop: 4 }}
                      >
                        สถานะ: ปกติ
                      </Text>
                    )}
                  </View>

                  {isBanned ? (
                    <TouchableOpacity
                      style={styles.unbanBtn}
                      onPress={() => handleUnbanUser(item)}
                    >
                      <Ionicons name="lock-open" size={16} color="#fff" />
                      <Text style={styles.banBtnText}>ปลดแบน</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.banBtn}
                      onPress={() => openBanModal(item)}
                    >
                      <Ionicons name="ban" size={16} color="#fff" />
                      <Text style={styles.banBtnText}>แบน</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            }}
          />
        </View>
      )}

      {/* ========================================== */}
      {/* ✅ MODAL แก้ไขข้อมูลเกมทุกอย่างใน Game Detail + เอาติ๊กถูกออกได้ */}
      {/* ========================================== */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Text style={{ color: "#ef4444", fontSize: 16 }}>ยกเลิก</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>แก้ไขข้อมูลเกม (Admin)</Text>
              <TouchableOpacity
                onPress={handleSaveGameEdit}
                disabled={savingGame}
              >
                {savingGame ? (
                  <ActivityIndicator size="small" color="#10b981" />
                ) : (
                  <Text
                    style={{
                      color: "#10b981",
                      fontSize: 16,
                      fontWeight: "bold",
                    }}
                  >
                    บันทึก
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              {/* ✅ สวิตช์ตรวจสอบเกม / ยกเลิกการตรวจสอบ (เอาติ๊กถูกออก) */}
              <View style={styles.verifySwitchCard}>
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Ionicons
                      name={
                        editGameForm.is_reviewed
                          ? "checkmark-circle"
                          : "close-circle"
                      }
                      size={20}
                      color={editGameForm.is_reviewed ? "#10b981" : "#9ca3af"}
                    />
                    <Text
                      style={{
                        color: "#fff",
                        fontWeight: "bold",
                        fontSize: 15,
                      }}
                    >
                      สถานะการตรวจสอบ (เครื่องหมายติ๊กถูก)
                    </Text>
                  </View>
                  <Text
                    style={{ color: "#9ca3af", fontSize: 12, marginTop: 4 }}
                  >
                    {editGameForm.is_reviewed
                      ? "ผ่านการตรวจสอบแล้ว (ปิดสวิตช์เพื่อเอาติ๊กถูกออก)"
                      : "ยังไม่ได้รับการตรวจสอบ (เปิดสวิตช์เพื่อติดติ๊กถูก)"}
                  </Text>
                </View>
                <Switch
                  value={editGameForm.is_reviewed}
                  onValueChange={(val) =>
                    setEditGameForm({ ...editGameForm, is_reviewed: val })
                  }
                  trackColor={{ false: "#374151", true: "#10b981" }}
                  thumbColor="#fff"
                />
              </View>

              <Text style={styles.label}>ชื่อเกม (Title)</Text>
              <TextInput
                style={styles.input}
                value={editGameForm.title}
                onChangeText={(t) =>
                  setEditGameForm({ ...editGameForm, title: t })
                }
              />

              {/* ✅ แก้ไขชื่อค่ายเกม และ วันที่อัปโหลด */}
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>ชื่อค่ายเกม (Publisher)</Text>
                  <TextInput
                    style={styles.input}
                    value={editGameForm.publisher}
                    onChangeText={(t) =>
                      setEditGameForm({ ...editGameForm, publisher: t })
                    }
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>วันที่อัปโหลด</Text>
                  <TextInput
                    style={styles.input}
                    value={editGameForm.release_date}
                    onChangeText={(t) =>
                      setEditGameForm({ ...editGameForm, release_date: t })
                    }
                  />
                </View>
              </View>

              {/* ราคา และ ส่วนลด */}
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>ราคาเต็ม (บาท)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={editGameForm.price}
                    onChangeText={(t) =>
                      setEditGameForm({ ...editGameForm, price: t })
                    }
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>ส่วนลด (%)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={editGameForm.discount_percent}
                    onChangeText={(t) =>
                      setEditGameForm({ ...editGameForm, discount_percent: t })
                    }
                  />
                </View>
              </View>

              <Text style={styles.label}>หมวดหมู่ (Tag / Genre)</Text>
              <TextInput
                style={styles.input}
                value={editGameForm.tag}
                onChangeText={(t) =>
                  setEditGameForm({ ...editGameForm, tag: t })
                }
              />

              {/* ✅ แก้ไขรูปปกเกม (เลือกได้ทั้ง URL และ อัปโหลดจากเครื่อง) */}
              <Text style={styles.label}>รูปปกเกม (Cover Image)</Text>
              <View style={styles.modeSwitchRow}>
                <TouchableOpacity
                  style={[
                    styles.modeBtn,
                    coverEditMode === "url" && styles.modeBtnActive,
                  ]}
                  onPress={() => setCoverEditMode("url")}
                >
                  <Text style={styles.modeBtnText}>ใส่ลิงก์ URL</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modeBtn,
                    coverEditMode === "device" && styles.modeBtnActive,
                  ]}
                  onPress={() => setCoverEditMode("device")}
                >
                  <Text style={styles.modeBtnText}>อัปโหลดจากเครื่อง</Text>
                </TouchableOpacity>
              </View>

              {coverEditMode === "url" ? (
                <TextInput
                  style={styles.input}
                  placeholder="https://..."
                  placeholderTextColor="#6b7280"
                  value={editGameForm.image_url}
                  onChangeText={(t) =>
                    setEditGameForm({ ...editGameForm, image_url: t })
                  }
                />
              ) : (
                <TouchableOpacity
                  style={styles.uploadPickerBtn}
                  onPress={handlePickEditCover}
                >
                  <Ionicons name="image-outline" size={20} color="#fff" />
                  <Text style={{ color: "#fff", fontWeight: "bold" }}>
                    เลือกรูปปกใหม่จากเครื่อง
                  </Text>
                </TouchableOpacity>
              )}

              {editGameForm.image_url ? (
                <Image
                  source={{ uri: editGameForm.image_url }}
                  style={styles.coverPreviewModal}
                />
              ) : null}

              {/* ✅ แก้ไข Gallery (เพิ่ม/ลบรูปและวิดีโอ) */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Text style={styles.label}>
                  แกลเลอรี ({editGameForm.gallery_media?.length || 0} ไฟล์)
                </Text>
                <TouchableOpacity
                  style={styles.smallAddBtn}
                  onPress={handleAddEditGallery}
                >
                  <Ionicons name="add-circle" size={16} color="#fff" />
                  <Text
                    style={{ color: "#fff", fontSize: 12, fontWeight: "bold" }}
                  >
                    เพิ่มรูป/วิดีโอ
                  </Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 15 }}
              >
                {(editGameForm.gallery_media || []).map((g, idx) => (
                  <View key={idx} style={styles.galleryEditItem}>
                    <Image
                      source={{ uri: g.url }}
                      style={{ width: "100%", height: "100%" }}
                    />
                    <TouchableOpacity
                      style={styles.galleryRemoveIcon}
                      onPress={() => handleRemoveEditGallery(idx)}
                    >
                      <Ionicons name="close-circle" size={22} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>

              {/* ✅ แก้ไขรูปแบบไฟล์เกม (URL / .APK) */}
              <Text style={styles.label}>รูปแบบไฟล์เกม (URL / .APK)</Text>
              <View style={styles.modeSwitchRow}>
                <TouchableOpacity
                  style={[
                    styles.modeBtn,
                    editGameForm.download_type === "url" &&
                      styles.modeBtnActive,
                  ]}
                  onPress={() =>
                    setEditGameForm({ ...editGameForm, download_type: "url" })
                  }
                >
                  <Text style={styles.modeBtnText}>ลิงก์ URL</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modeBtn,
                    editGameForm.download_type === "apk" &&
                      styles.modeBtnActive,
                  ]}
                  onPress={() =>
                    setEditGameForm({ ...editGameForm, download_type: "apk" })
                  }
                >
                  <Text style={styles.modeBtnText}>ไฟล์ .APK</Text>
                </TouchableOpacity>
              </View>

              {editGameForm.download_type === "url" ? (
                <TextInput
                  style={styles.input}
                  placeholder="ลิงก์สำหรับเข้าเล่นเกม..."
                  placeholderTextColor="#6b7280"
                  value={editGameForm.download_url}
                  onChangeText={(t) =>
                    setEditGameForm({ ...editGameForm, download_url: t })
                  }
                />
              ) : (
                <TouchableOpacity
                  style={styles.uploadPickerBtn}
                  onPress={handlePickEditApk}
                >
                  <Ionicons name="logo-android" size={20} color="#fff" />
                  <Text style={{ color: "#fff", fontWeight: "bold" }}>
                    เลือกไฟล์ .APK ใหม่จากเครื่อง
                  </Text>
                </TouchableOpacity>
              )}

              {/* ✅ แก้ไข / ลบ QR Code โดเนท */}
              <Text style={styles.label}>QR Code โดเนทประจำเกม</Text>
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 15 }}>
                <TouchableOpacity
                  style={[styles.uploadPickerBtn, { flex: 1, marginBottom: 0 }]}
                  onPress={handlePickEditQr}
                >
                  <Ionicons name="qr-code-outline" size={18} color="#fff" />
                  <Text
                    style={{ color: "#fff", fontWeight: "bold", fontSize: 13 }}
                  >
                    เปลี่ยนรูป QR
                  </Text>
                </TouchableOpacity>
                {editGameForm.donate_qr_url ? (
                  <TouchableOpacity
                    style={[
                      styles.uploadPickerBtn,
                      { backgroundColor: "#ef4444", flex: 1, marginBottom: 0 },
                    ]}
                    onPress={() =>
                      setEditGameForm({ ...editGameForm, donate_qr_url: "" })
                    }
                  >
                    <Ionicons name="trash-outline" size={18} color="#fff" />
                    <Text
                      style={{
                        color: "#fff",
                        fontWeight: "bold",
                        fontSize: 13,
                      }}
                    >
                      ลบรูป QR
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <Text style={styles.label}>รายละเอียดเกม (Description)</Text>
              <TextInput
                style={[
                  styles.input,
                  { height: 100, textAlignVertical: "top" },
                ]}
                multiline
                value={editGameForm.description}
                onChangeText={(t) =>
                  setEditGameForm({ ...editGameForm, description: t })
                }
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL เพิ่มเกมใหม่โดย Admin */}
      <Modal visible={addModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Text style={{ color: "#ef4444", fontSize: 16 }}>ยกเลิก</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>เพิ่มเกมใหม่ (Admin)</Text>
              <TouchableOpacity
                onPress={handleAddGameByAdmin}
                disabled={savingGame}
              >
                {savingGame ? (
                  <ActivityIndicator size="small" color="#10b981" />
                ) : (
                  <Text
                    style={{
                      color: "#10b981",
                      fontSize: 16,
                      fontWeight: "bold",
                    }}
                  >
                    เพิ่มเกม
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>ชื่อเกม *</Text>
              <TextInput
                style={styles.input}
                placeholder="ระบุชื่อเกม..."
                placeholderTextColor="#6b7280"
                value={newGameForm.title}
                onChangeText={(t) =>
                  setNewGameForm({ ...newGameForm, title: t })
                }
              />

              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>ชื่อค่ายเกม</Text>
                  <TextInput
                    style={styles.input}
                    value={newGameForm.publisher}
                    onChangeText={(t) =>
                      setNewGameForm({ ...newGameForm, publisher: t })
                    }
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>วันที่อัปโหลด</Text>
                  <TextInput
                    style={styles.input}
                    value={newGameForm.release_date}
                    onChangeText={(t) =>
                      setNewGameForm({ ...newGameForm, release_date: t })
                    }
                  />
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>ราคา (บาท)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={newGameForm.price}
                    onChangeText={(t) =>
                      setNewGameForm({ ...newGameForm, price: t })
                    }
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>ส่วนลดเริ่มต้น (%)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={newGameForm.discount_percent}
                    onChangeText={(t) =>
                      setNewGameForm({ ...newGameForm, discount_percent: t })
                    }
                  />
                </View>
              </View>

              <Text style={styles.label}>หมวดหมู่</Text>
              <TextInput
                style={styles.input}
                value={newGameForm.tag}
                onChangeText={(t) => setNewGameForm({ ...newGameForm, tag: t })}
              />

              <Text style={styles.label}>รูปปกเกม</Text>
              <View style={styles.modeSwitchRow}>
                <TouchableOpacity
                  style={[
                    styles.modeBtn,
                    newCoverMode === "url" && styles.modeBtnActive,
                  ]}
                  onPress={() => setNewCoverMode("url")}
                >
                  <Text style={styles.modeBtnText}>ลิงก์ URL</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modeBtn,
                    newCoverMode === "device" && styles.modeBtnActive,
                  ]}
                  onPress={() => setNewCoverMode("device")}
                >
                  <Text style={styles.modeBtnText}>อัปโหลดจากเครื่อง</Text>
                </TouchableOpacity>
              </View>

              {newCoverMode === "url" ? (
                <TextInput
                  style={styles.input}
                  placeholder="https://..."
                  placeholderTextColor="#6b7280"
                  value={newGameForm.image_url}
                  onChangeText={(t) =>
                    setNewGameForm({ ...newGameForm, image_url: t })
                  }
                />
              ) : (
                <TouchableOpacity
                  style={styles.uploadPickerBtn}
                  onPress={handlePickNewCover}
                >
                  <Ionicons name="image-outline" size={20} color="#fff" />
                  <Text style={{ color: "#fff", fontWeight: "bold" }}>
                    เลือกรูปปกจากเครื่อง
                  </Text>
                </TouchableOpacity>
              )}

              <Text style={styles.label}>รายละเอียดเกม</Text>
              <TextInput
                style={[styles.input, { height: 90, textAlignVertical: "top" }]}
                multiline
                placeholder="คำอธิบายเกม..."
                placeholderTextColor="#6b7280"
                value={newGameForm.description}
                onChangeText={(t) =>
                  setNewGameForm({ ...newGameForm, description: t })
                }
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL ตั้งเวลาแบนผู้ใช้ */}
      <Modal visible={banModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { height: "auto", paddingBottom: 30 }]}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setBanModalVisible(false)}>
                <Text style={{ color: "#9ca3af", fontSize: 16 }}>ยกเลิก</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>ตั้งเวลาแบนผู้ใช้</Text>
              <View style={{ width: 40 }} />
            </View>

            <Text
              style={{
                color: "#fff",
                fontSize: 16,
                fontWeight: "bold",
                marginBottom: 15,
              }}
            >
              เป้าหมาย:{" "}
              <Text style={{ color: "#ef4444" }}>
                {targetBanUser?.username}
              </Text>
            </Text>

            <Text style={styles.label}>ระบุจำนวนเวลาที่ต้องการแบน</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={banDuration}
              onChangeText={setBanDuration}
            />

            <Text style={styles.label}>เลือกหน่วยเวลา</Text>
            <View style={styles.unitGrid}>
              {timeUnits.map((unit) => (
                <TouchableOpacity
                  key={unit.key}
                  style={[
                    styles.unitPill,
                    banUnit === unit.key && styles.unitPillActive,
                  ]}
                  onPress={() => setBanUnit(unit.key)}
                >
                  <Text
                    style={[
                      styles.unitPillText,
                      banUnit === unit.key && { color: "#fff" },
                    ]}
                  >
                    {unit.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.confirmBanBtn}
              onPress={handleConfirmBan}
            >
              <Ionicons name="ban" size={20} color="#fff" />
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "bold" }}>
                ยืนยันการแบนและบังคับออกจากระบบ
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    letterSpacing: 1,
  },

  tabBar: {
    flexDirection: "row",
    backgroundColor: "#1a1a2e",
    margin: 15,
    borderRadius: 12,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 3,
  },
  tabBtnActive: { backgroundColor: "#ef4444" },
  tabText: { color: "#9ca3af", fontSize: 10, fontWeight: "bold" },
  tabTextActive: { color: "#fff" },

  onlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.4)",
    padding: 18,
    borderRadius: 16,
    marginBottom: 20,
  },
  onlineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#10b981",
    marginRight: 14,
  },
  onlineTitle: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  onlineSub: { color: "#9ca3af", fontSize: 12, marginTop: 2 },
  onlineCount: { color: "#10b981", fontSize: 26, fontWeight: "bold" },

  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 22,
  },
  statCard: {
    width: "48%",
    backgroundColor: "#1a1a2e",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2a2a4a",
    alignItems: "center",
  },
  statNum: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginVertical: 6,
  },
  statLabel: { color: "#9ca3af", fontSize: 12 },

  ageCard: {
    backgroundColor: "#1a1a2e",
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2a2a4a",
    marginBottom: 22,
  },
  progressBg: {
    height: 8,
    backgroundColor: "#0a0a1a",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 4 },

  addGameBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10b981",
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  addGameBtnText: { color: "#fff", fontWeight: "bold", fontSize: 14 },

  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a2e",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#2a2a4a",
  },
  gameThumb: {
    width: 65,
    height: 65,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: "#0a0a1a",
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  itemTitle: { color: "#fff", fontSize: 15, fontWeight: "bold", flexShrink: 1 },
  itemSub: { color: "#9ca3af", fontSize: 11, marginTop: 2 },
  priceText: { color: "#10b981", fontSize: 14, fontWeight: "bold" },
  oldPriceText: {
    color: "#6b7280",
    fontSize: 12,
    textDecorationLine: "line-through",
  },
  discountBadge: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountBadgeText: { color: "#fff", fontSize: 10, fontWeight: "bold" },

  verifyToggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  editIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },

  inboxCard: {
    backgroundColor: "#1a1a2e",
    padding: 15,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f59e0b",
  },
  newUploadBadge: {
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  newUploadText: { color: "#f59e0b", fontSize: 10, fontWeight: "bold" },
  inboxActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  inboxActionText: { color: "#fff", fontSize: 12, fontWeight: "bold" },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#2a2a4a",
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 10,
    fontSize: 14,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    overflow: "hidden",
  },
  roleBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  roleBadgeText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  banBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ef4444",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 5,
  },
  unbanBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10b981",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 5,
  },
  banBtnText: { color: "#fff", fontSize: 12, fontWeight: "bold" },

  unitGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  unitPill: {
    width: "30%",
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#0a0a1a",
    borderWidth: 1,
    borderColor: "#2a2a4a",
    alignItems: "center",
  },
  unitPillActive: { backgroundColor: "#ef4444", borderColor: "#ef4444" },
  unitPillText: { color: "#9ca3af", fontSize: 13, fontWeight: "bold" },
  confirmBanBtn: {
    flexDirection: "row",
    backgroundColor: "#ef4444",
    paddingVertical: 15,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },

  verifySwitchCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0a0a1a",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2a2a4a",
    marginBottom: 16,
  },
  modeSwitchRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#0a0a1a",
    borderWidth: 1,
    borderColor: "#2a2a4a",
    alignItems: "center",
  },
  modeBtnActive: { backgroundColor: "#3b82f6", borderColor: "#3b82f6" },
  modeBtnText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  uploadPickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3b82f6",
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 12,
    gap: 8,
  },
  coverPreviewModal: {
    width: "100%",
    height: 140,
    borderRadius: 10,
    marginBottom: 15,
    backgroundColor: "#0a0a1a",
  },
  smallAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10b981",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  galleryEditItem: {
    width: 110,
    height: 75,
    borderRadius: 8,
    marginRight: 10,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#0a0a1a",
  },
  galleryRemoveIcon: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "#0a0a1a",
    borderRadius: 12,
  },

  emptyBox: { alignItems: "center", marginTop: 60 },
  emptyText: { color: "#9ca3af", marginTop: 12, fontSize: 15 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#1a1a2e",
    height: "90%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 15,
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a4a",
  },
  modalTitle: { color: "#fff", fontSize: 17, fontWeight: "bold" },
  label: {
    color: "#9ca3af",
    fontSize: 13,
    marginBottom: 6,
    fontWeight: "bold",
  },
  input: {
    backgroundColor: "#0a0a1a",
    color: "#fff",
    padding: 14,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#2a2a4a",
  },
});
