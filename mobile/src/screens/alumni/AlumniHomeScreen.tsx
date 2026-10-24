import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import Colors from '../../constants/colors';
import Header from '../../components/Header';
import StatCard from '../../components/StatCard';
import DataService from '../../services/dataService';

export const AlumniHomeScreen = ({ navigation, onLogout }: any) => {
  const [community, setCommunity] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [commData, profData] = await Promise.all([
        DataService.getAlumniCommunity().catch(() => []),
        DataService.getAlumniProfile().catch(() => null),
      ]);
      setCommunity(Array.isArray(commData) ? commData : []);
      setProfile(profData);
    } catch (e) {
      console.log('Error loading alumni home:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const totalAlumni = community.length || 1;
  const mentorCount = community.filter((a) => a.is_open_to_mentoring).length || 1;
  const alumniName = profile ? `${profile.first_name} ${profile.last_name || ''}` : 'Alumni UniSphere';
  const currentCompany = profile?.company || 'Réseau Professionnel';

  return (
    <View style={styles.container}>
      <Header
        title="Réseau Alumni UniSphere"
        subtitle="Communauté & Insertion Professionnelle"
        userName={alumniName}
        role="alumni"
        onLogout={onLogout}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.roleAlumni]} />}
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={Colors.roleAlumni} style={{ marginVertical: 30 }} />
        ) : (
          <>
            <View style={styles.statsRow}>
              <StatCard label="Communauté" value={`${totalAlumni} Diplômés`} icon="🤝" color={Colors.roleAlumni} subtext="Annuaire officiel" />
              <StatCard label="Mentors Actifs" value={`${mentorCount} Disponibles`} icon="🌱" color={Colors.accentGreen} subtext="Accompagnement" />
            </View>

            <View style={styles.statsRow}>
              <StatCard label="Entreprise Actuelle" value={currentCompany} icon="💼" color={Colors.accentPurple} subtext="Poste certifié" />
              <StatCard label="Statut Profil" value="Vérifié & Actif" icon="✅" color={Colors.accentGreen} subtext="Réseau UniSphere" />
            </View>

            <Text style={styles.sectionTitle}>Espaces Alumni</Text>
            <View style={styles.actionGrid}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => navigation?.navigate('AlumniDirectory')}>
                <Text style={styles.actionIcon}>📖</Text>
                <Text style={styles.actionText}>Annuaire des Diplômés & Réseau</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={() => navigation?.navigate('AlumniProfile')}>
                <Text style={styles.actionIcon}>👤</Text>
                <Text style={styles.actionText}>Mon Profil & Disponibilité Mentorat</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Opportunités Professionnelles & Insertion</Text>
            <View style={styles.card}>
              <Text style={styles.jobTitle}>Programme Mentorat & Stages UniSphere</Text>
              <Text style={styles.jobCompany}>🏢 Réseau des Partenaires Académiques</Text>
              <Text style={styles.jobDesc}>
                Connectez-vous directement avec les étudiants finissants pour proposer des stages, encadrer des mémoires et partager vos retours d'expérience.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: Colors.text, marginTop: 12, marginBottom: 12 },
  actionGrid: { gap: 10, marginBottom: 16 },
  actionBtn: { backgroundColor: Colors.white, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: Colors.border },
  actionIcon: { fontSize: 24 },
  actionText: { fontSize: 14, fontWeight: '700', color: Colors.text },
  card: { backgroundColor: Colors.white, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border },
  jobTitle: { fontSize: 15, fontWeight: '800', color: Colors.text },
  jobCompany: { fontSize: 12, color: Colors.roleAlumni, fontWeight: '700', marginTop: 4 },
  jobDesc: { fontSize: 12, color: Colors.textMuted, marginTop: 6, lineHeight: 18 },
});

export default AlumniHomeScreen;
