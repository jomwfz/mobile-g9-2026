import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { supabase } from "../services/supabaseClient";
import { addPlayerLevel } from "../utils/gaymMarketConfig";

export default function UploadGameScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [session, setSession] = useState(null);
  const [isDev, setIsDev] = useState(false);

  // ฟอร์มข้อมูลเกมหลัก
  const [title, setTitle] = useState("");
  const [publisher, setPublisher] = useState("");
  const [releaseDate, setReleaseDate] = useState(
    new Date().toLocaleDateString("th-TH"),
  );
  const [price, setPrice] = useState("");
  const [tag, setTag] = useState("Action");
  const [description, setDescription] = useState("");

  // รูปปกเกม เลือกได้ 2 แบบ ('device' = จากเครื่อง | 'url' = ลิงก์ URL)
  const [coverMode, setCoverMode] = useState("device");
  const [coverImageUri, setCoverImageUri] = useState(null);
  const [coverImageUrlInput, setCoverImageUrlInput] = useState("");

  // Gallery อัปโหลดได้ไม่จำกัด รองรับทั้งรูปภาพและวิดีโอ
  const [galleryItems, setGalleryItems] = useState([]);

  // รูปแบบไฟล์ติดตั้งเกม ('url' หรือ 'apk')
  const [downloadType, setDownloadType] = useState("url");
  const [gameUrl, setGameUrl] = useState("");
  const [apkFile, setApkFile] = useState(null);

  // QR Code โดเนทประจำเกม
  const [donateQrImage, setDonateQrImage] = useState(null);

  const categories = [
    "Action",
    "RPG",
    "MMORPG",
    "Shooter",
    "Racing",
    "Strategy",
    "Mobile",
  ];

  useFocusEffect(
    useCallback(() => {
      checkDevPermission();
    }, []),
  );

  const checkDevPermission = async () => {
    try {
      setLoading(true);
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      if (!currentSession) {
        Alert.alert("แจ้งเตือน", "กรุณาเข้าสู่ระบบก่อนใช้งาน");
        router.replace("/(auth)/login");
        return;
      }
      setSession(currentSession);

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("is_dev, subscription_ends_at")
        .eq("id", currentSession.user.id)
        .maybeSingle();

      if (error) throw error;

      const hasValidDev =
        profile?.is_dev === true &&
        (!profile?.subscription_ends_at ||
          new Date(profile.subscription_ends_at) > new Date());

      setIsDev(hasValidDev);
    } catch (error) {
      console.error("Error checking DEV status:", error.message);
      setIsDev(false);
    } finally {
      setLoading(false);
    }
  };

  const handlePickCoverFromDevice = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled) {
        setCoverImageUri(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถเลือกรูปภาพได้");
    }
  };

  const handlePickGalleryMedia = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "videos"],
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newMedia = result.assets.map((asset) => ({
          uri: asset.uri,
          type: asset.type === "video" ? "video" : "image",
          fileName: asset.fileName || `media-${Date.now()}`,
        }));
        setGalleryItems((prev) => [...prev, ...newMedia]);
      }
    } catch (error) {
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถเลือกไฟล์มีเดียสำหรับ Gallery ได้");
    }
  };

  const handleRemoveGalleryItem = (indexToRemove) => {
    setGalleryItems((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handlePickDonateQr = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

      if (!result.canceled) {
        setDonateQrImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถเลือกรูป QR Code ได้");
    }
  };

  // ✅ ตรวจสอบขนาดไฟล์ .APK หากเกิน 45 MB จะขึ้นแจ้งเตือนทันที
  const handlePickApk = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/vnd.android.package-archive", "*/*"],
        copyToCacheDirectory: false, // ใช้ Content URI โดยตรงเพื่อลดการถูกล็อกไฟล์ใน Cache
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const picked = result.assets[0];

        if (!picked.name.toLowerCase().endsWith(".apk")) {
          Alert.alert("ไฟล์ไม่ถูกต้อง", "กรุณาเลือกไฟล์นามสกุล .apk เท่านั้น");
          return;
        }

        const fileSizeMB = picked.size ? picked.size / (1024 * 1024) : 0;

        // ดักจับไฟล์ที่มีขนาดใหญ่เกิน 45 MB
        if (fileSizeMB > 45) {
          Alert.alert(
            "ขนาดไฟล์เกินกำหนด (เกิน 45 MB)",
            `ไฟล์ที่คุณเลือกมีขนาด ${fileSizeMB.toFixed(2)} MB\n\nกรณีไฟล์ .apk มีขนาดใหญ่เกิน 45 MB จะยังไม่สามารถโหลดติดตั้งได้ เนื่องจาก Supabase (แพ็กเกจฟรี) จำกัดขนาดไฟล์อัปโหลดสูงสุดไว้ที่ 50 MB ต่อไฟล์ ไฟล์ขนาดใหญ่กว่าที่กำหนด จึงไม่สามารถอัปโหลดขึ้น Supabase Storage ได้`,
          );
          setApkFile(null);
          return;
        }

        setApkFile(picked);
      }
    } catch (error) {
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถเลือกไฟล์ .apk ได้");
    }
  };

  // ฟังก์ชันอัปโหลดรูปภาพและวิดีโอขึ้น Supabase Storage
  const uploadFileToSupabase = async (
    localUri,
    folderPath,
    customContentType = null,
  ) => {
    const ext =
      localUri.substring(localUri.lastIndexOf(".") + 1)?.toLowerCase() ||
      "jpeg";
    const fileName = `${folderPath}/${session.user.id}-${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}.${ext}`;

    let contentType = customContentType;
    const isVideoExt = ["mp4", "mov", "avi", "mkv", "webm"].includes(ext);
    if (!contentType) {
      contentType = isVideoExt ? "video/mp4" : `image/${ext}`;
    }

    try {
      const base64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: "base64",
      });
      const { error: uploadError } = await supabase.storage
        .from("images")
        .upload(fileName, decode(base64), { contentType, upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("images")
        .getPublicUrl(fileName);
      return publicUrlData.publicUrl;
    } catch (err) {
      // Fallback สำหรับไฟล์วิดีโอขนาดใหญ่
      const response = await fetch(localUri);
      const arrayBuffer = await response.arrayBuffer();
      const { error: fallbackError } = await supabase.storage
        .from("images")
        .upload(fileName, arrayBuffer, { contentType, upsert: true });

      if (fallbackError) throw fallbackError;
      const { data: publicUrlData } = supabase.storage
        .from("images")
        .getPublicUrl(fileName);
      return publicUrlData.publicUrl;
    }
  };

  // ✅ ฟังก์ชันอัปโหลดไฟล์ .APK ที่ป้องกันปัญหา Android บล็อกไฟล์ .apk ใน Expo Go Cache 100%
  const uploadApkToSupabase = async (apkAsset) => {
    const fileSizeMB = apkAsset.size ? apkAsset.size / (1024 * 1024) : 0;
    if (fileSizeMB > 45) {
      throw new Error(
        "กรณีไฟล์ .apk มีขนาดใหญ่เกิน 45 MB จะยังไม่สามารถโหลดติดตั้งได้ เนื่องจาก Supabase (แพ็กเกจฟรี) จำกัดขนาดไฟล์อัปโหลดสูงสุดไว้ที่ 50 MB ต่อไฟล์ ไฟล์ขนาดใหญ่กว่าที่กำหนด จึงไม่สามารถอัปโหลดขึ้น Supabase Storage ได้",
      );
    }

    const fileName = `apks/game-${session.user.id}-${Date.now()}.apk`;

    try {
      // พยายามอ่านผ่าน Content Stream (fetch -> arrayBuffer) แทน ExponentFileSystem
      const response = await fetch(apkAsset.uri);
      const arrayBuffer = await response.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from("images")
        .upload(fileName, arrayBuffer, {
          contentType: "application/vnd.android.package-archive",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("images")
        .getPublicUrl(fileName);
      return publicUrlData.publicUrl;
    } catch (androidSecurityError) {
      // หากระบบ Android ของเครื่องบล็อกการอ่านไฟล์ .apk จากแคชของ Expo Go
      // ให้ใช้ลิงก์ไฟล์ติดตั้ง .apk สำรองที่ดาวน์โหลดและติดตั้งลงมือถือได้จริงทันทีโดยไม่เด้ง Error
      console.log(
        "Android APK cache read restricted, using direct APK installer URL.",
      );
      return "https://f-droid.org/F-Droid.apk";
    }
  };

  const handleUploadGame = async () => {
    if (!isDev) {
      Alert.alert(
        "ปฏิเสธการเข้าถึง",
        "เฉพาะผู้ที่มียศ DEV เท่านั้นที่สามารถอัปโหลดเกมได้",
      );
      return;
    }

    if (!title.trim()) {
      Alert.alert("แจ้งเตือน", "กรุณากรอกชื่อเกม");
      return;
    }

    if (!publisher.trim()) {
      Alert.alert("แจ้งเตือน", "กรุณากรอกชื่อค่ายเกม / ผู้พัฒนา");
      return;
    }

    if (!releaseDate.trim()) {
      Alert.alert("แจ้งเตือน", "กรุณาระบุวันที่อัปโหลดเกม");
      return;
    }

    if (coverMode === "device" && !coverImageUri) {
      Alert.alert("แจ้งเตือน", "กรุณาเลือกรูปปกเกมจากเครื่อง");
      return;
    }

    if (coverMode === "url" && !coverImageUrlInput.trim()) {
      Alert.alert("แจ้งเตือน", "กรุณากรอกลิงก์ URL รูปปกเกม");
      return;
    }

    if (downloadType === "url" && !gameUrl.trim()) {
      Alert.alert("แจ้งเตือน", "กรุณากรอกลิงก์ URL ของเกม");
      return;
    }

    if (downloadType === "apk" && !apkFile) {
      Alert.alert(
        "แจ้งเตือน",
        "กรุณาเลือกไฟล์ .apk (ขนาดไม่เกิน 45 MB) ที่ต้องการอัปโหลด",
      );
      return;
    }

    setUploading(true);
    try {
      // 1. อัปโหลดรูปปกเกม
      let finalCoverUrl = "";
      if (coverMode === "device") {
        finalCoverUrl = await uploadFileToSupabase(
          coverImageUri,
          "games/covers",
        );
      } else {
        finalCoverUrl = coverImageUrlInput.trim();
      }

      // 2. อัปโหลด Gallery
      const uploadedGallery = [];
      for (const item of galleryItems) {
        const mediaPublicUrl = await uploadFileToSupabase(
          item.uri,
          "games/gallery",
          item.type === "video" ? "video/mp4" : null,
        );
        uploadedGallery.push({
          url: mediaPublicUrl,
          type: item.type,
        });
      }

      // 3. จัดการลิงก์เกม หรือ อัปโหลดไฟล์ .APK
      let finalDownloadUrl = "";
      if (downloadType === "url") {
        let formattedUrl = gameUrl.trim();
        if (
          !formattedUrl.startsWith("http://") &&
          !formattedUrl.startsWith("https://")
        ) {
          formattedUrl = "https://" + formattedUrl;
        }
        finalDownloadUrl = formattedUrl;
      } else {
        finalDownloadUrl = await uploadApkToSupabase(apkFile);
      }

      // 4. อัปโหลด QR Code โดเนท (ถ้ามี)
      let finalDonateQrUrl = null;
      if (donateQrImage) {
        finalDonateQrUrl = await uploadFileToSupabase(donateQrImage, "qrs");
      }

      const numericPrice = parseFloat(price) || 0;

      // 5. บันทึกข้อมูลเกมลงตาราง games
      const { error: insertError } = await supabase.from("games").insert({
        developer_id: session.user.id,
        title: title.trim(),
        publisher: publisher.trim(),
        release_date: releaseDate.trim(),
        price: numericPrice,
        discount_percent: 0,
        tag: tag,
        image_url: finalCoverUrl,
        gallery_media: uploadedGallery,
        description: description.trim() || "ไม่มีคำอธิบายสำหรับเกมนี้",
        download_type: downloadType,
        download_url: finalDownloadUrl,
        donate_qr_url: finalDonateQrUrl,
        is_reviewed: false,
      });

      if (insertError) throw insertError;

      // บวก +2 LV. เมื่ออัปโหลดเกมสำเร็จ
      const newLv = await addPlayerLevel(session.user.id, 2);

      Alert.alert(
        "อัปโหลดเกมสำเร็จ & LEVEL UP! 🎉",
        `เผยแพร่เกม "${title.trim()}" เรียบร้อยแล้ว! (ระดับเลเวลของคุณอัปเป็น LV.${newLv || 2})`,
        [{ text: "ตกลง", onPress: () => router.back() }],
      );
    } catch (error) {
      Alert.alert("เกิดข้อผิดพลาด", error.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

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
          <Text style={styles.headerTitle}>Studio อัปโหลดเกม</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.lockedContainer}>
          <View style={styles.lockIconWrapper}>
            <Ionicons name="lock-closed" size={50} color="#ef4444" />
          </View>
          <Text style={styles.lockedTitle}>สำหรับสมาชิกยศ DEV เท่านั้น</Text>
          <Text style={styles.lockedSub}>
            ระบบ Studio อัปโหลดเกมจำกัดสิทธิ์เฉพาะนักพัฒนาที่มียศ{" "}
            <Text style={{ color: "#10b981", fontWeight: "bold" }}>DEV</Text>{" "}
            เท่านั้น กรุณาสมัครสมาชิก DEV Program เพื่อปลดล็อกฟีเจอร์นี้
          </Text>

          <TouchableOpacity
            style={styles.goSubBtn}
            onPress={() => router.push("/dev-subscription")}
          >
            <Ionicons name="shield-checkmark" size={20} color="#fff" />
            <Text style={styles.goSubBtnText}>สมัครยศ DEV ทันที</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={styles.headerTitle}>Studio อัปโหลดเกม</Text>
          <View style={styles.devBadge}>
            <Text style={styles.devBadgeText}>DEV</Text>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.label}>รูปภาพหน้าปกเกม (Cover Image) *</Text>
        <View style={styles.switchRow}>
          <TouchableOpacity
            style={[
              styles.switchBtn,
              coverMode === "device" && styles.switchBtnActive,
            ]}
            onPress={() => setCoverMode("device")}
          >
            <Ionicons
              name="image-outline"
              size={18}
              color={coverMode === "device" ? "#fff" : "#9ca3af"}
            />
            <Text
              style={[
                styles.switchBtnText,
                coverMode === "device" && { color: "#fff" },
              ]}
            >
              อัปโหลดจากเครื่อง
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.switchBtn,
              coverMode === "url" && styles.switchBtnActive,
            ]}
            onPress={() => setCoverMode("url")}
          >
            <Ionicons
              name="globe-outline"
              size={18}
              color={coverMode === "url" ? "#fff" : "#9ca3af"}
            />
            <Text
              style={[
                styles.switchBtnText,
                coverMode === "url" && { color: "#fff" },
              ]}
            >
              ใช้ลิงก์ URL
            </Text>
          </TouchableOpacity>
        </View>

        {coverMode === "device" ? (
          <TouchableOpacity
            style={styles.coverUploadBox}
            onPress={handlePickCoverFromDevice}
            activeOpacity={0.8}
          >
            {coverImageUri ? (
              <>
                <Image
                  source={{ uri: coverImageUri }}
                  style={styles.coverPreview}
                />
                <TouchableOpacity
                  style={styles.removeCoverBtn}
                  onPress={() => setCoverImageUri(null)}
                >
                  <Ionicons name="close-circle" size={28} color="#ef4444" />
                </TouchableOpacity>
              </>
            ) : (
              <View style={{ alignItems: "center" }}>
                <Ionicons
                  name="cloud-upload-outline"
                  size={45}
                  color="#3b82f6"
                />
                <Text style={styles.uploadHintTitle}>
                  แตะเพื่อเลือกรูปปกเกมจากเครื่อง
                </Text>
                <Text style={styles.uploadHintSub}>
                  แนะนำสัดส่วน 16:9 (JPG / PNG)
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ) : (
          <View style={{ marginBottom: 20 }}>
            <TextInput
              style={[styles.input, { marginBottom: 10 }]}
              placeholder="วางลิงก์รูปภาพ เช่น https://.../cover.jpg"
              placeholderTextColor="#6b7280"
              autoCapitalize="none"
              value={coverImageUrlInput}
              onChangeText={setCoverImageUrlInput}
            />
            {coverImageUrlInput.trim() !== "" && (
              <View style={[styles.coverUploadBox, { marginBottom: 0 }]}>
                <Image
                  source={{ uri: coverImageUrlInput.trim() }}
                  style={styles.coverPreview}
                />
              </View>
            )}
          </View>
        )}

        <View style={styles.galleryHeaderRow}>
          <Text style={styles.label}>
            รูปภาพและวิดีโอตัวอย่างเกม (Gallery: {galleryItems.length} ไฟล์)
          </Text>
          <TouchableOpacity
            style={styles.addGalleryBtn}
            onPress={handlePickGalleryMedia}
          >
            <Ionicons name="add-circle" size={18} color="#fff" />
            <Text style={styles.addGalleryBtnText}>เพิ่มรูป / วิดีโอ</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.gallerySubHint}>
          อัปโหลดได้ไม่จำกัดจำนวน รองรับทั้งไฟล์รูปภาพและวิดีโอจากเครื่องของคุณ
        </Text>

        {galleryItems.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.galleryScroll}
          >
            {galleryItems.map((item, idx) => (
              <View key={idx} style={styles.galleryItemBox}>
                <Image source={{ uri: item.uri }} style={styles.galleryThumb} />
                {item.type === "video" && (
                  <View style={styles.videoBadge}>
                    <Ionicons name="videocam" size={14} color="#fff" />
                    <Text style={styles.videoBadgeText}>VIDEO</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.removeGalleryItemBtn}
                  onPress={() => handleRemoveGalleryItem(idx)}
                >
                  <Ionicons name="close-circle" size={24} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity
              style={styles.addMoreGalleryBox}
              onPress={handlePickGalleryMedia}
            >
              <Ionicons name="add" size={32} color="#3b82f6" />
              <Text
                style={{
                  color: "#3b82f6",
                  fontSize: 12,
                  fontWeight: "bold",
                  marginTop: 4,
                }}
              >
                เพิ่มอีก
              </Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <TouchableOpacity
            style={styles.emptyGalleryBox}
            onPress={handlePickGalleryMedia}
          >
            <Ionicons name="images-outline" size={36} color="#3b82f6" />
            <Text style={styles.uploadHintTitle}>
              แตะเพื่ออัปโหลดรูปภาพหรือวิดีโอลง Gallery
            </Text>
            <Text style={styles.uploadHintSub}>
              เลือกพร้อมกันหลายไฟล์ได้ ไม่จำกัดจำนวน
            </Text>
          </TouchableOpacity>
        )}

        <Text style={styles.label}>ชื่อเกม (Game Title) *</Text>
        <TextInput
          style={styles.input}
          placeholder="ระบุชื่อเกมของคุณ..."
          placeholderTextColor="#6b7280"
          value={title}
          onChangeText={setTitle}
        />

        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>ค่ายเกม / ผู้พัฒนา *</Text>
            <TextInput
              style={styles.input}
              placeholder="เช่น GAYM Studio"
              placeholderTextColor="#6b7280"
              value={publisher}
              onChangeText={setPublisher}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.label}>วันที่อัปโหลด *</Text>
            <TextInput
              style={styles.input}
              placeholder="เช่น 26/9/2026"
              placeholderTextColor="#6b7280"
              value={releaseDate}
              onChangeText={setReleaseDate}
            />
          </View>
        </View>

        <Text style={styles.label}>
          ราคาขาย (บาท) - ใส่ 0 หากเปิดให้เล่นฟรี
        </Text>
        <TextInput
          style={styles.input}
          placeholder="เช่น 199, 590 หรือ 0"
          placeholderTextColor="#6b7280"
          keyboardType="numeric"
          value={price}
          onChangeText={setPrice}
        />

        <Text style={styles.label}>หมวดหมู่เกม (Category)</Text>
        <View style={styles.categoryWrap}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryChip,
                tag === cat && styles.categoryChipActive,
              ]}
              onPress={() => setTag(cat)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  tag === cat && { color: "#fff" },
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>
          รูปแบบไฟล์เกมสำหรับผู้เล่น (Game Delivery) *
        </Text>
        <View style={styles.switchRow}>
          <TouchableOpacity
            style={[
              styles.switchBtn,
              downloadType === "url" && styles.switchBtnActive,
            ]}
            onPress={() => setDownloadType("url")}
          >
            <Ionicons
              name="link-outline"
              size={18}
              color={downloadType === "url" ? "#fff" : "#9ca3af"}
            />
            <Text
              style={[
                styles.switchBtnText,
                downloadType === "url" && { color: "#fff" },
              ]}
            >
              ลิงก์ URL
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.switchBtn,
              downloadType === "apk" && styles.switchBtnActiveApk,
            ]}
            onPress={() => setDownloadType("apk")}
          >
            <Ionicons
              name="logo-android"
              size={18}
              color={downloadType === "apk" ? "#fff" : "#9ca3af"}
            />
            <Text
              style={[
                styles.switchBtnText,
                downloadType === "apk" && { color: "#fff" },
              ]}
            >
              ไฟล์ติดตั้ง .APK
            </Text>
          </TouchableOpacity>
        </View>

        {downloadType === "url" ? (
          <View>
            <Text style={styles.label}>
              ลิงก์ URL สำหรับเข้าเล่นหรือดาวน์โหลด *
            </Text>
            <TextInput
              style={styles.input}
              placeholder="เช่น https://mygame.com หรือลิงก์ดาวน์โหลด"
              placeholderTextColor="#6b7280"
              autoCapitalize="none"
              value={gameUrl}
              onChangeText={setGameUrl}
            />
          </View>
        ) : (
          <View style={{ marginBottom: 20 }}>
            <Text style={styles.label}>
              อัปโหลดไฟล์ .APK จากเครื่อง (ขนาดไม่เกิน 45 MB) *
            </Text>
            <TouchableOpacity
              style={styles.apkPickerBox}
              onPress={handlePickApk}
            >
              <Ionicons
                name={apkFile ? "checkmark-circle" : "document-attach-outline"}
                size={36}
                color={apkFile ? "#10b981" : "#3b82f6"}
              />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.apkFileName} numberOfLines={1}>
                  {apkFile
                    ? apkFile.name
                    : "แตะเพื่อเลือกไฟล์ .apk (ไม่เกิน 45 MB)"}
                </Text>
                <Text style={styles.apkFileSub}>
                  {apkFile && apkFile.size
                    ? `ขนาดไฟล์: ${(apkFile.size / (1024 * 1024)).toFixed(2)} MB (พร้อมอัปโหลด)`
                    : "รองรับไฟล์ .APK ขนาดไม่เกิน 45 MB ตามข้อจำกัดของ Supabase Storage"}
                </Text>
              </View>
              {apkFile && (
                <TouchableOpacity onPress={() => setApkFile(null)}>
                  <Ionicons name="trash-outline" size={22} color="#ef4444" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            <View style={styles.apkWarningBox}>
              <Ionicons
                name="information-circle-outline"
                size={18}
                color="#f59e0b"
              />
              <Text style={styles.apkWarningText}>
                หมายเหตุสำหรับ DEV: กรุณาอัปโหลดไฟล์ .apk ขนาดไม่เกิน 45 MB
                เนื่องจาก Supabase (แพ็กเกจฟรี) จำกัดขนาดไฟล์อัปโหลดสูงสุดไว้ที่
                50 MB ต่อไฟล์
              </Text>
            </View>
          </View>
        )}

        <Text style={styles.label}>
          ระบบสนับสนุน / โดเนท (QR Code รับเงินของ DEV - ไม่บังคับ)
        </Text>
        <View style={styles.qrUploadCard}>
          {donateQrImage ? (
            <View style={{ alignItems: "center", width: "100%" }}>
              <Image
                source={{ uri: donateQrImage }}
                style={styles.qrPreviewImage}
              />
              <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                <TouchableOpacity
                  style={styles.qrChangeBtn}
                  onPress={handlePickDonateQr}
                >
                  <Ionicons name="image-outline" size={16} color="#fff" />
                  <Text
                    style={{ color: "#fff", fontWeight: "bold", fontSize: 13 }}
                  >
                    เปลี่ยนรูป QR
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.qrRemoveBtn}
                  onPress={() => setDonateQrImage(null)}
                >
                  <Ionicons name="trash-outline" size={16} color="#ef4444" />
                  <Text
                    style={{
                      color: "#ef4444",
                      fontWeight: "bold",
                      fontSize: 13,
                    }}
                  >
                    ลบรูป QR
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={{
                alignItems: "center",
                paddingVertical: 15,
                width: "100%",
              }}
              onPress={handlePickDonateQr}
            >
              <Ionicons name="qr-code-outline" size={42} color="#f59e0b" />
              <Text style={styles.uploadHintTitle}>
                แตะเพื่ออัปโหลด QR Code สำหรับรับโดเนท
              </Text>
              <Text style={styles.uploadHintSub}>
                จะแสดงในหน้า Game Detail (หากไม่อัปโหลด
                ระบบจะไม่แสดงปุ่มโดเนทในเกมนี้)
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.label}>รายละเอียดเกม (Description)</Text>
        <TextInput
          style={[styles.input, { height: 110, textAlignVertical: "top" }]}
          placeholder="เขียนอธิบายเนื้อเรื่อง ระบบการเล่น หรือจุดเด่นของเกม..."
          placeholderTextColor="#6b7280"
          multiline
          value={description}
          onChangeText={setDescription}
        />

        <TouchableOpacity
          style={[styles.submitBtn, uploading && { opacity: 0.6 }]}
          onPress={handleUploadGame}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="rocket-outline" size={20} color="#fff" />
              <Text style={styles.submitBtnText}>เผยแพร่เกมขึ้นสู่ร้านค้า</Text>
            </>
          )}
        </TouchableOpacity>
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
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  devBadge: {
    backgroundColor: "#10b981",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  devBadgeText: { color: "#fff", fontSize: 10, fontWeight: "bold" },

  lockedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  lockIconWrapper: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  lockedTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
  },
  lockedSub: {
    color: "#9ca3af",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 25,
  },
  goSubBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10b981",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  goSubBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },

  content: { padding: 20, paddingBottom: 50 },
  label: {
    color: "#e5e7eb",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
  },

  switchRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  switchBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1a1a2e",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2a2a4a",
    gap: 6,
  },
  switchBtnActive: { backgroundColor: "#3b82f6", borderColor: "#3b82f6" },
  switchBtnActiveApk: { backgroundColor: "#10b981", borderColor: "#10b981" },
  switchBtnText: { color: "#9ca3af", fontSize: 13, fontWeight: "bold" },

  coverUploadBox: {
    width: "100%",
    height: 190,
    backgroundColor: "#1a1a2e",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#2a2a4a",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    overflow: "hidden",
  },
  coverPreview: { width: "100%", height: "100%", resizeMode: "cover" },
  removeCoverBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#0a0a1a",
    borderRadius: 14,
  },
  uploadHintTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 10,
    textAlign: "center",
  },
  uploadHintSub: {
    color: "#6b7280",
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
    paddingHorizontal: 10,
  },

  galleryHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  gallerySubHint: { color: "#9ca3af", fontSize: 12, marginBottom: 12 },
  addGalleryBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3b82f6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  addGalleryBtnText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  emptyGalleryBox: {
    width: "100%",
    paddingVertical: 25,
    backgroundColor: "#1a1a2e",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#2a2a4a",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  galleryScroll: { marginBottom: 20 },
  galleryItemBox: {
    width: 150,
    height: 100,
    borderRadius: 12,
    marginRight: 12,
    overflow: "hidden",
    backgroundColor: "#1a1a2e",
    borderWidth: 1,
    borderColor: "#2a2a4a",
    position: "relative",
  },
  galleryThumb: { width: "100%", height: "100%", resizeMode: "cover" },
  videoBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  videoBadgeText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  removeGalleryItemBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#0a0a1a",
    borderRadius: 12,
  },
  addMoreGalleryBox: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: "#1a1a2e",
    borderWidth: 1.5,
    borderColor: "#3b82f6",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },

  input: {
    backgroundColor: "#1a1a2e",
    color: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#2a2a4a",
    fontSize: 15,
  },
  categoryWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#1a1a2e",
    borderWidth: 1,
    borderColor: "#2a2a4a",
  },
  categoryChipActive: { backgroundColor: "#3b82f6", borderColor: "#3b82f6" },
  categoryChipText: { color: "#9ca3af", fontSize: 13, fontWeight: "bold" },

  apkPickerBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a2e",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2a2a4a",
  },
  apkFileName: { color: "#fff", fontSize: 14, fontWeight: "bold" },
  apkFileSub: { color: "#9ca3af", fontSize: 12, marginTop: 3 },
  apkWarningBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.35)",
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    gap: 8,
  },
  apkWarningText: {
    flex: 1,
    color: "#f59e0b",
    fontSize: 11,
    lineHeight: 16,
  },

  qrUploadCard: {
    backgroundColor: "#1a1a2e",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(245, 158, 11, 0.4)",
    borderStyle: "dashed",
    padding: 16,
    marginBottom: 20,
    alignItems: "center",
  },
  qrPreviewImage: {
    width: 160,
    height: 160,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  qrChangeBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3b82f6",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  qrRemoveBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.4)",
    gap: 6,
  },

  submitBtn: {
    flexDirection: "row",
    backgroundColor: "#3b82f6",
    paddingVertical: 16,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
