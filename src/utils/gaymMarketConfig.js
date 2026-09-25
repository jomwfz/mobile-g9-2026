import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, Text, Image, StyleSheet, Animated, Easing } from "react-native";
import { useFocusEffect } from "expo-router";
import { supabase } from "../services/supabaseClient";

// ====================================================
// ✅ ฟังก์ชันคำนวณยศจาก LV. และฟังก์ชันเพิ่ม LV. ให้ผู้เล่น
// ====================================================
export const getRankName = (level) => {
  const lv = level || 1;
  if (lv <= 5) return "มือใหม่";
  if (lv <= 15) return "เกมเมอร์";
  if (lv <= 30) return "โปรเพลเยอร์";
  if (lv <= 50) return "อีลีท";
  return "มาสเตอร์";
};

export const addPlayerLevel = async (userId, addAmount = 1) => {
  if (!userId || addAmount <= 0) return null;
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("level")
      .eq("id", userId)
      .single();

    const currentLv = profile?.level || 1;
    const nextLv = currentLv + addAmount;

    const { error } = await supabase
      .from("profiles")
      .update({ level: nextLv })
      .eq("id", userId);

    if (error) throw error;
    return nextLv;
  } catch (error) {
    console.error("Error adding level:", error.message);
    return null;
  }
};

// ====================================================
// 1. รายการกรอบรูปโปรไฟล์ (เรทราคา 1 - 5 GAYM Coin)
// ====================================================
export const MARKET_FRAMES = [
  {
    id: "frame_shark",
    name: "กรอบ Shark (ฉลามจ้าวสมุทร)",
    price: 1,
    animated: false,
    desc: "กรอบรูปครีบฉลามสุดเท่สีน้ำเงินเข้ม",
    previewColor: "#0284c7",
    badge: "🦈 SHARK",
  },
  {
    id: "frame_flash",
    name: "กรอบ Flash (สายฟ้าฟาด)",
    price: 3,
    animated: true,
    desc: "กรอบรูปสายฟ้าสีทองกระพริบแบบมี Animation",
    previewColor: "#facc15",
    badge: "⚡ FLASH",
  },
  {
    id: "frame_rainbow",
    name: "กรอบ Rainbow (สายรุ้งหมุนวน)",
    price: 4,
    animated: true,
    desc: "กรอบรูปสีรุ้งสดใสพร้อม Animation หมุนวน",
    previewColor: "#ec4899",
    badge: "🌈 RAINBOW",
  },
  {
    id: "frame_rgb",
    name: "กรอบ RGB Gaming (ไฟวิ่ง)",
    price: 5,
    animated: true,
    desc: "กรอบไฟ RGB เปลี่ยนสีอัตโนมัติระดับเกมเมอร์",
    previewColor: "#10b981",
    badge: "✨ RGB",
  },
];

// ====================================================
// 2. รายการ Theme พิเศษของแอป (เรทราคา 5 - 10 GAYM Coin)
// ====================================================
export const MARKET_THEMES = [
  {
    id: "theme_brown",
    name: "Theme Brown (หมีบราวน์อบอุ่น)",
    price: 5,
    animated: false,
    desc: "โทนสีน้ำตาลคาราเมลอบอุ่น สไตล์คาเฟ่หมีบราวน์",
    bg: "#2b1d14",
    card: "#3e2a1e",
    accent: "#d97706",
    text: "#fef3c7",
    subText: "#d6d3d1",
    border: "#5c3d2e",
    chatBubbleMe: "#b45309",
    chatBubbleOther: "#3e2a1e",
    emoji: "🐻",
  },
  {
    id: "theme_doraemon",
    name: "Theme Doraemon (โดราเอมอน)",
    price: 7,
    animated: false,
    desc: "โทนสีฟ้า-ขาว-กระดิ่งเหลือง สดใสสไตล์โดราเอมอน",
    bg: "#082f49",
    card: "#0c4a6e",
    accent: "#00a0e9",
    text: "#ffffff",
    subText: "#bae6fd",
    border: "#0284c7",
    chatBubbleMe: "#ef4444",
    chatBubbleOther: "#0c4a6e",
    emoji: "🔔",
  },
  {
    id: "theme_kitty",
    name: "Theme Kitty (คิตตี้พิงค์)",
    price: 8,
    animated: false,
    desc: "โทนสีชมพูพาสเทลหวานแหวว น่ารักทุกหน้าจอ",
    bg: "#3b0726",
    card: "#590d3b",
    accent: "#f472b6",
    text: "#fdf2f8",
    subText: "#fbcfe8",
    border: "#9d174d",
    chatBubbleMe: "#ec4899",
    chatBubbleOther: "#590d3b",
    emoji: "🎀",
  },
  {
    id: "theme_rgb",
    name: "Theme RGB (ไฟเกมมิ่ง Animation)",
    price: 10,
    animated: true,
    desc: "ธีมระดับตำนาน! ขอบการ์ดและปุ่มเปลี่ยนสีไฟวิ่ง RGB ทั่วทั้งแอป",
    bg: "#05050d",
    card: "#111122",
    accent: "#10b981",
    text: "#ffffff",
    subText: "#9ca3af",
    border: "#ec4899",
    chatBubbleMe: "#6366f1",
    chatBubbleOther: "#181830",
    emoji: "🌈",
  },
];

export const getThemeConfig = (themeId) => {
  const found = MARKET_THEMES.find((t) => t.id === themeId);
  if (found) return found;
  return {
    id: "default",
    name: "GAYM Original",
    animated: false,
    bg: "#0a0a1a",
    card: "#1a1a2e",
    accent: "#3b82f6",
    text: "#ffffff",
    subText: "#9ca3af",
    border: "#2a2a4a",
    chatBubbleMe: "#3b82f6",
    chatBubbleOther: "#1a1a2e",
    emoji: "🎮",
  };
};

export function useUserAppTheme(overrideThemeId = null) {
  const [equippedThemeId, setEquippedThemeId] = useState(
    overrideThemeId || "default",
  );
  const rgbAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      if (overrideThemeId) {
        setEquippedThemeId(overrideThemeId);
        return;
      }
      let isMounted = true;
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (session && isMounted) {
          const { data } = await supabase
            .from("profiles")
            .select("equipped_theme")
            .eq("id", session.user.id)
            .maybeSingle();
          if (data?.equipped_theme && isMounted) {
            setEquippedThemeId(data.equipped_theme);
          }
        }
      });
      return () => {
        isMounted = false;
      };
    }, [overrideThemeId]),
  );

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(rgbAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const theme = getThemeConfig(overrideThemeId || equippedThemeId);

  const animatedRgbColor = rgbAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#ec4899"],
  });

  return {
    theme,
    equippedThemeId: overrideThemeId || equippedThemeId,
    isRgbTheme: theme.id === "theme_rgb",
    animatedRgbColor,
  };
}

export function AvatarWithFrame({
  avatarUrl,
  username = "U",
  frameId = "none",
  size = 60,
}) {
  const animVal = useRef(new Animated.Value(0)).current;
  const flashVal = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (frameId === "frame_rgb" || frameId === "frame_rainbow") {
      const colorLoop = Animated.loop(
        Animated.timing(animVal, {
          toValue: 1,
          duration: frameId === "frame_rgb" ? 2200 : 1400,
          easing: Easing.linear,
          useNativeDriver: false,
        }),
      );
      colorLoop.start();
      return () => colorLoop.stop();
    } else if (frameId === "frame_flash") {
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(flashVal, {
            toValue: 0.25,
            duration: 280,
            useNativeDriver: false,
          }),
          Animated.timing(flashVal, {
            toValue: 1,
            duration: 280,
            useNativeDriver: false,
          }),
        ]),
      );
      pulseLoop.start();
      return () => pulseLoop.stop();
    }
  }, [frameId]);

  const rgbBorderColor = animVal.interpolate({
    inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
    outputRange: [
      "#ff0055",
      "#ffaa00",
      "#00ff66",
      "#00ccff",
      "#aa00ff",
      "#ff0055",
    ],
  });

  const rainbowBorderColor = animVal.interpolate({
    inputRange: [0, 0.33, 0.66, 1],
    outputRange: ["#ec4899", "#facc15", "#38bdf8", "#ec4899"],
  });

  const outerSize = size + 10;
  let borderStyle = {
    borderWidth: 0,
    borderColor: "transparent",
  };

  if (frameId === "frame_rgb") {
    borderStyle = {
      borderWidth: 3.5,
      borderColor: rgbBorderColor,
    };
  } else if (frameId === "frame_rainbow") {
    borderStyle = {
      borderWidth: 3.5,
      borderColor: rainbowBorderColor,
    };
  } else if (frameId === "frame_flash") {
    borderStyle = {
      borderWidth: 3.5,
      borderColor: "#facc15",
      opacity: flashVal,
    };
  } else if (frameId === "frame_shark") {
    borderStyle = {
      borderWidth: 3.5,
      borderColor: "#0284c7",
    };
  }

  return (
    <View
      style={{
        width: outerSize,
        height: outerSize,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Animated.View
        style={[
          {
            width: outerSize,
            height: outerSize,
            borderRadius: outerSize / 2,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#0a0a1a",
          },
          borderStyle,
        ]}
      >
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            overflow: "hidden",
            backgroundColor: "#3b82f6",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={{ width: "100%", height: "100%" }}
            />
          ) : (
            <Text
              style={{
                color: "#fff",
                fontSize: size * 0.42,
                fontWeight: "bold",
              }}
            >
              {username ? username[0].toUpperCase() : "U"}
            </Text>
          )}
        </View>
      </Animated.View>

      {frameId === "frame_shark" && (
        <View style={styles.badgeCorner}>
          <Text style={{ fontSize: size * 0.26 }}>🦈</Text>
        </View>
      )}
      {frameId === "frame_flash" && (
        <View style={styles.badgeCorner}>
          <Text style={{ fontSize: size * 0.26 }}>⚡</Text>
        </View>
      )}
      {frameId === "frame_rainbow" && (
        <View style={styles.badgeCorner}>
          <Text style={{ fontSize: size * 0.26 }}>🌈</Text>
        </View>
      )}
      {frameId === "frame_rgb" && (
        <View style={styles.badgeCorner}>
          <Text style={{ fontSize: size * 0.24 }}>✨</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badgeCorner: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#0a0a1a",
    borderRadius: 12,
    paddingHorizontal: 2,
  },
});
