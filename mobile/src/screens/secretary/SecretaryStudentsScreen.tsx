import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput } from 'react-native';
import Colors from '../../constants/colors';
import Header from '../../components/Header';

export const SecretaryStudentsScreen = () => {
  const [search, setSearch] = useState('');

  const students = [
    { id: 1, name: 'Moussa Coulibaly', matricule: 'ETU-2026-0842', filiere: 'Informatique', level: 'L3', dossier: 'Complet' },
    { id: 2, name: 'Aminata Diallo', matricule: 'ETU-2026-0112', filiere: 'Gestion', level: 'M1', dossier: 'Complet' },
    { id: 3, name: 'Bakary Diakité', matricule: 'ETU-2026-0304', filiere: 'Droit', level: 'L2', dossier: 'Incomplet' },
    { id: 4, name: 'Saliou Traoré', matricule: 'ETU-2026-0520', filiere: 'Informatique', level: 'L1', dossier: 'Complet' },
  ];

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.matricule.toLowerCase().includes(search.toLowerCase()) ||
      s.filiere.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <Header title="Dossiers Étudiants" subtitle="Recherche & Consultation" role="secretary" />

      <View style={styles.searchBox}>
        <TextInput
          style={styles.input}
          placeholder="Rechercher par nom, matricule ou filière..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {filtered.map((st) => (
          <View key={st.id} style={styles.card}>
            <View style={styles.top}>
              <View>
                <Text style={styles.name}>{st.name}</Text>
                <Text style={styles.mat}>{st.matricule}</Text>
              </View>
              <View style={[styles.badge, st.dossier === 'Complet' ? styles.badgeGreen : styles.badgeAmber]}>
                <Text style={[styles.badgeText, st.dossier === 'Complet' ? styles.textGreen : styles.textAmber]}>
                  {st.dossier}
                </Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.meta}>🎓 {st.filiere} ({st.level})</Text>
              <Text style={styles.actionLink}>Voir le dossier ➔</Text>
            </View>
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
  name: { fontSize: 15, fontWeight: '700', color: Colors.text },
  mat: { fontSize: 11, color: Colors.roleSecretary, fontWeight: '700', marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeGreen: { backgroundColor: '#ECFDF5' },
  badgeAmber: { backgroundColor: '#FFFBEB' },
  badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  textGreen: { color: Colors.accentGreen },
  textAmber: { color: Colors.accentAmber },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  meta: { fontSize: 12, color: Colors.textMuted },
  actionLink: { fontSize: 12, color: Colors.roleSecretary, fontWeight: '700' },
});

export default SecretaryStudentsScreen;
