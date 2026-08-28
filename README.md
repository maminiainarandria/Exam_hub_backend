# Exam Hub Backend

Backend de l'application **Exam Hub**, une plateforme web de gestion d'examens QCM.

L'application permet à un administrateur de gérer les étudiants, les cours, les examens, les questions et les résultats. Les étudiants peuvent consulter les examens disponibles, les passer une seule fois et obtenir immédiatement leur note et leur correction.

## Technologies

- Node.js
- Express
- TypeScript
- PostgreSQL
- Docker
- `pg` pour les requêtes SQL
- JWT avec `jsonwebtoken`
- `bcrypt`
- `cors`
- `dotenv`

Aucun ORM n'est utilisé. Les accès à PostgreSQL sont réalisés en SQL brut avec des requêtes paramétrées.

## Architecture du backend

Le projet suit une architecture en couches :

- `Controller/` : gestion des requêtes et réponses HTTP
- `Service/` : logique métier
- `Repositorie/` : accès à PostgreSQL
- `Model/` : types utilisés par l'application
- `Security/` : JWT et gestion des mots de passe
- `Middleware/` : authentification, autorisation et gestion des erreurs
- `Route/` : définition des routes API
- `Config/` : configuration de l'application
- `Utils/` : validation et utilitaires
- `database/` : schéma PostgreSQL et données initiales

## Prérequis

Avant de lancer le projet, installer :

- Node.js
- npm
- Docker Desktop
- Git

## Installation

Cloner le dépôt puis se placer dans le dossier du projet.

Installer les dépendances :

```bash
npm install
```

## Configuration

Créer le fichier `.env` à partir de `.env.example`.

Sous PowerShell :

```powershell
Copy-Item .env.example .env
```

Configuration de développement :

```env
PORT=3001
DATABASE_URL=postgresql://exam_hub:exam_hub_password@localhost:5433/exam_hub
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=24h
CORS_ORIGIN=http://localhost:5173
```

Le fichier `.env` contient les secrets locaux et ne doit pas être versionné dans Git.
## Base de données

PostgreSQL est exécuté dans un conteneur Docker dédié.

Démarrer la base de données :

```bash
docker compose up -d
```

Vérifier que le conteneur fonctionne :

```bash
docker compose ps
```

Le conteneur PostgreSQL doit apparaître avec un état `healthy`.

PostgreSQL est accessible sur le port :

```text
5433
```

Les fichiers de base de données sont :

```text
database/schema.sql
database/seed.sql


```
## Lancement du backend

En mode développement :

```bash
npm run dev
```

L'API est disponible à l'adresse :

```text
http://localhost:3001/api
```

## Compilation

Pour vérifier que le projet TypeScript compile correctement :

```bash
npm run build
```

Pour lancer la version compilée :

```bash
npm start
```

## Authentification

L'authentification utilise un JWT envoyé dans l'en-tête HTTP :

```text
Authorization: Bearer <token>
```

Le JWT contient :

```json
{
  "userId": 1,
  "role": "admin"
}
```

La durée de validité du JWT est de 24 heures.
## Comptes de démonstration

### Administrateur

```text
Email : admin@examhub.local
Mot de passe : Admin123!
```

### Étudiant Alice

```text
Email : alice@examhub.local
Mot de passe : Student123!
```

### Étudiant Bob

```text
Email : bob@examhub.local
Mot de passe : Student123!
```

## Routes principales

Toutes les routes sont préfixées par `/api`.

### Authentification

```text
POST /api/auth/login
```

### Administration des étudiants

```text
GET    /api/students
POST   /api/students
PUT    /api/students/:id
DELETE /api/students/:id
```

### Administration des cours

```text
GET    /api/courses
POST   /api/courses
PUT    /api/courses/:id
DELETE /api/courses/:id
```

### Administration des examens

```text
GET    /api/exams
POST   /api/exams
GET    /api/exams/:id
PUT    /api/exams/:id
DELETE /api/exams/:id
GET    /api/exams/:id/results
```

### Administration des questions

```text
GET    /api/exams/:id/questions
POST   /api/exams/:id/questions
PUT    /api/questions/:id
DELETE /api/questions/:id
```

### Espace étudiant

```text
GET  /api/my/exams
GET  /api/my/exams/:id
POST /api/my/exams/:id/submit
GET  /api/my/results
```

## Règles principales

- Pas d'auto-inscription.
- Un étudiant ne peut passer un examen qu'une seule fois.
- Un examen est accessible uniquement pendant sa fenêtre de disponibilité.
- Une question possède entre 2 et 6 choix.
- Une question possède exactement une bonne réponse.
- Les points sont des entiers supérieurs ou égaux à 1.
- Une soumission partielle est autorisée.
- Une question non répondue vaut 0 point.
- Le score est calculé uniquement côté serveur.
- `is_correct` n'est jamais envoyé à l'étudiant avant la soumission.
- Les questions et choix sont verrouillés après une tentative.
- Un cours ayant des examens ne peut pas être supprimé.
- Un examen ayant des tentatives ne peut pas être supprimé.
- Un étudiant désactivé ne peut plus se connecter.
- Après soumission, l'étudiant reçoit immédiatement sa note et sa correction.

## Format des erreurs

Toutes les erreurs de l'API utilisent la forme :

```json
{
  "message": "..."
}
```

Codes HTTP principaux :

```text
400 : données invalides
401 : non authentifié
403 : accès interdit
404 : ressource introuvable
409 : conflit
500 : erreur interne
```

## Git

La branche principale du projet est :

```text
main
```

Le dépôt contient un historique progressif de commits correspondant aux différentes fonctionnalités et corrections du projet.