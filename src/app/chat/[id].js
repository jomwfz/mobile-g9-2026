import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { supabase } from "../../services/supabaseClient";
import { AvatarWithFrame, useUserAppTheme } from "../../utils/gaymMarketConfig";

export default function PrivateChatScreen() {
  const router = useRouter();
  const { id: receiverId } = useLocalSearchParams();
  const { theme } = useUserAppTheme(); // ✅ เปลี่ยนสีหน้าแชทส่วนตัวตาม Theme พิเศษ

  const [session, setSession] = useState(null);
  const [receiverProfile, setReceiverProfile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [chatImage, setChatImage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      if (currentSession && receiverId) {
        fetchChatData(currentSession.user.id, receiverId);
      }
    });
  }, [receiverId]);

  const fetchChatData = async (myId, targetId) => {
    try {
      setLoading(true);
      const { data: targetUser } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, is_dev, equipped_frame")
        .eq("id", targetId)
        .single();
      setReceiverProfile(targetUser);

      const { data: msgs, error } = await supabase
        .from("private_messages")
        .select("*")
        .or(
          `and(sender_id.eq.${myId},receiver_id.eq.${targetId}),and(sender_id.eq.${targetId},receiver_id.eq.${myId})`,
        )
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(msgs || []);
    } catch (error) {
      console.error("Error loading private chat:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const pickChatImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setChatImage(result.assets[0].uri);
    }
  };

  const handleSendMessage = async () => {
    if ((!text.trim() && !chatImage) || !session) return;
    try {
      let finalImageUrl = null;
      if (chatImage) {
        const fileExt =
          chatImage.substring(chatImage.lastIndexOf(".") + 1) || "jpeg";
        const fileName = `chats/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const base64 = await FileSystem.readAsStringAsync(chatImage, {
          encoding: "base64",
        });

        const { error: uploadError } = await supabase.storage
          .from("images")
          .upload(fileName, decode(base64), {
            contentType: `image/${fileExt}`,
          });
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("images")
          .getPublicUrl(fileName);
        finalImageUrl = publicUrlData.publicUrl;
      }

      const { error } = await supabase.from("private_messages").insert({
        sender_id: session.user.id,
        receiver_id: receiverId,
        message: text.trim(),
        image_url: finalImageUrl,
      });

      if (error) throw error;
      setText("");
      setChatImage(null);
      fetchChatData(session.user.id, receiverId);
    } catch (error) {
      Alert.alert("เกิดข้อผิดพลาด", error.message);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Header แชทส่วนตัว */}
      <View
        style={[
          styles.header,
          { backgroundColor: theme.card, borderBottomColor: theme.border },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.userRow}
          onPress={() => router.push(`/user/${receiverId}`)}
        >
          <AvatarWithFrame
            avatarUrl={receiverProfile?.avatar_url}
            username={receiverProfile?.username}
            frameId={receiverProfile?.equipped_frame || "none"}
            size={38}
          />
          <View style={{ marginLeft: 10 }}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              {receiverProfile?.username || "Chat"} {theme.emoji}
            </Text>
          </View>
        </TouchableOpacity>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.accent} />
          </View>
        ) : (
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ padding: 15, paddingBottom: 30 }}
            renderItem={({ item }) => {
              const isMe = item.sender_id === session?.user?.id;
              return (
                <View
                  style={[
                    styles.msgBubble,
                    isMe
                      ? {
                          alignSelf: "flex-end",
                          backgroundColor: theme.chatBubbleMe,
                        }
                      : {
                          alignSelf: "flex-start",
                          backgroundColor: theme.chatBubbleOther,
                          borderWidth: 1,
                          borderColor: theme.border,
                        },
                  ]}
                >
                  {item.message ? (
                    <Text style={[styles.msgText, { color: theme.text }]}>
                      {item.message}
                    </Text>
                  ) : null}
                  {item.image_url ? (
                    <Image
                      source={{ uri: item.image_url }}
                      style={styles.msgImage}
                    />
                  ) : null}
                </View>
              );
            }}
          />
        )}

        <View
          style={[
            styles.inputBar,
            { backgroundColor: theme.card, borderTopColor: theme.border },
          ]}
        >
          <TouchableOpacity onPress={pickChatImage} style={{ padding: 8 }}>
            <Ionicons name="image-outline" size={24} color={theme.accent} />
          </TouchableOpacity>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: theme.bg, color: theme.text },
            ]}
            placeholder="พิมพ์ข้อความส่วนตัว..."
            placeholderTextColor={theme.subText}
            value={text}
            onChangeText={setText}
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: theme.accent }]}
            onPress={handleSendMessage}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 6 },
  userRow: { flexDirection: "row", alignItems: "center" },
  headerTitle: { fontSize: 17, fontWeight: "bold" },

  msgBubble: {
    maxWidth: "78%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    marginBottom: 10,
  },
  msgText: { fontSize: 15 },
  msgImage: { width: 180, height: 180, borderRadius: 10, marginTop: 6 },

  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  input: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    fontSize: 15,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
  },
});
