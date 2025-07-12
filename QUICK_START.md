# 🚀 StraySafe Quick Start Guide

## ⚡ One-Command Setup

### **Option 1: Automated Setup (Recommended)**
```bash
# Make scripts executable and run
chmod +x start-development.sh stop-development.sh
./start-development.sh
```

### **Option 2: Manual Setup**
```bash
# 1. Backend Setup
cd backend
npm install
docker-compose up -d postgres
npm run seed
npm run dev &

# 2. Frontend Setup (in another terminal)
cd ..
npm install
echo "VITE_API_URL=http://localhost:5000/api" > .env.local
npm run dev
```

## 🧪 Test Your Integration

### **1. Backend Health Check**
```bash
curl http://localhost:5000/api/health
# Expected: {"status":"OK","timestamp":"...","environment":"development"}
```

### **2. Test Authentication**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"sarah@example.com","password":"password123"}'
# Should return user data and JWT token
```

### **3. Test Reports API**
```bash
curl http://localhost:5000/api/reports
# Should return sample reports data
```

## 🌐 Access Your Application

### **URLs**
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000/api  
- **Database Admin**: http://localhost:8080 (Adminer)

### **Test Credentials**
| Role | Email | Password |
|------|-------|----------|
| **Citizen** | sarah@example.com | password123 |
| **NGO** | contact@nycanimalrescue.org | password123 |
| **Admin** | admin@straysafe.com | admin123 |
| **Volunteer** | mike@example.com | password123 |

## ✅ Verification Checklist

### **Backend Working**
- [ ] `curl http://localhost:5000/api/health` returns OK
- [ ] Login API returns JWT token
- [ ] Reports API returns sample data
- [ ] Database contains seeded users

### **Frontend Working**  
- [ ] Homepage loads at http://localhost:5173
- [ ] Login with test credentials works
- [ ] Navigation shows user info after login
- [ ] Reports page displays data from backend

### **Integration Working**
- [ ] Frontend can authenticate users via backend
- [ ] Reports are loaded from real database
- [ ] User sessions persist across page refreshes
- [ ] No CORS errors in browser console

## 🎯 Testing User Flows

### **As a Citizen**
1. Open http://localhost:5173
2. Click "Sign In"
3. Login with: sarah@example.com / password123
4. Go to "Report" page
5. Create a new stray animal report
6. View your report in the system

### **As an NGO**
1. Login with: contact@nycanimalrescue.org / password123
2. View assigned reports
3. Update report statuses
4. Add progress updates

### **As Admin**
1. Login with: admin@straysafe.com / admin123
2. Access admin features
3. View all users and reports
4. Manage NGO approvals

## 🐛 Quick Troubleshooting

### **Backend Not Starting**
```bash
# Check if PostgreSQL is running
docker-compose logs postgres

# Check for port conflicts
lsof -i :5000

# View backend logs
cd backend && npm run dev
```

### **Database Issues**
```bash
# Restart database
cd backend && docker-compose down && docker-compose up -d postgres

# Re-seed database
npm run seed
```

### **Frontend Issues**
```bash
# Clear browser cache and localStorage
localStorage.clear()

# Check if backend is accessible
curl http://localhost:5000/api/health

# Restart frontend
npm run dev
```

### **CORS Errors**
- Ensure FRONTEND_URL in backend/.env matches frontend URL
- Check that both servers are running on correct ports
- Clear browser cache

## 📊 Database Preview

Access the database admin panel at http://localhost:8080:
- **System**: PostgreSQL
- **Server**: postgres  
- **Username**: postgres
- **Password**: password
- **Database**: straysafe_db

## 🛑 Stop Development

```bash
# Using script
./stop-development.sh

# Or manually
pkill -f "node.*server.js"
pkill -f "vite"
cd backend && docker-compose down
```

## 🎉 Success!

If everything is working:
- ✅ Backend API is responding
- ✅ Frontend loads without errors  
- ✅ Authentication works
- ✅ Data flows between frontend and backend
- ✅ Real-time features are ready

**Your StraySafe platform is fully integrated and ready for development!**

## 🚀 Next Steps

1. **Customize**: Update branding, colors, and content
2. **Extend**: Add new features and API endpoints  
3. **Deploy**: Use Docker for production deployment
4. **Configure**: Set up real Cloudinary credentials for image uploads
5. **Monitor**: Add logging and error tracking

## 📞 Need Help?

- Check `INTEGRATION_GUIDE.md` for detailed troubleshooting
- View `BACKEND_SUMMARY.md` for complete backend documentation
- Inspect browser DevTools for frontend debugging
- Check backend logs for API issues

**Happy coding!** 🐕🐱