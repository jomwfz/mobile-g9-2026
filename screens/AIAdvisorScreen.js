import React from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';

export default function AIAdvisorScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Game Advisor</Text>
        <Ionicons name="time-outline" size={24} color={COLORS.text} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        {/* User Bubble */}
        <View style={styles.userBubble}>
          <Text style={styles.userText}>แนะนำเกมผ่อนคลายเล่นหลังเลิกเรียนให้หน่อยครับ ขอภาพแนว Pixel Art</Text>
        </View>

        {/* AI Bubble with Game Card */}
        <View style={styles.aiBubble}>
          <Text style={styles.aiText}>ได้เลยครับ! นี่คือเกมที่เหมาะกับการพักผ่อนหลังเลิกเรียน:</Text>
          <View style={styles.aiGameCard}>
            <Image source={{ uri: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&w=500&q=80' }} style={styles.aiGameImg} />
            <View style={styles.aiGameInfo}>
              <Text style={styles.aiGameTitle}>Neon Nights</Text>
              <Text style={styles.textDim}>Cozy • Pixel Art</Text>
              <TouchableOpacity style={styles.storeBtn}>
                <Text style={styles.storeBtnText}>View Store</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Prompt Suggestions */}
      <View style={styles.suggestions}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.promptChip}><Text style={styles.promptText}>🔥 เกม Co-op เล่นกับเพื่อน</Text></View>
          <View style={styles.promptChip}><Text style={styles.promptText}>😱 อินดี้สยองขวัญ</Text></View>
        </ScrollView>
      </View>

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput style={styles.textInput} placeholder="Ask AI for game recommendations..." placeholderTextColor={COLORS.textDim} />
        <TouchableOpacity style={styles.sendBtn}>
          <Ionicons name="send" size={18} color={COLORS.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 60, backgroundColor: COLORS.card },
  backBtn: { backgroundColor: COLORS.cardLight, padding: 10, borderRadius: 16 },
  headerTitle: { color: COLORS.secondary, fontSize: 20, fontWeight: 'bold', fontFamily: 'Prompt_700Bold' },
  userBubble: { alignSelf: 'flex-end', backgroundColor: COLORS.primary, padding: 16, borderRadius: 20, borderBottomRightRadius: 5, maxWidth: '80%', marginBottom: 20 },
  userText: { color: COLORS.text, fontSize: 15, lineHeight: 22, fontFamily: 'Prompt_400Regular' },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: COLORS.card, padding: 16, borderRadius: 20, borderBottomLeftRadius: 5, maxWidth: '90%', marginBottom: 20 },
  aiText: { color: COLORS.text, fontSize: 15, lineHeight: 22, marginBottom: 15, fontFamily: 'Prompt_400Regular' },
  aiGameCard: { flexDirection: 'row', backgroundColor: COLORS.cardLight, borderRadius: 16, padding: 10 },
  aiGameImg: { width: 70, height: 70, borderRadius: 12 },
  aiGameInfo: { marginLeft: 12, flex: 1, justifyContent: 'space-between' },
  aiGameTitle: { color: COLORS.text, fontWeight: 'bold', fontSize: 16, fontFamily: 'Prompt_700Bold' },
  textDim: { color: COLORS.textDim, fontSize: 12, fontFamily: 'Prompt_400Regular' },
  storeBtn: { backgroundColor: COLORS.secondary, paddingVertical: 4, paddingHorizontal: 12, borderRadius: 8, alignSelf: 'flex-start' },
  storeBtnText: { color: COLORS.background, fontWeight: 'bold', fontSize: 12, fontFamily: 'Prompt_700Bold' },
  suggestions: { paddingHorizontal: 20, paddingBottom: 10 },
  promptChip: { backgroundColor: COLORS.card, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: COLORS.cardLight },
  promptText: { color: COLORS.textDim, fontSize: 13, fontFamily: 'Prompt_400Regular' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, paddingHorizontal: 20, paddingVertical: 15, paddingBottom: 30 },
  textInput: { flex: 1, color: COLORS.text, fontSize: 15, backgroundColor: COLORS.cardLight, padding: 12, borderRadius: 20, fontFamily: 'Prompt_400Regular' },
  sendBtn: { backgroundColor: COLORS.primary, width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
});