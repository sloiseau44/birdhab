# Birdhab — Contexte du projet

> Ce fichier centralise toutes les décisions techniques et fonctionnelles du projet.
> Il doit être mis à jour à chaque décision importante et committé dans le repo.
> Dernière mise à jour : juillet 2026

---

## Vision du projet

**Birdhab** est une application de gestion locative tout-en-un pour propriétaires particuliers.

- **Cible** : Propriétaires bailleurs (1 à 10 biens) qui veulent fuir Excel
- **Types de biens** : Logements, parkings, commerces
- **Zone géographique** : France uniquement (loi Alur, IRL, bail type, quittances légales, encadrement des loyers)
- **Modèle** : Open-core, code public GitHub, zéro SaaS à héberger
- **Licence** : Business Source License 1.1 (BUSL-1.1)
  - Usage commercial interdit sans permission
  - Change Date : 2029-01-01 → bascule en Apache 2.0
  - Contact commercial : stephaneloiseau44@gmail.com

---

## Objectifs du développeur

1. **Book technique** — vitrine pour recruteurs, secteur défense Côte d'Azur
2. **Montée en compétence** — Java 21, Spring Boot 3, microservices
3. **Revenus** — si ça décolle après la situation professionnelle actuelle
4. **Utilisateurs** — viendra naturellement si les deux premiers sont bien faits

---

## Contraintes légales importantes

- Développeur actuellement en CDI chez **Atos** (Ingénieur Développement, depuis juillet 2024)
- Contrat soumis à la **Convention SYNTEC**
- **Article 14 — Clause d'exclusivité** : interdiction d'exercer toute activité professionnelle complémentaire sans accord écrit de la direction
- **Article 13 — Propriété intellectuelle** : les logiciels créés dans l'exercice des fonctions Atos appartiennent à Atos (Birdhab n'est pas concerné car sans lien avec le travail chez Atos)
- ✅ Développement personnel sur temps libre = OK
- ✅ Code public GitHub sans revenus = OK
- ❌ Commercialisation tant que CDI Atos en cours = à éviter
- ❌ Structure juridique = à éviter pour l'instant

---

## Stack technique

| Composant | Technologie |
|---|---|
| Langage | Java 21 (records, virtual threads, pattern matching) |
| Framework | Spring Boot 3 |
| Sécurité | Spring Security + JWT + OAuth2 |
| Base de données | PostgreSQL |
| Stockage fichiers | MinIO (souverain, alternative S3) |
| Containerisation | Docker |
| CI/CD | GitHub Actions |
| Architecture | Microservices |
| Documentation API | OpenAPI / Swagger |

---

## Architecture — Microservices

```
birdhab/
├── services/
│   ├── auth/          # Authentification, JWT, rôles, utilisateurs
│   ├── property/      # Biens immobiliers
│   ├── tenant/        # Locataires
│   ├── lease/         # Baux (bien + locataire, dates, loyer, dépôt, IRL)
│   ├── document/      # Documents, contrats, quittances PDF
│   ├── payment/       # Paiements, loyers, relances
│   └── gateway/       # API Gateway (point d'entrée unique)
├── shared/
│   └── common/        # Code partagé entre services
├── docker/            # Configuration Docker / Docker Compose
├── docs/
│   └── api/           # Contrats OpenAPI
└── .github/
    └── workflows/
        └── ci.yml     # CI GitHub Actions (Java 21 Temurin, main + develop)
```

---

## Périmètre fonctionnel

### MVP (v1) — À développer en priorité

| Module | Fonctionnalités |
|---|---|
| **Gestion des biens** | Ajouter/modifier un bien (adresse, type, surface, loyer de référence) |
| **Gestion des locataires** | Fiche locataire, coordonnées, documents d'identité |
| **Gestion des baux** | Création de bail, dates, loyer, dépôt de garantie, révision IRL |
| **Suivi des paiements** | Enregistrer un paiement, détecter les retards, générer une quittance PDF |
| **Tableau de bord** | Loyers attendus vs perçus, biens occupés/vacants, alertes |

> Le tableau de bord n'a nécessité aucun backend supplémentaire : ses données
> (biens, baux actifs → occupé/vacant, échéances → attendu/perçu/retard) sont
> exposées par `property`/`lease`/`payment` via la Gateway et agrégées côté
> frontend (même principe que la quittance PDF de `payment` — voir décision
> « Aucune agrégation cross-service » dans CLAUDE.md). Fait, voir
> `src/pages/DashboardPage.tsx`.

### Hors MVP (v2+)

- Génération de contrats de bail PDF
- Gestion des charges
- État des lieux numérique
- Notifications email automatiques
- Encadrement des loyers
- Intégrations comptables (Pennylane, Dolibarr)
- **Portail locataire** : le locataire dispose de son propre compte (rôle `TENANT`,
  déjà prévu dans le modèle auth) pour accéder à son espace personnel :
  - Consultation et dépôt de documents liés à son bail (service `document`,
    avec règles d'autorisation restreignant l'accès à ses seuls documents)
  - Messagerie directe avec son propriétaire (nouveau microservice `messaging`
    envisagé, plutôt que de le rattacher à `tenant` ou `document`)
  - Compte créé par invitation du propriétaire (email), lié à sa fiche
    `Tenant` existante via une référence `tenant_id` sur `User`

### Version Enterprise (payante — après sortie d'Atos)

- SSO / LDAP / Active Directory
- Signature électronique
- Archivage légal
- Support & SLA
- Déploiement on-premise assisté

---

## Modèle Open-Core

| Fonctionnalité | Community (public) | Enterprise (payant) |
|---|---|---|
| Gestion biens / locataires / baux | ✅ | ✅ |
| Suivi paiements + quittances | ✅ | ✅ |
| Tableau de bord | ✅ | ✅ |
| SSO / LDAP | ❌ | ✅ |
| Signature électronique | ❌ | ✅ |
| Archivage légal | ❌ | ✅ |
| Support & SLA | ❌ | ✅ |

---

## État d'avancement

- [x] Nom du projet validé : **Birdhab**
- [x] Licence BUSL-1.1 configurée
- [x] Structure du repo créée (7 microservices + frontend)
- [x] CI/CD GitHub Actions configuré
- [x] .gitignore configuré
- [x] Docker Compose fonctionnel (PostgreSQL + MinIO)
- [x] **MVP complet, backend et frontend** : les 6 microservices (`auth`, `property`, `tenant`,
      `lease`, `payment`, `document`) + `gateway` sont codés et testés ; le frontend
      (`frontend/`) couvre l'authentification, le profil propriétaire, et les 5 modules CRUD
      + le tableau de bord, tous vérifiés de bout en bout dans un vrai navigateur. Détail
      service par service dans `git log` et le tableau « Décisions actées » ci-dessous —
      cette liste ne duplique plus l'historique complet, qui devenait obsolète trop vite.
- [x] Tests automatisés frontend (Vitest + Testing Library + MSW, voir « Décisions actées »)
      couvrant la logique critique et les 5 modules CRUD.
- [ ] Périmètre MVP finalisé (revue finale du scope avant de passer à autre chose)

---

## Conventions de développement

- **Branches** : `main` (production) et `develop` (développement)
- **Commits** : Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`)
- **Java** : Java 21, utiliser les records pour les DTOs, pattern matching si pertinent
- **Tests** : JUnit 5 + Mockito, viser 80% de couverture minimum
- **Documentation** : Javadoc sur les classes publiques, OpenAPI sur tous les endpoints

---

## Décisions actées

| Sujet | Décision | Justification |
|---|---|---|
| Migration BDD | **Flyway** | Migrations SQL pures, simple à maintenir seul, suffisant pour le volume de schéma prévu. Liquibase apporte du rollback auto et du multi-SGBD, mais répond à des besoins (multi-équipes, multi-environnements) que le projet n'a pas en solo. |
| Générateur PDF | **Apache PDFBox** | Licence Apache 2.0, cohérente avec la philosophie open-core du projet. iText impose une licence commerciale ou AGPL au-delà d'un usage basique, ce qui est délicat vu le modèle BUSL-1.1. |
| Stratégie multi-tenant | **Schéma unique + `owner_id`** en clé étrangère sur toutes les tables métier | Suffisant pour du 1 à 10 biens par propriétaire ; évite la complexité opérationnelle d'un schéma par propriétaire. Migration vers du multi-schéma restera possible plus tard si besoin. |
| Gestion des baux | **Nouveau microservice dédié `lease`** | Cohérent avec le pattern 1 service = 1 contexte borné déjà suivi pour auth/property/tenant, plutôt que de mélanger le cycle de vie du bail avec celui du bien ou du locataire. |
| Quittance PDF (`payment`) | **Agrégation côté appelant, pas d'appel réseau serveur-à-serveur** | Une quittance légale a besoin de données réparties dans 3 services (bailleur/auth, locataire/tenant, bien/property) ; plutôt que d'assouplir la convention « pas d'appel réseau entre microservices », c'est le frontend/BFF qui agrège ces informations et les transmet à `payment`, qui se limite à la mise en page PDF. |
| Stockage des documents d'identité (`document`) | **MinIO derrière un port `FileStorage`** | Le SDK MinIO n'est jamais utilisé directement dans la couche métier : `DocumentService` dépend d'une interface `FileStorage`, implémentée par `MinioFileStorage`, ce qui permet de tester la logique métier sans instance MinIO réelle. |
| Authentification à la Gateway | **Routage HTTP pur, pas de centralisation JWT** | Centraliser la validation à la Gateway suppose que les services ne soient joignables que via elle, ce qui n'est pas l'architecture de déploiement prévue (produit self-hosted, sans isolation réseau garantie) ; un service qui ferait confiance à un en-tête interne (ex. `X-User-Id`) serait alors trivialement usurpable en l'appelant directement. Chaque service continue de valider lui-même le JWT (defense in depth) ; le gain de centraliser (moins de code dupliqué, JWT vérifié une seule fois) ne compense pas ce risque à l'échelle du projet. |
| Refresh tokens (`auth`) | **Stockés hachés (SHA-256), jamais en clair** | Symétrique avec le hachage BCrypt des mots de passe : une fuite de la base `birdhab` ne doit pas suffire à obtenir des sessions valides pendant toute leur durée de vie (30 jours). SHA-256 (rapide) suffit ici, contrairement à BCrypt pour les mots de passe : le jeton d'origine est un JWT à haute entropie, pas un secret à faible entropie choisi par un humain, donc pas de risque de brute-force à ralentir. |
| Login (`auth`) | **Vérification BCrypt même si l'email est inconnu (hash factice)** | Sans ça, une requête sur un email inexistant répond plus vite (pas de calcul BCrypt) qu'une requête sur un email existant avec mauvais mot de passe, ce qui permet d'énumérer les comptes enregistrés par mesure du temps de réponse, malgré un message d'erreur identique dans les deux cas. |
| Type de fichier (`document`) | **Détection par octets réels (signature PDF/JPEG/PNG), pas par Content-Type déclaré** | Le Content-Type d'un upload multipart est fourni par le client et donc falsifiable ; un fichier dont le contenu ne correspond à aucune des 3 signatures est rejeté même s'il prétend être un type accepté. |
| Tests d'intégration | **Un `FlywayMigrationIT` par service (failsafe, `mvn verify`), pas de suite complète `@DataJpaTest`** | Les tests Mockito ne peuvent pas détecter une migration Flyway qui ne correspond pas au mapping JPA (colonne renommée, type incohérent...) — trou réel identifié en consolidation (la migration V2 de `auth` n'avait jamais été exécutée avant ce test). Cible précisément ce trou sans ouvrir un chantier de tests d'intégration complet (requêtes dérivées, etc.), hors scope pour l'instant. |
| Duplication infra JWT | **Extraite vers `shared/common` (`JwtValidator`, `JwtValidatorService`, `JwtProperties`, `JwtAuthenticationFilter`, `JwtAuthenticationEntryPoint`)** | `JwtAuthenticationEntryPoint` était identique à l'octet près dans les 6 services, `JwtAuthenticationFilter` à 99% — pure infrastructure technique, pas de logique métier, donc pas de coupling métier introduit entre services malgré le code partagé. `auth` garde son propre `JwtService` (émission de jetons en plus de la validation) ; les 5 autres services déclarent explicitement les beans partagés via un `JwtConfig` local plutôt qu'un component-scan automatique, pour éviter tout conflit de bean avec `auth`. |
| Stack frontend | **React 18 + Vite 8 + TypeScript + Tailwind CSS v4, react-router-dom v7** | React choisi pour l'objectif « book technique » (stack la plus demandée côté recrutement). Démarré en Tailwind v3/react-router v6 (Node du poste bloqué en 18.16) puis remonté en v4/v7 après mise à jour du poste en Node 24 LTS. |
| Jetons JWT côté frontend | **Stockés en `localStorage`, pas de cookie httpOnly** | Compromis pragmatique pour une SPA sans BFF : un cookie httpOnly nécessiterait un backend dédié à la gestion de session, hors scope actuel. Accepté en connaissance du risque XSS ; à revoir si un BFF est introduit un jour. |
| Types TypeScript frontend | **Générés depuis les contrats OpenAPI existants (`openapi-typescript`), jamais écrits à la main** | Réutilise le travail déjà fait sur `docs/api/*.yml` plutôt que de dupliquer la définition des DTOs côté frontend ; a aussi révélé que plusieurs schémas `*Response` ne déclaraient aucun champ `required` alors que le backend les renvoie toujours (corrigé, voir commit `feat: démarrer le frontend`). |
| Adresse du propriétaire (`auth`) | **Ajoutée a posteriori via `PUT /auth/me`, pas à l'inscription** | La quittance PDF (`payment`) a besoin de l'adresse du bailleur, absente du modèle `User` jusqu'ici — trou détecté en construisant le module Paiements du frontend. Plutôt que de l'exiger à l'inscription (alourdit ce flux pour une donnée seulement utile au moment de générer une quittance), elle se renseigne via une page « Mon profil » dédiée, colonnes nullable en base. |
| Tableau de bord (frontend) | **Stat tiles + meter de progression, pas de graphique à deux axes** | Suit le skill `dataviz` du projet : « attendu vs perçu » sur deux mesures de même nature se prête à un meter (barre de progression), pas à un graphique à deux échelles. Couleur de statut réservée (rouge uniquement pour l'alerte de retard, jamais réutilisée comme couleur de série). |
| Tests frontend | **Vitest + React Testing Library + MSW, pas de mock d'Axios** | MSW intercepte au niveau réseau (XHR), donc l'intercepteur JWT de `client.ts` (refresh sur 401, déduplication) est testé tel qu'il s'exécute réellement plutôt que via une version mockée. Étendu aux 5 modules CRUD après le socle initial — la vérification manuelle en navigateur reste la référence pour un nouveau module. A révélé deux vrais bugs (`uploadDocument` fixait un `Content-Type: multipart/form-data` sans boundary ; les erreurs sur requêtes `responseType: 'blob'` ne remontaient jamais le vrai message serveur, `Blob` au lieu de JSON) et deux limitations de jsdom sans rapport avec le code applicatif (validation `required` d'un `<input type="file">`, perte du nom de fichier à travers `FormData`+XHR), documentées dans `CLAUDE.md`. |
| Gestion des erreurs (frontend) | **Chaque mutation de suppression a son propre état d'erreur affiché en `ErrorBanner`, un `ErrorBoundary` global protège contre l'écran blanc, une session réellement expirée redirige vers `/login`** | Revue ciblée : les 5 suppressions (Biens/Locataires/Baux/Paiements/Documents) échouaient silencieusement (pas de `onError`), le téléchargement de document n'avait pas de `catch`, aucun filet pour une exception de rendu inattendue, et un refresh token mort en cours de session laissait l'utilisateur sur une page cassée sans jamais le rediriger vers `/login`. Voir `SESSION_EXPIRED_EVENT` dans `CLAUDE.md`. |

## Questions en suspens

- [ ] Finaliser le périmètre exact du MVP