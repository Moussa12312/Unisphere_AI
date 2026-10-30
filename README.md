# 🎓 UniSphere AI — Plateforme SaaS de Gestion Universitaire Intelligente

**UniSphere AI** est une plateforme complète de gestion académique, pédagogique, financière et administrative destinée aux universités et grandes écoles (système LMD), intégrant un assistant IA, le contrôle d'accès par QR Code, la génération de documents officiels certifiés et une application mobile compagnon.

---

## 🏗️ Architecture du Projet

| Composant | Technologie | Port par défaut | Dossier |
| :--- | :--- | :--- | :--- |
| **Frontend Web** | Next.js 16, React 19, TypeScript, TailwindCSS 4 | `3005` (dev) / `3000` (prod) | [`frontend/`](file:///c:/UniSphere_AI/frontend) |
| **Backend API** | FastAPI (Python 3.11/3.12), SQLAlchemy, Alembic | `8000` | [`backend/`](file:///c:/UniSphere_AI/backend) |
| **Application Mobile** | React Native (Expo 57) | `8081` | [`mobile/`](file:///c:/UniSphere_AI/mobile) |
| **Base de données** | PostgreSQL 15+ (ou SQLite local `unisphere.db`) | `5432` | `backend/unisphere.db` |

---

## 👥 Espaces Utilisateurs (9 Rôles)

1. **Super Admin (`super_admin`)** : Pilotage multi-universités, facturation SaaS, plans d'abonnement, audit, base de données.
2. **Direction / Admin (`admin`)** : Tableau de bord global, étudiants, enseignants, filières, cours, finances, délibérations, bulletins.
3. **Censeur / Direction des Études (`censeur`)** : Validation des notes, détection d'anomalies, sessions d'examen, rattrapages, emplois du temps.
4. **Secrétariat Général (`secretary`)** : Inscriptions, tirage des cartes étudiantes (planches A4), certificats de scolarité, saisie des notes, UE.
5. **Comptable (`accountant`)** : Encaissements des frais de scolarité, reçus, dépenses, paie du personnel, grand livre, balance générale.
6. **Enseignant (`teacher`)** : Gestion des cours, appel et présence par QR Code, saisie des notes CC/Examen, supports pédagogiques.
7. **Étudiant (`student`)** : Carte numérique QR, consultation des notes et bulletins LMD, emploi du temps, reçus de paiement, demandes d'actes.
8. **Poste de Garde (`guard`)** : Scanner QR Code temps réel aux portiques, registre des entrées/sorties, déclaration d'incidents.
9. **Alumni (`alumni`)** : Annuaire des diplômés, mentorat, opportunités professionnelles.

---

## 🚀 Installation & Lancement Rapide

### 1. Configuration des Variables d'Environnement

Copiez les fichiers d'exemple `.env.example` :

```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

Variables principales dans `backend/.env` :
- `DATABASE_URL` : URL SQLite (`sqlite:///./unisphere.db`) ou PostgreSQL (`postgresql://user:pass@localhost:5432/unisphere_ai`)
- `SECRET_KEY` : Clé secrète JWT (obligatoire, ne jamais committer)
- `ALGORITHM` : `HS256`
- `FRONTEND_URL` : Origines autorisées pour CORS (`http://localhost:3000,http://localhost:3005`)
- `OPENAI_API_KEY` : Clé API pour l'assistant IA UniSphere

### 2. Démarrer le Backend (FastAPI)

```powershell
cd backend
.\venv\Scripts\activate
pip install -r requirements.txt

# Initialiser les comptes de démonstration (optionnel)
python setup_mobile_demo_users.py

# Lancer le serveur API sur le port 8000
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- Documentation interactive Swagger : `http://localhost:8000/docs`
- Vérification de santé : `http://localhost:8000/api/v1/health`

### 3. Démarrer le Frontend (Next.js)

```powershell
cd frontend
npm install
npm run dev
```
- L'interface web est accessible sur `http://localhost:3005` (ou `http://localhost:3000` en production).

### 4. Démarrer l'Application Mobile (Expo)

```powershell
cd mobile
npm install
npx expo start
```

---

## 🧪 Tests & Vérification Qualité

Pour vérifier l'ensemble des endpoints API sur tous les rôles :

```powershell
python test_all_mobile_endpoints.py
```

Pour vérifier le typage TypeScript du frontend :

```powershell
cd frontend
npx tsc --noEmit
```

---

## 🐳 Déploiement en Production (Docker)

Consultez le guide détaillé dans [DEPLOYMENT.md](file:///c:/UniSphere_AI/DEPLOYMENT.md) ou lancez directement :

```bash
docker compose up -d --build
```

