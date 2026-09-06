import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';

const TAGS = ['Action', 'RPG', 'Cozy', 'Indie Horror', 'Pixel Art', 'Sci-Fi', 'Multiplayer'];
const PRICES = ['Free', 'Under 500 THB', '500 - 1,000 THB', 'Over 1,000 THB'];

export default function SearchFilterScreen({ navigation }) {
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedPrice, setSelectedPrice] = useState('Free');

  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search & Filter</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.textDim} />
          <TextInput 
            style={styles.searchInput} 
            placeholder="Search games, studios..." 
            placeholderTextColor={COLORS.textDim}
          />
        </View>

        {/* Categories */}
        <Text style={styles.sectionTitle}>Categories & Tags</Text>
        <View style={styles.chipsContainer}>
          {TAGS.map(tag => (
            <TouchableOpacity 
              key={tag} 
              style={[styles.chip, selectedTags.includes(tag) && styles.chipActive]}
              onPress={() => toggleTag(tag)}
            >
              <Text style={[styles.chipText, selectedTags.includes(tag) && styles.chipTextActive]}>{tag}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Price Range */}
        <Text style={styles.sectionTitle}>Price Range</Text>
        <View style={styles.chipsContainer}>
          {PRICES.map(price => (
            <TouchableOpacity 
              key={price} 
              style={[styles.chip, selectedPrice === price && styles.chipActive]}
              onPress={() => setSelectedPrice(price)}
            >
              <Text style={[styles.chipText, selectedPrice === price && styles.chipTextActive]}>{price}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.resetBtn} onPress={() => { setSelectedTags([]); setSelectedPrice(''); }}>
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.applyBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.applyText}>Apply Filters</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 60 },
  backBtn: { backgroundColor: COLORS.card, padding: 10, borderRadius: 16 },
  headerTitle: { color: COLORS.text, fontSize: 20, fontWeight: 'bold', fontFamily: 'Prompt_700Bold' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 16, paddingHorizontal: 15, height: 50, marginBottom: 30 },
  searchInput: { flex: 1, color: COLORS.text, marginLeft: 10, fontSize: 16, fontFamily: 'Prompt_400Regular' },
  sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginBottom: 15, fontFamily: 'Prompt_700Bold' },
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 30 },
  chip: { backgroundColor: COLORS.card, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, marginRight: 10, marginBottom: 10, borderWidth: 1, borderColor: COLORS.cardLight },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: COLORS.textDim, fontWeight: '500', fontFamily: 'Prompt_500Medium' },
  chipTextActive: { color: COLORS.text, fontWeight: 'bold', fontFamily: 'Prompt_700Bold' },
  bottomBar: { flexDirection: 'row', padding: 20, backgroundColor: COLORS.card, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  resetBtn: { flex: 1, padding: 15, alignItems: 'center' },
  resetText: { color: COLORS.textDim, fontWeight: 'bold', fontSize: 16, fontFamily: 'Prompt_700Bold' },
  applyBtn: { flex: 2, backgroundColor: COLORS.primary, padding: 15, borderRadius: 20, alignItems: 'center' },
  applyText: { color: COLORS.text, fontWeight: 'bold', fontSize: 16, fontFamily: 'Prompt_700Bold' },
});