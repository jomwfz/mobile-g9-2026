import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';

export default function SettingsScreen({ navigation }) {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  const SettingRow = ({ icon, title, isSwitch, value, onToggle }) => (
    <View style={styles.settingRow}>
      <View style={styles.settingLeft}>
        <View style={styles.iconBox}>
          <Ionicons name={icon} size={20} color={COLORS.text} />
        </View>
        <Text style={styles.settingText}>{title}</Text>
      </View>
      {isSwitch ? (
        <Switch 
          value={value} 
          onValueChange={onToggle}
          trackColor={{ false: COLORS.cardLight, true: COLORS.primary }}
          thumbColor={COLORS.text}
        />
      ) : (
        <Ionicons name="chevron-forward" size={20} color={COLORS.textDim} />
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.sectionTitle}>Account & Privacy</Text>
        <View style={styles.cardGroup}>
          <SettingRow icon="person-outline" title="Edit Profile" />
          <SettingRow icon="lock-closed-outline" title="Change Password" />
          <SettingRow icon="shield-checkmark-outline" title="Privacy Settings" />
        </View>

        <Text style={styles.sectionTitle}>App Preferences</Text>
        <View style={styles.cardGroup}>
          <SettingRow icon="notifications-outline" title="Push Notifications" isSwitch value={notifications} onToggle={setNotifications} />
          <SettingRow icon="moon-outline" title="Dark Theme" isSwitch value={darkMode} onToggle={setDarkMode} />
          <SettingRow icon="language-outline" title="Language (English)" />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 60 },
  backBtn: { backgroundColor: COLORS.card, padding: 10, borderRadius: 16 },
  headerTitle: { color: COLORS.text, fontSize: 20, fontWeight: 'bold', fontFamily: 'Prompt_700Bold' },
  sectionTitle: { color: COLORS.textDim, fontSize: 14, fontWeight: 'bold', marginBottom: 10, marginTop: 20, marginLeft: 10, textTransform: 'uppercase', fontFamily: 'Prompt_700Bold' },
  cardGroup: { backgroundColor: COLORS.card, borderRadius: 24, paddingHorizontal: 15, paddingVertical: 5 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: COLORS.cardLight },
  settingLeft: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { backgroundColor: COLORS.cardLight, padding: 8, borderRadius: 10, marginRight: 15 },
  settingText: { color: COLORS.text, fontSize: 16, fontWeight: '500', fontFamily: 'Prompt_500Medium' },
});