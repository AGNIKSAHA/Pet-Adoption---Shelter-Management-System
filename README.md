# Pet Adoption & Shelter Management System

A production-ready, scalable full-stack web application for managing animal shelters and pet adoption workflows. Built with modern technologies and best practices for deployment.

## 🌟 Features

### Core Functionality

- ✅ **Multi-Shelter Support**: Manage multiple shelters with separate inventories
- ✅ **Role-Based Access Control**: Admin, Shelter Staff, Adopter, and Foster roles
- ✅ **Pet Lifecycle Management**: State machine-based status transitions
- ✅ **Adoption Applications**: Complete application workflow with review pipeline
- ✅ **Medical Records**: Track vaccinations, treatments, and health history
- ✅ **Foster System**: Foster applications and pet assignments
- ✅ **Real-time Messaging**: Communication between adopters and shelters
- ✅ **Favorites**: Save pets for later viewing
- ✅ **Notifications**: In-app and email notifications
- ✅ **Advanced Search**: Filter by species, breed, age, size, compatibility, location
- ✅ **Geospatial Search**: Find pets near your location
- ✅ **Payment Integration**: Stripe for donations
- ✅ **Audit Logging**: Complete audit trail for compliance

### Security & Quality

- ✅ JWT Authentication with refresh tokens
- ✅ Email verification
- ✅ Password reset functionality
- ✅ Rate limiting
- ✅ Input validation
- ✅ CORS protection
- ✅ Helmet security headers
- ✅ XSS protection
- ✅ SQL injection prevention (MongoDB)

## 🛠️ Tech Stack

### Backend

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB 6+
- **Authentication**: JWT (access + refresh tokens)
- **Email**: Nodemailer
- **Payments**: Stripe
- **Validation**: express-validator
- **Security**: Helmet, CORS, rate-limit

### Frontend

- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v7
- **State Management**: Redux Toolkit
- **Data Fetching**: TanStack Query (React Query)
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form + Zod
- **Notifications**: React Hot Toast
- **Icons**: Lucide React
- **Payments**: Stripe.js

## 📋 Prerequisites

- Node.js >= 18.x
- MongoDB >= 6.x
- npm or yarn
- Stripe account (for payments)
- Email service (Gmail, SendGrid, etc.)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd "Pet Adoption & Shelter Management System"
```

### 2. Backend Setup

```bash
cd server
npm install
```

Create `.env` file:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/pet-adoption
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@petadoption.com
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret
STRIPE_PUBLISHABLE_KEY=pk_test_your_key
MAX_FILE_SIZE=5242880
UPLOAD_DIR=uploads
```

Start backend:

```bash
npm run dev
```

Backend will run on `http://localhost:5000`

### 3. Frontend Setup

```bash
cd ../client
npm install
```

Create `.env` file:

```env
VITE_API_URL=http://localhost:5000/api/v1
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key
```

Start frontend:

```bash
npm run dev
```

Frontend will run on `http://localhost:5173`

## 📁 Project Structure

```
Pet Adoption & Shelter Management System/
├── server/                          # Backend
│   ├── src/
│   │   ├── app/
│   │   │   ├── common/             # Shared utilities
│   │   │   │   ├── config/         # Configuration
│   │   │   │   ├── middlewares/    # Express middlewares
│   │   │   │   ├── utils/          # Utility functions
│   │   │   │   └── types/          # TypeScript types
│   │   │   ├── modules/            # Feature modules
│   │   │   │   ├── auth/
│   │   │   │   ├── user/
│   │   │   │   ├── pet/
│   │   │   │   ├── shelter/
│   │   │   │   ├── application/
│   │   │   │   ├── foster/
│   │   │   │   ├── message/
│   │   │   │   ├── favorite/
│   │   │   │   ├── notification/
│   │   │   │   ├── medical/
│   │   │   │   ├── audit/
│   │   │   │   └── token/
│   │   │   └── routes/             # Route aggregator
│   │   └── index.ts                # Entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
│
└── client/                          # Frontend
    ├── src/
    │   ├── components/             # Reusable components
    │   ├── layouts/                # Layout components
    │   ├── pages/                  # Page components
    │   │   ├── public/
    │   │   ├── auth/
    │   │   ├── adopter/
    │   │   ├── shelter/
    │   │   ├── admin/
    │   │   └── shared/
    │   ├── store/                  # Redux store
    │   │   └── slices/
    │   ├── lib/                    # Libraries & utilities
    │   ├── hooks/                  # Custom hooks
    │   ├── types/                  # TypeScript types
    │   ├── App.tsx
    │   ├── main.tsx
    │   └── index.css
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    └── tsconfig.json
```

## 🔐 User Roles & Permissions

### Admin

- Full system access
- Manage shelters
- Manage users
- View all analytics
- Override any operation

### Shelter Staff

- Manage pets in their shelter
- Review adoption applications
- Manage foster assignments
- View shelter analytics
- Communicate with adopters

### Adopter

- Browse and search pets
- Save favorites
- Submit adoption applications
- Track application status
- Message shelter staff

### Foster

- Same as Adopter
- View foster assignments
- Update foster status

## 📊 Pet Status State Machine

```
intake → medical_hold → available → meet → adopted
         ↓                ↓           ↓
      deceased        fostered    returned
                    transferred
```

### Valid Transitions

- `intake` → `medical_hold`, `available`, `deceased`
- `medical_hold` → `available`, `deceased`
- `available` → `meet`, `fostered`, `transferred`, `deceased`
- `meet` → `available`, `adopted`, `deceased`
- `adopted` → `returned`, `deceased`
- `returned` → `medical_hold`, `available`, `deceased`
- `fostered` → `available`, `adopted`, `deceased`
- `transferred` → `deceased`

## 🌐 API Endpoints

### Authentication

- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/logout` - Logout
- `POST /api/v1/auth/verify-email` - Verify email
- `POST /api/v1/auth/forgot-password` - Request password reset
- `POST /api/v1/auth/reset-password` - Reset password
- `POST /api/v1/auth/refresh` - Refresh access token
- `GET /api/v1/auth/me` - Get current user

### Pets

- `GET /api/v1/pets` - List pets (with filters)
- `GET /api/v1/pets/nearby` - Search nearby pets
- `GET /api/v1/pets/:id` - Get pet details
- `POST /api/v1/pets` - Create pet (Staff/Admin)
- `PATCH /api/v1/pets/:id` - Update pet (Staff/Admin)
- `PATCH /api/v1/pets/:id/status` - Update status (Staff/Admin)
- `DELETE /api/v1/pets/:id` - Delete pet (Staff/Admin)

### Applications

- `POST /api/v1/applications` - Submit application (Adopter)
- `GET /api/v1/applications` - List applications
- `GET /api/v1/applications/:id` - Get application details
- `PATCH /api/v1/applications/:id/status` - Update status (Staff/Admin)
- `PATCH /api/v1/applications/:id/withdraw` - Withdraw application (Adopter)

See `server/README.md` for complete API documentation.

## 🧪 Testing

### Backend

```bash
cd server
npm test
```

### Frontend

```bash
cd client
npm test
```

## 🚀 Deployment

### Backend Deployment (Example: Heroku)

1. Create Heroku app
2. Add MongoDB Atlas addon or configure external MongoDB
3. Set environment variables
4. Deploy:

```bash
git subtree push --prefix server heroku main
```

### Frontend Deployment (Example: Vercel)

1. Connect GitHub repository
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Add environment variables
5. Deploy

### Environment Variables for Production

**Backend:**

- Set `NODE_ENV=production`
- Use strong JWT secrets (min 32 characters)
- Configure production MongoDB URI
- Set up production email service
- Configure Stripe webhook endpoint
- Enable HTTPS

**Frontend:**

- Set `VITE_API_URL` to production API URL
- Set Stripe publishable key

## 📝 Development Guidelines

### Code Style

- Use TypeScript strict mode
- Follow ESLint rules
- Use Prettier for formatting
- Write meaningful commit messages

### Git Workflow

1. Create feature branch
2. Make changes
3. Write tests
4. Submit pull request
5. Code review
6. Merge to main

### Database Indexes

All critical queries have appropriate indexes:

- User email (unique)
- Pet species, breed, status, shelterId
- Application status, petId, adopterId
- Shelter location (geospatial)

## 🔒 Security Best Practices

- ✅ Passwords hashed with bcrypt
- ✅ JWT tokens with short expiration
- ✅ HTTP-only cookies for refresh tokens
- ✅ Rate limiting on all endpoints
- ✅ Input validation on all requests
- ✅ CORS configured for specific origin
- ✅ Helmet security headers
- ✅ Audit logging for critical actions
- ✅ Email verification required
- ✅ Password strength requirements

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📧 Support

For support, email support@petadoption.com or open an issue in the repository.

## 🙏 Acknowledgments

- React Team
- Express.js Team
- MongoDB Team
- Stripe Team
- All open-source contributors

---

**Built with ❤️ for animal welfare**
