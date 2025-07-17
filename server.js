// =========================================
// TWITTER OAUTH 1.0a - ENGLISH VERSION
// =========================================

const express = require('express');
const OAuth = require('oauth').OAuth;
const session = require('express-session');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// =========================================
// VERCEL OPTIMIZED CONFIGURATION
// =========================================

app.set('trust proxy', 1);

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://twitter.com', 'https://api.twitter.com', 'https://x.com'] 
    : '*',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

// =========================================
// UTILITY FUNCTIONS
// =========================================

function getCallbackUrl(req) {
  const host = req.get('host');
  const protocol = req.get('x-forwarded-proto') || req.protocol;
  return `${protocol}://${host}/auth/twitter/callback`;
}

function createOAuth(callbackUrl) {
  return new OAuth(
    'https://api.twitter.com/oauth/request_token',
    'https://api.twitter.com/oauth/access_token',
    process.env.TWITTER_API_KEY,
    process.env.TWITTER_API_SECRET,
    '1.0A',
    callbackUrl,
    'HMAC-SHA1'
  );
}

function verifyCredentials(req, res, next) {
  const credentials = [
    'TWITTER_API_KEY',
    'TWITTER_API_SECRET',
    'TWITTER_ACCESS_TOKEN',
    'TWITTER_ACCESS_TOKEN_SECRET'
  ];

  for (const cred of credentials) {
    if (!process.env[cred]) {
      return res.status(500).send(`
        <h1>❌ Configuration Error</h1>
        <p>Environment variable <strong>${cred}</strong> not configured.</p>
        <p>Configure all variables in Vercel and redeploy.</p>
      `);
    }
  }
  next();
}

// Function to mask tokens (security)
function maskToken(token) {
  if (!token) return 'N/A';
  if (token.length <= 8) return token;
  
  const start = token.substring(0, 4);
  const end = token.substring(token.length - 4);
  const middle = '*'.repeat(Math.max(0, token.length - 8));
  
  return `${start}${middle}${end}`;
}

// Function to get user permissions
function getPermissions(user) {
  const permissions = [];
  
  // Based on what OAuth 1.0a allows
  permissions.push('✅ Read timeline tweets');
  permissions.push('✅ View profile information');
  permissions.push('✅ View followed accounts and followers');
  
  // Check if has write permission
  if (user.status && user.status.text) {
    permissions.push('✅ Post tweets');
  }
  
  // Check other permissions based on profile
  if (user.profile_image_url) {
    permissions.push('✅ Access profile picture');
  }
  
  if (user.location) {
    permissions.push('✅ Access profile location');
  }
  
  if (user.email) {
    permissions.push('✅ Access account email');
  }
  
  return permissions;
}

// =========================================
// ROUTES
// =========================================

// Homepage
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Twitter OAuth - Vercel</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .container {
            background: rgba(255, 255, 255, 0.95);
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            max-width: 600px;
            width: 90%;
            text-align: center;
          }
          h1 { color: #1da1f2; margin-bottom: 20px; }
          .user-info { 
            background: #f8f9fa;
            padding: 25px;
            border-radius: 15px;
            margin: 20px 0;
            border-left: 5px solid #1da1f2;
          }
          .profile-img {
            border-radius: 50%;
            width: 80px;
            height: 80px;
            margin: 15px auto;
            display: block;
            border: 3px solid #1da1f2;
          }
          button {
            background: linear-gradient(45deg, #1da1f2, #0d8bd9);
            color: white;
            padding: 15px 30px;
            border: none;
            border-radius: 25px;
            cursor: pointer;
            font-size: 16px;
            margin: 10px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(29, 161, 242, 0.3);
          }
          button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(29, 161, 242, 0.4);
          }
          .logout-btn {
            background: linear-gradient(45deg, #e74c3c, #c0392b);
            box-shadow: 0 4px 15px rgba(231, 76, 60, 0.3);
          }
          .stats { display: flex; justify-content: space-around; margin: 20px 0; }
          .stat { text-align: center; }
          .stat-number { font-size: 24px; font-weight: bold; color: #1da1f2; }
          .stat-label { font-size: 14px; color: #666; }
          .powered-by { 
            margin-top: 30px; 
            font-size: 12px; 
            color: #666; 
            opacity: 0.8;
          }
          .direct-login {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
            border: 2px dashed #1da1f2;
          }
          .endpoint-info {
            background: #e8f5fe;
            padding: 15px;
            border-radius: 8px;
            margin: 10px 0;
            font-family: monospace;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🐦 Twitter OAuth on Vercel</h1>
          
          ${req.session.user ? `
            <div class="user-info">
              <img src="${req.session.user.profile_image_url_https}" alt="Profile picture" class="profile-img">
              <h2>Welcome, ${req.session.user.name}! 👋</h2>
              <p><strong>@${req.session.user.screen_name}</strong></p>
              
              <div class="stats">
                <div class="stat">
                  <div class="stat-number">${req.session.user.followers_count.toLocaleString()}</div>
                  <div class="stat-label">Followers</div>
                </div>
                <div class="stat">
                  <div class="stat-number">${req.session.user.friends_count.toLocaleString()}</div>
                  <div class="stat-label">Following</div>
                </div>
                <div class="stat">
                  <div class="stat-number">${req.session.user.statuses_count.toLocaleString()}</div>
                  <div class="stat-label">Tweets</div>
                </div>
              </div>
            </div>
            
            <button onclick="location.href='/tweet'">✍️ Post Tweet</button>
            <button onclick="location.href='/permissions'">🔐 View Permissions</button>
            <button onclick="location.href='/logout'" class="logout-btn">🚪 Logout</button>
            
          ` : `
            <p style="margin: 20px 0; font-size: 18px;">
              Sign in with your Twitter account to continue
            </p>
            <button onclick="location.href='/auth/twitter'">
              🔑 Login with Twitter
            </button>
            
            <div class="direct-login">
              <h3>🚀 Direct Login</h3>
              <p>Or use this endpoint to go directly to Twitter:</p>
              <div class="endpoint-info">
                GET /login
              </div>
              <button onclick="location.href='/login'">
                ⚡ Direct Login
              </button>
            </div>
          `}
          
          <div class="powered-by">
            🚀 Hosted on Vercel | 💻 Built with Node.js
          </div>
        </div>
      </body>
    </html>
  `);
});

// =========================================
// DIRECT LOGIN ENDPOINT (NEW!)
// =========================================

app.get('/login', verifyCredentials, (req, res) => {
  const callbackUrl = getCallbackUrl(req);
  const oauth = createOAuth(callbackUrl);
  
  oauth.getOAuthRequestToken((error, oauthToken, oauthTokenSecret, results) => {
    if (error) {
      console.error('Error getting request token:', error);
      return res.status(500).send(`
        <h1>❌ Authentication Error</h1>
        <p>Could not connect to Twitter.</p>
        <p>Please check your credentials and try again.</p>
        <button onclick="location.href='/'">Try Again</button>
      `);
    }

    req.session.oauthRequestToken = oauthToken;
    req.session.oauthRequestTokenSecret = oauthTokenSecret;
    req.session.callbackUrl = callbackUrl;

    // DIRECT REDIRECT TO TWITTER (no intermediate page)
    res.redirect(`https://api.twitter.com/oauth/authorize?oauth_token=${oauthToken}`);
  });
});

// Start authentication (old route kept for compatibility)
app.get('/auth/twitter', verifyCredentials, (req, res) => {
  const callbackUrl = getCallbackUrl(req);
  const oauth = createOAuth(callbackUrl);
  
  oauth.getOAuthRequestToken((error, oauthToken, oauthTokenSecret, results) => {
    if (error) {
      console.error('Error getting request token:', error);
      return res.status(500).send(`
        <h1>❌ Authentication Error</h1>
        <p>Could not connect to Twitter.</p>
        <p>Please check your credentials and try again.</p>
        <button onclick="location.href='/'">Try Again</button>
      `);
    }

    req.session.oauthRequestToken = oauthToken;
    req.session.oauthRequestTokenSecret = oauthTokenSecret;
    req.session.callbackUrl = callbackUrl;

    res.redirect(`https://api.twitter.com/oauth/authorize?oauth_token=${oauthToken}`);
  });
});

// =========================================
// UPDATED CALLBACK WITH PERMISSIONS
// =========================================

app.get('/auth/twitter/callback', (req, res) => {
  const { oauth_token, oauth_verifier } = req.query;

  if (!oauth_token || !oauth_verifier) {
    return res.status(400).send(`
      <h1>❌ Callback Error</h1>
      <p>Invalid authorization parameters.</p>
      <button onclick="location.href='/'">Try Again</button>
    `);
  }

  const callbackUrl = req.session.callbackUrl || getCallbackUrl(req);
  const oauth = createOAuth(callbackUrl);

  oauth.getOAuthAccessToken(
    oauth_token,
    req.session.oauthRequestTokenSecret,
    oauth_verifier,
    (error, oauthAccessToken, oauthAccessTokenSecret, results) => {
      if (error) {
        console.error('Error getting access token:', error);
        return res.status(500).send(`
          <h1>❌ Authentication Error</h1>
          <p>Could not complete login.</p>
          <button onclick="location.href='/'">Try Again</button>
        `);
      }

      req.session.oauthAccessToken = oauthAccessToken;
      req.session.oauthAccessTokenSecret = oauthAccessTokenSecret;

      oauth.get(
        'https://api.twitter.com/1.1/account/verify_credentials.json',
        oauthAccessToken,
        oauthAccessTokenSecret,
        (error, data, response) => {
          if (error) {
            console.error('Error getting user data:', error);
            return res.status(500).send(`
              <h1>❌ Profile Loading Error</h1>
              <p>Login successful, but could not load profile data.</p>
              <button onclick="location.href='/'">Try Again</button>
            `);
          }

          const userData = JSON.parse(data);
          req.session.user = userData;
          
          // Save extra session data
          req.session.authData = {
            oauth_token: oauth_token,
            oauth_verifier: oauth_verifier,
            timestamp: new Date().toISOString()
          };

          // Clean up temporary tokens
          delete req.session.oauthRequestToken;
          delete req.session.oauthRequestTokenSecret;
          delete req.session.callbackUrl;

          // SUCCESS PAGE WITH PERMISSIONS AND TOKENS
          const permissions = getPermissions(userData);
          
          res.send(`
            <!DOCTYPE html>
            <html lang="en">
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>🎉 Authorization Granted!</title>
                <style>
                  * { margin: 0; padding: 0; box-sizing: border-box; }
                  body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    padding: 20px;
                  }
                  .container {
                    background: rgba(255, 255, 255, 0.95);
                    padding: 40px;
                    border-radius: 20px;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                    max-width: 800px;
                    margin: 0 auto;
                  }
                  h1 { color: #28a745; margin-bottom: 30px; text-align: center; }
                  .success-badge {
                    background: #d4edda;
                    color: #155724;
                    padding: 20px;
                    border-radius: 15px;
                    margin: 20px 0;
                    border-left: 5px solid #28a745;
                    text-align: center;
                  }
                  .user-info {
                    background: #f8f9fa;
                    padding: 25px;
                    border-radius: 15px;
                    margin: 20px 0;
                    display: flex;
                    align-items: center;
                    gap: 20px;
                  }
                  .profile-img {
                    border-radius: 50%;
                    width: 80px;
                    height: 80px;
                    border: 3px solid #1da1f2;
                  }
                  .permissions-section {
                    background: #e8f5fe;
                    padding: 25px;
                    border-radius: 15px;
                    margin: 20px 0;
                  }
                  .permissions-list {
                    list-style: none;
                    padding: 0;
                  }
                  .permissions-list li {
                    padding: 8px 0;
                    border-bottom: 1px solid #e0e0e0;
                  }
                  .permissions-list li:last-child {
                    border-bottom: none;
                  }
                  .tokens-section {
                    background: #fff3cd;
                    padding: 25px;
                    border-radius: 15px;
                    margin: 20px 0;
                    border-left: 5px solid #ffc107;
                  }
                  .token-item {
                    background: #ffffff;
                    padding: 15px;
                    border-radius: 8px;
                    margin: 10px 0;
                    border: 1px solid #e0e0e0;
                    font-family: monospace;
                    font-size: 14px;
                    word-break: break-all;
                  }
                  .token-label {
                    font-weight: bold;
                    color: #333;
                    margin-bottom: 5px;
                  }
                  .token-value {
                    color: #666;
                  }
                  button {
                    background: linear-gradient(45deg, #1da1f2, #0d8bd9);
                    color: white;
                    padding: 15px 30px;
                    border: none;
                    border-radius: 25px;
                    cursor: pointer;
                    font-size: 16px;
                    margin: 10px;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 15px rgba(29, 161, 242, 0.3);
                  }
                  button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(29, 161, 242, 0.4);
                  }
                  .button-container {
                    text-align: center;
                    margin-top: 30px;
                  }
                  .warning {
                    background: #fff3cd;
                    color: #856404;
                    padding: 15px;
                    border-radius: 8px;
                    margin: 15px 0;
                    border: 1px solid #ffeaa7;
                  }
                </style>
              </head>
              <body>
                <div class="container">
                  <h1>🎉 Authorization Granted Successfully!</h1>
                  
                  <div class="success-badge">
                    <h2>✅ Login successful!</h2>
                    <p>You have authorized our application to access your Twitter account.</p>
                  </div>
                  
                  <div class="user-info">
                    <img src="${userData.profile_image_url_https}" alt="Profile picture" class="profile-img">
                    <div>
                      <h3>${userData.name}</h3>
                      <p><strong>@${userData.screen_name}</strong></p>
                      <p>Account created on: ${new Date(userData.created_at).toLocaleDateString('en-US')}</p>
                    </div>
                  </div>
                  
                  <div class="permissions-section">
                    <h3>🔐 Granted Permissions</h3>
                    <p>Your application now has access to the following features:</p>
                    <ul class="permissions-list">
                      ${permissions.map(permission => `<li>${permission}</li>`).join('')}
                    </ul>
                  </div>
                  
                  <div class="tokens-section">
                    <h3>🔑 Access Tokens</h3>
                    <div class="warning">
                      <strong>⚠️ Important:</strong> These tokens are sensitive and should be kept secure.
                    </div>
                    
                    <div class="token-item">
                      <div class="token-label">OAuth Token:</div>
                      <div class="token-value">${maskToken(oauth_token)}</div>
                    </div>
                    
                    <div class="token-item">
                      <div class="token-label">OAuth Verifier:</div>
                      <div class="token-value">${maskToken(oauth_verifier)}</div>
                    </div>
                    
                    <div class="token-item">
                      <div class="token-label">Access Token:</div>
                      <div class="token-value">${maskToken(oauthAccessToken)}</div>
                    </div>
                    
                    <div class="token-item">
                      <div class="token-label">Access Token Secret:</div>
                      <div class="token-value">${maskToken(oauthAccessTokenSecret)}</div>
                    </div>
                    
                    <div class="token-item">
                      <div class="token-label">Authorization completed at:</div>
                      <div class="token-value">${new Date().toLocaleString('en-US')}</div>
                    </div>
                  </div>
                  
                  <div class="button-container">
                    <button onclick="location.href='/'">🏠 Go to Application</button>
                    <button onclick="location.href='/permissions'">📋 View Full Details</button>
                  </div>
                </div>
              </body>
            </html>
          `);
        }
      );
    }
  );
});

// =========================================
// DETAILED PERMISSIONS PAGE
// =========================================

app.get('/permissions', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/');
  }

  const user = req.session.user;
  const authData = req.session.authData;
  const permissions = getPermissions(user);

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>🔐 Permissions and Tokens</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
          }
          .container {
            background: rgba(255, 255, 255, 0.95);
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            max-width: 1000px;
            margin: 0 auto;
          }
          h1 { color: #1da1f2; margin-bottom: 30px; text-align: center; }
          .section {
            background: #f8f9fa;
            padding: 25px;
            border-radius: 15px;
            margin: 20px 0;
            border-left: 5px solid #1da1f2;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin: 20px 0;
          }
          .card {
            background: #ffffff;
            padding: 20px;
            border-radius: 10px;
            border: 1px solid #e0e0e0;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .card h3 {
            color: #333;
            margin-bottom: 15px;
          }
          .token-full {
            background: #f8f9fa;
            padding: 10px;
            border-radius: 5px;
            font-family: monospace;
            font-size: 12px;
            word-break: break-all;
            margin: 10px 0;
          }
          .permissions-list {
            list-style: none;
            padding: 0;
          }
          .permissions-list li {
            padding: 8px 0;
            border-bottom: 1px solid #e0e0e0;
          }
          .permissions-list li:last-child {
            border-bottom: none;
          }
          button {
            background: linear-gradient(45deg, #1da1f2, #0d8bd9);
            color: white;
            padding: 15px 30px;
            border: none;
            border-radius: 25px;
            cursor: pointer;
            font-size: 16px;
            margin: 10px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(29, 161, 242, 0.3);
          }
          button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(29, 161, 242, 0.4);
          }
          .button-container {
            text-align: center;
            margin-top: 30px;
          }
          .warning {
            background: #fff3cd;
            color: #856404;
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
            border: 1px solid #ffeaa7;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🔐 Detailed Permissions and Tokens</h1>
          
          <div class="section">
            <h2>👤 User Information</h2>
            <div class="grid">
              <div class="card">
                <h3>Basic Data</h3>
                <p><strong>Name:</strong> ${user.name}</p>
                <p><strong>Username:</strong> @${user.screen_name}</p>
                <p><strong>ID:</strong> ${user.id}</p>
                <p><strong>Verified:</strong> ${user.verified ? '✅ Yes' : '❌ No'}</p>
              </div>
              
              <div class="card">
                <h3>Statistics</h3>
                <p><strong>Followers:</strong> ${user.followers_count.toLocaleString()}</p>
                <p><strong>Following:</strong> ${user.friends_count.toLocaleString()}</p>
                <p><strong>Tweets:</strong> ${user.statuses_count.toLocaleString()}</p>
                <p><strong>Likes:</strong> ${user.favourites_count.toLocaleString()}</p>
              </div>
              
              <div class="card">
                <h3>Account Information</h3>
                <p><strong>Created on:</strong> ${new Date(user.created_at).toLocaleDateString('en-US')}</p>
                <p><strong>Location:</strong> ${user.location || 'Not specified'}</p>
                <p><strong>Timezone:</strong> ${user.time_zone || 'Not specified'}</p>
                <p><strong>Language:</strong> ${user.lang || 'Not specified'}</p>
              </div>
            </div>
          </div>
          
          <div class="section">
            <h2>🔐 Granted Permissions</h2>
            <ul class="permissions-list">
              ${permissions.map(permission => `<li>${permission}</li>`).join('')}
            </ul>
          </div>
          
          <div class="section">
            <h2>🔑 Access Tokens</h2>
            <div class="warning">
              <strong>⚠️ Security:</strong> These tokens allow access to your account. Keep them secure!
            </div>
            
            <div class="grid">
              <div class="card">
                <h3>OAuth Token</h3>
                <div class="token-full">${req.session.oauthAccessToken || 'Token not available'}</div>
              </div>
              
              <div class="card">
                <h3>OAuth Token Secret</h3>
                <div class="token-full">${req.session.oauthAccessTokenSecret || 'Token secret not available'}</div>
              </div>
              
              ${authData ? `
                <div class="card">
                  <h3>Authorization Data</h3>
                  <p><strong>OAuth Token:</strong></p>
                  <div class="token-full">${authData.oauth_token}</div>
                  <p><strong>OAuth Verifier:</strong></p>
                  <div class="token-full">${authData.oauth_verifier}</div>
                  <p><strong>Authorized on:</strong> ${new Date(authData.timestamp).toLocaleString('en-US')}</p>
                </div>
              ` : ''}
            </div>
          </div>
          
          <div class="button-container">
            <button onclick="location.href='/'">🏠 Back to Home</button>
            <button onclick="location.href='/logout'">🚪 Logout</button>
          </div>
        </div>
      </body>
    </html>
  `);
});

// =========================================
// OTHER ROUTES (maintained the same)
// =========================================

// Tweet page
app.get('/tweet', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/');
  }

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Post Tweet</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .container {
            background: rgba(255, 255, 255, 0.95);
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            max-width: 600px;
            width: 90%;
          }
          h1 { color: #1da1f2; margin-bottom: 20px; text-align: center; }
          .user-info { 
            background: #f8f9fa;
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 25px;
            text-align: center;
          }
          textarea {
            width: 100%;
            min-height: 120px;
            padding: 20px;
            border: 2px solid #e1e8ed;
            border-radius: 15px;
            font-size: 16px;
            resize: vertical;
            font-family: inherit;
            transition: border-color 0.3s ease;
          }
          textarea:focus {
            border-color: #1da1f2;
            outline: none;
            box-shadow: 0 0 0 3px rgba(29, 161, 242, 0.1);
          }
          .char-count {
            text-align: right;
            margin: 10px 0;
            font-size: 14px;
            color: #657786;
          }
          button {
            background: linear-gradient(45deg, #1da1f2, #0d8bd9);
            color: white;
            padding: 15px 30px;
            border: none;
            border-radius: 25px;
            cursor: pointer;
            font-size: 16px;
            margin: 10px 5px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(29, 161, 242, 0.3);
          }
          button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(29, 161, 242, 0.4);
          }
          .back-btn {
            background: linear-gradient(45deg, #6c757d, #545b62);
            box-shadow: 0 4px 15px rgba(108, 117, 125, 0.3);
          }
          .button-container { text-align: center; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>✍️ Post Tweet</h1>
          
          <div class="user-info">
            <strong>Logged in as:</strong> @${req.session.user.screen_name}
          </div>
          
          <form method="POST" action="/tweet">
            <textarea 
              name="status" 
              placeholder="What's happening? 🤔" 
              maxlength="280" 
              required
              oninput="updateCharCount(this)"
            ></textarea>
            
            <div class="char-count">
              <span id="charCount">0</span>/280 characters
            </div>
            
            <div class="button-container">
              <button type="submit" id="tweetBtn">🐦 Tweet</button>
              <button type="button" class="back-btn" onclick="location.href='/'">
                ⬅️ Back
              </button>
            </div>
          </form>
        </div>
        
        <script>
          function updateCharCount(textarea) {
            const charCount = document.getElementById('charCount');
            const tweetBtn = document.getElementById('tweetBtn');
            const count = textarea.value.length;
            
            charCount.textContent = count;
            
            if (count > 280) {
              charCount.style.color = '#e0245e';
              tweetBtn.disabled = true;
              tweetBtn.style.opacity = '0.5';
            } else if (count > 260) {
              charCount.style.color = '#ffad1f';
              tweetBtn.disabled = false;
              tweetBtn.style.opacity = '1';
            } else {
              charCount.style.color = '#657786';
              tweetBtn.disabled = false;
              tweetBtn.style.opacity = '1';
            }
          }
        </script>
      </body>
    </html>
  `);
});

// Process tweet
app.post('/tweet', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/');
  }

  const { status } = req.body;

  if (!status || status.trim().length === 0) {
    return res.status(400).send(`
      <h1>❌ Error</h1>
      <p>Tweet cannot be empty!</p>
      <button onclick="history.back()">Back</button>
    `);
  }

  if (status.length > 280) {
    return res.status(400).send(`
      <h1>❌ Error</h1>
      <p>Tweet too long! Maximum 280 characters.</p>
      <button onclick="history.back()">Back</button>
    `);
  }

  const callbackUrl = getCallbackUrl(req);
  const oauth = createOAuth(callbackUrl);

  oauth.post(
    'https://api.twitter.com/1.1/statuses/update.json',
    req.session.oauthAccessToken,
    req.session.oauthAccessTokenSecret,
    { status: status },
    (error, data, response) => {
      if (error) {
        console.error('Error posting tweet:', error);
        return res.status(500).send(`
          <h1>❌ Tweet Error</h1>
          <p>Could not post tweet. Please try again.</p>
          <button onclick="history.back()">Try Again</button>
        `);
      }

      const tweetData = JSON.parse(data);
      
      res.send(`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Tweet Posted!</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .container {
                background: rgba(255, 255, 255, 0.95);
                padding: 40px;
                border-radius: 20px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                max-width: 600px;
                width: 90%;
                text-align: center;
              }
              h1 { color: #28a745; margin-bottom: 20px; }
              .success { 
                background: #d4edda;
                color: #155724;
                padding: 25px;
                border-radius: 15px;
                margin: 20px 0;
                border-left: 5px solid #28a745;
              }
              .tweet-content {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 10px;
                margin: 15px 0;
                font-style: italic;
              }
              button {
                background: linear-gradient(45deg, #1da1f2, #0d8bd9);
                color: white;
                padding: 15px 30px;
                border: none;
                border-radius: 25px;
                cursor: pointer;
                font-size: 16px;
                margin: 10px;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(29, 161, 242, 0.3);
              }
              button:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(29, 161, 242, 0.4);
              }
              .twitter-link {
                background: linear-gradient(45deg, #1da1f2, #0d8bd9);
                color: white;
                text-decoration: none;
                display: inline-block;
                padding: 12px 25px;
                border-radius: 25px;
                margin: 10px;
                transition: all 0.3s ease;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>🎉 Tweet Posted Successfully!</h1>
              
              <div class="success">
                <h3>✅ Your tweet has been published!</h3>
                <div class="tweet-content">
                  "${tweetData.text}"
                </div>
                <p><strong>Posted on:</strong> ${new Date(tweetData.created_at).toLocaleString('en-US')}</p>
              </div>
              
              <a href="https://twitter.com/${tweetData.user.screen_name}/status/${tweetData.id_str}" 
                 target="_blank" 
                 class="twitter-link">
                🔗 View on Twitter
              </a>
              
              <div>
                <button onclick="location.href='/'">🏠 Back to Home</button>
                <button onclick="location.href='/tweet'">✍️ Post Another Tweet</button>
              </div>
            </div>
          </body>
        </html>
      `);
    }
  );
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 404 error handling
app.use((req, res) => {
  res.status(404).send(`
    <h1>404 - Page Not Found</h1>
    <p>The page you're looking for doesn't exist.</p>
    <button onclick="location.href='/'">Back to Home</button>
  `);
});

// Error handling
app.use((error, req, res, next) => {
  console.error('Application error:', error);
  res.status(500).send(`
    <h1>500 - Server Error</h1>
    <p>Something went wrong. Please try again later.</p>
    <button onclick="location.href='/'">Back to Home</button>
  `);
});

// =========================================
// EXPORT FOR VERCEL
// =========================================

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;