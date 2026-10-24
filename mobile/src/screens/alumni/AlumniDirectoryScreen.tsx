import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, RefreshControl, ActivityIndicator } from 'react-native';
import Colors from '../../constants/colors';
import Header from '../../components/Header';
import DataService from '../../services/dataService';

export const AlumniDirectoryScreen = () => {
  const [alumniList, setAlumniList] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAlumni = async () => {
    try {
      const data = await DataService.getAlumniCommunity(search);
      setAlumniList(Array.isArray(data) ? data : []);
    } catch (e) {
      console.log('Error loading alumni directory:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAlumni();
  }, [search]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAlumni();
  };

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

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.roleAlumni]} />}
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={Colors.roleAlumni} style={{ marginVertical: 30 }} />
        ) : alumniList.length > 0 ? (
          alumniList.map((a) => {
            const name = `${a.first_name || ''} ${a.last_name || ''}`.trim() || 'Alumni UniSphere';
            const promo = a.promotion || (a.graduation_year ? `Promo ${a.graduation_year}` : 'Promo Certifiée');
            const position = a.current_position || 'Professionnel Diplômé';
            const company = a.company ? `@ ${a.company}` : '';
            return (
              <View key={a.id} style={styles.card}>
                <View style={styles.top}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.name}>{name}</Text>
                    <Text style={styles.promo}>{promo} • {a.filiere || 'Diplômé UniSphere'}</Text>
                  </View>
                  {a.is_open_to_mentoring && (
                    <View style={styles.mentorBadge}>
                      <Text style={styles.mentorText}>🌱 Mentor</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.position}>💼 {position} {company}</Text>
                <Text style={styles.contactLink}>
                  {a.location ? `📍 ${a.location} • ` : ''}Contacter sur le réseau ➔
                </Text>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Aucun alumni trouvé</Text>
            <Text style={styles.emptySubtitle}>Les diplômés inscrits au réseau apparaîtront ici.</Text>
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
  name: { fontSize: 15, fontWeight: '800', color: Colors.text },
  promo: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  mentorBadge: { backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  mentorText: { fontSize: 10, fontWeight: '800', color: Colors.accentGreen },
  position: { fontSize: 13, color: Colors.text, marginTop: 8, fontWeight: '600' },
  contactLink: { fontSize: 12, color: Colors.roleAlumni, fontWeight: '700', marginTop: 10 },
  emptyCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  emptySubtitle: { fontSize: 12, color: Colors.textMuted, textAlign: 'center' },
});

export default AlumniDirectoryScreen;
