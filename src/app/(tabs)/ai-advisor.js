import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AiAdvisorScreen() {
  const flatListRef = useRef();

  // API KEY ของ NVIDIA
  // นำ API Key ตัวใหม่มาใส่แทนของเดิม
  const AI_API_KEY =
    "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";

  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "1",
      text: "สวัสดีครับ! ผมคือ GAYM AI Advisor 🤖\nอยากให้ผมแนะนำเกมแนวไหน หรือมีคำถามอะไรเกี่ยวกับเกม พิมพ์ถามมาได้เลยครับ!",
      isAi: true,
    },
  ]);

  useEffect(() => {
    if (flatListRef.current) {
      setTimeout(
        () => flatListRef.current.scrollToEnd({ animated: true }),
        200,
      );
    }
  }, [messages, isTyping]);

  const callAiAPI = async (userText) => {
    const apiUrl = "https://integrate.api.nvidia.com/v1/chat/completions";
    const systemPrompt =
      "คุณคือ AI Advisor ประจำร้านขายเกมชื่อ GAYM Store หน้าที่ของคุณคือแนะนำเกม ตอบคำถามเกี่ยวกับเกมด้วยความสุภาพ เป็นกันเอง และใช้ภาษาไทย ให้คำตอบกระชับ ไม่ยาวเกินไป";

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${AI_API_KEY}`,
          Accept: "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-20b",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userText },
          ],
          // ปรับ 2 ค่านี้ใหม่
          temperature: 0.7, // ลดจาก 1 มาเป็น 0.7 เพื่อให้ AI ตอบตรงคำถาม ไม่คิดออกทะเล (ประหยัดเวลาคิด)
          max_tokens: 400, // ลดจาก 4096 เหลือ 400 บังคับให้ตอบสั้น กระชับ และรวดเร็ว
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("NVIDIA Error:", response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (data.choices && data.choices.length > 0) {
        // บางโมเดลอาจมี reasoning_content (กระบวนการคิด) เพิ่มเข้ามา
        const message = data.choices[0].message;
        const reasoning = message.reasoning_content ? `(กำลังคิด...)\n` : "";

        return reasoning + message.content;
      } else {
        throw new Error("ระบบไม่ได้ส่งข้อความกลับมา");
      }
    } catch (error) {
      console.error("API Call Error:", error);
      return `[ระบบขัดข้อง] รายละเอียด: ${error.message}`;
    }
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isAi: false,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsTyping(true);

    const aiResponseText = await callAiAPI(userMessage.text);

    const aiMessage = {
      id: (Date.now() + 1).toString(),
      text: aiResponseText,
      isAi: true,
    };
    setMessages((prev) => [...prev, aiMessage]);
    setIsTyping(false);
  };

  const renderMessage = ({ item }) => (
    <View
      style={[
        styles.messageBubble,
        item.isAi ? styles.aiBubble : styles.userBubble,
      ]}
    >
      <Text style={styles.messageText}>{item.text}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Ionicons name="sparkles" size={24} color="#3b82f6" />
          <Text style={styles.headerTitle}>AI Advisor</Text>
        </View>
        <Text style={styles.headerSubtitle}>Powered by NVIDIA AI</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.chatContainer}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={() =>
            isTyping ? (
              <View
                style={[
                  styles.messageBubble,
                  styles.aiBubble,
                  { width: 60, alignItems: "center" },
                ]}
              >
                <ActivityIndicator size="small" color="#fff" />
              </View>
            ) : null
          }
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="พิมพ์ข้อความคุยกับ AI..."
            placeholderTextColor="#6b7280"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isTyping) && { opacity: 0.5 },
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || isTyping}
          >
            {isTyping ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a1a" },
  header: {
    padding: 15,
    paddingTop: 40,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a2e",
    alignItems: "center",
  },
  headerTitleContainer: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "#fff" },
  headerSubtitle: { color: "#6b7280", fontSize: 12, marginTop: 4 },
  chatContainer: { padding: 15, paddingBottom: 20 },
  messageBubble: {
    maxWidth: "85%",
    padding: 15,
    borderRadius: 16,
    marginBottom: 15,
  },
  aiBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#1a1a2e",
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#0000ff",
    borderBottomRightRadius: 4,
  },
  messageText: { color: "#fff", fontSize: 15, lineHeight: 22 },
  inputContainer: {
    flexDirection: "row",
    padding: 15,
    backgroundColor: "#0a0a1a",
    borderTopWidth: 1,
    borderTopColor: "#1a1a2e",
    alignItems: "center",
  },
  input: {
    flex: 1,
    backgroundColor: "#1a1a2e",
    color: "#fff",
    padding: 12,
    borderRadius: 25,
    paddingHorizontal: 20,
    minHeight: 45,
  },
  sendButton: {
    backgroundColor: "#0000ff",
    width: 45,
    height: 45,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
});
