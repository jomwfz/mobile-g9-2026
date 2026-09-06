import React from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';

export default function CreatorStudioScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Creator Studio</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        {/* Upload Media Cover */}
        <TouchableOpacity style={styles.uploadBox}>
          <Ionicons name="cloud-upload-outline" size={48} color={COLORS.primary} />
          <Text style={styles.uploadText}>Upload Game Cover (16:9)</Text>
          <Text style={styles.textDim}>PNG, JPG up to 5MB</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Game Title</Text>
        <TextInput style={styles.input} placeholder="e.g. Neon Nights" placeholderTextColor={COLORS.textDim} />

        <Text style={styles.label}>Description</Text>
        <TextInput style={[styles.input, { height: 100, textAlignVertical: 'top' }]} placeholder="Tell players about your game..." placeholderTextColor={COLORS.textDim} multiline />

        <Text style={styles.label}>Price (THB)</Text>
        <TextInput style={styles.input} placeholder="e.g. 450 (Leave blank for Free)" placeholderTextColor={COLORS.textDim} keyboardType="numeric" />

        <Text style={styles.label}>Upload Game File</Text>
        <TouchableOpacity style={styles.fileBox}>
          <Ionicons name="folder-outline" size={24} color={COLORS.textDim} />
          <Text style={styles.fileText}>Select .zip or .exe file</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.submitBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.submitText}>Submit to Admin</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 60 },
  backBtn: { backgroundColor: COLORS.card, padding: 10, borderRadius: 16 },
  headerTitle: { color: COLORS.text, fontSize: 20, fontWeight: 'bold' },
  uploadBox: { backgroundColor: COLORS.card, height: 180, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderStyle: 'dashed', borderWidth: 2, borderColor: COLORS.cardLight },
  uploadText: { color: COLORS.text, fontSize: 16, fontWeight: 'bold', marginTop: 10 },
  textDim: { color: COLORS.textDim, fontSize: 12, marginTop: 4 },
  label: { color: COLORS.text, fontSize: 16, fontWeight: 'bold', marginBottom: 8, marginTop: 15 },
  input: { backgroundColor: COLORS.card, borderRadius: 16, padding: 15, color: COLORS.text, fontSize: 15 },
  fileBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 16, padding: 15, borderWidth: 1, borderColor: COLORS.cardLight },
  fileText: { color: COLORS.textDim, marginLeft: 10, fontSize: 15 },
  submitBtn: { backgroundColor: COLORS.success, padding: 18, borderRadius: 20, alignItems: 'center', marginTop: 30 },
  submitText: { color: COLORS.background, fontSize: 18, fontWeight: 'bold' },
});