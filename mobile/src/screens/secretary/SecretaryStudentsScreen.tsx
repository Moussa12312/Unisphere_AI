import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, RefreshControl, ActivityIndicator } from 'react-native';
import Colors from '../../constants/colors';
import Header from '../../components/Header';
import DataService from '../../services/dataService';

export const SecretaryStudentsScreen = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStudents = async () => {
    try {
      const data = await DataService.getSecretaryStudents(50);
      const list = Array.isArray(data) ? data : (data?.students || []);
      setStudents(list);
    } catch (e) {
      console.log('Error loading secretary students:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadStudents();
  };

  const filtered = students.filter((s) => {
    const name = s.first_name ? `${s.first_name} ${s.last_name || ''}` : (s.full_name || '');
    const mat = s.matricule || '';
    const fil = s.filiere || '';
    const q = search.toLowerCase();
    return name.toLowerCase().includes(q) || mat.toLowerCase().includes(q) || fil.toLowerCase().includes(q);
  });

  return (
    <View style={styles.container}>
      <Header title="Dossiers Étudiants" subtitle="Recherche & Consultation Directe" role="secretary" />

      <View style={styles.searchBox}>
        <TextInput
          style={styles.input}
          placeholder="Rechercher par nom, matricule ou filière..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.roleSecretary]} />}
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={Colors.roleSecretary} style={{ marginVertical: 30 }} />
        ) : filtered.length > 0 ? (
          filtered.map((st) => {
            const name = st.first_name ? `${st.first_name} ${st.last_name || ''}` : (st.full_name || 'Étudiant');
            const isComplete = st.status === 'active' || !st.missing_docs;
            return (
              <View key={st.id} style={styles.card}>
                <View style={styles.top}>
                  <View>
                    <Text style={styles.name}>{name}</Text>
                    <Text style={styles.mat}>{st.matricule || 'N/A'}</Text>
                  </View>
                  <View style={[styles.badge, isComplete ? styles.badgeGreen : styles.badgeAmber]}>
                    <Text style={[styles.badgeText, isComplete ? styles.textGreen : styles.textAmber]}>
                      {isComplete ? 'Complet' : 'À compléter'}
                    </Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.meta}>🎓 {st.filiere || 'Filière'} ({st.level || 'LMD'})</Text>
                  <Text style={styles.actionLink}>Dossier Actif ➔</Text>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Aucun étudiant trouvé</Text>
            <Text style={styles.emptySubtitle}>Les étudiants enregistrés dans l'université apparaîtront ici.</Text>
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
  emptyCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  emptySubtitle: { fontSize: 12, color: Colors.textMuted, textAlign: 'center' },
});

export default SecretaryStudentsScreen;
