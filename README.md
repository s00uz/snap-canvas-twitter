
## 📋 STEP 1: Initial Setup

### 1.1 Create GitHub Account
1. **Visit:** https://github.com
2. **Click:** "Sign up"
3. **Fill in:** Email, password, and username
4. **Confirm:** Your email
5. **Done!** You have a GitHub account

### 1.2 Create Vercel Account
1. **Visit:** https://vercel.com
2. **Click:** "Sign up"
3. **Choose:** "Continue with GitHub" 
4. **Authorize:** Vercel to access your GitHub
5. **Done!** You have a Vercel account

### 1.3 Install Node.js (Optional - only if you want to test locally)
1. **Visit:** https://nodejs.org
2. **Download:** The LTS version (recommended)
3. **Install:** Run the downloaded file
4. **Test:** Open terminal/command prompt and type `node --version`

---

## 📂 STEP 2: Copy the Project

### 2.1 Access the Original Repository
**Repository link:** https://github.com/s00uz/snap-canvas-twitter

### 2.2 Fork the Project
1. **Click:** The "Fork" button (top right corner)
2. **Choose:** Your personal account
3. **Wait:** For GitHub to copy all files
4. **Done!** Now you have your own copy

### 2.3 Verify Files
Make sure your copy contains these files:
- ✅ `server.js` (main code)
- ✅ `package.json` (configuration)
- ✅ `.env` (credentials - you'll edit this)
- ✅ `vercel.json` (Vercel configuration)
- ✅ `.gitignore` (files to ignore)
- ✅ `README.md` (documentation)

---

## 🐦 STEP 3: Configure Twitter Developer

### 3.1 Create Twitter Developer Account
1. **Visit:** https://developer.twitter.com
2. **Log in:** With your Twitter account
3. **Click:** "Apply for a developer account"
4. **Fill out:** The form (be honest about usage)
5. **Wait:** For approval (usually happens within minutes)

### 3.2 Create an Application
1. **Visit:** https://developer.twitter.com/en/portal/dashboard
2. **Click:** "Create Project" or "Create App"
3. **Fill in:**
   - **Name:** "My OAuth App"
   - **Description:** "Application to test OAuth 1.0a"
   - **Website:** `https://example.com` (will change later)

### 3.3 Configure Permissions
1. **Go to:** "App settings"
2. **Click:** "Edit" under "User authentication settings"
3. **Configure:**
   - **OAuth 1.0a:** ✅ Enabled
   - **App permissions:** Read and Write
   - **Type of App:** Web App
   - **Callback URI:** `https://example.com/auth/twitter/callback` (will change)
   - **Website URL:** `https://example.com` (will change)
4. **Save:** The settings

### 3.4 Copy Credentials
1. **Go to:** "Keys and Tokens"
2. **Copy and note down** (very important!):
   - **API Key** (Ex: ABC123def456...)
   - **API Secret** (Ex: xyz789uvw123...)
   - **Access Token** (Ex: 123456789-ABC...)
   - **Access Token Secret** (Ex: MNO789pqr...)

**⚠️ IMPORTANT:** Keep these credentials in a safe place!

---

## 🔧 STEP 4: Configure Credentials on GitHub

### 4.1 Edit .env file
1. **In your GitHub repository**, click on the `.env` file
2. **Click:** The pencil icon (Edit)
3. **Replace** the lines with your real values:
4. **Click:** "Commit changes"
5. **Confirm:** The commit

**⚠️ ATTENTION:** Use YOUR real credentials, not the examples!

---

## 🚀 STEP 5: Deploy to Vercel

### 5.1 Connect GitHub to Vercel
1. **Visit:** https://vercel.com
2. **Log in** (if not already logged in)
3. **Click:** "New Project"
4. **Find:** Your `snap-canvas-twitter` repository
5. **Click:** "Import"

### 5.2 Configure Environment Variables
**VERY IMPORTANT:** On the configuration screen:

1. **Click:** "Environment Variables"
2. **Add them one by one:**

```
Name: TWITTER_API_KEY
Value: [your real API key]

Name: TWITTER_API_SECRET
Value: [your real API secret]

Name: TWITTER_ACCESS_TOKEN
Value: [your real access token]

Name: TWITTER_ACCESS_TOKEN_SECRET
Value: [your real access token secret]

Name: SESSION_SECRET
Value: my_password_123
```

3. **DO NOT include** commented variables or examples!

### 5.3 Deploy
1. **Click:** "Deploy"
2. **Wait:** 2-3 minutes for the build
3. **Copy:** The generated URL (ex: `https://twitter-oauth-app-abc123.vercel.app`)

**🎉 Congratulations! Your app is live!**

---

## 🔗 STEP 6: Configure URLs in Twitter

### 6.1 Update Callback URLs
1. **Go back to:** https://developer.twitter.com
2. **Go to:** Your app → "App settings"
3. **Edit:** "User authentication settings"
4. **Replace:**
   - **Callback URI:** `https://YOUR-VERCEL-URL.vercel.app/auth/twitter/callback`
   - **Website URL:** `https://YOUR-VERCEL-URL.vercel.app`
5. **Save:** The settings

**⚠️ IMPORTANT:** Use the real URL that Vercel gave you!

---

## ✅ STEP 7: Test Your Application

### 7.1 Access Your App
1. **Open:** The Vercel URL in your browser using this format: `https://YOUR-VERCEL-URL.vercel.app/login` - it's important to include the `/login` path
2. Perform OAuth 1.0 authentication.
