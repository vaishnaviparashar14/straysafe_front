# 🚀 StraySafe Frontend-Backend Integration Guide

## 📋 Complete Setup Process

### **Step 1: Backend Setup**

1. **Install Backend Dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Set Up Database**
   ```bash
   # Option A: Using Docker (Recommended)
   docker-compose up -d postgres
   
   # Option B: Local PostgreSQL
   createdb straysafe_db
   psql -d straysafe_db -f config/schema.sql
   ```

3. **Seed Sample Data**
   ```bash
   npm run seed
   ```

4. **Start Backend Server**
   ```bash
   npm run dev
   ```

   **Verify Backend is Running:**
   ```bash
   curl http://localhost:5000/api/health
   # Should return: {"status":"OK","timestamp":"...","environment":"development"}
   ```

### **Step 2: Frontend Setup**

1. **Install Frontend Dependencies**
   ```bash
   cd ..  # Go back to root
   npm install
   ```

2. **Create Environment File**
   ```bash
   # Create .env.local in root directory
   echo "VITE_API_URL=http://localhost:5000/api" > .env.local
   ```

3. **Start Frontend**
   ```bash
   npm run dev
   ```

## 🧪 Testing the Integration

### **Backend API Testing**

1. **Health Check**
   ```bash
   curl http://localhost:5000/api/health
   ```

2. **Test User Registration**
   ```bash
   curl -X POST http://localhost:5000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Test User",
       "email": "test@example.com",
       "password": "password123",
       "role": "citizen"
     }'
   ```

3. **Test Login**
   ```bash
   curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "sarah@example.com",
       "password": "password123"
     }'
   ```

4. **Test Get Reports**
   ```bash
   curl http://localhost:5000/api/reports
   ```

### **Frontend Testing**

1. **Open Browser**
   - Go to `http://localhost:5173`
   - You should see the StraySafe homepage

2. **Test Authentication**
   - Click "Sign In" in navigation
   - Use these test credentials:
     - **Email**: `sarah@example.com`
     - **Password**: `password123`
   - You should be logged in successfully

3. **Test Different User Roles**
   - **Citizen**: `sarah@example.com` / `password123`
   - **NGO**: `contact@nycanimalrescue.org` / `password123`
   - **Admin**: `admin@straysafe.com` / `admin123`
   - **Volunteer**: `mike@example.com` / `password123`

4. **Test Report Creation**
   - Go to "Report" page
   - Fill out the form with sample data
   - Check if the report appears in backend database

## 🔍 Verification Points

### **✅ Backend Working Correctly**
- [ ] Health endpoint returns OK status
- [ ] User registration works
- [ ] User login returns JWT token
- [ ] Reports endpoint returns sample data
- [ ] Database has seeded data

### **✅ Frontend Working Correctly**
- [ ] Homepage loads without errors
- [ ] Login form connects to backend
- [ ] User authentication state persists
- [ ] Navigation updates based on user role
- [ ] Reports page loads data from backend

### **✅ Real-time Features**
- [ ] Socket.IO connection established
- [ ] New reports show up in real-time
- [ ] Report updates appear instantly

## 🐛 Troubleshooting

### **Common Issues & Solutions**

#### **Backend Won't Start**
```bash
# Check if PostgreSQL is running
docker-compose logs postgres

# Check backend logs
npm run dev
```

#### **Database Connection Failed**
```bash
# Verify database credentials in .env
cat backend/.env

# Test database connection
docker-compose exec postgres psql -U postgres -d straysafe_db -c "SELECT COUNT(*) FROM users;"
```

#### **Frontend API Calls Failing**
```bash
# Check if backend is running
curl http://localhost:5000/api/health

# Check browser network tab for CORS errors
# Check console for API errors
```

#### **Authentication Not Working**
- Clear browser localStorage: `localStorage.clear()`
- Check JWT token in localStorage: `localStorage.getItem('straysafe_token')`
- Verify token format and expiration

## 📱 How to Preview Your Project

### **1. Local Development**
- **Frontend**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000/api`
- **Database Admin**: `http://localhost:8080` (Adminer)

### **2. Test Different User Flows**

#### **As a Citizen:**
1. Register/login as citizen
2. Create a stray animal report
3. View reports on map
4. Follow up on your reports

#### **As an NGO:**
1. Login as NGO user
2. View assigned reports
3. Update report status
4. Add progress updates

#### **As Admin:**
1. Login as admin
2. View all users and reports
3. Approve NGO registrations
4. Manage system statistics

### **3. Real-time Testing**
1. Open multiple browser windows
2. Login as different users
3. Create a report in one window
4. Watch it appear in real-time in other windows

## 🚀 Production Deployment

### **Backend Deployment**
```bash
# Build for production
npm run build

# Deploy with Docker
docker-compose -f docker-compose.prod.yml up -d
```

### **Frontend Deployment**
```bash
# Build for production
npm run build

# Deploy to static hosting (Vercel, Netlify, etc.)
```

## 🔧 API Testing Tools

### **Postman Collection**
Import this JSON to test all endpoints:

```json
{
  "info": { "name": "StraySafe API" },
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "url": "{{base_url}}/health"
      }
    },
    {
      "name": "Register User",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/auth/register",
        "body": {
          "mode": "raw",
          "raw": "{\n  \"name\": \"Test User\",\n  \"email\": \"test@example.com\",\n  \"password\": \"password123\"\n}"
        }
      }
    }
  ],
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:5000/api"
    }
  ]
}
```

### **Browser DevTools Testing**
```javascript
// Test API connection from browser console
fetch('http://localhost:5000/api/health')
  .then(r => r.json())
  .then(console.log);

// Test authentication
fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'sarah@example.com',
    password: 'password123'
  })
})
.then(r => r.json())
.then(console.log);
```

## 📊 Monitoring & Debugging

### **Backend Logs**
```bash
# View server logs
cd backend && npm run dev

# View database logs
docker-compose logs postgres

# View all services
docker-compose logs -f
```

### **Frontend Debugging**
- Open browser DevTools (F12)
- Check Console tab for errors
- Check Network tab for API calls
- Check Application tab for localStorage

### **Database Inspection**
- **Adminer**: `http://localhost:8080`
  - System: PostgreSQL
  - Server: postgres
  - Username: postgres
  - Password: password
  - Database: straysafe_db

## 🎯 Success Indicators

### **✅ Everything Working**
1. Backend health check returns OK
2. Frontend loads without console errors
3. User can register and login
4. Reports are displayed from database
5. Real-time updates work
6. Image uploads function (with Cloudinary)
7. NGO features accessible
8. Admin panel functional

### **🎉 Ready for Production**
- All API endpoints working
- Authentication flow complete
- Real-time features operational
- Image uploads configured
- Database properly seeded
- Error handling working
- Security measures active

## 🆘 Getting Help

If you encounter issues:

1. **Check Logs**: Backend console, browser console, database logs
2. **Verify Endpoints**: Use curl or Postman to test API
3. **Check Environment**: Ensure all environment variables are set
4. **Database State**: Verify data is seeded properly
5. **Network Issues**: Check CORS settings and port availability

**Your StraySafe platform is now fully integrated and ready to use!** 🚀