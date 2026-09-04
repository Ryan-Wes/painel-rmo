# Histórico — Painel RMO

## 2026-09-03 — Ideia e primeira tentativa (Claude Artifact)

Problema: na Elecnor, o número de requisição de mão de obra (RMO) fica numa
folha impressa colada na parede do planejamento. Para pegar um número novo,
a pessoa precisa perguntar no planejamento e alguém risca o número a mão.
Processo manual, exige presença física, sem histórico de quem pegou o quê.

Primeira versão foi feita como um Claude Artifact (HTML publicado com banco
de dados embutido da própria plataforma). Funcionava, mas o banco desse tipo
de página só sincroniza entre pessoas logadas na mesma organização Claude —
não dava para compartilhar o link livremente com qualquer colega.

## 2026-09-04 — Reescrita para GitHub Pages + Firebase

Decisão: reescrever como site estático hospedado no GitHub Pages (link
compartilhável com qualquer pessoa, sem depender de conta Claude), usando
Firestore (Firebase) como banco compartilhado em tempo real.

- Faixa de números: 130–349 (220 números), mesma ordem da folha original,
  10 colunas.
- Reserva usa transação do Firestore (`runTransaction`) para evitar que duas
  pessoas peguem o mesmo número ao mesmo tempo — só cria o documento se ele
  ainda não existir.
- "Pegar próximo número disponível": pega o menor número livre; se alguém
  pegar no mesmo instante, tenta automaticamente o próximo (até 8 tentativas).
- Liberar um número (engano) apaga o documento — ele volta a aparecer como
  disponível.
- Regras do Firestore (ver README) permitem leitura livre, criação só com os
  campos `takenBy`/`takenAt` válidos, e bloqueiam updates — mantém o banco
  simples sem exigir login dos usuários.
- Design: paleta "papel + carimbo industrial" (creme + ferrugem/laranja),
  tipografia Archivo (títulos) + Public Sans (texto) + IBM Plex Mono (números
  da grade, tabular), remetendo à folha impressa original.

Pendente: usuário ainda precisa criar o projeto Firebase, colar as
credenciais em `firebase-config.js`, e publicar o repositório no GitHub
(comandos completos no README).

## 2026-09-04 — Renomeado para "Painel RMO"

Nome do projeto era "Quadro MDO". Usuário confirmou que o termo usado na
Elecnor é **RMO (Requisição de Mão de Obra)**, não "solicitação"/MDO.
Renomeado o projeto e a pasta (`quadro-mdo` → `painel-rmo`), e ajustados os
textos da interface ("solicitação" → "requisição") para usar o vocabulário
correto do time.
