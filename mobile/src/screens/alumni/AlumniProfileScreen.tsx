import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import Colors from '../../constants/colors';
import Header from '../../components/Header';

export const AlumniProfileScreen = () => {
  const [company, setCompany] = useState('Tech Solutions Mali');
  const [position, setPosition] = useState('Ingénieur Logiciel & Cloud');
  const [openToMentoring, setOpenToMentoring] = useState(true);

  const handleSave = () => {
    Alert.alert('Profil Mis à Jour', 'Vos informations ont été actualisées dans l\'annuaire UniSphere.');
  };

  return (
    <View style={styles.container}>
      <Header title="Mon Profil Alumni" subtitle="Visibilité Professionnelle & Mentorat" role="alumni" />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Informations Professionnelles</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Entreprise / Organisation Actuelle</Text>
            <TextInput
              style={styles.input}
              value={company}
              onChangeText={setCompany}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Poste / Titre Professionnel</Text>
            <TextInput
              style={styles.input}
              value={position}
              onChangeText={setPosition}
            />
          </View>

          <TouchableOpacity
            style={[styles.toggleBtn, openToMentoring && styles.toggleBtnActive]}
            onPress={() => setOpenToMentoring(!openToMentoring)}
          >
            <Text style={styles.toggleIcon}>{openToMentoring ? '✅' : '⚪'}</Text>
            <Text style={styles.toggleText}>
              Disponible pour le mentorat d'étudiants & l'accueil de stagiaires
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>💾 Sauvegarder mon profil</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  card: { backgroundColor: Colors.white, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: Colors.border },
  cardTitle: { fontSize: 15, fontWeight: '800', color: Colors.text, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 8 },
  inputGroup: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, marginBottom: 6 },
  input: { backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, backgroundColor: '#F8FAFC', borderRadius: 12, marginVertical: 12, borderWidth: 1, borderColor: Colors.border },
  toggleBtnActive: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  toggleIcon: { fontSize: 16 },
  toggleText: { flex: 1, fontSize: 12, fontWeight: '700', color: Colors.text },
  saveBtn: { backgroundColor: Colors.roleAlumni, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: Colors.white, fontSize: 14, fontWeight: '800' },
});

export default AlumniProfileScreen;
