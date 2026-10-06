# CASO 404

**Uma investigação criminal conduzida por Inteligência Artificial Generativa.**
Checkpoint 4 (IA Generativa e Game Design), disciplina NLP, Chatbots e Agentes Virtuais, FIAP.
Grupo: Gustavo Balbo Saraiva · Ian Nobres · Matheus Mikio.

Um empresário é encontrado morto às 23h40 na Sala 404, com a porta trancada por dentro. O jogador explora a cena, coleta e analisa evidências, interroga cinco suspeitos e monta a linha do tempo antes da acusação final. **As falas dos suspeitos são geradas em tempo real por IA (Gemini ou Claude)**, sempre amarradas à "verdade" do caso, que fica no servidor.

## Como rodar

Requisitos: Node.js 20+.

```bash
npm install
npm run dev
```

Abra http://localhost:5173. O servidor sobe na porta 3404, e o Vite encaminha `/api` para ele.

### Diálogo com IA (opcional)

Sem configuração, o jogo usa o **modo roteirizado** (falas pré-escritas no caso), o que já permite jogar do início ao fim. Para gerar as falas com IA:

```bash
cp .env.example .env
# edite .env e preencha GEMINI_API_KEY (ou ANTHROPIC_API_KEY)
```

Com `GEMINI_API_KEY` o jogo usa o **Gemini** (padrão `gemini-2.5-flash`, troque com `GEMINI_MODEL`). Sem ela, usa o **Claude** se houver `ANTHROPIC_API_KEY` (padrão `claude-opus-5`, troque com `CLAUDE_MODEL`). O menu mostra qual motor está ativo. O `.env` está no `.gitignore`: nunca faça commit da chave.

### Outros comandos

| Comando | O que faz |
|---|---|
| `npm test` | Testes do engine, da validação e de uma partida completa (modo Mock) |
| `npm run test:llm` | Roteiro de consistência contra o LLM real (Gemini ou Claude) (exige chave e gasta créditos) |
| `npm run typecheck` | Checagem de tipos do servidor e do client |
| `npm run build` e depois `npm start` | Build de produção; o servidor passa a entregar o client em http://localhost:3404 |

## Como jogar

1. **Explore:** passe o mouse pela cena; o que pode ser examinado ganha cantos de destaque. Use o Mapa para ir ao corredor e à sala de monitoramento.
2. **Analise:** no Laboratório, peça exames de digitais, DNA ou substâncias. Cada exame leva ~40 min do relógio do caso.
3. **Interrogue:** em Suspeitos, pergunte livremente. Quando um suspeito fizer uma declaração, use **Confrontar contradição** com a evidência que a desmente.
4. **Monte a teoria:** no Quadro, arraste os eventos para os horários certos e ligue evidências a suspeitos.
5. **Acuse:** escolha culpado, motivo, método e até 3 evidências-chave. A nota avalia toda a investigação.

O jogo também tem um tutorial ("Como jogar") no menu, no briefing e no botão de ajuda da cena.

O relógio corre a cada ação, e algumas evidências podem se perder se você demorar.

## Arquitetura

```
case-data/case-001/case.json   ← o caso inteiro (fonte da verdade, com segredos)
shared/                        ← tipos compartilhados server/client
server/  (Express + TS)
  case/        loader com validação zod + publicView (lista branca do que vai ao navegador)
  engine/      estado da sessão, relógio, laboratório, interrogatório determinístico, pontuação, saves
  dialogue/    Mock | Gemini | Claude → validator → fallback
client/  (React + Vite + Tailwind + zustand + dnd-kit)
docs/          roteiro do caso, prompts de imagem, registro de uso de IA
```

**Pipeline do interrogatório:** pergunta → o engine detecta o tema, registra a declaração, decide contradição e emoção → monta o prompt (ficha do suspeito + instrução da jogada + fala de referência) → o LLM (Gemini ou Claude) responde em JSON estruturado → o validador confere (sem confissão, sem nomes ou horários inventados) → exibe. Em caso de falha, cai na fala roteirizada.

O cliente **nunca** recebe o culpado, as mentiras ou as contradições. Um teste garante isso.

## Documentação

- [docs/roteiro-do-caso.md](docs/roteiro-do-caso.md): solução, linha do tempo e suspeitos (**spoiler!**)
- [docs/prompts-imagens.md](docs/prompts-imagens.md): prompts prontos para gerar as imagens no Bing e como posicionar os hotspots
- [docs/ai-log.md](docs/ai-log.md): o que foi feito por IA e como ela é controlada
