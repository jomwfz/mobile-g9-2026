import React from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, FlatList, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';
import { MOCK_POSTS, MOCK_LIBRARY } from '../mockData';

export default function CommunityScreen() {
  
  const renderPost = ({ item }) => (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
        <View style={styles.postMeta}>
          <Text style={styles.userName}>{item.user}</Text>
          <Text style={styles.timeText}>{item.time}</Text>
        </View>
        <Ionicons name="ellipsis-horizontal" size={20} color={COLORS.textDim} />
      </View>
      
      <Text style={styles.postContent}>{item.content}</Text>
      
      <View style={styles.postActions}>
        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons name="heart-outline" size={20} color={COLORS.danger} />
          <Text style={styles.actionText}>{item.likes}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons name="chatbubble-outline" size={20} color={COLORS.secondary} />
          <Text style={styles.actionText}>{item.comments}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons name="share-social-outline" size={20} color={COLORS.textDim} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Community</Text>
      </View>

      {/* Game Rooms (My Games Tab) */}
      <View style={styles.roomsContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{id: 'all', image: 'https://cdn-icons-png.flaticon.com/512/681/681443.png'}, ...MOCK_LIBRARY]}
          keyExtractor={item => item.id}
          renderItem={({item, index}) => (
            <TouchableOpacity style={[styles.roomBubble, index === 0 && styles.roomBubbleActive]}>
              <Image source={{ uri: item.image }} style={styles.roomImage} />
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Discussion Feed */}
      <FlatList
        data={MOCK_POSTS}
        keyExtractor={item => item.id}
        renderItem={renderPost}
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Chat Input Floating */}
      <View style={styles.inputContainer}>
        <TextInput 
          style={styles.textInput} 
          placeholder="Share your thoughts..." 
          placeholderTextColor={COLORS.textDim}
        />
        <TouchableOpacity style={styles.sendBtn}>
          <Ionicons name="send" size={18} color={COLORS.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 20, paddingTop: 60 },
  headerTitle: { color: COLORS.text, fontSize: 28, fontWeight: 'bold', fontFamily: 'Prompt_700Bold' },
  roomsContainer: { paddingLeft: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: COLORS.card },
  roomBubble: { width: 56, height: 56, borderRadius: 28, marginRight: 12, backgroundColor: COLORS.cardLight, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  roomBubbleActive: { borderColor: COLORS.primary },
  roomImage: { width: '100%', height: '100%' },
  postCard: { backgroundColor: COLORS.card, borderRadius: 24, padding: 20, marginBottom: 16 },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  postMeta: { flex: 1, marginLeft: 12 },
  userName: { color: COLORS.text, fontWeight: 'bold', fontSize: 16, fontFamily: 'Prompt_700Bold' },
  timeText: { color: COLORS.textDim, fontSize: 12, fontFamily: 'Prompt_400Regular' },
  postContent: { color: COLORS.text, fontSize: 15, lineHeight: 22, marginBottom: 16, fontFamily: 'Prompt_400Regular' },
  postActions: { flexDirection: 'row', alignItems: 'center' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 24 },
  actionText: { color: COLORS.textDim, marginLeft: 6, fontWeight: '500', fontFamily: 'Prompt_500Medium' },
  inputContainer: { position: 'absolute', bottom: 90, left: 20, right: 20, backgroundColor: COLORS.cardLight, borderRadius: 30, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, elevation: 5 },
  textInput: { flex: 1, color: COLORS.text, fontSize: 15, marginLeft: 5, fontFamily: 'Prompt_400Regular' },
  sendBtn: { backgroundColor: COLORS.primary, width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
});