import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Colors from '../../constants/colors';
import Header from '../../components/Header';

export const AdminSettingsScreen = () => {
  return (
    <View style={styles.container}>
      <Header title="Paramètres Système" subtitle="Configuration Globale de l'Université" role="admin" />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Profil de l'Université</Text>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Nom de l'Institution</Text>
            <Text style={styles.settingVal}>Université UniSphere AI</Text>
          </View>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Système Académique</Text>
            <Text style={styles.settingVal}>LMD (Licence, Master, Doctorat)</Text>
          </View>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Note Minimale de Validation</Text>
            <Text style={styles.settingVal}>10.00 / 20.00</Text>
          </View>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Pénalités Retard Paiement</Text>
            <Text style={styles.settingVal}>5 000 FCFA (Automatique)</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sécurité & Connexions</Text>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Tokens JWT Expiration</Text>
            <Text style={styles.settingVal}>30 Minutes</Text>
          </View>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Contrôle d'accès Portail</Text>
            <Text style={styles.settingVal}>QR Code crypté & Journalisé</Text>
          </View>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Version API Mobile</Text>
            <Text style={styles.settingVal}>v2.0.0 Production</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  card: { backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: Colors.border },
  cardTitle: { fontSize: 15, fontWeight: '800', color: Colors.text, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 8 },
  settingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  settingLabel: { fontSize: 13, color: Colors.textMuted },
  settingVal: { fontSize: 13, fontWeight: '700', color: Colors.text },
});

export default AdminSettingsScreen;
