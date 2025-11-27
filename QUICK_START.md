# Creerlio Platform - Quick Start Guide

## Access Your Application

### Frontend (User Interface)
🌐 **URL:** https://opulent-capybara-97gqpjqr69939pqw-3000.app.github.dev

### API (Backend)
🔌 **URL:** https://opulent-capybara-97gqpjqr69939pqw-5007.app.github.dev

---

## Demo Accounts

### Talent User Account
👤 **Email:** talent@demo.com  
🔑 **Password:** Password123!

**Quick Login:** Click the "Demo as Talent" button on the login page

### Business User Account
🏢 **Email:** business@demo.com  
🔑 **Password:** Password123!

**Quick Login:** Click the "Demo as Business" button on the login page

---

## How to Test the Application

### Option 1: Quick Demo Flow
1. **Open the application:** Click the frontend URL above
2. **Click "Login"** on the homepage
3. **Click "Demo as Talent"** or **"Demo as Business"** button
4. You'll be automatically logged in!

### Option 2: Manual Login
1. **Open the application:** Click the frontend URL above
2. **Click "Login"**
3. **Enter email and password** from above
4. **Click "Sign In"**

---

## What You Can Do

### As a Talent User 👤

#### Dashboard
- View your stats (applications, saved jobs, profile views, match score)
- Browse recommended jobs with match scores
- Click **"Apply Now"** to apply to a job
- Click **"Save"** to save a job for later
- See your recent activity

#### Portfolio
- View your professional profile
- See your projects with images and descriptions
- Browse your skills and technologies
- View certifications and awards
- Edit your profile (coming soon)

#### Messages
- View conversations with employers
- Read and send messages
- See online status and unread counts
- Type and press Enter to send

#### Navigation
- **Dashboard** - Your main overview
- **Job Search** - Find jobs (coming soon)
- **Applications** - Track your applications (coming soon)
- **Portfolio** - Your professional showcase
- **Messages** - Chat with employers

---

### As a Business User 🏢

#### Dashboard
- View your recruiting stats
- Browse top candidates with match scores
- Click **"View Profile"** to see a candidate's full profile
- Click **"Contact"** to message a candidate
- See active job postings
- View recent activity

#### Company Profile
- View your company information
- See company stats and mission
- Browse leadership team
- View office photos and culture
- See benefits and perks you offer
- Edit company profile (coming soon)

#### Messages
- View conversations with candidates
- Read and send messages
- See online status and unread counts
- Type and press Enter to send

#### Navigation
- **Dashboard** - Your main overview
- **Candidates** - Browse talent (coming soon)
- **Job Postings** - Manage your jobs (coming soon)
- **Company Profile** - Your company showcase
- **Messages** - Chat with candidates

---

## Testing Checklist

### ✅ Things to Try

**Login & Navigation:**
- [ ] Login with talent demo account
- [ ] Navigate to Portfolio
- [ ] Navigate to Messages
- [ ] Logout and login with business account
- [ ] Navigate to Company Profile
- [ ] Navigate to Messages

**Talent Features:**
- [ ] Click "Apply Now" on a job
- [ ] Click "Save" on a job
- [ ] View your portfolio projects
- [ ] Browse your skills
- [ ] Send a message to an employer

**Business Features:**
- [ ] Click "View Profile" on a candidate
- [ ] Click "Contact" on a candidate
- [ ] View company profile
- [ ] Browse team members
- [ ] Send a message to a candidate

**Messaging:**
- [ ] Click on different conversations
- [ ] Type and send a message
- [ ] See message appear in thread
- [ ] Notice timestamp updates

---

## Features Completed ✅

### Fully Functional
- ✅ User authentication (login/logout)
- ✅ Talent dashboard with stats and job recommendations
- ✅ Business dashboard with stats and candidate recommendations
- ✅ Talent portfolio with projects, skills, certifications
- ✅ Business portfolio (company profile) with team, culture, benefits
- ✅ Messaging system for both user types
- ✅ Working navigation throughout the app
- ✅ Interactive buttons with proper functionality
- ✅ Responsive design
- ✅ Beautiful UI with Tailwind CSS

### Coming Soon 🚀
- ⏳ Job Search page with filters
- ⏳ Applications tracking page
- ⏳ Candidates search page
- ⏳ Job Postings management
- ⏳ Analytics dashboard
- ⏳ Real-time messaging with WebSocket
- ⏳ Profile editing functionality
- ⏳ Project/team member management

---

## Common Issues & Solutions

### Can't Access the URLs?
- Make sure you're using the correct GitHub Codespaces URLs
- Check that both services are running (see "Restart Services" below)

### Login Not Working?
- Make sure you're using **Password123!** (with capital P and exclamation mark)
- Or use the demo buttons for one-click login

### Page Not Loading?
- Check the browser console (F12) for errors
- Try refreshing the page
- Verify you're logged in (check for token in localStorage)

### Buttons Not Responding?
- Check that JavaScript is enabled in your browser
- Try refreshing the page
- Check browser console for errors

---

## Restart Services (If Needed)

If something isn't working, you can restart the services:

### Restart Frontend (Next.js)
```bash
cd /workspaces/creerlio-platform/frontend/frontend-app
rm -rf .next
npm run dev
```

### Restart Backend (API)
```bash
cd /workspaces/creerlio-platform/backend/Creerlio.Api
dotnet run --urls http://0.0.0.0:5007
```

---

## Browser Console Debugging

Open browser console (F12) and look for these messages:

**Successful Login:**
```
✅ Response status: 200
🔗 Fetching dashboard from: https://...api/talent/dashboard
```

**API Connection:**
```
🌐 Current hostname: opulent-capybara-97gqpjqr69939pqw-3000.app.github.dev
🔗 API Base URL: https://opulent-capybara-97gqpjqr69939pqw-5007.app.github.dev
```

---

## Need Help?

### Check These Files
- `TESTING_REPORT.md` - Detailed testing documentation
- `AUTH_IMPLEMENTATION.md` - Authentication details
- `README.md` - Project overview

### Verify Services Running
```bash
# Check if frontend is running
ps aux | grep "next dev"

# Check if API is running  
ps aux | grep "dotnet"
```

---

## Quick Feature Tour

### 🎯 Recommended Testing Path

1. **Start Here:** https://opulent-capybara-97gqpjqr69939pqw-3000.app.github.dev
2. **Login as Talent** (Demo button)
3. **View Dashboard** - See your stats and recommended jobs
4. **Click "Apply Now"** - Test job application
5. **Click "Portfolio"** - See your professional showcase
6. **Click "Messages"** - Send a test message
7. **Logout**
8. **Login as Business** (Demo button)
9. **View Dashboard** - See candidate recommendations
10. **Click "Contact"** - Navigate to messages
11. **Click "Company Profile"** - See your company showcase
12. **Send a Message** - Test messaging from business side

---

## Summary

You now have a fully functional talent and business platform with:
- ✨ Beautiful, responsive UI
- 🔐 Secure authentication
- 📊 Interactive dashboards
- 💼 Professional portfolios
- 💬 Messaging system
- 🚀 Smooth navigation

**Everything is working and ready to test!** Enjoy exploring the application! 🎉
