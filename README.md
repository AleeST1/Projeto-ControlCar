# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## ControlCar — Firebase Firestore (Segurança)

Este projeto suporta sincronização com Firestore quando `VITE_USE_FIRESTORE=1` e o usuário está autenticado.

Para proteger os dados por usuário, aplique as regras do arquivo `firestore.rules` (incluído na raiz do repositório) no seu projeto Firebase:

1. Acesse Firebase Console → Firestore Database → Rules.
2. Substitua as regras pelo conteúdo de `firestore.rules` deste repositório.
3. Publique as regras.

As regras:
- Permitem leitura/escrita apenas do proprietário (`userId == uid`).
- Impedem atualizar o `userId` de um documento para outro usuário.
- Exigem que `fuelings` e `reminders` referenciem um `vehicleId` que pertence ao mesmo usuário.

Observações:
- Em modo offline (`isFirebaseConfigured=false`), Firestore não é utilizado.
- Certifique-se de configurar as variáveis `.env` (prefixo `VITE_FIREBASE_...`) e `VITE_USE_FIRESTORE=1` para ativar a sincronização.

## ControlCar — Notificações (Firebase Cloud Messaging)

Este projeto inclui suporte a notificações push via Firebase Cloud Messaging (FCM) para avisar sobre manutenções próximas ou vencidas.

### 1) Variáveis de ambiente (.env)
Crie um arquivo `.env` na raiz com os valores do seu projeto Firebase. Use o `.env.example` como referência e ajuste:

- `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`
- `VITE_USE_FIRESTORE=1`
- `VITE_FIREBASE_VAPID_KEY` (obrigatório para Web Push)

Como obter o VAPID (Public key):
1. Firebase Console → Project Settings → Cloud Messaging.
2. Em "Web configuration" ou "Key pair (VAPID)", copie a "Public key" e coloque em `VITE_FIREBASE_VAPID_KEY`.

### 2) Service Worker do FCM
O arquivo `firebase-messaging-sw.js` está disponível em:
- `public/firebase-messaging-sw.js` (ambiente de desenvolvimento com Vite)
- `dist/firebase-messaging-sw.js` (gerado no build a partir de `public/` para Firebase Hosting)

O app registra um Service Worker dedicado para FCM com escopo `/firebase-cloud-messaging-push-scope` para evitar conflito com o SW do PWA.

### 3) Ativar notificações no app
1. Inicie o app (`npm run dev`) e faça login.
2. Acesse a página "Manutenções".
3. Clique em "Ativar" para permitir notificações. O app:
   - Solicita permissão do navegador.
   - Obtém o token FCM usando o VAPID key.
   - Salva o token em `Firestore/notificationTokens` com seu `userId`.

### 4) Envio de notificações automático (Plano grátis)
No plano grátis do Firebase (Spark), o agendamento nativo de Cloud Functions não está disponível. Para manter tudo grátis, há duas opções:

#### Opção A — GitHub Actions rodando o script local (recomendado)
Este repositório inclui um workflow em `.github/workflows/send-reminders-script.yml` que roda diariamente o script `functions/sendReminders.js` usando uma Service Account.

Passos:
1. Gere uma chave de serviço no Firebase Console:
   - Project Settings → Service accounts → Generate new private key
   - Copie o conteúdo JSON com segurança.
2. No repositório do GitHub, crie o segredo `FIREBASE_SERVICE_ACCOUNT_JSON` e cole o JSON completo.
3. (Opcional) Ajuste o horário no cron do workflow. Por padrão roda às 08:00 (America/Sao_Paulo).
4. Para rodar manualmente ou alterar os “X dias”, use `Run workflow` e informe `daysBefore`.

O workflow instalará dependências em `functions/` e executará `node functions/sendReminders.js <daysBefore>` lendo as coleções do Firestore e enviando via FCM.

#### Opção B — Script local (Task Scheduler no Windows)
Use o script que envia notificações via `firebase-admin` sem Functions:

1. No diretório `functions/`, instale dependências: `npm i`
2. Gere uma chave de serviço no Firebase Console:
   - Project Settings → Service accounts → Generate new private key
   - Guarde o conteúdo JSON com segurança
3. Execute o job manualmente:
   - Opção A (arquivo): salve a chave em `functions/service-account.json` e execute:
     - Windows PowerShell: `setx GOOGLE_APPLICATION_CREDENTIALS "%CD%\\functions\\service-account.json"`
     - Em seguida: `npm run send-reminders` (dentro de `functions/`)
   - Opção B (variável): defina `FIREBASE_SERVICE_ACCOUNT_JSON` com o conteúdo JSON (cuidado com limites de tamanho do Windows) e rode `npm run send-reminders`
4. Para executar diariamente sem custo:
   - Windows: agende no "Agendador de Tarefas" chamando `npm run send-reminders` em `functions/`

Observações:
- O script lê `notificationTokens`, `vehicles` e `maintenances` no Firestore e envia push via FCM para cada usuário com manutenção próxima/atrasada.
- Não exponha sua chave de serviço no cliente ou em repositórios públicos.
- Você também pode enviar mensagens manuais pelo Firebase Console → Cloud Messaging.

### 5) Dicas de resolução de problemas
- Se `enableNotifications` falhar, verifique se o `VITE_FIREBASE_VAPID_KEY` está definido corretamente.
- Se já houver um SW (PWA) controlando a página, o FCM usa um SW dedicado com escopo próprio para evitar conflito.
- Tokens são persistidos em `Firestore/notificationTokens`; confirme que a coleção existe e que as regras permitem escrita pelo usuário autenticado.
- Verifique o suporte do navegador: Notificações e Push precisam estar habilitados (no Chrome/Edge em Windows).
- Antecedência (X dias): por padrão é 7 dias. Você pode configurar:
  - Via variável de ambiente `REMINDER_DAYS_BEFORE` (para o script local)
  - Via parâmetro no workflow (`daysBefore`) ou argumento CLI do script
  - Editando o código nos arquivos `functions/index.js` e `functions/sendReminders.js`

#### Opção C — Functions HTTP (requer plano Blaze)
Se optar por Cloud Functions com endpoint HTTP (`sendReminderNotificationsNow`), será necessário usar o plano Blaze. Nesse caso, você pode manter o workflow `.github/workflows/send-reminders.yml` para chamar a função diariamente.
