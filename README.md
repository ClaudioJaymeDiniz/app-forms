# Reports App

Um aplicativo React Native com Expo para criação, gerenciamento e preenchimento de relatórios com suporte offline e sincronização automática.

## 📱 Funcionalidades

### Autenticação
- Login com email/senha
- Integração com Google e Microsoft (simulada)
- Registro de novos usuários
- Gerenciamento seguro de sessões

### Gerenciamento de Projetos
- Criação de projetos personalizados
- Configuração de cores e identidade visual
- Organização de relatórios por projeto

### Criação de Relatórios
- Campos personalizáveis (texto, textarea, checkbox, select, arquivo, imagem)
- Definição de permissões de acesso
- Configuração de campos obrigatórios
- Status de relatórios (rascunho, ativo, arquivado)

### Preenchimento de Relatórios
- Interface intuitiva para preenchimento
- Salvamento automático a cada 30 segundos
- Modo offline com sincronização posterior
- Validação de campos obrigatórios

### Dashboard e Análise
- Painel com estatísticas e métricas
- Visualização de relatórios recentes
- Filtros avançados por período, status e responsável
- Indicadores de status de conectividade

### Funcionalidades Offline
- Armazenamento local com SQLite
- Sincronização automática quando online
- Fila de sincronização para dados pendentes
- Indicador de status de sincronização

## 🛠️ Tecnologias Utilizadas

- **React Native** - Framework para desenvolvimento mobile
- **Expo** - Plataforma de desenvolvimento e build
- **SQLite** - Banco de dados local
- **React Navigation** - Navegação entre telas
- **React Native Paper** - Componentes de UI Material Design
- **TypeScript** - Tipagem estática
- **Expo SecureStore** - Armazenamento seguro de dados sensíveis

## 📦 Instalação e Configuração

### Pré-requisitos
- Node.js 18+ 
- npm ou yarn
- Expo CLI

### Passos para instalação

1. **Clone o repositório**
```bash
git clone <repository-url>
cd ReportsApp
```

2. **Instale as dependências**
```bash
npm install
```

3. **Execute o aplicativo**

Para desenvolvimento web:
```bash
npm run web
```

Para Android:
```bash
npm run android
```

Para iOS:
```bash
npm run ios
```

## 📱 Como usar

### Primeiro acesso
1. Execute o aplicativo
2. Crie uma conta ou faça login
3. Crie seu primeiro projeto
4. Configure um relatório com os campos necessários
5. Comece a preencher relatórios

### Criando um projeto
1. Acesse a aba "Projetos"
2. Toque no botão "+" ou "Novo Projeto"
3. Preencha nome, descrição e cores personalizadas
4. Salve o projeto

### Criando um relatório
1. Acesse "Novo Relatório" no dashboard ou projetos
2. Selecione o projeto
3. Configure título e descrição
4. Adicione campos usando o botão "+"
5. Configure cada campo (rótulo, tipo, obrigatório)
6. Salve o relatório

### Preenchendo relatórios
1. Acesse a aba "Relatórios"
2. Selecione um relatório ativo
3. Toque em "Preencher"
4. Complete os campos necessários
5. Salve como rascunho ou envie

## 🗄️ Estrutura do Banco de Dados

O aplicativo utiliza SQLite com as seguintes tabelas principais:

- **users** - Dados dos usuários
- **projects** - Projetos e configurações
- **reports** - Definições de relatórios
- **report_submissions** - Dados preenchidos pelos usuários
- **report_versions** - Histórico de versões
- **notifications** - Notificações do sistema
- **sync_queue** - Fila de sincronização offline

## 🔄 Sincronização Offline

O aplicativo funciona completamente offline e sincroniza automaticamente quando a conexão é restaurada:

1. **Detecção de conectividade** - Monitora status da rede
2. **Armazenamento local** - Todos os dados ficam no SQLite
3. **Fila de sincronização** - Operações pendentes são enfileiradas
4. **Sincronização automática** - Executa a cada 30 segundos quando online
5. **Tratamento de erros** - Retry automático com limite de tentativas

## 🎨 Personalização

### Cores do projeto
Cada projeto pode ter suas próprias cores:
- Cor primária (padrão: #2196F3)
- Cor secundária (padrão: #FFC107)

### Tipos de campos disponíveis
- **Texto** - Campo de texto simples
- **Texto longo** - Área de texto multilinha
- **Checkbox** - Caixa de seleção
- **Lista suspensa** - Menu dropdown com opções
- **Arquivo** - Upload de arquivos
- **Imagem** - Upload de imagens

## 🔐 Segurança

- Autenticação com tokens JWT (simulado)
- Armazenamento seguro de credenciais com Expo SecureStore
- Criptografia de dados sensíveis
- Validação de permissões por usuário

## 📊 Métricas e Analytics

O dashboard apresenta:
- Total de relatórios criados
- Relatórios pendentes de preenchimento
- Relatórios concluídos
- Número de projetos ativos

## 🚀 Próximas Funcionalidades

- [ ] Exportação para PDF e Excel
- [ ] Gráficos e relatórios analíticos
- [ ] Notificações push
- [ ] Colaboração em tempo real
- [ ] Integração com APIs externas
- [ ] Backup automático na nuvem
- [ ] Assinatura digital de relatórios

## 🐛 Solução de Problemas

### Problemas comuns

**Erro de inicialização do banco**
- Verifique se o SQLite está disponível
- Limpe o cache: `expo r -c`

**Problemas de sincronização**
- Verifique a conexão de internet
- Force sincronização manual no perfil

**Erro de compilação TypeScript**
- Execute: `npm install typescript @types/react`

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

## 👥 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📞 Suporte

Para suporte técnico ou dúvidas:
- Email: suporte@reportsapp.com
- Issues: GitHub Issues
- Documentação: Wiki do projeto

---

Desenvolvido com ❤️ usando React Native e Expo

