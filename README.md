# 🐦 Twitter OAuth 1.0a - Aplicação de Login

Esta é uma aplicação simples que permite fazer login com Twitter usando OAuth 1.0a e fazer tweets.

## 🚀 Como usar

### 1. Preparação inicial

1. **Instale o Node.js**
   - Baixe em: https://nodejs.org
   - Escolha a versão LTS (recomendada)

2. **Verifique a instalação**
   ```bash
   node --version
   npm --version
   ```

### 2. Obter credenciais do Twitter

1. Acesse: https://developer.twitter.com
2. Faça login com sua conta do Twitter
3. Clique em "Create Project" ou "Create App"
4. Preencha as informações solicitadas
5. Após aprovação, vá em "Keys and Tokens"
6. Anote as seguintes informações:
   - **API Key** (Consumer Key)
   - **API Secret** (Consumer Secret)
   - **Access Token**
   - **Access Token Secret**

### 3. Configurar o projeto

1. **Baixe os arquivos**
   - Certifique-se de ter todos os arquivos na mesma pasta

2. **Configure as credenciais**
   - Abra o arquivo `.env`
   - Substitua os valores pelas suas credenciais reais
   - Exemplo:
     ```
     TWITTER_API_KEY=ABC123def456
     TWITTER_API_SECRET=xyz789uvw123
     TWITTER_ACCESS_TOKEN=123456789-ABC123def456
     TWITTER_ACCESS_TOKEN_SECRET=MNO789pqr123
     SESSION_SECRET=minha_senha_123
     ```

3. **Instalar dependências**
   ```bash
   npm install
   ```

### 4. Executar o projeto

1. **Modo desenvolvimento**
   ```bash
   npm run dev
   ```

2. **Modo produção**
   ```bash
   npm start
   ```

3. **Abra no navegador**
   - Acesse: http://localhost:3000

## 📋 Funcionalidades

- ✅ Login com Twitter
- ✅ Exibir dados do perfil
- ✅ Fazer tweets
- ✅ Logout
- ✅ Interface responsiva

## 🔧 Estrutura dos arquivos

```
twitter-oauth-app/
├── package.json          # Configurações do projeto
├── .env                  # Credenciais (não compartilhar!)
├── server.js             # Código principal
├── .gitignore            # Arquivos para ignorar no Git
├── README.md             # Este arquivo
└── node_modules/         # Dependências (criado automaticamente)
```

## 🐛 Solução de problemas

### Erro: "Cannot find module"
**Solução:** Execute `npm install`

### Erro: "Credentials invalid"
**Solução:** Verifique se as credenciais no arquivo `.env` estão corretas

### Erro: "Port already in use"
**Solução:** 
- Feche outros programas que usam a porta 3000
- Ou mude a porta no arquivo `.env`: `PORT=3001`

### Erro: "Callback URL mismatch"
**Solução:** 
- No Twitter Developer Portal, configure:
- **Callback URL:** `http://localhost:3000/auth/twitter/callback`
- **Website URL:** `http://localhost:3000`

## 🚀 Deploy (Hospedagem)

### Opção 1: Railway (Recomendado)
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

### Opção 2: Heroku
```bash
heroku create seu-app-name
git push heroku main
```

### Opção 3: Vercel
```bash
npm install -g vercel
vercel
```

## 🔒 Segurança

- ❌ NUNCA compartilhe o arquivo `.env`
- ❌ NUNCA faça upload das credenciais para GitHub
- ✅ Use HTTPS em produção
- ✅ Mantenha as dependências atualizadas

## 📞 Ajuda

Se precisar de ajuda:
1. Verifique se seguiu todos os passos
2. Veja a seção "Solução de problemas"
3. Procure no Google pelo erro específico
4. Peça ajuda em fóruns como Stack Overflow

---

**Feito com ❤️ para aprender OAuth 1.0a**