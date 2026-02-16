# Pet Adoption & Shelter Management System - Backend

A production-ready, scalable backend API for managing animal shelters and pet adoption workflows.

## 🚀 Features

- **Authentication & Authorization**: JWT-based auth with refresh tokens, email verification, password reset
- **Role-Based Access Control**: Admin, Shelter Staff, Adopter, Foster roles
- **Pet Management**: CRUD operations with state machine validation for pet lifecycle
- **Adoption Applications**: Complete application workflow with review pipeline
- **Medical Records**: Track vaccinations, treatments, and health history
- **Foster System**: Foster applications and assignments
- **Messaging**: Communication between adopters and shelters
- **Favorites**: Save pets for later
- **Notifications**: In-app and email notifications
- **Audit Logging**: Complete audit trail for compliance
- **Geospatial Search**: Find pets near a location
- **Advanced Filtering**: Search by species, breed, age, size, compatibility
- **Stripe Integration**: Payment processing for donations
- **Security**: Helmet, CORS, rate limiting, input validation

## 📋 Prerequisites

- Node.js >= 18.x
- MongoDB >= 6.x
- npm or yarn

## 🛠️ Installation

1. **Clone and navigate**:

   ```bash
   cd server
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Environment setup**:

   ```bash
   cp .env.example .env
   ```

4. **Configure `.env`**:
   - Set `MONGODB_URI` to your MongoDB connection string
   - Set `JWT_SECRET` and `JWT_REFRESH_SECRET` to strong random strings
   - Configure email settings (SMTP)
   - Add Stripe API keys
   - Set `CLIENT_URL` to your frontend URL

## 🏃 Running the Application

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm start
```

## 📚 API Documentation

### Base URL

```
http://localhost:5000/api/v1
```

### Authentication Endpoints

#### Register

```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "adopter"
}
```

#### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

#### Verify Email

```http
POST /auth/verify-email
Content-Type: application/json

{
  "token": "verification_token_from_email"
}
```

#### Forgot Password

```http
POST /auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Reset Password

```http
POST /auth/reset-password
Content-Type: application/json

{
  "token": "reset_token_from_email",
  "password": "NewSecurePass123"
}
```

#### Refresh Token

```http
POST /auth/refresh
Cookie: refreshToken=<token>
```

#### Get Current User

```http
GET /auth/me
Authorization: Bearer <access_token>
```

### Pet Endpoints

#### Get All Pets (with filters)

```http
GET /pets?species=dog&size=medium&page=1&limit=20
```

Query Parameters:

- `species`: dog, cat, bird, rabbit, other
- `breed`: string (partial match)
- `minAge`, `maxAge`: number (in months)
- `gender`: male, female
- `size`: small, medium, large
- `status`: intake, medical_hold, available, meet, adopted, etc.
- `shelterId`: MongoDB ObjectId
- `goodWithKids`, `goodWithDogs`, `goodWithCats`: true/false
- `page`, `limit`: pagination

#### Search Nearby Pets

```http
GET /pets/nearby?longitude=-122.4194&latitude=37.7749&maxDistance=50000
```

#### Get Pet by ID

```http
GET /pets/:id
```

#### Create Pet (Shelter Staff/Admin only)

```http
POST /pets
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Max",
  "species": "dog",
  "breed": "Golden Retriever",
  "age": 24,
  "gender": "male",
  "size": "large",
  "color": "Golden",
  "description": "Friendly and energetic",
  "temperament": ["friendly", "energetic", "loyal"],
  "compatibility": {
    "goodWithKids": true,
    "goodWithDogs": true,
    "goodWithCats": false
  },
  "shelterId": "shelter_id"
}
```

#### Update Pet

```http
PATCH /pets/:id
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "description": "Updated description",
  "temperament": ["friendly", "calm"]
}
```

#### Update Pet Status

```http
PATCH /pets/:id/status
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "status": "available"
}
```

Valid transitions (State Machine):

- `intake` → `medical_hold`, `available`, `deceased`
- `medical_hold` → `available`, `deceased`
- `available` → `meet`, `fostered`, `transferred`, `deceased`
- `meet` → `available`, `adopted`, `deceased`
- `adopted` → `returned`, `deceased`
- `returned` → `medical_hold`, `available`, `deceased`
- `fostered` → `available`, `adopted`, `deceased`
- `transferred` → `deceased`

#### Delete Pet (Soft Delete)

```http
DELETE /pets/:id
Authorization: Bearer <access_token>
```

### Application Endpoints

#### Submit Application (Adopter only)

```http
POST /applications
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "petId": "pet_id",
  "questionnaire": {
    "hasOwnedPetsBefore": true,
    "currentPets": "1 cat",
    "housingType": "house",
    "hasYard": true,
    "householdMembers": 3,
    "hasChildren": true,
    "childrenAges": "5, 8",
    "workSchedule": "9-5 weekdays",
    "petCareExperience": "Owned dogs for 10 years",
    "whyAdopt": "Looking for a family companion"
  },
  "references": [
    {
      "name": "Jane Smith",
      "relationship": "Friend",
      "phone": "555-0123",
      "email": "jane@example.com"
    }
  ]
}
```

#### Get Applications

```http
GET /applications?status=submitted&page=1&limit=20
Authorization: Bearer <access_token>
```

#### Get Application by ID

```http
GET /applications/:id
Authorization: Bearer <access_token>
```

#### Update Application Status (Shelter Staff/Admin only)

```http
PATCH /applications/:id/status
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "status": "approved",
  "notes": "Great candidate, approved for adoption"
}
```

Status values: `submitted`, `reviewing`, `interview`, `approved`, `rejected`

#### Withdraw Application (Adopter only)

```http
PATCH /applications/:id/withdraw
Authorization: Bearer <access_token>
```

## 🗄️ Database Schema

### Collections

- **users**: User accounts with roles
- **shelters**: Shelter information with geospatial data
- **pets**: Pet profiles with status and compatibility
- **medicalrecords**: Medical history for pets
- **applications**: Adoption applications with questionnaires
- **fosters**: Foster applications
- **fosterassignments**: Active foster placements
- **messages**: User-to-user messaging
- **favorites**: Saved pets
- **notifications**: In-app notifications
- **auditlogs**: Complete audit trail
- **refreshtokens**: JWT refresh tokens

## 🔒 Security Features

- **Password Hashing**: bcrypt with salt rounds
- **JWT Authentication**: Access tokens (15min) + Refresh tokens (7 days)
- **HTTP-Only Cookies**: Refresh tokens stored securely
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Input Validation**: express-validator on all inputs
- **Helmet**: Security headers
- **CORS**: Configured for specific origin
- **Audit Logging**: All critical actions logged

## 🏗️ Architecture

```
server/src/
├── index.ts                          # Main entry point
└── app/
    ├── common/                       # Shared utilities
    │   ├── config/
    │   │   ├── db.ts                 # Database connection
    │   │   └── env.ts                # Environment variables
    │   ├── middlewares/
    │   │   ├── auth.middleware.ts    # Authentication middleware
    │   │   ├── catch.middleware.ts   # Async error handler
    │   │   ├── error.middleware.ts   # Error handling
    │   │   └── validate.middleware.ts # Validation middleware
    │   ├── utils/
    │   │   ├── jwt.ts                # JWT utilities
    │   │   └── mail.ts               # Email utilities
    │   └── types/
    │       └── express.d.ts          # Express type extensions
    ├── modules/                      # Feature modules
    │   ├── auth/
    │   │   ├── auth.controller.ts
    │   │   ├── auth.routes.ts
    │   │   └── auth.validation.ts
    │   ├── user/
    │   │   └── user.model.ts
    │   ├── pet/
    │   │   ├── pet.controller.ts
    │   │   ├── pet.routes.ts
    │   │   ├── pet.model.ts
    │   │   └── pet.validation.ts
    │   ├── application/
    │   │   ├── application.controller.ts
    │   │   ├── application.routes.ts
    │   │   └── application.model.ts
    │   └── ... (other modules)
    └── routes/
        └── index.ts                  # Main route aggregator
```

## 🧪 Testing

```bash
npm test
```

## 📝 Environment Variables

See `.env.example` for all required environment variables.

## 🚀 Deployment

1. Set `NODE_ENV=production`
2. Configure production MongoDB URI
3. Set strong JWT secrets
4. Configure production email service
5. Set up Stripe webhook endpoint
6. Deploy to your preferred platform (AWS, Heroku, DigitalOcean, etc.)

## 📄 License

MIT
