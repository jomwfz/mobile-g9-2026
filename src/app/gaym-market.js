import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { supabase } from "../services/supabaseClient";
import {
  MARKET_FRAMES,
  MARKET_THEMES,
  AvatarWithFrame,
  useUserAppTheme,
} from "../utils/gaymMarketConfig";

// ✅ รายการแพ็กเกจเติม GAYM Coin ที่สามารถกดหยิบใส่ตะกร้ารวมกับเกมได้ทันที
const COIN_PACKAGES = [
  {
    id: 999001,
    coins: 1,
    title: "แพ็กเกจ 1 GAYM Coin",
    originalPrice: 20,
    finalPrice: 20,
    discountPercent: 0,
    desc: "เหมาะสำหรับซื้อกรอบรูปเริ่มต้น",
    popular: false,
  },
  {
    id: 999005,
    coins: 5,
    title: "แพ็กเกจ 5 GAYM Coin",
    originalPrice: 100,
    finalPrice: 100,
    discountPercent: 0,
    desc: "ซื้อกรอบรูป Animation หรือ Theme หมีบราวน์ได้ทันที",
    popular: false,
  },
  {
    id: 999010,
    coins: 10,
    title: "แพ็กเกจ 10 GAYM Coin",
    originalPrice: 200,
    finalPrice: 100,
    discountPercent: 50,
    desc: "สุดคุ้ม! ราคาปกติ 200 บาท ลด 50% เหลือเพียง 100 บาท",
    popular: true,
  },
];

export default function GaymMarketScreen() {
  const router = useRouter();
  const { theme, isRgbTheme, animatedRgbColor } = useUserAppTheme();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [cartCount, setCartCount] = useState(0);
  const [activeCategory, setActiveCategory] = useState("coins"); // 'coins' | 'frames' | 'themes'
  const [buyingId, setBuyingId] = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadMarketProfile();
    }, []),
  );

  const loadMarketProfile = async () => {
    try {
      setLoading(true);
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      if (!currentSession) {
        Alert.alert("แจ้งเตือน", "กรุณาเข้าสู่ระบบก่อนใช้งาน GAYM Market");
        router.replace("/(auth)/login");
        return;
      }
      setSession(currentSession);

      const [profileRes, cartRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("id", currentSession.user.id)
          .single(),
        supabase
          .from("user_cart")
          .select("id")
          .eq("user_id", currentSession.user.id),
      ]);

      if (profileRes.data) setProfile(profileRes.data);
      setCartCount(cartRes.data?.length || 0);
    } catch (error) {
      console.error("Market load error:", error.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ ฟังก์ชันเมื่อผู้เล่นกดซื้อแพ็กเกจ GAYM Coin -> เพิ่มเข้าไปรวมใน Cart ซื้อเกมทันที
  const handleAddCoinPackToCart = async (pack) => {
    if (!session) return;
    setBuyingId(pack.id);
    try {
      // 1. บันทึก/อัปเดตข้อมูลแพ็กเกจในตาราง games เพื่อให้เชื่อมกับตะกร้าได้สมบูรณ์
      const { error: upsertError } = await supabase.from("games").upsert({
        id: pack.id,
        title:
          pack.discountPercent > 0
            ? `${pack.title} (ลด ${pack.discountPercent}%)`
            : pack.title,
        publisher: "GAYM Official",
        release_date: "-",
        price: pack.finalPrice, // เก็บราคาสุทธิที่ต้องจ่ายจริง (เช่น 10 Coin = 100 บาท)
        discount_percent: pack.discountPercent,
        tag: "GAYM_COIN",
        image_url: "https://cdn-icons-png.flaticon.com/512/1490/1490853.png",
        description: pack.desc,
        is_reviewed: true,
        coin_amount: pack.coins,
      });

      if (upsertError) throw upsertError;

      // 2. เพิ่มแพ็กเกจเหรียญลงในตาราง user_cart รวมกับเกม
      const { error: cartError } = await supabase.from("user_cart").insert({
        user_id: session.user.id,
        game_id: pack.id,
      });

      if (cartError) throw cartError;

      setCartCount((prev) => prev + 1);

      Alert.alert(
        "เพิ่มลงตะกร้าแล้ว!",
        `เพิ่ม "${pack.title}" (฿${pack.finalPrice}) เข้าสู่ตะกร้าสินค้าเรียบร้อยแล้ว สามารถชำระเงินรวมกับเกมได้เลย`,
        [
          { text: "เลือกดูสินค้าต่อ", style: "cancel" },
          {
            text: "ไปที่ตะกร้าสินค้า (Cart)",
            onPress: () => router.push("/cart"),
          },
        ],
      );
    } catch (error) {
      Alert.alert("เกิดข้อผิดพลาด", error.message);
    } finally {
      setBuyingId(null);
    }
  };

  // ซื้อกรอบรูปหรือ Theme ด้วย GAYM Coin ที่มีในบัญชี
  const handleBuyCosmeticItem = (item) => {
    const currentCoins = profile?.gaym_coins ?? 0;
    const ownedList = Array.isArray(profile?.owned_items)
      ? profile.owned_items
      : [];

    if (ownedList.includes(item.id)) {
      Alert.alert(
        "คุณมีไอเทมนี้แล้ว",
        "สามารถกดเลือกใช้งานได้ที่เมนู 'ตกแต่งโปรไฟล์' ในหน้า Profile",
      );
      return;
    }

    if (currentCoins < item.price) {
      Alert.alert(
        "GAYM Coin ไม่เพียงพอ",
        `ไอเทมนี้ใช้ ${item.price} GAYM Coin แต่คุณมี ${currentCoins} Coin\nต้องการไปที่หมวดเติมเหรียญ GAYM Coin หรือไม่?`,
        [
          { text: "ยกเลิก", style: "cancel" },
          {
            text: "ไปหน้าเติม Coin",
            onPress: () => setActiveCategory("coins"),
          },
        ],
      );
      return;
    }

    Alert.alert(
      "ยืนยันการแลกซื้อ",
      `ต้องการใช้ ${item.price} GAYM Coin เพื่อแลกซื้อ "${item.name}" ใช่หรือไม่? (ได้รับ +1 LV.)`,
      [
        { text: "ยกเลิก", style: "cancel" },
        {
          text: "แลกซื้อเลย",
          onPress: async () => {
            try {
              setBuyingId(item.id);
              const newCoins = currentCoins - item.price;
              const newOwned = [...ownedList, item.id];
              const nextLevel = (profile?.level || 1) + 1; // ✅ บวก +1 LV.

              const { error } = await supabase
                .from("profiles")
                .update({
                  gaym_coins: newCoins,
                  owned_items: newOwned,
                  level: nextLevel,
                })
                .eq("id", session.user.id);

              if (error) throw error;

              setProfile({
                ...profile,
                gaym_coins: newCoins,
                owned_items: newOwned,
                level: nextLevel,
              });

              Alert.alert(
                "ซื้อสำเร็จ & LEVEL UP! 🎉",
                `ได้รับ "${item.name}" และเลเวลอัปเป็น LV.${nextLevel} เรียบร้อยแล้ว!`,
                [
                  { text: "เลือกซื้อต่อ", style: "cancel" },
                  {
                    text: "ไปหน้าตกแต่งโปรไฟล์",
                    onPress: () => router.push("/(tabs)/profile"),
                  },
                ],
              );
            } catch (error) {
              Alert.alert("เกิดข้อผิดพลาด", error.message);
            } finally {
              setBuyingId(null);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  const ownedItems = Array.isArray(profile?.owned_items)
    ? profile.owned_items
    : [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: theme.card }]}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="sparkles" size={20} color="#facc15" />
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            GAYM MARKET
          </Text>
        </View>

        {/* แสดงยอด GAYM Coin คงเหลือ + ปุ่มไปหน้าตะกร้าสินค้า */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <TouchableOpacity
            style={styles.coinPill}
            onPress={() => setActiveCategory("coins")}
          >
            <Ionicons name="logo-bitcoin" size={15} color="#facc15" />
            <Text style={styles.coinText}>{profile?.gaym_coins ?? 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.cartBtn,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
            onPress={() => router.push("/cart")}
          >
            <Ionicons name="cart" size={20} color={theme.text} />
            {cartCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ปุ่มสลับ 3 หมวดหมู่: เติมเหรียญ Coin | กรอบรูป (1-5 Coin) | Theme (5-10 Coin) */}
      <View style={[styles.tabRow, { backgroundColor: theme.card }]}>
        <TouchableOpacity
          style={[
            styles.tabBtn,
            activeCategory === "coins" && { backgroundColor: "#f59e0b" },
          ]}
          onPress={() => setActiveCategory("coins")}
        >
          <Ionicons
            name="logo-bitcoin"
            size={16}
            color={activeCategory === "coins" ? "#fff" : theme.subText}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeCategory === "coins" ? "#fff" : theme.subText },
            ]}
          >
            เติม Coin
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabBtn,
            activeCategory === "frames" && { backgroundColor: theme.accent },
          ]}
          onPress={() => setActiveCategory("frames")}
        >
          <Ionicons
            name="person-circle-outline"
            size={16}
            color={activeCategory === "frames" ? "#fff" : theme.subText}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeCategory === "frames" ? "#fff" : theme.subText },
            ]}
          >
            กรอบรูป (1-5)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabBtn,
            activeCategory === "themes" && { backgroundColor: theme.accent },
          ]}
          onPress={() => setActiveCategory("themes")}
        >
          <Ionicons
            name="color-palette-outline"
            size={16}
            color={activeCategory === "themes" ? "#fff" : theme.subText}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeCategory === "themes" ? "#fff" : theme.subText },
            ]}
          >
            Theme (5-10)
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeCategory === "coins" && (
          // ========================================================
          // ✅ หมวดที่ 1: ซื้อแพ็กเกจเติมเหรียญ GAYM Coin (รวมเข้าตะกร้าซื้อเกม)
          // ========================================================
          <>
            <Animated.View
              style={[
                styles.heroBanner,
                {
                  backgroundColor: theme.card,
                  borderColor: isRgbTheme ? animatedRgbColor : "#facc15",
                },
              ]}
            >
              <Text style={[styles.heroTitle, { color: theme.text }]}>
                เติมเหรียญ GAYM Coin
              </Text>
              <Text style={[styles.heroSub, { color: theme.subText }]}>
                เลือกแพ็กเกจเหรียญที่ต้องการ ระบบจะนำเข้าสู่ตะกร้าสินค้า (Cart)
                เพื่อชำระเงินรวมกับเกมที่คุณเลือกไว้ทันที!
              </Text>
            </Animated.View>

            {COIN_PACKAGES.map((pack) => (
              <View
                key={pack.id}
                style={[
                  styles.coinPackCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: pack.popular ? "#facc15" : theme.border,
                    borderWidth: pack.popular ? 2 : 1,
                  },
                ]}
              >
                {pack.popular && (
                  <View style={styles.discountRibbon}>
                    <Text style={styles.discountRibbonText}>
                      🔥 โปรโมชันพิเศษ ลด 50% (คุ้มที่สุด!)
                    </Text>
                  </View>
                )}

                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={styles.coinIconCircle}>
                    <Ionicons name="logo-bitcoin" size={34} color="#facc15" />
                    <Text style={styles.coinPackAmountText}>+{pack.coins}</Text>
                  </View>

                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={[styles.itemName, { color: theme.text }]}>
                      {pack.title}
                    </Text>
                    <Text style={[styles.itemDesc, { color: theme.subText }]}>
                      {pack.desc}
                    </Text>

                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        marginTop: 8,
                      }}
                    >
                      <Text style={styles.bahtFinalPrice}>
                        ฿{pack.finalPrice}
                      </Text>
                      {pack.discountPercent > 0 && (
                        <>
                          <Text style={styles.bahtOldPrice}>
                            ฿{pack.originalPrice}
                          </Text>
                          <View style={styles.halfOffBadge}>
                            <Text style={styles.halfOffText}>
                              -{pack.discountPercent}%
                            </Text>
                          </View>
                        </>
                      )}
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.addCartCoinBtn}
                    onPress={() => handleAddCoinPackToCart(pack)}
                    disabled={buyingId === pack.id}
                  >
                    {buyingId === pack.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="cart-outline" size={18} color="#fff" />
                        <Text style={styles.addCartCoinText}>ใส่ตะกร้า</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

        {activeCategory === "frames" &&
          // ========================================================
          // หมวดที่ 2: กรอบรูปโปรไฟล์ (1 - 5 GAYM Coin)
          // ========================================================
          MARKET_FRAMES.map((frame) => {
            const isOwned = ownedItems.includes(frame.id);
            const isEquipped = profile?.equipped_frame === frame.id;

            return (
              <View
                key={frame.id}
                style={[
                  styles.itemCard,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <View style={{ marginRight: 16 }}>
                  <AvatarWithFrame
                    avatarUrl={profile?.avatar_url}
                    username={profile?.username}
                    frameId={frame.id}
                    size={62}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 6,
                    }}
                  >
                    <Text style={[styles.itemName, { color: theme.text }]}>
                      {frame.name}
                    </Text>
                    {frame.animated && (
                      <View style={styles.animBadge}>
                        <Text style={styles.animBadgeText}>ANIMATED</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.itemDesc, { color: theme.subText }]}>
                    {frame.desc}
                  </Text>

                  <View style={styles.priceActionRow}>
                    <View style={styles.priceTag}>
                      <Ionicons name="logo-bitcoin" size={16} color="#facc15" />
                      <Text style={styles.priceValue}>
                        {frame.price} GAYM Coin
                      </Text>
                    </View>

                    {isOwned ? (
                      <TouchableOpacity
                        style={[
                          styles.ownedBtn,
                          {
                            backgroundColor: isEquipped ? "#10b981" : "#374151",
                          },
                        ]}
                        onPress={() => router.push("/(tabs)/profile")}
                      >
                        <Text style={styles.ownedBtnText}>
                          {isEquipped ? "กำลังใช้งาน" : "มีแล้ว (ไปตกแต่ง)"}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[
                          styles.buyBtn,
                          { backgroundColor: theme.accent },
                        ]}
                        onPress={() => handleBuyCosmeticItem(frame)}
                        disabled={buyingId === frame.id}
                      >
                        {buyingId === frame.id ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.buyBtnText}>แลกซื้อ</Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          })}

        {activeCategory === "themes" &&
          // ========================================================
          // หมวดที่ 3: Theme พิเศษของแอป (5 - 10 GAYM Coin)
          // ========================================================
          MARKET_THEMES.map((tItem) => {
            const isOwned = ownedItems.includes(tItem.id);
            const isEquipped = profile?.equipped_theme === tItem.id;

            return (
              <View
                key={tItem.id}
                style={[
                  styles.itemCard,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <View
                  style={[
                    styles.themePreviewBox,
                    { backgroundColor: tItem.bg, borderColor: tItem.accent },
                  ]}
                >
                  <Text style={{ fontSize: 28 }}>{tItem.emoji}</Text>
                  <View style={{ flexDirection: "row", gap: 4, marginTop: 6 }}>
                    <View
                      style={[styles.colorDot, { backgroundColor: tItem.bg }]}
                    />
                    <View
                      style={[styles.colorDot, { backgroundColor: tItem.card }]}
                    />
                    <View
                      style={[
                        styles.colorDot,
                        { backgroundColor: tItem.accent },
                      ]}
                    />
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 6,
                    }}
                  >
                    <Text style={[styles.itemName, { color: theme.text }]}>
                      {tItem.name}
                    </Text>
                    {tItem.animated && (
                      <View style={styles.animBadge}>
                        <Text style={styles.animBadgeText}>RGB ANIMATION</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.itemDesc, { color: theme.subText }]}>
                    {tItem.desc}
                  </Text>

                  <View style={styles.priceActionRow}>
                    <View style={styles.priceTag}>
                      <Ionicons name="logo-bitcoin" size={16} color="#facc15" />
                      <Text style={styles.priceValue}>
                        {tItem.price} GAYM Coin
                      </Text>
                    </View>

                    {isOwned ? (
                      <TouchableOpacity
                        style={[
                          styles.ownedBtn,
                          {
                            backgroundColor: isEquipped ? "#10b981" : "#374151",
                          },
                        ]}
                        onPress={() => router.push("/(tabs)/profile")}
                      >
                        <Text style={styles.ownedBtnText}>
                          {isEquipped ? "กำลังใช้งาน" : "มีแล้ว (ไปตกแต่ง)"}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[
                          styles.buyBtn,
                          { backgroundColor: theme.accent },
                        ]}
                        onPress={() => handleBuyCosmeticItem(tItem)}
                        disabled={buyingId === tItem.id}
                      >
                        {buyingId === tItem.id ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.buyBtnText}>แลกซื้อ</Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
      </ScrollView>
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
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", letterSpacing: 0.5 },
  coinPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(250, 204, 21, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#facc15",
    gap: 5,
  },
  coinText: { color: "#facc15", fontWeight: "bold", fontSize: 14 },
  cartBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    position: "relative",
  },
  cartBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#ef4444",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  cartBadgeText: { color: "#fff", fontSize: 10, fontWeight: "bold" },

  heroBanner: {
    marginBottom: 15,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  heroTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  heroSub: { fontSize: 12, lineHeight: 18 },

  tabRow: {
    flexDirection: "row",
    margin: 15,
    marginBottom: 5,
    borderRadius: 12,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 5,
  },
  tabText: { fontSize: 11, fontWeight: "bold" },

  scrollContent: { padding: 15, paddingBottom: 40 },

  // สไตล์การ์ดแพ็กเกจเหรียญ GAYM Coin
  coinPackCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 14,
  },
  discountRibbon: {
    backgroundColor: "rgba(239, 68, 68, 0.18)",
    borderWidth: 1,
    borderColor: "#ef4444",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 10,
  },
  discountRibbonText: { color: "#f87171", fontSize: 11, fontWeight: "bold" },
  coinIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 16,
    backgroundColor: "rgba(250, 204, 21, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(250, 204, 21, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  coinPackAmountText: {
    color: "#facc15",
    fontSize: 13,
    fontWeight: "bold",
    marginTop: 2,
  },
  bahtFinalPrice: { color: "#10b981", fontSize: 20, fontWeight: "bold" },
  bahtOldPrice: {
    color: "#6b7280",
    fontSize: 14,
    textDecorationLine: "line-through",
  },
  halfOffBadge: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  halfOffText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  addCartCoinBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f59e0b",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 5,
  },
  addCartCoinText: { color: "#fff", fontSize: 12, fontWeight: "bold" },

  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  themePreviewBox: {
    width: 72,
    height: 72,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#fff",
  },
  itemName: { fontSize: 15, fontWeight: "bold" },
  animBadge: {
    backgroundColor: "#ec4899",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  animBadgeText: { color: "#fff", fontSize: 9, fontWeight: "bold" },
  itemDesc: { fontSize: 12, marginTop: 4, lineHeight: 17 },

  priceActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  priceTag: { flexDirection: "row", alignItems: "center", gap: 5 },
  priceValue: { color: "#facc15", fontSize: 14, fontWeight: "bold" },

  buyBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 10,
  },
  buyBtnText: { color: "#fff", fontSize: 13, fontWeight: "bold" },
  ownedBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  ownedBtnText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
});
