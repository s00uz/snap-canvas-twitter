// =========================================
// IMPORTAÇÕES - Carregando as bibliotecas
// =========================================

const express = require('express');           // Framework web
const OAuth = require('oauth').OAuth;         // Biblioteca OAuth 1.0a
const session = require('express-session');   // Gerenciamento de sessões
const cors = require('cors');                 // Permitir requisições de outros domínios
require('dotenv').config();                   // Carregar variáveis do arquivo .env

// =========================================
// CONFIGURAÇÕES INICIAIS
// =========================================

const app = express();                        // Criar aplicação Express
const PORT = process.env.PORT || 3000;        // Porta do servidor

// =========================================
// MIDDLEWARES - Funcionalidades extras
// =========================================

app.use(cors());                              // Habilitar CORS
app.use(express.json());                      // Entender JSON
app.use(express.urlencoded({ extended: true })); // Entender formulários
app.use(session({                             // Configurar sessões
  secret: process.env.SESSION_SECRET,         // Senha para criptografar
  resave: false,                              // Não salvar se não mudou
  saveUninitialized: false,                   // Só salvar se tiver dados
  cookie: { secure: false }                   // HTTP em desenvolvimento
}));

// =========================================
// CONFIGURAÇÃO DO TWITTER OAUTH
// =========================================

const oauth = new OAuth(
  'https://api.twitter.com/oauth/request_token',  // URL para pedir token
  'https://api.twitter.com/oauth/access_token',   // URL para confirmar token
  process.env.TWITTER_API_KEY,                    // Sua API Key
  process.env.TWITTER_API_SECRET,                 // Sua API Secret
  '1.0A',                                         // Versão OAuth
  `http://localhost:${PORT}/auth/twitter/callback`, // URL de retorno
  'HMAC-SHA1'                                     // Algoritmo de segurança
);

// =========================================
// PÁGINA INICIAL
// =========================================

app.get('/', (req, res) => {
  // Criar HTML da página inicial
  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Twitter OAuth - Login</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            max-width: 600px; 
            margin: 50px auto; 
            padding: 20px; 
            background-color: #f5f5f5;
          }
          .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          button { 
            background: #1da1f2; 
            color: white; 
            padding: 12px 24px; 
            border: none; 
            border-radius: 25px; 
            cursor: pointer; 
            font-size: 16px;
            margin: 10px 5px;
          }
          button:hover { 
            background: #0d8bd9; 
          }
          .user-info { 
            background: #e8f5fe; 
            padding: 20px; 
            border-radius: 8px; 
            margin: 20px 0; 
            border-left: 4px solid #1da1f2;
          }
          .profile-img {
            border-radius: 50%; 
            width: 64px; 
            height: 64px;
            margin: 10px 0;
          }
          h1 { color: #1da1f2; }
          .welcome { color: #14171a; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🐦 Twitter OAuth Demo</h1>
          
          ${req.session.user ? `
            <!-- Se o usuário está logado -->
            <div class="user-info">
              <h2 class="welcome">Bem-vindo, ${req.session.user.screen_name}! 👋</h2>
              <img src="${req.session.user.profile_image_url}" alt="Foto do perfil" class="profile-img">
              <p><strong>Nome:</strong> ${req.session.user.name}</p>
              <p><strong>Seguidores:</strong> ${req.session.user.followers_count.toLocaleString()}</p>
              <p><strong>Seguindo:</strong> ${req.session.user.friends_count.toLocaleString()}</p>
              <p><strong>Tweets:</strong> ${req.session.user.statuses_count.toLocaleString()}</p>
            </div>
            
            <button onclick="location.href='/tweet'">✍️ Fazer Tweet</button>
            <button onclick="location.href='/logout'" style="background: #dc3545;">🚪 Logout</button>
            
          ` : `
            <!-- Se o usuário não está logado -->
            <p>Faça login com sua conta do Twitter para continuar:</p>
            <button onclick="location.href='/auth/twitter'">🔑 Login com Twitter</button>
          `}
        </div>
      </body>
    </html>
  `);
});

// =========================================
// INICIAR LOGIN COM TWITTER
// =========================================

app.get('/auth/twitter', (req, res) => {
  // Pedir token temporário ao Twitter
  oauth.getOAuthRequestToken((error, oauthToken, oauthTokenSecret, results) => {
    if (error) {
      console.error('❌ Erro ao obter request token:', error);
      return res.status(500).send('Erro na autenticação. Verifique suas credenciais.');
    }

    // Salvar tokens temporários na sessão
    req.session.oauthRequestToken = oauthToken;
    req.session.oauthRequestTokenSecret = oauthTokenSecret;

    // Redirecionar usuário para autorizar no Twitter
    res.redirect(`https://api.twitter.com/oauth/authorize?oauth_token=${oauthToken}`);
  });
});

// =========================================
// CALLBACK - TWITTER RETORNA AQUI
// =========================================

app.get('/auth/twitter/callback', (req, res) => {
  const { oauth_token, oauth_verifier } = req.query;

  // Verificar se recebeu os dados necessários
  if (!oauth_token || !oauth_verifier) {
    return res.status(400).send('Parâmetros de callback inválidos');
  }

  // Trocar token temporário por token permanente
  oauth.getOAuthAccessToken(
    oauth_token,
    req.session.oauthRequestTokenSecret,
    oauth_verifier,
    (error, oauthAccessToken, oauthAccessTokenSecret, results) => {
      if (error) {
        console.error('❌ Erro ao obter access token:', error);
        return res.status(500).send('Erro na autenticação');
      }

      // Salvar tokens permanentes na sessão
      req.session.oauthAccessToken = oauthAccessToken;
      req.session.oauthAccessTokenSecret = oauthAccessTokenSecret;

      // Buscar dados do usuário
      oauth.get(
        'https://api.twitter.com/1.1/account/verify_credentials.json',
        oauthAccessToken,
        oauthAccessTokenSecret,
        (error, data, response) => {
          if (error) {
            console.error('❌ Erro ao obter dados do usuário:', error);
            return res.status(500).send('Erro ao obter dados do usuário');
          }

          // Salvar dados do usuário na sessão
          req.session.user = JSON.parse(data);

          // Limpar tokens temporários
          delete req.session.oauthRequestToken;
          delete req.session.oauthRequestTokenSecret;

          console.log('✅ Usuário logado:', req.session.user.screen_name);
          res.redirect('/');
        }
      );
    }
  );
});

// =========================================
// PÁGINA PARA FAZER TWEET
// =========================================

app.get('/tweet', (req, res) => {
  // Verificar se está logado
  if (!req.session.user) {
    return res.redirect('/');
  }

  // Mostrar formulário para tweet
  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Fazer Tweet</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            max-width: 600px; 
            margin: 50px auto; 
            padding: 20px; 
            background-color: #f5f5f5;
          }
          .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          textarea { 
            width: 100%; 
            height: 120px; 
            margin: 10px 0; 
            padding: 15px; 
            border: 2px solid #e1e8ed; 
            border-radius: 8px; 
            font-size: 16px;
            resize: vertical;
          }
          textarea:focus {
            border-color: #1da1f2;
            outline: none;
          }
          button { 
            background: #1da1f2; 
            color: white; 
            padding: 12px 24px; 
            border: none; 
            border-radius: 25px; 
            cursor: pointer; 
            font-size: 16px;
            margin: 5px;
          }
          button:hover { 
            background: #0d8bd9; 
          }
          .back-btn {
            background: #6c757d;
          }
          .back-btn:hover {
            background: #545b62;
          }
          .char-count {
            text-align: right;
            margin-top: 5px;
            color: #657786;
          }
          h1 { color: #1da1f2; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>✍️ Fazer Tweet</h1>
          <p>Logado como: <strong>@${req.session.user.screen_name}</strong></p>
          
          <form method="POST" action="/tweet">
            <textarea 
              name="status" 
              placeholder="O que está acontecendo?" 
              maxlength="280" 
              required
              oninput="updateCharCount(this)"
            ></textarea>
            <div class="char-count">
              <span id="charCount">0</span>/280
            </div>
            <br>
            <button type="submit">🐦 Tweetar</button>
            <button type="button" class="back-btn" onclick="location.href='/'">⬅️ Voltar</button>
          </form>
        </div>
        
        <script>
          function updateCharCount(textarea) {
            const charCount = document.getElementById('charCount');
            const count = textarea.value.length;
            charCount.textContent = count;
            
            // Mudar cor conforme se aproxima do limite
            if (count > 260) {
              charCount.style.color = '#e0245e';
            } else if (count > 200) {
              charCount.style.color = '#ffad1f';
            } else {
              charCount.style.color = '#657786';
            }
          }
        </script>
      </body>
    </html>
  `);
});

// =========================================
// PROCESSAR TWEET
// =========================================

app.post('/tweet', (req, res) => {
  // Verificar se está logado
  if (!req.session.user) {
    return res.redirect('/');
  }

  const { status } = req.body;

  // Verificar se o tweet não está vazio
  if (!status || status.trim().length === 0) {
    return res.status(400).send('Tweet não pode estar vazio');
  }

  // Enviar tweet para o Twitter
  oauth.post(
    'https://api.twitter.com/1.1/statuses/update.json',
    req.session.oauthAccessToken,
    req.session.oauthAccessTokenSecret,
    { status: status },
    (error, data, response) => {
      if (error) {
        console.error('❌ Erro ao fazer tweet:', error);
        return res.status(500).send('Erro ao fazer tweet. Tente novamente.');
      }

      const tweetData = JSON.parse(data);
      console.log('✅ Tweet enviado:', tweetData.text);

      // Página de sucesso
      res.send(`
        <!DOCTYPE html>
        <html lang="pt-BR">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Tweet Enviado!</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                max-width: 600px; 
                margin: 50px auto; 
                padding: 20px; 
                background-color: #f5f5f5;
              }
              .container {
                background: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                text-align: center;
              }
              .success { 
                background: #d4edda; 
                color: #155724; 
                padding: 20px; 
                border-radius: 8px; 
                margin: 20px 0; 
                border-left: 4px solid #28a745;
              }
              button { 
                background: #1da1f2; 
                color: white; 
                padding: 12px 24px; 
                border: none; 
                border-radius: 25px; 
                cursor: pointer; 
                font-size: 16px;
                margin: 10px;
              }
              button:hover { 
                background: #0d8bd9; 
              }
              h1 { color: #1da1f2; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>🎉 Tweet Enviado com Sucesso!</h1>
              <div class="success">
                <h3>Seu tweet foi publicado!</h3>
                <p><strong>Conteúdo:</strong> "${tweetData.text}"</p>
                <p><strong>Data:</strong> ${new Date(tweetData.created_at).toLocaleString('pt-BR')}</p>
              </div>
              <button onclick="location.href='/'">🏠 Voltar ao Início</button>
              <button onclick="location.href='/tweet'">✍️ Fazer Outro Tweet</button>
            </div>
          </body>
        </html>
      `);
    }
  );
});

// =========================================
// LOGOUT
// =========================================

app.get('/logout', (req, res) => {
  // Destruir sessão
  req.session.destroy(() => {
    console.log('👋 Usuário fez logout');
    res.redirect('/');
  });
});

// =========================================
// INICIAR SERVIDOR
// =========================================

const server = app.listen(PORT, () => {
  console.log('🚀 Servidor rodando!');
  console.log(`📱 Acesse: http://localhost:${PORT}`);
  console.log('⚡ Pressione Ctrl+C para parar');
});

// =========================================
// TRATAMENTO DE ERROS
// =========================================

process.on('uncaughtException', (error) => {
  console.error('❌ Erro não tratado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise rejeitada:', reason);
});

module.exports = app;