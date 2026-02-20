# 📱 Configuração de Verificação por SMS (Twilio)

Este guia explica como configurar a verificação por telemóvel usando Twilio.

## 📋 Pré-requisitos

- Conta Twilio (gratuita para teste)
- Telemóvel para receber SMS de teste

---

## 🚀 Passo 1: Criar Conta Twilio

1. Aceda a: https://www.twilio.com/try-twilio
2. Crie uma conta gratuita
3. Verifique o seu email e telemóvel

**Conta gratuita inclui:**
- $15 USD de créditos de teste
- ~500 SMS grátis
- Apenas pode enviar para números verificados (perfeito para desenvolvimento)

---

## 🔑 Passo 2: Obter Credenciais

### 2.1 Account SID e Auth Token

1. Vá ao Dashboard: https://console.twilio.com/
2. Encontre na página principal:
   - **Account SID** (exemplo: `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
   - **Auth Token** (clique em "Show" para revelar)

### 2.2 Obter Número de Telefone

1. No menu lateral, vá a: **Phone Numbers** → **Manage** → **Active Numbers**
2. Se não tiver nenhum, clique em **Buy a Number**
3. Escolha um número com capacidade de SMS:
   - **Country:** Portugal ou país desejado
   - **Capabilities:** Marque **SMS**
4. Clique em **Buy** (usa créditos gratuitos)
5. Copie o número (formato: `+351xxxxxxxxx`)

---

## ⚙️ Passo 3: Configurar Variáveis de Ambiente

Adicione ao seu ficheiro `.env.local`:

```bash
# Twilio SMS Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+351xxxxxxxxx
```

**⚠️ Importante:**
- `TWILIO_PHONE_NUMBER` deve incluir o código do país (ex: `+351` para Portugal)
- Não partilhe estas credenciais publicamente
- Adicione `.env.local` ao `.gitignore`

---

## 🧪 Passo 4: Verificar Número de Teste

**Com conta gratuita, só pode enviar SMS para números verificados:**

1. No Twilio Console, vá a: **Phone Numbers** → **Manage** → **Verified Caller IDs**
2. Clique em **Add a new Caller ID**
3. Introduza o seu número de telemóvel (formato: `+351xxxxxxxxx`)
4. Receberá um código de verificação por SMS
5. Introduza o código para verificar

---

## ✅ Passo 5: Testar

1. Reinicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

2. Aceda a `/mesa/[numero]`
3. Adicione o seu telemóvel verificado
4. Deve receber um SMS com o código de 6 dígitos!

---

## 💰 Produção (Upgrade para Conta Paga)

Para usar em produção com qualquer número:

1. Vá a: https://console.twilio.com/billing
2. **Upgrade to Paid Account**
3. Adicione método de pagamento
4. Custos aproximados:
   - **Portugal:** ~€0.05 por SMS
   - **Internacional:** varia por país

**Após upgrade:**
- Pode enviar para qualquer número (não precisa verificar)
- Sem limite de 500 SMS
- Pay-as-you-go (paga apenas o que usa)

---

## 🔍 Troubleshooting

### "SMS service not configured"
- Verifique se as 3 variáveis de ambiente estão definidas em `.env.local`
- Reinicie o servidor após adicionar variáveis

### "Failed to send verification SMS"
1. Verifique logs do servidor para erro específico
2. Confirme que o número está no formato internacional (`+351...`)
3. Com conta gratuita, confirme que o número foi verificado no Twilio Console

### "Unverified number"
- Conta gratuita só envia para números verificados
- Adicione o número em **Verified Caller IDs** no Twilio Console

### SMS não chega
1. Verifique Twilio Logs: https://console.twilio.com/monitor/logs/sms
2. Veja se o SMS foi entregue ou houve erro
3. Alguns operadores podem bloquear SMS de números estrangeiros

---

## 📊 Monitorização

**Twilio Console - Monitoring:**
- https://console.twilio.com/monitor/logs/sms
- Veja todos os SMS enviados
- Status de entrega
- Erros detalhados

**Verificar créditos restantes:**
- https://console.twilio.com/billing

---

## 🌍 Formato de Números

| País | Formato | Exemplo |
|------|---------|---------|
| 🇵🇹 Portugal | +351XXXXXXXXX | +351912345678 |
| 🇪🇸 Espanha | +34XXXXXXXXX | +34612345678 |
| 🇬🇧 Reino Unido | +44XXXXXXXXXX | +447911123456 |
| 🇫🇷 França | +33XXXXXXXXX | +33612345678 |
| 🇧🇷 Brasil | +55XXXXXXXXXXX | +5511912345678 |

**SEMPRE use o código do país (+) no início!**

---

## 🔒 Segurança

- ✅ Nunca commit `.env.local` para Git
- ✅ Guarde credenciais em local seguro (1Password, etc.)
- ✅ Em produção, use variáveis de ambiente do servidor (Vercel/Railway)
- ✅ Rate limiting já está implementado (máx 3 SMS por hora por número)
- ✅ Códigos expiram em 15 minutos

---

## 📖 Recursos

- Twilio Docs: https://www.twilio.com/docs/sms
- Pricing: https://www.twilio.com/sms/pricing
- Console: https://console.twilio.com/
- Support: https://support.twilio.com/

---

✅ **Sistema implementado e pronto para uso!**
