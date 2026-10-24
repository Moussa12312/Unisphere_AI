import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput } from 'react-native';
import Colors from '../../constants/colors';
import Header from '../../components/Header';
import RoleBadge from '../../components/RoleBadge';

export const AdminAccountsScreen = () => {
  const [search, setSearch] = useState('');

  const accounts = [
    { id: 1, name: 'Moussa Coulibaly', email: 'etudiant@unisphere.ai', role: 'student', status: 'Actif' },
    { id: 2, name: 'Dr. Cheick Coulibaly', email: 'enseignant@unisphere.ai', role: 'teacher', status: 'Actif' },
    { id: 3, name: 'Awa Traoré', email: 'secretaire@unisphere.ai', role: 'secretary', status: 'Actif' },
    { id: 4, name: 'Prof. Amadou Diop', email: 'censeur@unisphere.ai', role: 'censeur', status: 'Actif' },
    { id: 5, name: 'Alou Sissoko', email: 'gardien@unisphere.ai', role: 'guard', status: 'Actif' },
    { id: 6, name: 'Kadiatou Touré', email: 'comptable@unisphere.ai', role: 'accountant', status: 'Actif' },
  ];

  const filtered = accounts.filter(
    (a) => a.name.toLowerCase().includes(search.toLowerCase()) || a.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <Header title="Gestion des Utilisateurs" subtitle="Comptes, Permissions & Rôles" role="admin" />

      <View style={styles.searchBox}>
        <TextInput
          style={styles.input}
          placeholder="Rechercher par nom ou email..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {filtered.map((acc) => (
          <View key={acc.id} style={styles.card}>
            <View style={styles.cardTop}>
              <View>
                <Text style={styles.name}>{acc.name}</Text>
                <Text style={styles.email}>{acc.email}</Text>
              </View>
              <RoleBadge role={acc.role} />
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.statusLive}>● Statut : {acc.status}</Text>
              <Text style={styles.editLink}>Gérer ➔</Text>
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
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  name: { fontSize: 15, fontWeight: '800', color: Colors.text },
  email: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  statusLive: { fontSize: 11, fontWeight: '700', color: Colors.accentGreen },
  editLink: { fontSize: 12, color: Colors.roleAdmin, fontWeight: '700' },
});

export default AdminAccountsScreen;
