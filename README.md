# 🚀 Nyvlo Omnichannel - Plataforma de Automação para WhatsApp

Plataforma completa para automação de atendimento via WhatsApp com painel administrativo avançado.

## 📋 Funcionalidades

- ✅ Menu interativo com navegação por números
- ✅ Informações detalhadas sobre cursos
- ✅ Agendamento de visitas com lembretes automáticos
- ✅ Pré-matrícula completa pelo WhatsApp
- ✅ FAQ com perguntas frequentes
- ✅ Transferência para atendente humano
- ✅ Envio e recebimento de documentos
- ✅ Painel administrativo web
- ✅ Backup automático de dados

## 🚀 Instalação

### Pré-requisitos

- Node.js 18+
- npm ou yarn

### Passos

1. Clone o repositório e instale as dependências:

```bash
npm install
```

2. Crie um administrador para o painel:

```bash
npx ts-node scripts/create-admin.ts
```

3. Compile o projeto:

```bash
npm run build
```

4. Inicie o bot:

```bash
npm start
```

5. Escaneie o QR Code com seu WhatsApp

## ⚙️ Configuração

Edite o arquivo `config/bot-config.json` para personalizar:

- Informações da empresa
- Horário de funcionamento
- Mensagens do bot
- Cursos disponíveis
- Perguntas frequentes

### Exemplo de configuração:

```json
{
  "company": {
    "name": "Modus Centro de Formação de Vigilantes",
    "address": "Rua Exemplo, 123",
    "phone": "(00) 0000-0000"
  },
  "businessHours": {
    "weekdays": { "start": "08:00", "end": "18:00" },
    "saturday": { "start": "08:00", "end": "12:00" }
  }
}
```

## 🖥️ Painel Administrativo

Acesse `http://localhost:5173` após iniciar o bot.

Funcionalidades:
- Dashboard com métricas
- Visualização de conversas
- Gerenciamento de agendamentos
- Acompanhamento de matrículas
- Exportação de relatórios (CSV)
- Backup do banco de dados

## 📁 Estrutura do Projeto

```
├── src/
│   ├── adapters/       # Conexão com WhatsApp (Baileys)
│   ├── admin/          # Painel administrativo
│   ├── config/         # Carregamento de configuração
│   ├── core/           # State machine e message handler
│   ├── services/       # Serviços de negócio
│   ├── types/          # Definições TypeScript
│   └── utils/          # Utilitários (validadores)
├── tests/
│   ├── unit/           # Testes unitários
│   └── property/       # Testes de propriedade
├── config/             # Arquivos de configuração
├── data/               # Banco de dados SQLite
├── logs/               # Arquivos de log
└── uploads/            # Documentos enviados
```

## 🧪 Testes

```bash
# Rodar todos os testes
npm test

# Rodar com cobertura
npm run test:coverage
```

## 📝 Comandos do Bot

| Comando | Ação |
|---------|------|
| `menu` ou `0` | Voltar ao menu principal |
| `1-6` | Selecionar opção do menu |
| `voltar` | Voltar ao menu anterior |

## 🔒 Segurança

- Senhas armazenadas com bcrypt
- Autenticação JWT no painel admin
- Validação de CPF com algoritmo oficial
- Logs de todas as operações

## 📄 Licença

ISC
