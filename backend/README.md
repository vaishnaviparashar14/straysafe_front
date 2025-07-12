# StraySafe Backend API

A comprehensive Node.js backend API for the StraySafe Platform - a system for reporting and managing stray animals with real-time updates, NGO management, and image uploads.

## 🚀 Features

- **User Authentication**: JWT-based authentication with role-based access control
- **Report Management**: Create, update, and track stray animal reports
- **Real-time Updates**: WebSocket integration for live notifications
- **NGO Management**: Registration, approval, and assignment system
- **Image Uploads**: Cloudinary integration for photo management
- **Location Services**: Geographic search and nearby reports
- **Database**: PostgreSQL with comprehensive schema
- **API Documentation**: RESTful API with proper validation
- **Security**: Rate limiting, input validation, and secure headers

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)
- **Image Storage**: Cloudinary
- **Real-time**: Socket.IO
- **Validation**: Joi
- **Security**: Helmet, bcrypt, CORS
- **File Upload**: Multer

## 📋 Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- Cloudinary account (for image uploads)

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

4. **Configure your `.env` file**
   ```env
   # Database Configuration
   DATABASE_URL=postgresql://username:password@localhost:5432/straysafe_db
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=straysafe_db
   DB_USER=your_username
   DB_PASSWORD=your_password

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRES_IN=7d

   # Server Configuration
   PORT=5000
   NODE_ENV=development

   # Cloudinary Configuration
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret

   # Frontend URL
   FRONTEND_URL=http://localhost:5173
   ```

## 🗄️ Database Setup

1. **Create PostgreSQL database**
   ```sql
   CREATE DATABASE straysafe_db;
   ```

2. **Run database schema**
   ```bash
   psql -U your_username -d straysafe_db -f config/schema.sql
   ```

3. **Seed the database with sample data**
   ```bash
   npm run seed
   ```

## 🚀 Running the Application

1. **Development mode**
   ```bash
   npm run dev
   ```

2. **Production mode**
   ```bash
   npm start
   ```

3. **Health check**
   ```bash
   curl http://localhost:5000/api/health
   ```

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/password` - Change password

### Reports
- `GET /api/reports` - Get all reports (with filtering)
- `GET /api/reports/nearby` - Get nearby reports
- `GET /api/reports/:id` - Get single report
- `POST /api/reports` - Create new report
- `PUT /api/reports/:id` - Update report
- `POST /api/reports/:id/updates` - Add update to report
- `POST /api/reports/:id/follow` - Follow/unfollow report
- `DELETE /api/reports/:id` - Delete report

### Users
- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get user profile
- `GET /api/users/:id/reports` - Get user's reports
- `GET /api/users/:id/notifications` - Get user's notifications
- `PATCH /api/users/:id/deactivate` - Deactivate user (admin only)

### NGOs
- `GET /api/ngos` - Get all approved NGOs
- `GET /api/ngos/:id` - Get NGO details
- `POST /api/ngos/register` - Register new NGO
- `PUT /api/ngos/:id` - Update NGO profile
- `GET /api/ngos/:id/reports` - Get NGO's assigned reports
- `POST /api/ngos/:id/assign-report` - Assign report to NGO
- `PATCH /api/ngos/:id/approve` - Approve NGO (admin only)

### File Upload
- `POST /api/upload/image` - Upload single image
- `POST /api/upload/images` - Upload multiple images
- `POST /api/upload/avatar` - Upload user avatar
- `DELETE /api/upload/image/:publicId` - Delete image

## 🔐 Authentication

The API uses JWT tokens for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### User Roles
- **citizen**: Can create and view reports
- **ngo**: Can manage assigned reports and create updates
- **volunteer**: Can assist with reports and updates
- **admin**: Full system access

## 📊 Sample Data

The seeding script creates sample users with the following credentials:

- **Admin**: admin@straysafe.com / admin123
- **Citizen**: sarah@example.com / password123
- **NGO**: contact@nycanimalrescue.org / password123
- **Volunteer**: mike@example.com / password123

## 🔧 API Features

### Filtering and Pagination
Most list endpoints support filtering and pagination:

```bash
GET /api/reports?status=reported&urgency=high&page=1&limit=10
```

### Real-time Updates
The server provides WebSocket connections for real-time updates:

```javascript
// Client-side example
const socket = io('http://localhost:5000');

socket.on('new-report', (data) => {
  console.log('New report:', data);
});

socket.on('report-updated', (data) => {
  console.log('Report updated:', data);
});
```

### Geographic Search
Find reports near a location:

```bash
GET /api/reports/nearby?lat=40.7829&lng=-73.9654&radius=10
```

### File Upload
Upload images with automatic optimization:

```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -F "image=@photo.jpg" \
  -F "folder=reports" \
  http://localhost:5000/api/upload/image
```

## 🛡️ Security Features

- **Rate Limiting**: Prevents abuse with configurable limits
- **Input Validation**: Joi schema validation on all endpoints
- **SQL Injection Protection**: Parameterized queries
- **XSS Protection**: Helmet middleware
- **CORS**: Configured for frontend domain
- **Password Hashing**: bcrypt with salt rounds
- **Session Management**: JWT token blacklisting

## 🧪 Testing

Run the test endpoints to verify functionality:

```bash
# Health check
curl http://localhost:5000/api/health

# Register user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## 🔍 Monitoring

The application includes:
- Request logging with Morgan
- Error tracking with stack traces
- Performance monitoring for database queries
- Health check endpoint for uptime monitoring

## 📈 Performance

- **Database Indexing**: Optimized queries with proper indexes
- **Connection Pooling**: PostgreSQL connection pool
- **Image Optimization**: Automatic image resizing and compression
- **Caching**: Response caching for static data
- **Compression**: Gzip compression for API responses

## 🚢 Deployment

### Environment Variables for Production
```env
NODE_ENV=production
DATABASE_URL=<production-db-url>
JWT_SECRET=<strong-production-secret>
CLOUDINARY_CLOUD_NAME=<production-cloudinary>
FRONTEND_URL=<production-frontend-url>
```

### Docker Deployment
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, please contact the development team or create an issue in the repository.

---

## 📞 Contact

For questions or support:
- Email: support@straysafe.com
- GitHub: [Repository Issues](https://github.com/your-repo/issues)

Happy coding! 🐕🐱