import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Colors from '../../constants/colors';
import Header from '../../components/Header';
import StatCard from '../../components/StatCard';

export const AlumniHomeScreen = ({ navigation, onLogout }: any) => {
  return (
    <View style={styles.container}>
      <Header
        title="Réseau Alumni UniSphere"
        subtitle="Communauté & Insertion Professionnelle"
        userName="Diplômé Promo 2024"
        role="alumni"
        onLogout={onLogout}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statsRow}>
          <StatCard label="Communauté" value="1 240 Diplômés" icon="🤝" color={Colors.roleAlumni} subtext="12 Promotions" />
          <StatCard label="Offres d'Emploi" value="18 Postes" icon="💼" color={Colors.accentGreen} subtext="Stages & CDI" />
        </View>

        <View style={styles.statsRow}>
          <StatCard label="Mes Mentorés" value="2 Étudiants" icon="🌱" color={Colors.accentPurple} subtext="Accompagnement PFE" />
          <StatCard label="Demandes Docs" value="0 En attente" icon="📜" color={Colors.accent} subtext="Relevés certifiés" />
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

        <Text style={styles.sectionTitle}>Dernières Offres Partagées</Text>
        <View style={styles.card}>
          <Text style={styles.jobTitle}>Ingénieur Data & Intelligence Artificielle</Text>
          <Text style={styles.jobCompany}>🏢 Orange Mali • Bamako • CDI</Text>
          <Text style={styles.jobDesc}>Recherche un diplômé UniSphere avec compétences Python, FastAPI et Machine Learning.</Text>
        </View>
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
