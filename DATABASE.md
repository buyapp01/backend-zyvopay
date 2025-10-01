# 📊 ZyvoPay - Documentação do Banco de Dados

> **Guia executivo para entender a estrutura de dados da plataforma ZyvoPay**

## 🎯 Visão Geral

O banco de dados do ZyvoPay é o coração da plataforma, responsável por gerenciar todas as operações financeiras, contas, transações e garantir conformidade regulatória. Ele foi projetado para ser seguro, escalável e totalmente auditável.

### Números da Plataforma
- **30 Tabelas** organizadas por módulos funcionais
- **57 Funções Programadas (RPCs)** para lógica de negócio
- **17 Funções Serverless** para processamento assíncrono
- **5 Webhooks Automáticos** para notificações em tempo real
- **4 Tarefas Agendadas** para processamento periódico

---

## 🏗️ Estrutura Principal

### 1. **Gestão de Clientes e Usuários**

#### Clientes (`clients`)
Representa as **empresas que usam o ZyvoPay** (como Sabor Aí, Bayep, etc.)

**O que armazena:**
- Dados cadastrais da empresa (nome, CNPJ, email, telefone)
- Status da conta (ativo, suspenso, bloqueado)
- Limites de transação e taxas personalizadas
- URL e segredo para receber webhooks
- Integração com Celcoin

**Funcionalidades:**
- Cadastro e validação de empresas
- Configuração de taxas e limites
- Gerenciamento de webhook URLs
- Controle de status (ativo/inativo)

#### Usuários (`users`)
Representa os **usuários administrativos** que gerenciam a plataforma

**O que armazena:**
- Informações pessoais (nome, email, telefone, documento)
- Avatar e preferências
- Integração com sistema de autenticação Supabase

#### Chaves de API (`api_keys`)
**Credenciais de acesso** para integração programática

**O que armazena:**
- Nome da chave (identificação)
- Hash criptográfico da chave
- Escopos de permissão (read, write)
- Status (ativa/inativa)
- Data de expiração
- Último uso

**Funcionalidades:**
- Geração de chaves únicas e seguras
- Controle de permissões granular
- Rastreamento de uso
- Renovação e revogação

---

### 2. **Contas e Saldos**

#### Subcontas (`subaccounts`)
Representa as **contas bancárias dos usuários finais** (restaurantes, comerciantes)

**O que armazena:**
- Tipo de conta (Pessoa Física ou Jurídica)
- Dados do proprietário (nome, documento, email, telefone)
- Status KYC (validação de identidade)
- **Saldo em centavos** (evita problemas de arredondamento)
- **Saldo bloqueado** (reservado para transações pendentes)
- Limites diários (PIX e TED)
- Dados da conta Celcoin (ID, agência, conta)

**Funcionalidades:**
- Criação de contas PF/PJ
- Validação KYC/KYB
- Gestão de saldo em tempo real
- Bloqueio e desbloqueio de valores
- Aplicação de limites diários

#### Histórico de Saldo (`balance_history`)
**Auditoria completa** de todas as mudanças de saldo

**O que registra:**
- Snapshot de saldo em cada momento
- Saldo total vs saldo bloqueado
- Transação que causou a mudança
- Motivo da alteração
- Timestamp preciso

#### Snapshots Diários (`balance_snapshots`)
**Fotos diárias** do saldo para reconciliação

**O que armazena:**
- Saldo final do dia
- Total de créditos e débitos
- Quantidade de transações
- Data do snapshot

---

### 3. **Transações Financeiras**

#### Transações (`transactions`)
O **registro central** de todas as operações financeiras

**Tipos de transação:**
- 💰 **PIX Payment** - Pagamento PIX enviado
- 💵 **PIX Receipt** - Recebimento PIX
- 🏦 **TED** - Transferência bancária
- 🔄 **Internal Transfer** - Transferência entre subcontas
- 💸 **Fee** - Cobrança de taxa
- ↩️ **Chargeback** - Estorno
- 🔙 **Refund** - Reembolso

**Status possíveis:**
- ⏳ Pending - Aguardando
- ⚙️ Processing - Processando
- ✅ Completed - Concluída
- ❌ Failed - Falhou
- 🚫 Cancelled - Cancelada
- ↪️ Reversed - Revertida

**Informações armazenadas:**
- Valor em centavos
- Conta de débito e crédito
- Cliente responsável
- Dados específicos (chave PIX, dados bancários TED)
- ID da transação na Celcoin
- Descrição e metadados
- Taxa cobrada
- Timestamps de cada etapa
- Motivo de falha (se aplicável)

#### Webhooks de Transação (`transaction_webhooks`)
**Notificações recebidas** da Celcoin sobre transações

**O que armazena:**
- Tipo de evento
- Payload completo
- Status de processamento
- Timestamp de recebimento

#### Entregas de Webhook (`webhook_deliveries`)
**Notificações enviadas** para os clientes

**O que gerencia:**
- URL de destino
- Payload da notificação
- Assinatura HMAC para segurança
- Tentativas de entrega (até 5x)
- Resposta do cliente
- Status (pending, delivered, failed, retrying)
- Próximo retry com backoff exponencial

---

### 4. **PIX - Sistema de Pagamentos Instantâneos**

#### Chaves PIX (`pix_keys`)
**Registro de chaves PIX** das subcontas

**Tipos de chave:**
- 📱 CPF
- 🏢 CNPJ
- 📧 Email
- 📞 Telefone
- 🔑 EVP (chave aleatória)

**Funcionalidades:**
- Registro e validação de chaves
- Definição de chave padrão
- Ativação/desativação
- Sincronização com Celcoin

#### QR Codes PIX (`pix_qr_codes`)
**Geração de QR codes** para recebimento

**Tipos:**
- **Estático** - Valor fixo ou aberto, uso ilimitado
- **Dinâmico** - Valor específico, uso único ou limitado

**Funcionalidades:**
- Geração de código EMV
- Imagem do QR code em base64
- Controle de expiração
- Limite de usos
- Rastreamento de utilização

#### Cobranças PIX (`pix_charge_requests`)
**Cobranças com vencimento** e juros/multa

**O que gerencia:**
- Valor da cobrança
- Data de vencimento
- Dados do pagador
- Multa percentual
- Juros diários
- Desconto até data
- QR code associado
- Status de pagamento

---

### 5. **Transferências Programadas**

#### Agendamentos (`scheduled_transfers`)
**Transferências futuras** com data programada

**Funcionalidades:**
- Agendamento de PIX ou TED
- Data e hora específicas
- Execução automática via cron
- Registro de sucesso ou falha
- Metadados customizados

**Status:**
- Scheduled - Agendado
- Executed - Executado
- Failed - Falhou
- Cancelled - Cancelado

#### Recorrências (`recurring_payments`)
**Pagamentos automáticos** periódicos

**Frequências:**
- Diária
- Semanal
- Mensal
- Anual

**O que gerencia:**
- Chave PIX de destino
- Valor fixo
- Data de início e fim
- Próxima execução
- Contador de execuções
- Última transação gerada
- Ativação/desativação

---

### 6. **Split de Pagamentos (Marketplace)**

#### Regras de Split (`split_rules`)
**Configuração de divisão** de pagamentos

**O que define:**
- Nome da regra
- Lista de destinatários com:
  - Subconta destino
  - Percentual ou valor fixo
  - Ordem de execução
- Validação (total = 100% ou não)
- Status ativo/inativo

**Exemplo de uso:**
```
Transação de R$ 100:
- Restaurante: 95% (R$ 95,00)
- Plataforma: 5% (R$ 5,00)
```

#### Transações Split (`split_transactions`)
**Execução individual** de cada split

**O que registra:**
- Transação original
- Regra aplicada
- Subconta destino
- Valor ou percentual
- Transação destino criada
- Status da execução

---

### 7. **Conformidade e Segurança**

#### Documentos KYC/KYB (`kyc_documents`)
**Validação de identidade** (KYC = Know Your Customer)

**Tipos de documento:**
- RG, CNH, Passaporte
- Selfie
- Comprovante de endereço
- Contrato social (PJ)
- Cartão CNPJ
- Extrato bancário

**Fluxo:**
- Upload → Pending Review
- Análise → Approved ou Rejected
- Motivo de rejeição (se aplicável)
- Expiração automática

#### Verificações de Compliance (`compliance_checks`)
**Verificações regulatórias** obrigatórias

**Tipos de verificação:**
- **AML** - Anti-Money Laundering (lavagem de dinheiro)
- **PEP** - Pessoa Politicamente Exposta
- **OFAC** - Lista de sanções EUA
- **Sanctions List** - Listas internacionais
- **Watchlist** - Listas de vigilância
- **Fraud Score** - Pontuação de fraude

**Resultados:**
- Clear - Liberado
- Warning - Atenção
- Hit - Encontrado em lista
- Manual Review - Requer revisão manual

#### Relatórios de Atividade Suspeita (`suspicious_activity_reports`)
**SAR - Suspicious Activity Reports** para COAF

**O que registra:**
- Tipo de suspeita
- Nível de risco
- Transações relacionadas
- Regras de detecção
- Relatório ao COAF
- Resolução

#### Entidades Bloqueadas (`blocked_entities`)
**Lista negra** de CPF, CNPJ, email, telefone, IP

**Funcionalidades:**
- Bloqueio preventivo
- Diferentes níveis de severidade
- Expiração automática
- Notas e justificativas
- Rastreamento de quem bloqueou

#### Monitoramento de Velocidade (`velocity_checks`)
**Detecção de padrões suspeitos** de uso

**O que monitora:**
- Quantidade de transações em período
- Volume financeiro
- Limites excedidos
- Ações tomadas automaticamente

---

### 8. **Disputas e Reembolsos**

#### Disputas (`disputes`)
**Gestão de contestações** e chargebacks

**Status:**
- Opened - Aberta
- Under Review - Em análise
- Evidence Provided - Evidência fornecida
- Won - Ganha
- Lost - Perdida
- Closed - Fechada

**O que gerencia:**
- Transação contestada
- Tipo de disputa
- Reclamação do cliente
- Prazos de evidência
- Valor em disputa
- Resolução e notas

#### Solicitações de Reembolso (`refund_requests`)
**Processo de aprovação** de estornos

**Fluxo:**
1. Solicitação com motivo
2. Revisão por aprovador
3. Aprovação ou rejeição
4. Criação de transação de estorno
5. Notificação

---

### 9. **Auditoria e Logs**

#### Logs de Auditoria (`audit_logs`)
**Registro de todas as ações** administrativas

**O que rastreia:**
- Quem fez (usuário)
- O que fez (ação)
- Quando fez (timestamp)
- Em qual entidade
- Valores antigos e novos
- IP e User Agent
- Metadados adicionais

#### Logs de Requisições API (`api_request_logs`)
**Rastreamento de todas as chamadas** à API

**O que registra:**
- Chave API usada
- Cliente responsável
- Método e endpoint
- Status da resposta
- Request e response body
- Duração em ms
- IP e User Agent

#### Reconciliação Bancária (`bank_reconciliation`)
**Validação com extratos** da Celcoin

**O que compara:**
- Saldo ZyvoPay vs Celcoin
- Diferenças encontradas
- Transações faltantes
- Transações extras
- Status de reconciliação
- Notas de ajuste

---

### 10. **Notificações e Comunicação**

#### Fila de Notificações (`notification_queue`)
**Sistema de envio** de comunicações

**Canais:**
- 📧 Email (via Resend)
- 📱 SMS (via Twilio)
- 🔔 Push (via FCM)
- 🔗 Webhook

**Prioridades:**
- Low - Baixa
- Normal - Normal
- High - Alta
- Critical - Crítica

**Funcionalidades:**
- Templates customizáveis
- Variáveis dinâmicas
- Retry automático (até 3x)
- Rastreamento de abertura e clique

---

### 11. **Documentos e Backups**

#### Documentos (`documents`)
**Armazenamento de arquivos** diversos

**O que gerencia:**
- Tipo de documento
- Nome e caminho do arquivo
- Tamanho em bytes
- MIME type
- Bucket de storage
- Status de revisão
- Metadados customizados

#### Backups de Transações (`transaction_backups`)
**Backups semanais** automáticos

**O que armazena:**
- Tipo de backup (weekly)
- Data do backup
- Caminho do arquivo no Storage
- Formato (JSON)
- Quantidade de transações
- Range de datas
- Status e erros

**Automação:**
- Execução toda segunda-feira às 02:00
- Últimos 7 dias de transações
- Limpeza automática após 90 dias
- Notificação por email

---

### 12. **Métricas e Relatórios**

#### Resumos Diários (`daily_summaries`)
**Métricas pré-calculadas** para performance

**O que agrega:**
- Total de transações
- Volume financeiro total
- Total de taxas
- Quantidade por tipo (PIX, TED)
- Valor por tipo
- Transações bem-sucedidas vs falhas
- Saldo de abertura e fechamento

**Benefício:** Consultas rápidas sem processar milhões de registros

---

## 🤖 Automações Inteligentes

### Edge Functions (Funções Serverless)

A plataforma utiliza **17 funções serverless** que executam automaticamente:

#### 🔔 Processadores de Webhook (5 funções)
1. **webhook-delivery-processor** - Entrega webhooks aos clientes com retry inteligente
2. **webhook-transaction-completed** - Processa transações concluídas e executa splits
3. **webhook-transaction-failed** - Reverte bloqueios de saldo em falhas
4. **webhook-pix-received** - Processa PIX recebidos e notifica
5. **webhook-subaccount-created** - Envia boas-vindas em novas contas

#### 🏦 Integração Celcoin (4 funções)
6. **celcoin-create-subaccount** - Cria contas no BaaS Celcoin
7. **celcoin-pix-payment** - Executa pagamentos PIX
8. **celcoin-ted-transfer** - Executa transferências TED
9. **celcoin-webhook-receiver** - Recebe notificações da Celcoin

#### ⏰ Tarefas Agendadas (4 funções)
10. **cron-scheduled-transfers** - Executa agendamentos (a cada minuto)
11. **cron-recurring-payments** - Processa recorrências (a cada hora)
12. **cron-balance-snapshots** - Cria snapshots diários (meia-noite)
13. **cron-weekly-backups** - Gera backups semanais (segunda 02:00)

#### 🛠️ Utilitários (4 funções)
14. **api-middleware-auth** - Valida API keys e rate limiting
15. **upload-document** - Processa upload de documentos
16. **worker-notification-sender** - Envia emails, SMS e push
17. **health-check** - Monitor de saúde do sistema

### Database Webhooks (Gatilhos Automáticos)

O banco de dados dispara **5 webhooks automaticamente** quando eventos ocorrem:

1. **on_transaction_completed** - Quando transação é concluída
2. **on_transaction_failed** - Quando transação falha
3. **on_pix_received** - Quando PIX é recebido
4. **on_subaccount_created** - Quando nova conta é criada
5. **on_webhook_delivery_pending** - Quando webhook precisa ser entregue

### Cron Jobs (Tarefas Agendadas)

**4 cron jobs** executam tarefas periódicas:

1. **Transfers Agendadas** - A cada minuto (`* * * * *`)
2. **Pagamentos Recorrentes** - A cada hora (`0 * * * *`)
3. **Snapshots de Saldo** - Diariamente à meia-noite (`0 0 * * *`)
4. **Backups Semanais** - Segunda-feira às 02:00 (`0 2 * * 1`)

---

## 🔒 Segurança e Criptografia

### Dados Sensíveis Protegidos

**Todos os dados sensíveis são criptografados**, incluindo:
- Webhook secrets dos clientes
- Tokens de integração
- Dados pessoais (PII)
- Documentos KYC/KYB

### Autenticação e Autorização

**3 camadas de segurança:**
1. **API Keys** com hash SHA-256
2. **Escopos de permissão** granulares (read/write)
3. **Rate limiting** (60 req/min por chave)

### Auditoria Completa

**Tudo é registrado:**
- Todas as ações administrativas
- Todas as requisições API
- Todas as mudanças de saldo
- Todas as transações

---

## 📈 Escalabilidade e Performance

### Índices Otimizados

O banco possui **índices estratégicos** em:
- Chaves estrangeiras (FKs)
- Campos de busca frequente
- Campos de data para filtros
- Campos de status

### Particionamento Futuro

Preparado para **particionamento** quando necessário:
- Transações por mês/ano
- Logs por período
- Backups por data

### Cache Inteligente

**Token OAuth2 da Celcoin** em cache para evitar requisições desnecessárias

---

## 🔄 Fluxos de Operação

### Fluxo Completo de Pagamento PIX

```
1. Cliente faz requisição via API
2. API Gateway valida API key
3. Sistema verifica saldo disponível
4. Saldo é bloqueado
5. Edge Function chama Celcoin
6. Celcoin processa pagamento
7. Webhook retorna status
8. Database Webhook dispara
9. Edge Function executa splits
10. Saldo é debitado
11. Webhook é enviado ao cliente
12. Histórico e auditoria são atualizados
```

### Fluxo de Recebimento PIX

```
1. Celcoin recebe PIX
2. Webhook notifica ZyvoPay
3. Database Webhook dispara
4. Edge Function cria transação
5. Saldo é creditado
6. Splits são executados (se configurado)
7. Webhook é enviado ao cliente
8. Notificações são enviadas
```

### Fluxo de Criação de Conta

```
1. Cliente envia dados via API
2. Validações iniciais
3. Edge Function cria conta na Celcoin
4. Registro criado no ZyvoPay
5. Chave PIX EVP gerada automaticamente
6. Database Webhook dispara
7. Email de boas-vindas enviado
8. Status: pending_kyc
9. Aguarda upload de documentos
10. Após aprovação: status → active
```

---

## 📊 Métricas e KPIs

### Dados Disponíveis para Análise

**Financeiro:**
- Volume transacionado por período
- Taxa de sucesso vs falha
- Receita de taxas
- Saldo total gerenciado

**Operacional:**
- Tempo médio de processamento
- Taxa de retry de webhooks
- Uptime das Edge Functions
- Latência de APIs

**Compliance:**
- Contas pendentes de KYC
- Alertas de atividade suspeita
- Hits em listas de sanções
- Disputas abertas

**Usuário:**
- Novas contas por período
- Ativação de contas
- Taxa de churn
- Tickets de suporte

---

## 🎯 Próximas Evoluções

### Em Roadmap

1. **Machine Learning:**
   - Detecção de fraude com IA
   - Previsão de churn
   - Análise de padrões de uso

2. **Novas Funcionalidades:**
   - Boleto bancário
   - Cartão de crédito/débito
   - Pagamentos internacionais
   - Conta digital completa

3. **Melhorias de Performance:**
   - Particionamento de tabelas grandes
   - Cache distribuído (Redis)
   - Índices adicionais baseados em uso real

4. **Analytics Avançado:**
   - Dashboard de métricas em tempo real
   - Relatórios customizáveis
   - Exportação de dados
   - API de Business Intelligence

---

## 📞 Contato Técnico

Para dúvidas sobre a estrutura do banco de dados:
- Email: tech@zyvopay.com
- Documentação API: https://docs.zyvopay.com
- Status da Plataforma: https://status.zyvopay.com

---

**Última atualização:** Outubro 2025
**Versão do Banco:** 1.0.0
**Total de Migrações:** 15
