import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput } from 'react-native';
import Colors from '../../constants/colors';
import Header from '../../components/Header';

export const AlumniDirectoryScreen = () => {
  const [search, setSearch] = useState('');

  const alumniList = [
    { id: 1, name: 'Seydou Keita', promo: 'Promo 2023', position: 'Lead Developer @ Société Générale', filiere: 'Informatique', mentoring: true },
    { id: 2, name: 'Aïssata Bamba', promo: 'Promo 2024', position: 'Auditrice Financière @ PwC', filiere: 'Finance & Comptabilité', mentoring: true },
    { id: 3, name: 'Mamadou Cissé', promo: 'Promo 2022', position: 'Chef de Projet @ Malitel', filiere: 'Télécoms & Réseaux', mentoring: false },
    { id: 4, name: 'Korotoumou Traoré', promo: 'Promo 2024', position: 'Data Analyst @ Moov Africa', filiere: 'Data Science', mentoring: true },
  ];

  const filtered = alumniList.filter(
    (a) => a.name.toLowerCase().includes(search.toLowerCase()) || a.position.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <Header title="Annuaire des Diplômés" subtitle="Réseau Professionnel UniSphere" role="alumni" />

      <View style={styles.searchBox}>
        <TextInput
          style={styles.input}
          placeholder="Rechercher par nom, entreprise ou poste..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {filtered.map((a) => (
          <View key={a.id} style={styles.card}>
            <View style={styles.top}>
              <View>
                <Text style={styles.name}>{a.name}</Text>
                <Text style={styles.promo}>{a.promo} • {a.filiere}</Text>
              </View>
              {a.mentoring && (
                <View style={styles.mentorBadge}>
                  <Text style={styles.mentorText}>🌱 Mentor</Text>
                </View>
              )}
            </View>

            <Text style={styles.position}>💼 {a.position}</Text>
            <Text style={styles.contactLink}>Contacter sur le réseau ➔</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  searchBox: { padding: 16, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  input: { backgroundColor: '#F1F5F9', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, color: Colors.text },
  content: { padding: 16, paddingBottom: 32 },
  card: { backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  name: { fontSize: 15, fontWeight: '800', color: Colors.text },
  promo: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  mentorBadge: { backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  mentorText: { fontSize: 10, fontWeight: '800', color: Colors.accentGreen },
  position: { fontSize: 13, color: Colors.text, marginTop: 8, fontWeight: '600' },
  contactLink: { fontSize: 12, color: Colors.roleAlumni, fontWeight: '700', marginTop: 10 },
});

export default AlumniDirectoryScreen;
