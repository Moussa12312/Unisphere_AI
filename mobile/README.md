# UniSphere AI — Application Mobile (Expo / React Native)

Application mobile officielle multi-rôles pour la plateforme universitaire **UniSphere AI**.
L'application propose 8 espaces dédiés complets, accessibles selon le profil connecté ou commutables via la barre de rôle.

---

## Les 8 Espaces Dédiés

1. 🎓 **Étudiant** :
   - Tableau de bord académique (moyenne, assiduité, crédits ECTS)
   - Relevé de notes LMD et unités d'enseignement (UE)
   - Carte étudiante numérique sécurisée avec QR code pour le contrôle d'accès
   - Emploi du temps hebdomadaire dynamique
   - Suivi des tranches de scolarité, montants réglés et reçus officiels

2. 👨‍🏫 **Enseignant** :
   - Modules d'enseignement et effectifs
   - Saisie rapide des notes LMD (CC et Examen)
   - Appel numérique de cours avec bascule Présent / Absent / Retard

3. 📁 **Secrétariat** :
   - Gestion des dossiers et recherche d'étudiants
   - Traitement et signature numérique des demandes de certificats
   - Planning et occupation des salles de cours et d'examen

4. ⚖️ **Censeur (Direction des Études)** :
   - Supervision des délibérations et validation des procès-verbaux
   - Publication des bulletins de notes officiels LMD
   - Détection et audit des anomalies de notation

5. 👑 **Administrateur** :
   - Vue d'ensemble de l'université et statistiques temps réel
   - Gestion des comptes et des permissions
   - Configuration académique et paramètres de sécurité

6. 🛡️ **Gardien (Sécurité Campus)** :
   - Scanner de QR Code de badge étudiant en direct
   - Contrôle d'accès au portail (Autorisé / Refusé)
   - Journal en direct des passages campus

7. 💰 **Comptable** :
   - Suivi des recouvrements et paiements des scolarités
   - Journal des encaissements par canal (Wave, Orange Money, Caisse, Chèque)
   - Clôture de caisse journalière

8. 🤝 **Alumni** :
   - Réseau et annuaire des diplômés par promotion
   - Offres d'emploi, stages et mentorat d'étudiants
   - Profil professionnel et visibilité carrières

---

## Démarrage Rapide

### 1. Installation des dépendances
```bash
cd mobile
npm install
```

### 2. Démarrer l'application avec Expo
```bash
npx expo start
```
- Appuyez sur **`w`** pour tester immédiatement dans le navigateur Web.
- Scannez le QR Code affiché dans le terminal avec l'application **Expo Go** (sur Android ou iOS) pour tester directement sur votre téléphone physique.

### 3. Génération de l'APK Téléchargeable sur Téléphone (Android)
```bash
# Avec EAS Build :
npm install -g eas-cli
eas login
eas build -p android --profile preview
```
L'APK standalone généré peut être téléchargé et installé directement sur n'importe quel smartphone Android !
