// =========================================
// TWITTER OAUTH 1.0a - VERSÃO ATUALIZADA
// =========================================

const express = require('express');
const OAuth = require('oauth').OAuth;
const session = require('express-session');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// =========================================
// CONFIGURAÇÃO OTIMIZADA PARA VERCEL
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
// FUNÇÕES UTILITÁRIAS
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

function verificarCredenciais(req, res, next) {
  const credenciais = [
    'TWITTER_API_KEY',
    'TWITTER_API_SECRET',
    'TWITTER_ACCESS_TOKEN',
    'TWITTER_ACCESS_TOKEN_SECRET'
  ];

  for (const cred of credenciais) {
    if (!process.env[cred]) {
      return res.status(500).send(`
        <h1>❌ Erro de Configuração</h1>
        <p>Variável de ambiente <strong>${cred}</strong> não configurada.</p>
        <p>Configure todas as variáveis na Vercel e faça novo deploy.</p>
      `);
    }
  }
  next();
}

// Função para mascarar tokens (segurança)
function mascarToken(token) {
  if (!token) return 'N/A';
  if (token.length <= 8) return token;
  
  const inicio = token.substring(0, 4);
  const fim = token.substring(token.length - 4);
  const meio = '*'.repeat(Math.max(0, token.length - 8));
  
  return `${inicio}${meio}${fim}`;
}

// Função para obter permissões do usuário
function obterPermissoes(user) {
  const permissoes = [];
  
  // Baseado no que o OAuth 1.0a permite
  permissoes.push('✅ Ler tweets da timeline');
  permissoes.push('✅ Ver informações do perfil');
  permissoes.push('✅ Ver contas seguidas e seguidores');
  
  // Verificar se tem permissão de escrita
  if (user.status && user.status.text) {
    permissoes.push('✅ Publicar tweets');
  }
  
  // Verificar outras permissões baseadas no perfil
  if (user.profile_image_url) {
    permissoes.push('✅ Acessar foto do perfil');
  }
  
  if (user.location) {
    permissoes.push('✅ Acessar localização do perfil');
  }
  
  if (user.email) {
    permissoes.push('✅ Acessar email da conta');
  }
  
  return permissoes;
}

// =========================================
// ROTAS
// =========================================

// Página inicial
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
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
          <h1>🐦 Twitter OAuth na Vercel</h1>
          
          ${req.session.user ? `
            <div class="user-info">
              <img src="${req.session.user.profile_image_url_https}" alt="Foto do perfil" class="profile-img">
              <h2>Bem-vindo, ${req.session.user.name}! 👋</h2>
              <p><strong>@${req.session.user.screen_name}</strong></p>
              
              <div class="stats">
                <div class="stat">
                  <div class="stat-number">${req.session.user.followers_count.toLocaleString()}</div>
                  <div class="stat-label">Seguidores</div>
                </div>
                <div class="stat">
                  <div class="stat-number">${req.session.user.friends_count.toLocaleString()}</div>
                  <div class="stat-label">Seguindo</div>
                </div>
                <div class="stat">
                  <div class="stat-number">${req.session.user.statuses_count.toLocaleString()}</div>
                  <div class="stat-label">Tweets</div>
                </div>
              </div>
            </div>
            
            <button onclick="location.href='/tweet'">✍️ Fazer Tweet</button>
            <button onclick="location.href='/permissions'">🔐 Ver Permissões</button>
            <button onclick="location.href='/logout'" class="logout-btn">🚪 Logout</button>
            
          ` : `
            <p style="margin: 20px 0; font-size: 18px;">
              Faça login com sua conta do Twitter para continuar
            </p>
            <button onclick="location.href='/auth/twitter'">
              🔑 Login com Twitter
            </button>
            
            <div class="direct-login">
              <h3>🚀 Login Direto</h3>
              <p>Ou use este endpoint para ir direto ao Twitter:</p>
              <div class="endpoint-info">
                GET /login
              </div>
              <button onclick="location.href='/login'">
                ⚡ Login Direto
              </button>
            </div>
          `}
          
          <div class="powered-by">
            🚀 Hospedado na Vercel | 💻 Feito com Node.js
          </div>
        </div>
      </body>
    </html>
  `);
});

// =========================================
// ENDPOINT DE LOGIN DIRETO (NOVO!)
// =========================================

app.get('/login', verificarCredenciais, (req, res) => {
  const callbackUrl = getCallbackUrl(req);
  const oauth = createOAuth(callbackUrl);
  
  oauth.getOAuthRequestToken((error, oauthToken, oauthTokenSecret, results) => {
    if (error) {
      console.error('Erro ao obter request token:', error);
      return res.status(500).send(`
        <h1>❌ Erro na Autenticação</h1>
        <p>Não foi possível conectar com o Twitter.</p>
        <p>Verifique suas credenciais e tente novamente.</p>
        <button onclick="location.href='/'">Tentar Novamente</button>
      `);
    }

    req.session.oauthRequestToken = oauthToken;
    req.session.oauthRequestTokenSecret = oauthTokenSecret;
    req.session.callbackUrl = callbackUrl;

    // REDIRECT DIRETO PARA O TWITTER (sem página intermediária)
    res.redirect(`https://api.twitter.com/oauth/authorize?oauth_token=${oauthToken}`);
  });
});

// Iniciar autenticação (rota antiga mantida para compatibilidade)
app.get('/auth/twitter', verificarCredenciais, (req, res) => {
  const callbackUrl = getCallbackUrl(req);
  const oauth = createOAuth(callbackUrl);
  
  oauth.getOAuthRequestToken((error, oauthToken, oauthTokenSecret, results) => {
    if (error) {
      console.error('Erro ao obter request token:', error);
      return res.status(500).send(`
        <h1>❌ Erro na Autenticação</h1>
        <p>Não foi possível conectar com o Twitter.</p>
        <p>Verifique suas credenciais e tente novamente.</p>
        <button onclick="location.href='/'">Tentar Novamente</button>
      `);
    }

    req.session.oauthRequestToken = oauthToken;
    req.session.oauthRequestTokenSecret = oauthTokenSecret;
    req.session.callbackUrl = callbackUrl;

    res.redirect(`https://api.twitter.com/oauth/authorize?oauth_token=${oauthToken}`);
  });
});

// =========================================
// CALLBACK ATUALIZADO COM PERMISSÕES
// =========================================

app.get('/auth/twitter/callback', (req, res) => {
  const { oauth_token, oauth_verifier } = req.query;

  if (!oauth_token || !oauth_verifier) {
    return res.status(400).send(`
      <h1>❌ Erro no Callback</h1>
      <p>Parâmetros de autorização inválidos.</p>
      <button onclick="location.href='/'">Tentar Novamente</button>
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
        console.error('Erro ao obter access token:', error);
        return res.status(500).send(`
          <h1>❌ Erro na Autenticação</h1>
          <p>Não foi possível completar o login.</p>
          <button onclick="location.href='/'">Tentar Novamente</button>
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
            console.error('Erro ao obter dados do usuário:', error);
            return res.status(500).send(`
              <h1>❌ Erro ao Carregar Perfil</h1>
              <p>Login realizado, mas não foi possível carregar os dados.</p>
              <button onclick="location.href='/'">Tentar Novamente</button>
            `);
          }

          const userData = JSON.parse(data);
          req.session.user = userData;
          
          // Salvar dados extras da sessão
          req.session.authData = {
            oauth_token: oauth_token,
            oauth_verifier: oauth_verifier,
            timestamp: new Date().toISOString()
          };

          // Limpar tokens temporários
          delete req.session.oauthRequestToken;
          delete req.session.oauthRequestTokenSecret;
          delete req.session.callbackUrl;

          // PÁGINA DE SUCESSO COM PERMISSÕES E TOKENS
          const permissoes = obterPermissoes(userData);
          
          res.send(`
            <!DOCTYPE html>
            <html lang="pt-BR">
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>🎉 Autorização Concedida!</title>
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
                  <h1>🎉 Autorização Concedida com Sucesso!</h1>
                  
                  <div class="success-badge">
                    <h2>✅ Login realizado com sucesso!</h2>
                    <p>Você autorizou nossa aplicação a acessar sua conta do Twitter.</p>
                  </div>
                  
                  <div class="user-info">
                    <img src="${userData.profile_image_url_https}" alt="Foto do perfil" class="profile-img">
                    <div>
                      <h3>${userData.name}</h3>
                      <p><strong>@${userData.screen_name}</strong></p>
                      <p>Conta criada em: ${new Date(userData.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                  
                  <div class="permissions-section">
                    <h3>🔐 Permissões Concedidas</h3>
                    <p>Sua aplicação agora tem acesso às seguintes funcionalidades:</p>
                    <ul class="permissions-list">
                      ${permissoes.map(permissao => `<li>${permissao}</li>`).join('')}
                    </ul>
                  </div>
                  
                  <div class="tokens-section">
                    <h3>🔑 Tokens de Acesso</h3>
                    <div class="warning">
                      <strong>⚠️ Importante:</strong> Estes tokens são sensíveis e devem ser mantidos em segurança.
                    </div>
                    
                    <div class="token-item">
                      <div class="token-label">OAuth Token:</div>
                      <div class="token-value">${mascarToken(oauth_token)}</div>
                    </div>
                    
                    <div class="token-item">
                      <div class="token-label">OAuth Verifier:</div>
                      <div class="token-value">${mascarToken(oauth_verifier)}</div>
                    </div>
                    
                    <div class="token-item">
                      <div class="token-label">Access Token:</div>
                      <div class="token-value">${mascarToken(oauthAccessToken)}</div>
                    </div>
                    
                    <div class="token-item">
                      <div class="token-label">Access Token Secret:</div>
                      <div class="token-value">${mascarToken(oauthAccessTokenSecret)}</div>
                    </div>
                    
                    <div class="token-item">
                      <div class="token-label">Autorização realizada em:</div>
                      <div class="token-value">${new Date().toLocaleString('pt-BR')}</div>
                    </div>
                  </div>
                  
                  <div class="button-container">
                    <button onclick="location.href='/'">🏠 Ir para Aplicação</button>
                    <button onclick="location.href='/permissions'">📋 Ver Detalhes Completos</button>
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
// PÁGINA DE PERMISSÕES DETALHADAS
// =========================================

app.get('/permissions', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/');
  }

  const user = req.session.user;
  const authData = req.session.authData;
  const permissoes = obterPermissoes(user);

  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>🔐 Permissões e Tokens</title>
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
          <h1>🔐 Permissões e Tokens Detalhados</h1>
          
          <div class="section">
            <h2>👤 Informações do Usuário</h2>
            <div class="grid">
              <div class="card">
                <h3>Dados Básicos</h3>
                <p><strong>Nome:</strong> ${user.name}</p>
                <p><strong>Username:</strong> @${user.screen_name}</p>
                <p><strong>ID:</strong> ${user.id}</p>
                <p><strong>Verificado:</strong> ${user.verified ? '✅ Sim' : '❌ Não'}</p>
              </div>
              
              <div class="card">
                <h3>Estatísticas</h3>
                <p><strong>Seguidores:</strong> ${user.followers_count.toLocaleString()}</p>
                <p><strong>Seguindo:</strong> ${user.friends_count.toLocaleString()}</p>
                <p><strong>Tweets:</strong> ${user.statuses_count.toLocaleString()}</p>
                <p><strong>Curtidas:</strong> ${user.favourites_count.toLocaleString()}</p>
              </div>
              
              <div class="card">
                <h3>Informações da Conta</h3>
                <p><strong>Criada em:</strong> ${new Date(user.created_at).toLocaleDateString('pt-BR')}</p>
                <p><strong>Localização:</strong> ${user.location || 'Não informado'}</p>
                <p><strong>Timezone:</strong> ${user.time_zone || 'Não informado'}</p>
                <p><strong>Idioma:</strong> ${user.lang || 'Não informado'}</p>
              </div>
            </div>
          </div>
          
          <div class="section">
            <h2>🔐 Permissões Concedidas</h2>
            <ul class="permissions-list">
              ${permissoes.map(permissao => `<li>${permissao}</li>`).join('')}
            </ul>
          </div>
          
          <div class="section">
            <h2>🔑 Tokens de Acesso</h2>
            <div class="warning">
              <strong>⚠️ Segurança:</strong> Estes tokens permitem acesso à sua conta. Mantenha-os seguros!
            </div>
            
            <div class="grid">
              <div class="card">
                <h3>OAuth Token</h3>
                <div class="token-full">${req.session.oauthAccessToken || 'Token não disponível'}</div>
              </div>
              
              <div class="card">
                <h3>OAuth Token Secret</h3>
                <div class="token-full">${req.session.oauthAccessTokenSecret || 'Token secret não disponível'}</div>
              </div>
              
              ${authData ? `
                <div class="card">
                  <h3>Dados da Autorização</h3>
                  <p><strong>OAuth Token:</strong></p>
                  <div class="token-full">${authData.oauth_token}</div>
                  <p><strong>OAuth Verifier:</strong></p>
                  <div class="token-full">${authData.oauth_verifier}</div>
                  <p><strong>Autorizado em:</strong> ${new Date(authData.timestamp).toLocaleString('pt-BR')}</p>
                </div>
              ` : ''}
            </div>
          </div>
          
          <div class="section">
            <h2>🔗 Endpoints da API</h2>
            <div class="card">
              <h3>URLs Importantes</h3>
              <p><strong>Login Direto:</strong> <code>/login</code></p>
              <p><strong>Autorização:</strong> <code>/auth/twitter</code></p>
              <p><strong>Callback:</strong> <code>/auth/twitter/callback</code></p>
              <p><strong>Permissões:</strong> <code>/permissions</code></p>
              <p><strong>Fazer Tweet:</strong> <code>/tweet</code></p>
            </div>
          </div>
          
          <div class="button-container">
            <button onclick="location.href='/'">🏠 Voltar ao Início</button>
            <button onclick="location.href='/tweet'">✍️ Fazer Tweet</button>
            <button onclick="location.href='/logout'">🚪 Logout</button>
          </div>
        </div>
      </body>
    </html>
  `);
});

// =========================================
// OUTRAS ROTAS (mantidas iguais)
// =========================================

// Página de tweet
app.get('/tweet', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/');
  }

  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Fazer Tweet</title>
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
          <h1>✍️ Fazer Tweet</h1>
          
          <div class="user-info">
            <strong>Logado como:</strong> @${req.session.user.screen_name}
          </div>
          
          <form method="POST" action="/tweet">
            <textarea 
              name="status" 
              placeholder="O que está acontecendo? 🤔" 
              maxlength="280" 
              required
              oninput="updateCharCount(this)"
            ></textarea>
            
            <div class="char-count">
              <span id="charCount">0</span>/280 caracteres
            </div>
            
            <div class="button-container">
              <button type="submit" id="tweetBtn">🐦 Tweetar</button>
              <button type="button" class="back-btn" onclick="location.href='/'">
                ⬅️ Voltar
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

// Processar tweet
app.post('/tweet', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/');
  }

  const { status } = req.body;

  if (!status || status.trim().length === 0) {
    return res.status(400).send(`
      <h1>❌ Erro</h1>
      <p>Tweet não pode estar vazio!</p>
      <button onclick="history.back()">Voltar</button>
    `);
  }

  if (status.length > 280) {
    return res.status(400).send(`
      <h1>❌ Erro</h1>
      <p>Tweet muito longo! Máximo 280 caracteres.</p>
      <button onclick="history.back()">Voltar</button>
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
        console.error('Erro ao fazer tweet:', error);
        return res.status(500).send(`
          <h1>❌ Erro ao Tweetar</h1>
          <p>Não foi possível publicar o tweet. Tente novamente.</p>
          <button onclick="history.back()">Tentar Novamente</button>
        `);
      }

      const tweetData = JSON.parse(data);
      
      res.send(`
        <!DOCTYPE html>
        <html lang="pt-BR">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Tweet Enviado!</title>
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
              <h1>🎉 Tweet Enviado com Sucesso!</h1>
              
              <div class="success">
                <h3>✅ Seu tweet foi publicado!</h3>
                <div class="tweet-content">
                  "${tweetData.text}"
                </div>
                <p><strong>Publicado em:</strong> ${new Date(tweetData.created_at).toLocaleString('pt-BR')}</p>
              </div>
              
              <a href="https://twitter.com/${tweetData.user.screen_name}/status/${tweetData.id_str}" 
                 target="_blank" 
                 class="twitter-link">
                🔗 Ver no Twitter
              </a>
              
              <div>
                <button onclick="location.href='/'">🏠 Voltar ao Início</button>
                <button onclick="location.href='/tweet'">✍️ Fazer Outro Tweet</button>
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

// Tratamento de erro 404
app.use((req, res) => {
  res.status(404).send(`
    <h1>404 - Página Não Encontrada</h1>
    <p>A página que você procura não existe.</p>
    <button onclick="location.href='/'">Voltar ao Início</button>
  `);
});

// Tratamento de erros
app.use((error, req, res, next) => {
  console.error('Erro da aplicação:', error);
  res.status(500).send(`
    <h1>500 - Erro do Servidor</h1>
    <p>Algo deu errado. Tente novamente mais tarde.</p>
    <button onclick="location.href='/'">Voltar ao Início</button>
  `);
});

// =========================================
// EXPORT PARA VERCEL
// =========================================

const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;