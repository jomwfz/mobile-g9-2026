import React from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';

export default function ProfileScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        
        <View style={styles.profileHeader}>
          <TouchableOpacity style={styles.settingsBtn} onPress={() => navigation.navigate('Settings')}>
             <Ionicons name="settings-outline" size={24} color={COLORS.text} />
          </TouchableOpacity>
          
          <View style={styles.avatarContainer}>
            <Image source={{ uri: 'https://i.pravatar.cc/200?img=11' }} style={styles.avatar} />
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>Lv. 32</Text>
            </View>
          </View>
          
          <Text style={styles.displayName}>PlayerX</Text>
          <Text style={styles.username}>gaym_96</Text>
          
          <View style={{ flexDirection: 'row', gap: 15, marginTop: 10 }}>
            <TouchableOpacity style={styles.editBtn}>
              <Text style={styles.editBtnText}>Edit Profile</Text>
            </TouchableOpacity>
            
            {/* กดเพื่อไปหน้า Creator Studio */}
            <TouchableOpacity style={[styles.editBtn, { backgroundColor: COLORS.primary }]} onPress={() => navigation.navigate('CreatorStudio')}>
              <Text style={[styles.editBtnText, { color: COLORS.background }]}>Creator Studio</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>124</Text>
            <Text style={styles.statLabel}>Games</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>860h</Text>
            <Text style={styles.statLabel}>Playtime</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>15</Text>
            <Text style={styles.statLabel}>Badges</Text>
          </View>
        </View>

        {/* My Library Button (ย้ายมาจาก Tab Bar) */}
        <TouchableOpacity style={styles.libraryBtn} onPress={() => navigation.navigate('Library')}>
          <Ionicons name="library" size={22} color={COLORS.background} />
          <Text style={styles.libraryBtnText}>My Game Library</Text>
        </TouchableOpacity>

        {/* Currently Playing Card */}
        <Text style={styles.sectionTitle}>Currently Playing</Text>
        <View style={styles.playingCard}>
          <Image source={{ uri: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&w=500&q=80' }} style={styles.playingImg} />
          <View style={styles.playingInfo}>
            <Text style={styles.playingTitle}>Neon Nights</Text>
            <Text style={styles.textDim}>Last played: 2h ago</Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: '65%' }]} />
            </View>
            <Text style={styles.progressText}>65% Completed</Text>
          </View>
        </View>

        {/* My Badges / Collections */}
        <Text style={styles.sectionTitle}>My Badges</Text>
        <View style={styles.badgesContainer}>
           {[1,2,3,4].map((item) => (
             <View key={item} style={styles.badgeItem}>
                <Ionicons name="shield-checkmark" size={32} color={COLORS.secondary} />
             </View>
           ))}
        </View>

        {/* Log Out Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={() => navigation.replace('Login')}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
          <Text style={styles.logoutBtnText}>Log Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  profileHeader: { alignItems: 'center', paddingTop: 60, paddingBottom: 30, backgroundColor: COLORS.card, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  settingsBtn: { position: 'absolute', top: 50, right: 20, padding: 10 },
  avatarContainer: { position: 'relative', marginBottom: 16 },
  avatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: COLORS.primary },
  levelBadge: { position: 'absolute', bottom: -5, alignSelf: 'center', backgroundColor: COLORS.secondary, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 2, borderColor: COLORS.card },
  levelText: { color: COLORS.background, fontWeight: 'bold', fontSize: 12, fontFamily: 'Prompt_700Bold' },
  displayName: { color: COLORS.text, fontSize: 24, fontWeight: 'bold', fontFamily: 'Prompt_700Bold' },
  username: { color: COLORS.textDim, fontSize: 14, marginTop: 4, marginBottom: 16, fontFamily: 'Prompt_400Regular' },
  editBtn: { backgroundColor: COLORS.cardLight, paddingVertical: 8, paddingHorizontal: 24, borderRadius: 20 },
  editBtnText: { color: COLORS.text, fontWeight: 'bold', fontFamily: 'Prompt_700Bold' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', margin: 20, backgroundColor: COLORS.card, padding: 20, borderRadius: 24 },
  statBox: { alignItems: 'center' },
  statNumber: { color: COLORS.text, fontSize: 22, fontWeight: 'bold', fontFamily: 'Prompt_700Bold' },
  statLabel: { color: COLORS.textDim, fontSize: 12, marginTop: 4, fontFamily: 'Prompt_500Medium' },
  statDivider: { width: 1, height: 30, backgroundColor: COLORS.cardLight },
  libraryBtn: { flexDirection: 'row', backgroundColor: COLORS.secondary, marginHorizontal: 20, marginBottom: 10, paddingVertical: 15, borderRadius: 20, justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.secondary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 5, elevation: 5 },
  libraryBtnText: { color: COLORS.background, fontSize: 16, fontFamily: 'Prompt_700Bold', marginLeft: 10 },
  sectionTitle: { color: COLORS.text, fontSize: 20, fontWeight: 'bold', marginLeft: 20, marginBottom: 12, marginTop: 10, fontFamily: 'Prompt_700Bold' },
  playingCard: { flexDirection: 'row', backgroundColor: COLORS.card, marginHorizontal: 20, borderRadius: 24, padding: 12, alignItems: 'center' },
  playingImg: { width: 80, height: 80, borderRadius: 16 },
  playingInfo: { flex: 1, marginLeft: 16 },
  playingTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold', fontFamily: 'Prompt_700Bold' },
  textDim: { color: COLORS.textDim, fontSize: 12, marginTop: 4, fontFamily: 'Prompt_400Regular' },
  progressBarBg: { height: 6, backgroundColor: COLORS.cardLight, borderRadius: 3, marginTop: 10 },
  progressBarFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },
  progressText: { color: COLORS.primary, fontSize: 10, marginTop: 6, fontWeight: 'bold', alignSelf: 'flex-end', fontFamily: 'Prompt_700Bold' },
  badgesContainer: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 20, marginBottom: 20 },
  badgeItem: { width: 70, height: 70, backgroundColor: COLORS.card, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', marginHorizontal: 20, marginTop: 15, paddingVertical: 15, borderRadius: 20, borderWidth: 1, borderColor: COLORS.danger },
  logoutBtnText: { color: COLORS.danger, fontSize: 16, fontFamily: 'Prompt_700Bold', marginLeft: 10 }
});