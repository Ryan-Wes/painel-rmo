# Painel RMO — Elecnor

Painel web para reservar números de requisição de mão de obra sem depender
da folha impressa na parede do planejamento. Qualquer pessoa com o link
consegue ver os números disponíveis, reservar um e liberar em caso de engano
— tudo sincronizado em tempo real para todo mundo que estiver com a página
aberta.

Site estático (HTML/CSS/JS puro, sem build) hospedado no GitHub Pages, com o
estado compartilhado (quais números já foram usados) guardado no Firestore
(banco de dados gratuito do Firebase).

## 1. Criar o projeto Firebase (uma vez só)

1. Acesse https://console.firebase.google.com e faça login com uma conta
   Google.
2. **Adicionar projeto** → dê um nome (ex.: `painel-rmo-elecnor`) → pode
   desativar o Google Analytics → **Criar projeto**.
3. No menu lateral, vá em **Compilação → Firestore Database** → **Criar
   banco de dados** → escolha uma região próxima (ex. `southamerica-east1`)
   → inicie em **modo de produção**.
4. Na aba **Regras** do Firestore, apague o conteúdo e cole:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /requests/{numero} {
         allow read: if true;
         allow create: if request.resource.data.keys().hasOnly(['takenBy', 'takenAt'])
                       && request.resource.data.takenBy is string
                       && request.resource.data.takenBy.size() > 0
                       && request.resource.data.takenBy.size() < 80;
         allow update: if false;
         allow delete: if true;
       }
     }
   }
   ```

   Isso deixa todo mundo ler e reservar números, mas impede escrever campos
   estranhos no banco. **Publicar**.

5. Volte para a **Visão geral do projeto** (ícone de casa) → clique no
   ícone **`</>`** (Web) para registrar um app → dê um apelido (ex.
   `painel-rmo`) → **Registrar app**.
6. Vai aparecer um bloco `firebaseConfig = { apiKey: "...", ... }`. Copie
   esses valores para o arquivo [`firebase-config.js`](firebase-config.js)
   deste projeto, substituindo os campos `COLE_AQUI` / `SEU-PROJETO`.

   > Esses valores não são senha — são feitos para ficar visíveis no código
   > do site. Quem protege os dados são as regras do passo 4.

## 2. Publicar no GitHub Pages

Depois de editar o `firebase-config.js` com suas credenciais reais:

```bash
cd "C:\Users\WRyan\Desktop\PERSONAL\DEV\Projetos\painel-rmo"
git init
git add .
git commit -m "Painel RMO: painel de requisição de mão de obra"
```

Crie um repositório vazio no GitHub (github.com → **New repository**, sem
README/gitignore) chamado por exemplo `painel-rmo`, depois:

```bash
git remote add origin https://github.com/SEU-USUARIO/painel-rmo.git
git branch -M main
git push -u origin main
```

No GitHub: **Settings → Pages → Source: Deploy from a branch → Branch:
`main` / `(root)` → Save**. Em alguns minutos o site fica disponível em
`https://SEU-USUARIO.github.io/painel-rmo/` — esse é o link que você
compartilha com quem precisar reservar um número.

## Como funciona no dia a dia

- **Pegar próximo número disponível**: pega o menor número livre
  automaticamente.
- Clicar num número específico da grade também abre o mesmo formulário
  (nome + confirmar).
- Um número reservado aparece cinza/riscado para todo mundo, em tempo real.
- Passar o mouse num número reservado mostra quem pegou; clicar nele permite
  **liberar** (em caso de engano), devolvendo à lista.
- Faixa fixa: 130–349 (a mesma da folha impressa original).

## Estrutura

- `index.html` — estrutura da página.
- `styles.css` — visual.
- `app.js` — lógica (grade, reserva, liberação, tempo real).
- `firebase-config.js` — suas credenciais do Firebase (edite este arquivo).

Veja [`HISTORICO.md`](HISTORICO.md) para o histórico de decisões e mudanças
do projeto.
