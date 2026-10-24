import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, RefreshControl, ActivityIndicator } from 'react-native';
import Colors from '../../constants/colors';
import Header from '../../components/Header';
import RoleBadge from '../../components/RoleBadge';
import DataService from '../../services/dataService';

export const AdminAccountsScreen = () => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAccounts = async () => {
    try {
      const data = await DataService.getAdminUsers();
      setAccounts(Array.isArray(data) ? data : []);
    } catch (e) {
      console.log('Error loading admin accounts:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadAccounts();
  };

  const filtered = accounts.filter((a) => {
    const name = a.full_name || '';
    const email = a.email || '';
    const role = a.role || '';
    const q = search.toLowerCase();
    return name.toLowerCase().includes(q) || email.toLowerCase().includes(q) || role.toLowerCase().includes(q);
  });

  return (
    <View style={styles.container}>
      <Header title="Gestion des Utilisateurs" subtitle="Comptes, Permissions & Rôles" role="admin" />

      <View style={styles.searchBox}>
        <TextInput
          style={styles.input}
          placeholder="Rechercher par nom, email ou rôle..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.roleAdmin]} />}
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={Colors.roleAdmin} style={{ marginVertical: 30 }} />
        ) : filtered.length > 0 ? (
          filtered.map((acc) => (
            <View key={acc.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.name}>{acc.full_name || 'Utilisateur UniSphere'}</Text>
                  <Text style={styles.email}>{acc.email}</Text>
                </View>
                <RoleBadge role={acc.role || 'student'} />
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.statusLive}>
                  ● Statut : {acc.is_active !== false ? 'Actif' : 'Suspendu'}
                </Text>
                <Text style={styles.lastLogin}>
                  Dernier accès : {acc.last_login || 'Récemment'}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Aucun compte trouvé</Text>
            <Text style={styles.emptySubtitle}>Les utilisateurs configurés s'afficheront ici.</Text>
          </View>
        )}
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
  lastLogin: { fontSize: 11, color: Colors.textLight },
  emptyCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  emptySubtitle: { fontSize: 12, color: Colors.textMuted, textAlign: 'center' },
});

export default AdminAccountsScreen;
