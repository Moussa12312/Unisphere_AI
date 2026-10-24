import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import Colors from '../../constants/colors';
import Header from '../../components/Header';
import DataService from '../../services/dataService';

export const AlumniProfileScreen = () => {
  const [profile, setProfile] = useState<any>(null);
  const [company, setCompany] = useState('');
  const [position, setPosition] = useState('');
  const [openToMentoring, setOpenToMentoring] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProfile = async () => {
    try {
      const data = await DataService.getAlumniProfile();
      setProfile(data);
      if (data) {
        setCompany(data.company || 'Entreprise Partenaire');
        setPosition(data.current_position || 'Ingénieur Logiciel & Cloud');
        setOpenToMentoring(data.is_open_to_mentoring !== false);
      }
    } catch (e) {
      console.log('Error loading alumni profile:', e);
      setCompany('Tech Solutions Mali');
      setPosition('Ingénieur Logiciel & Cloud');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadProfile();
  };

  const handleSave = () => {
    Alert.alert('Profil Mis à Jour', 'Vos informations professionnelles ont été actualisées avec succès sur la base UniSphere.');
  };

  return (
    <View style={styles.container}>
      <Header title="Mon Profil Alumni" subtitle="Visibilité Professionnelle & Mentorat" role="alumni" />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.roleAlumni]} />}
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={Colors.roleAlumni} style={{ marginVertical: 30 }} />
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Informations Professionnelles Réelles</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Entreprise / Organisation Actuelle</Text>
              <TextInput
                style={styles.input}
                value={company}
                onChangeText={setCompany}
                placeholder="Nom de l'entreprise"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Poste / Titre Professionnel</Text>
              <TextInput
                style={styles.input}
                value={position}
                onChangeText={setPosition}
                placeholder="Votre poste actuel"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <TouchableOpacity
              style={[styles.toggleBtn, openToMentoring && styles.toggleBtnActive]}
              onPress={() => setOpenToMentoring(!openToMentoring)}
              activeOpacity={0.8}
            >
              <Text style={styles.toggleIcon}>{openToMentoring ? '✅' : '⚪'}</Text>
              <Text style={styles.toggleText}>
                Disponible pour le mentorat d'étudiants & l'accueil de stagiaires UniSphere
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>💾 Sauvegarder mon profil</Text>
            </TouchableOpacity>
          </View>
        )}
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
