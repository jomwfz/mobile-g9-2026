import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Linking,
  Modal,
  TextInput,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { supabase } from "../../services/supabaseClient";

export default function GameDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false); // ✅ เช็คสิทธิ์ Admin
  const [game, setGame] = useState(null);
  const [inLibrary, setInLibrary] = useState(false);
  const [inCart, setInCart] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingAdminEdit, setSavingAdminEdit] = useState(false);

  // Modal แสดง QR Code และรูป Gallery
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState(null);

  // ✅ Modal สำหรับ Admin แก้ไขทุกอย่างในหน้า Game Detail
  const [adminEditVisible, setAdminEditVisible] = useState(false);
  const [coverInputMode, setCoverInputMode] = useState("url"); // 'url' | 'device'
  const [editForm, setEditForm] = useState({
    title: "",
    publisher: "",
    release_date: "",
    price: "0",
    discount_percent: "0",
    tag: "",
    image_url: "",
    description: "",
    download_type: "url",
    download_url: "",
    donate_qr_url: "",
    gallery_media: [],
    is_reviewed: false,
  });

  useFocusEffect(
    useCallback(() => {
      loadGameDetail();
    }, [id]),
  );

  const loadGameDetail = async () => {
    try {
      setLoading(true);
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      setSession(currentSession);

      if (currentSession) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", currentSession.user.id)
          .maybeSingle();
        setIsAdmin(!!profileData?.is_admin);
      }

      // 1. ดึงข้อมูลเกมจาก Supabase
      const { data: dbGame } = await supabase
        .from("games")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      let gameData = dbGame;

      // 2. ถ้าเป็นเกมจาก FreeToGame API ให้ดึงข้อมูลมาผสมกัน
      try {
        const res = await fetch(`https://www.freetogame.com/api/game?id=${id}`);
        if (res.ok) {
          const apiGame = await res.json();
          const apiScreenshots = (apiGame.screenshots || []).map((s) => ({
            url: s.image,
            type: "image",
          }));

          gameData = {
            ...apiGame,
            ...dbGame,
            id: dbGame?.id || apiGame.id,
            title: dbGame?.title || apiGame.title,
            publisher:
              dbGame?.publisher ||
              apiGame.publisher ||
              apiGame.developer ||
              "Indie Studio",
            release_date: dbGame?.release_date || apiGame.release_date || "-",
            image_url: dbGame?.image_url || apiGame.thumbnail,
            gallery_media:
              dbGame?.gallery_media && dbGame.gallery_media.length > 0
                ? dbGame.gallery_media
                : apiScreenshots,
            tag: dbGame?.tag || apiGame.genre,
            description:
              dbGame?.description ||
              apiGame.short_description ||
              apiGame.description,
            price: dbGame?.price ?? 0,
            discount_percent: dbGame?.discount_percent ?? 0,
            is_reviewed: dbGame?.is_reviewed ?? false,
            download_type: dbGame?.download_type || "url",
            download_url:
              dbGame?.download_url ||
              apiGame.game_url ||
              apiGame.freetogame_profile_url,
            donate_qr_url: dbGame?.donate_qr_url || null,
          };
        }
      } catch (e) {
        // กรณีเป็นเกมใน Supabase ล้วน
      }

      setGame(gameData);

      if (currentSession && gameData) {
        const { data: libItem } = await supabase
          .from("user_library")
          .select("id")
          .eq("user_id", currentSession.user.id)
          .eq("game_id", id)
          .maybeSingle();
        setInLibrary(!!libItem);

        const { data: cartItem } = await supabase
          .from("user_cart")
          .select("id")
          .eq("user_id", currentSession.user.id)
          .eq("game_id", id)
          .maybeSingle();
        setInCart(!!cartItem);
      }
    } catch (error) {
      console.error("Error loading game detail:", error.message);
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชันอัปโหลดไฟล์จากเครื่องขึ้น Supabase
  const uploadMediaIfLocal = async (uri, folder) => {
    if (!uri) return null;
    if (uri.startsWith("http://") || uri.startsWith("https://")) return uri;

    const ext =
      uri.substring(uri.lastIndexOf(".") + 1)?.toLowerCase() || "jpeg";
    const fileName = `${folder}/admin-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: "base64",
    });
    const isVideo = ["mp4", "mov", "avi", "mkv", "webm"].includes(ext);

    const { error: uploadError } = await supabase.storage
      .from("images")
      .upload(fileName, decode(base64), {
        contentType: isVideo ? "video/mp4" : `image/${ext}`,
        upsert: true,
      });

    if (uploadError) throw uploadError;
    const { data: publicUrlData } = supabase.storage
      .from("images")
      .getPublicUrl(fileName);
    return publicUrlData.publicUrl;
  };

  // ✅ เปิดหน้าต่างแก้ไขเกมสำหรับ Admin
  const handleOpenAdminEdit = () => {
    if (!game) return;
    setCoverInputMode("url");
    setEditForm({
      title: game.title || "",
      publisher: game.publisher || "Indie Studio",
      release_date: game.release_date || "-",
      price: String(game.price ?? 0),
      discount_percent: String(game.discount_percent ?? 0),
      tag: game.tag || game.genre || "Action",
      image_url: game.image_url || game.thumbnail || "",
      description: game.description || "",
      download_type: game.download_type || "url",
      download_url: game.download_url || "",
      donate_qr_url: game.donate_qr_url || "",
      gallery_media: Array.isArray(game.gallery_media)
        ? game.gallery_media
        : [],
      is_reviewed: !!game.is_reviewed,
    });
    setAdminEditVisible(true);
  };

  // เลือกรูปปกจากเครื่อง
  const handlePickCoverDevice = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled) {
      setEditForm((prev) => ({ ...prev, image_url: result.assets[0].uri }));
    }
  };

  // เพิ่มรูป/วิดีโอเข้า Gallery
  const handleAddGalleryMedia = async () => {
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
      setEditForm((prev) => ({
        ...prev,
        gallery_media: [...(prev.gallery_media || []), ...added],
      }));
    }
  };

  // ✅ กดสลับสถานะการตรวจสอบ (ติดติ๊กถูก / เอาติ๊กถูกออก) ทันทีจากหน้า Game Detail
  const handleQuickToggleReviewed = async () => {
    if (!isAdmin || !game) return;
    const nextReviewed = !game.is_reviewed;
    try {
      const { error } = await supabase.from("games").upsert({
        id: game.id,
        title: game.title,
        publisher: game.publisher || "Indie Studio",
        release_date: game.release_date || "-",
        price: game.price || 0,
        discount_percent: game.discount_percent || 0,
        image_url: game.image_url || game.thumbnail,
        gallery_media: game.gallery_media || [],
        tag: game.tag || game.genre || "Action",
        description: game.description || "",
        download_type: game.download_type || "url",
        download_url: game.download_url || "",
        donate_qr_url: game.donate_qr_url || null,
        is_reviewed: nextReviewed,
      });

      if (error) throw error;
      setGame({ ...game, is_reviewed: nextReviewed });
      Alert.alert(
        "อัปเดตสถานะสำเร็จ",
        nextReviewed
          ? "อนุมัติเกมและแสดงเครื่องหมายติ๊กถูกเรียบร้อยแล้ว"
          : "ยกเลิกการตรวจสอบ (นำเครื่องหมายติ๊กถูกออก) เรียบร้อยแล้ว",
      );
    } catch (error) {
      Alert.alert("เกิดข้อผิดพลาด", error.message);
    }
  };

  // ✅ บันทึกการแก้ไขข้อมูลทั้งหมดใน Game Detail โดย Admin
  const handleSaveAdminEdit = async () => {
    setSavingAdminEdit(true);
    try {
      const priceNum = parseFloat(editForm.price) || 0;
      const discountNum = Math.min(
        100,
        Math.max(0, parseInt(editForm.discount_percent) || 0),
      );

      const finalCover = await uploadMediaIfLocal(
        editForm.image_url.trim(),
        "games/covers",
      );
      const finalQr = editForm.donate_qr_url
        ? await uploadMediaIfLocal(editForm.donate_qr_url, "qrs")
        : null;

      const finalGallery = [];
      for (const item of editForm.gallery_media || []) {
        const url = await uploadMediaIfLocal(item.url, "games/gallery");
        finalGallery.push({ url, type: item.type || "image" });
      }

      const payload = {
        id: game.id,
        title: editForm.title.trim(),
        publisher: editForm.publisher.trim() || "Indie Studio",
        release_date: editForm.release_date.trim() || "-",
        price: priceNum,
        discount_percent: discountNum,
        tag: editForm.tag.trim() || "Action",
        image_url: finalCover,
        description: editForm.description.trim(),
        download_type: editForm.download_type || "url",
        download_url: editForm.download_url.trim(),
        donate_qr_url: finalQr,
        gallery_media: finalGallery,
        is_reviewed: editForm.is_reviewed,
      };

      const { error } = await supabase.from("games").upsert(payload);
      if (error) throw error;

      setAdminEditVisible(false);
      loadGameDetail();
      Alert.alert("สำเร็จ", "บันทึกการแก้ไขข้อมูลเกมเรียบร้อยแล้ว");
    } catch (error) {
      Alert.alert("เกิดข้อผิดพลาด", error.message);
    } finally {
      setSavingAdminEdit(false);
    }
  };

  const handleAddToCart = async () => {
    if (!session) {
      Alert.alert("แจ้งเตือน", "กรุณาเข้าสู่ระบบก่อนสั่งซื้อเกม");
      router.push("/(auth)/login");
      return;
    }

    try {
      const discount = game.discount_percent || 0;
      const finalPrice = Math.round((game.price || 0) * (1 - discount / 100));

      await supabase.from("games").upsert({
        id: game.id,
        title: game.title,
        publisher: game.publisher || "Indie Studio",
        release_date: game.release_date || "-",
        price: finalPrice,
        image_url: game.image_url || game.thumbnail,
        gallery_media: game.gallery_media || [],
        tag: game.tag || game.genre || "Action",
        is_reviewed: game.is_reviewed || false,
        download_type: game.download_type || "url",
        download_url: game.download_url || game.game_url || "",
        donate_qr_url: game.donate_qr_url || null,
      });

      const { error } = await supabase.from("user_cart").insert({
        user_id: session.user.id,
        game_id: game.id,
      });

      if (error) throw error;
      setInCart(true);
      Alert.alert("สำเร็จ", "เพิ่มเกมลงในตะกร้าเรียบร้อยแล้ว");
    } catch (error) {
      Alert.alert("เกิดข้อผิดพลาด", error.message);
    }
  };

  const handlePlayGame = async () => {
    const targetUrl = game?.download_url || game?.game_url;

    if (!targetUrl) {
      Alert.alert(
        "แจ้งเตือน",
        "ผู้พัฒนาไม่ได้ระบุลิงก์หรือไฟล์สำหรับเกมนี้ไว้",
      );
      return;
    }

    if (
      game?.download_type === "apk" ||
      targetUrl.toLowerCase().endsWith(".apk")
    ) {
      Alert.alert(
        "ติดตั้งเกม (.APK)",
        `กำลังดาวน์โหลดและเปิดระบบติดตั้งแอปของมือถือสำหรับ "${game.title}"`,
        [
          { text: "ยกเลิก", style: "cancel" },
          {
            text: "ดาวน์โหลด & ติดตั้ง",
            onPress: async () => {
              try {
                await Linking.openURL(targetUrl);
              } catch (err) {
                Alert.alert("ข้อผิดพลาด", "ไม่สามารถเปิดไฟล์ติดตั้ง .apk ได้");
              }
            },
          },
        ],
      );
    } else {
      try {
        await Linking.openURL(targetUrl);
      } catch (err) {
        Alert.alert("ข้อผิดพลาด", "ไม่สามารถเปิดลิงก์ URL นี้ได้");
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!game) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={{ color: "#9ca3af" }}>ไม่พบข้อมูลเกมนี้</Text>
        </View>
      </SafeAreaView>
    );
  }

  const discount = game.discount_percent || 0;
  const originalPrice = game.price || 0;
  const finalPrice = Math.round(originalPrice * (1 - discount / 100));
  const isApk =
    game.download_type === "apk" ||
    game.download_url?.toLowerCase().endsWith(".apk");
  const galleryList = Array.isArray(game.gallery_media)
    ? game.gallery_media
    : [];

  return (
    <View style={styles.container}>
      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
        <View style={styles.bannerWrapper}>
          <Image
            source={{ uri: game.image_url || game.thumbnail }}
            style={styles.bannerImage}
          />
          <SafeAreaView style={styles.topBar}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.iconBtn}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/cart")}
              style={styles.iconBtn}
            >
              <Ionicons name="cart" size={22} color="#fff" />
            </TouchableOpacity>
          </SafeAreaView>
        </View>

        <View style={styles.content}>
          {/* ✅ แถบจัดการด่วนสำหรับ Admin (แสดงเฉพาะ Admin เท่านั้น) */}
          {isAdmin && (
            <View style={styles.adminQuickBar}>
              <TouchableOpacity
                style={styles.adminEditBtn}
                onPress={handleOpenAdminEdit}
              >
                <Ionicons name="create-outline" size={18} color="#fff" />
                <Text style={styles.adminBtnText}>แก้ไขข้อมูลเกม (Admin)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.adminVerifyBtn,
                  game.is_reviewed
                    ? { backgroundColor: "#ef4444" }
                    : { backgroundColor: "#10b981" },
                ]}
                onPress={handleQuickToggleReviewed}
              >
                <Ionicons
                  name={
                    game.is_reviewed
                      ? "close-circle-outline"
                      : "checkmark-circle-outline"
                  }
                  size={18}
                  color="#fff"
                />
                <Text style={styles.adminBtnText}>
                  {game.is_reviewed ? "เอาติ๊กถูกออก" : "อนุมัติติ๊กถูก"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ชื่อเกม พร้อมสัญลักษณ์ติ๊กถูก */}
          <View style={styles.titleRow}>
            <Text style={styles.title}>{game.title}</Text>
            {game.is_reviewed && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                <Text style={styles.verifiedText}>ตรวจสอบแล้ว</Text>
              </View>
            )}
          </View>

          {/* ข้อมูล ค่ายเกม และ วันที่อัปโหลด */}
          <View style={styles.metaInfoBox}>
            <View style={styles.metaItem}>
              <Ionicons name="business-outline" size={16} color="#3b82f6" />
              <Text style={styles.metaLabel}>ค่ายเกม:</Text>
              <Text style={styles.metaValue}>
                {game.publisher || "Indie Studio"}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={16} color="#10b981" />
              <Text style={styles.metaLabel}>วันที่อัปโหลด:</Text>
              <Text style={styles.metaValue}>{game.release_date || "-"}</Text>
            </View>
          </View>

          {/* หมวดหมู่ & รูปแบบไฟล์เกม */}
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 15 }}>
            <View style={styles.tagPill}>
              <Text style={styles.tagText}>
                {game.tag || game.genre || "Action"}
              </Text>
            </View>
            <View
              style={[
                styles.tagPill,
                { borderColor: isApk ? "#10b981" : "#3b82f6" },
              ]}
            >
              <Ionicons
                name={isApk ? "logo-android" : "globe-outline"}
                size={14}
                color={isApk ? "#10b981" : "#3b82f6"}
              />
              <Text
                style={[
                  styles.tagText,
                  { color: isApk ? "#10b981" : "#3b82f6" },
                ]}
              >
                {isApk ? "ไฟล์ติดตั้ง .APK" : "ลิงก์ URL"}
              </Text>
            </View>
          </View>

          {/* ราคาและส่วนลด */}
          <View style={styles.priceBox}>
            <Text style={styles.finalPrice}>
              {finalPrice === 0 ? "เล่นฟรี (Free)" : `฿${finalPrice}`}
            </Text>
            {discount > 0 && originalPrice > 0 && (
              <>
                <Text style={styles.oldPrice}>฿{originalPrice}</Text>
                <View style={styles.discountPill}>
                  <Text style={styles.discountText}>ลด {discount}%</Text>
                </View>
              </>
            )}
          </View>

          {/* แสดง Gallery รูปภาพและวิดีโอ */}
          {galleryList.length > 0 && (
            <View style={{ marginBottom: 22 }}>
              <Text style={styles.sectionHeader}>
                แกลเลอรีตัวอย่างเกม ({galleryList.length})
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {galleryList.map((media, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.galleryCard}
                    activeOpacity={0.85}
                    onPress={() => {
                      if (media.type === "video") {
                        Linking.openURL(media.url);
                      } else {
                        setSelectedGalleryImage(media.url);
                      }
                    }}
                  >
                    <Image
                      source={{ uri: media.url }}
                      style={styles.galleryImage}
                    />
                    {media.type === "video" && (
                      <View style={styles.videoPlayOverlay}>
                        <Ionicons name="play-circle" size={44} color="#fff" />
                        <Text style={styles.videoLabelText}>
                          แตะเพื่อเล่นวิดีโอ
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <Text style={styles.sectionHeader}>รายละเอียดเกม</Text>
          <Text style={styles.description}>
            {game.description || "ไม่มีคำอธิบายสำหรับเกมนี้"}
          </Text>

          {/* แสดงระบบสนับสนุน / โดเนท */}
          {game.donate_qr_url ? (
            <View style={styles.donateSectionCard}>
              <View style={styles.donateHeaderRow}>
                <Ionicons name="heart-circle" size={26} color="#f59e0b" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.donateTitle}>
                    สนับสนุนนักพัฒนา (Donate)
                  </Text>
                  <Text style={styles.donateSub}>
                    สแกน QR Code เพื่อโดเนทเป็นกำลังใจให้ผู้พัฒนาเกมนี้โดยตรง
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.qrPreviewWrapper}
                activeOpacity={0.85}
                onPress={() => setQrModalVisible(true)}
              >
                <Image
                  source={{ uri: game.donate_qr_url }}
                  style={styles.qrImageSmall}
                />
                <View style={styles.tapZoomPill}>
                  <Ionicons name="expand-outline" size={14} color="#fff" />
                  <Text style={styles.tapZoomText}>
                    แตะเพื่อขยายสแกน QR Code
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* แถบปุ่มด้านล่าง */}
      <View style={styles.bottomBar}>
        {inLibrary ? (
          <TouchableOpacity
            style={[styles.mainBtn, { backgroundColor: "#10b981" }]}
            onPress={handlePlayGame}
          >
            <Ionicons
              name={isApk ? "download-outline" : "play"}
              size={22}
              color="#fff"
            />
            <Text style={styles.mainBtnText}>
              {isApk ? "PLAY (ติดตั้งเกม .APK)" : "PLAY (เข้าเล่นเกม)"}
            </Text>
          </TouchableOpacity>
        ) : inCart ? (
          <TouchableOpacity
            style={[styles.mainBtn, { backgroundColor: "#3b82f6" }]}
            onPress={() => router.push("/cart")}
          >
            <Ionicons name="cart" size={20} color="#fff" />
            <Text style={styles.mainBtnText}>
              อยู่ในตะกร้าแล้ว (ไปที่ตะกร้า)
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.mainBtn} onPress={handleAddToCart}>
            <Ionicons name="cart-outline" size={20} color="#fff" />
            <Text style={styles.mainBtnText}>หยิบใส่ตะกร้า</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ======================================================= */}
      {/* ✅ MODAL สำหรับ Admin แก้ไขทุกอย่างในหน้า Game Detail */}
      {/* ======================================================= */}
      <Modal
        visible={adminEditVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.editModalOverlay}>
          <View style={styles.editModalContent}>
            <View style={styles.editModalHeader}>
              <TouchableOpacity onPress={() => setAdminEditVisible(false)}>
                <Text style={{ color: "#ef4444", fontSize: 16 }}>ยกเลิก</Text>
              </TouchableOpacity>
              <Text style={styles.editModalTitle}>แก้ไขข้อมูลเกม (Admin)</Text>
              <TouchableOpacity
                onPress={handleSaveAdminEdit}
                disabled={savingAdminEdit}
              >
                {savingAdminEdit ? (
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
              {/* สวิตช์เปิด/ปิดติ๊กถูก */}
              <View style={styles.switchRowBox}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{ color: "#fff", fontWeight: "bold", fontSize: 14 }}
                  >
                    ผ่านการตรวจสอบ (แสดงติ๊กถูก)
                  </Text>
                  <Text style={{ color: "#9ca3af", fontSize: 12 }}>
                    ปิดสวิตช์หากต้องการยกเลิกการตรวจสอบ (เอาติ๊กออก)
                  </Text>
                </View>
                <Switch
                  value={editForm.is_reviewed}
                  onValueChange={(v) =>
                    setEditForm({ ...editForm, is_reviewed: v })
                  }
                  trackColor={{ false: "#374151", true: "#10b981" }}
                  thumbColor="#fff"
                />
              </View>

              <Text style={styles.editLabel}>ชื่อเกม</Text>
              <TextInput
                style={styles.editInput}
                value={editForm.title}
                onChangeText={(t) => setEditForm({ ...editForm, title: t })}
              />

              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.editLabel}>ชื่อค่ายเกม</Text>
                  <TextInput
                    style={styles.editInput}
                    value={editForm.publisher}
                    onChangeText={(t) =>
                      setEditForm({ ...editForm, publisher: t })
                    }
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.editLabel}>วันที่อัปโหลด</Text>
                  <TextInput
                    style={styles.editInput}
                    value={editForm.release_date}
                    onChangeText={(t) =>
                      setEditForm({ ...editForm, release_date: t })
                    }
                  />
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.editLabel}>ราคาเต็ม (บาท)</Text>
                  <TextInput
                    style={styles.editInput}
                    keyboardType="numeric"
                    value={editForm.price}
                    onChangeText={(t) => setEditForm({ ...editForm, price: t })}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.editLabel}>ส่วนลด (%)</Text>
                  <TextInput
                    style={styles.editInput}
                    keyboardType="numeric"
                    value={editForm.discount_percent}
                    onChangeText={(t) =>
                      setEditForm({ ...editForm, discount_percent: t })
                    }
                  />
                </View>
              </View>

              <Text style={styles.editLabel}>หมวดหมู่ (Tag)</Text>
              <TextInput
                style={styles.editInput}
                value={editForm.tag}
                onChangeText={(t) => setEditForm({ ...editForm, tag: t })}
              />

              <Text style={styles.editLabel}>
                รูปปกเกม (เลือกได้ทั้ง URL และอัปโหลดจากเครื่อง)
              </Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
                <TouchableOpacity
                  style={[
                    styles.modeSelectBtn,
                    coverInputMode === "url" && styles.modeSelectBtnActive,
                  ]}
                  onPress={() => setCoverInputMode("url")}
                >
                  <Text style={styles.modeSelectText}>ลิงก์ URL</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modeSelectBtn,
                    coverInputMode === "device" && styles.modeSelectBtnActive,
                  ]}
                  onPress={() => setCoverInputMode("device")}
                >
                  <Text style={styles.modeSelectText}>อัปโหลดจากเครื่อง</Text>
                </TouchableOpacity>
              </View>

              {coverInputMode === "url" ? (
                <TextInput
                  style={styles.editInput}
                  value={editForm.image_url}
                  onChangeText={(t) =>
                    setEditForm({ ...editForm, image_url: t })
                  }
                />
              ) : (
                <TouchableOpacity
                  style={styles.pickDeviceBtn}
                  onPress={handlePickCoverDevice}
                >
                  <Ionicons name="image-outline" size={18} color="#fff" />
                  <Text style={{ color: "#fff", fontWeight: "bold" }}>
                    เลือกรูปปกจากเครื่อง
                  </Text>
                </TouchableOpacity>
              )}

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Text style={styles.editLabel}>
                  แกลเลอรี ({editForm.gallery_media?.length || 0} ไฟล์)
                </Text>
                <TouchableOpacity
                  style={styles.addMediaSmallBtn}
                  onPress={handleAddGalleryMedia}
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
                {(editForm.gallery_media || []).map((m, idx) => (
                  <View key={idx} style={styles.editGalleryBox}>
                    <Image
                      source={{ uri: m.url }}
                      style={{ width: "100%", height: "100%" }}
                    />
                    <TouchableOpacity
                      style={styles.removeGalleryIcon}
                      onPress={() =>
                        setEditForm((prev) => ({
                          ...prev,
                          gallery_media: prev.gallery_media.filter(
                            (_, i) => i !== idx,
                          ),
                        }))
                      }
                    >
                      <Ionicons name="close-circle" size={22} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>

              <Text style={styles.editLabel}>ลิงก์ดาวน์โหลด / URL เกม</Text>
              <TextInput
                style={styles.editInput}
                value={editForm.download_url}
                onChangeText={(t) =>
                  setEditForm({ ...editForm, download_url: t })
                }
              />

              <Text style={styles.editLabel}>รายละเอียดเกม (Description)</Text>
              <TextInput
                style={[
                  styles.editInput,
                  { height: 100, textAlignVertical: "top" },
                ]}
                multiline
                value={editForm.description}
                onChangeText={(t) =>
                  setEditForm({ ...editForm, description: t })
                }
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal แสดงรูปภาพ Gallery ขนาดเต็มจอ */}
      <Modal
        visible={!!selectedGalleryImage}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <Image
            source={{ uri: selectedGalleryImage }}
            style={{
              width: "100%",
              height: 300,
              borderRadius: 12,
              resizeMode: "contain",
            }}
          />
          <TouchableOpacity
            style={[styles.closeQrBtn, { marginTop: 20 }]}
            onPress={() => setSelectedGalleryImage(null)}
          >
            <Text style={styles.closeQrText}>ปิดรูปภาพ</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Modal แสดง QR Code ขนาดเต็มจอ */}
      <Modal visible={qrModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.qrModalBox}>
            <Text style={styles.qrModalTitle}>
              โดเนทสนับสนุนเกม {game.title}
            </Text>
            <Image
              source={{ uri: game.donate_qr_url }}
              style={styles.qrImageFull}
            />
            <TouchableOpacity
              style={styles.closeQrBtn}
              onPress={() => setQrModalVisible(false)}
            >
              <Text style={styles.closeQrText}>ปิดหน้าต่าง</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
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
  bannerWrapper: { width: "100%", height: 260, position: "relative" },
  bannerImage: { width: "100%", height: "100%" },
  topBar: {
    position: "absolute",
    top: 10,
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  content: { padding: 20, paddingBottom: 40 },

  // แถบปุ่มจัดการด่วนสำหรับ Admin
  adminQuickBar: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  adminEditBtn: {
    flex: 1.4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3b82f6",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  adminVerifyBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  adminBtnText: { color: "#fff", fontSize: 12, fontWeight: "bold" },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 10,
  },
  title: { color: "#fff", fontSize: 24, fontWeight: "bold" },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.4)",
    gap: 4,
  },
  verifiedText: { color: "#10b981", fontSize: 12, fontWeight: "bold" },

  metaInfoBox: {
    backgroundColor: "#1a1a2e",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2a2a4a",
    marginBottom: 14,
    gap: 6,
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaLabel: { color: "#9ca3af", fontSize: 13 },
  metaValue: { color: "#fff", fontSize: 13, fontWeight: "bold" },

  tagPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#1a1a2e",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2a2a4a",
  },
  tagText: { color: "#3b82f6", fontSize: 12, fontWeight: "bold" },
  priceBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  finalPrice: { color: "#10b981", fontSize: 24, fontWeight: "bold" },
  oldPrice: {
    color: "#6b7280",
    fontSize: 16,
    textDecorationLine: "line-through",
  },
  discountPill: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  discountText: { color: "#fff", fontSize: 12, fontWeight: "bold" },

  galleryCard: {
    width: 220,
    height: 130,
    borderRadius: 12,
    marginRight: 12,
    overflow: "hidden",
    backgroundColor: "#1a1a2e",
    borderWidth: 1,
    borderColor: "#2a2a4a",
    position: "relative",
  },
  galleryImage: { width: "100%", height: "100%", resizeMode: "cover" },
  videoPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  videoLabelText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
    marginTop: 4,
  },

  sectionHeader: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  description: {
    color: "#9ca3af",
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 25,
  },

  donateSectionCard: {
    backgroundColor: "#1a1a2e",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.4)",
    marginTop: 10,
  },
  donateHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 15,
  },
  donateTitle: { color: "#f59e0b", fontSize: 16, fontWeight: "bold" },
  donateSub: { color: "#9ca3af", fontSize: 12, marginTop: 2 },
  qrPreviewWrapper: { alignItems: "center", justifyContent: "center" },
  qrImageSmall: {
    width: 170,
    height: 170,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  tapZoomPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
  },
  tapZoomText: { color: "#f59e0b", fontSize: 12, fontWeight: "bold" },

  // สไตล์ Modal แก้ไขข้อมูลเกมของ Admin
  editModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.78)",
    justifyContent: "flex-end",
  },
  editModalContent: {
    backgroundColor: "#1a1a2e",
    height: "90%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  editModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 15,
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a4a",
  },
  editModalTitle: { color: "#fff", fontSize: 17, fontWeight: "bold" },
  switchRowBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0a0a1a",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2a2a4a",
    marginBottom: 16,
  },
  editLabel: {
    color: "#9ca3af",
    fontSize: 13,
    marginBottom: 6,
    fontWeight: "bold",
  },
  editInput: {
    backgroundColor: "#0a0a1a",
    color: "#fff",
    padding: 14,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#2a2a4a",
  },
  modeSelectBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#0a0a1a",
    borderWidth: 1,
    borderColor: "#2a2a4a",
    alignItems: "center",
  },
  modeSelectBtnActive: { backgroundColor: "#3b82f6", borderColor: "#3b82f6" },
  modeSelectText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  pickDeviceBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3b82f6",
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 14,
    gap: 8,
  },
  addMediaSmallBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10b981",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  editGalleryBox: {
    width: 110,
    height: 75,
    borderRadius: 8,
    marginRight: 10,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#0a0a1a",
  },
  removeGalleryIcon: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "#0a0a1a",
    borderRadius: 12,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  qrModalBox: {
    width: "100%",
    backgroundColor: "#1a1a2e",
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
    textAlign: "center",
  },
  qrImageFull: {
    width: 260,
    height: 260,
    borderRadius: 14,
    backgroundColor: "#fff",
    marginBottom: 20,
  },
  closeQrBtn: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 12,
  },
  closeQrText: { color: "#fff", fontWeight: "bold", fontSize: 15 },

  bottomBar: {
    padding: 20,
    backgroundColor: "#1a1a2e",
    borderTopWidth: 1,
    borderTopColor: "#2a2a4a",
  },
  mainBtn: {
    flexDirection: "row",
    backgroundColor: "#0000ff",
    paddingVertical: 15,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  mainBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
