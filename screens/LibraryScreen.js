import React, { useState } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, FlatList, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';
import { MOCK_LIBRARY } from '../mockData';

const FILTERS = ['Recent', 'Favorites', 'Completed', 'Action', 'RPG'];

// เพิ่มการรับค่า { navigation } เพื่อใช้คำสั่งย้อนกลับ
export default function LibraryScreen({ navigation }) {
  const [activeFilter, setActiveFilter] = useState('Recent');

  const renderGameItem = ({ item }) => (
    <View style={styles.libraryCard}>
      <Image source={{ uri: item.image }} style={styles.cardImage} />
      <View style={styles.cardContent}>
        <View>
          <Text style={styles.gameTitle}>{item.title}</Text>
          <Text style={styles.textDim}>{item.playTime} playtime</Text>
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.playBtn}>
            <Ionicons name="play" size={16} color={COLORS.background} />
            <Text style={styles.playBtnText}>Play</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.reviewBtn}>
            <Ionicons name="create-outline" size={20} color={COLORS.secondary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* แก้ไข Header โดยเพิ่มปุ่มย้อนกลับ */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>My Library</Text>
        
        <TouchableOpacity style={styles.searchBtn}>
          <Ionicons name="search" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Filter Bar */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {FILTERS.map((filter, index) => (
            <TouchableOpacity 
              key={index} 
              style={[styles.filterChip, activeFilter === filter && styles.filterChipActive]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}>
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Game List */}
      <FlatList
        data={MOCK_LIBRARY}
        keyExtractor={item => item.id}
        renderItem={renderGameItem}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, paddingTop: 60, alignItems: 'center' },
  backBtn: { backgroundColor: COLORS.card, padding: 10, borderRadius: 16 }, // สไตล์ปุ่มให้เข้ากับหน้าอื่นๆ
  searchBtn: { backgroundColor: 'transparent', padding: 10 }, // จัดช่องว่างให้สมดุล
  headerTitle: { color: COLORS.text, fontSize: 24, fontWeight: 'bold', fontFamily: 'Prompt_700Bold' },
  filterContainer: { paddingLeft: 20, marginBottom: 10 },
  filterChip: { backgroundColor: COLORS.card, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: COLORS.cardLight },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { color: COLORS.textDim, fontWeight: '500', fontFamily: 'Prompt_500Medium' },
  filterTextActive: { color: COLORS.text, fontWeight: 'bold', fontFamily: 'Prompt_700Bold' },
  libraryCard: { backgroundColor: COLORS.card, borderRadius: 24, flexDirection: 'row', padding: 12, marginBottom: 16, alignItems: 'center' },
  cardImage: { width: 90, height: 90, borderRadius: 16 },
  cardContent: { flex: 1, marginLeft: 16, height: 90, justifyContent: 'space-between' },
  gameTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginBottom: 4, fontFamily: 'Prompt_700Bold' },
  textDim: { color: COLORS.textDim, fontSize: 12, fontFamily: 'Prompt_400Regular' },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  playBtn: { backgroundColor: COLORS.secondary, flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 12 },
  playBtnText: { color: COLORS.background, fontWeight: 'bold', marginLeft: 6, fontFamily: 'Prompt_700Bold' },
  reviewBtn: { backgroundColor: COLORS.cardLight, padding: 8, borderRadius: 12 },
});