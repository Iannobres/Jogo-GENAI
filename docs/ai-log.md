# Registro de uso de IA no desenvolvimento

O CASO 404 foi construído quase inteiramente com IA generativa. Este registro documenta o que cada ferramenta produziu e onde houve intervenção humana. Ele serve de evidência para a avaliação do CP4.

## Ferramentas

| Ferramenta | Papel | Quando |
|---|---|---|
| **Claude (Anthropic), via API** | Gera as falas dos suspeitos no interrogatório | Em tempo real, durante a partida |
| **Bing Image Creator (DALL·E 3)** | Retratos, cenas e closes de evidência | Offline, na produção dos assets |
| **Claude Code (Anthropic)** | Roteiro do caso, código do jogo, testes e documentação | Desenvolvimento |

## O que foi gerado por IA

| Entrega | Gerado por | Revisão humana |
|---|---|---|
| Documento de concepção (CP4) | Grupo, com apoio de IA | Grupo |
| Roteiro do caso (`case.json`): suspeitos, fatos, mentiras, contradições, falas roteirizadas | Claude Code, a partir da premissa do CP4 | Grupo (coerência da solução) |
| Código do servidor (Case Engine, validador, integração com o Claude) | Claude Code | Grupo |
| Código do client (telas, HUD, quadro, interrogatório) | Claude Code | Grupo |
| Testes automatizados (`server/test`) | Claude Code | — |
| Prompts de imagem ([prompts-imagens.md](prompts-imagens.md)) | Claude Code | Grupo |
| Imagens (retratos, cenas, evidências) | Bing Image Creator | Grupo (curadoria das variações) |
| Diálogo durante o jogo | Claude API | Validado automaticamente pelo servidor |

## Decisões de arquitetura para conter a IA

Seguem a seção 5 do CP4 ("o backend é a fonte da verdade"):

1. **Plano determinístico, texto gerativo.** O servidor decide o tema da pergunta, a declaração que o suspeito faz, se houve contradição, o estado emocional e os fatos liberados. O Claude só redige a fala a partir desse plano.
2. **Verdade injetada em todo turno.** A ficha do suspeito (o que ele sabe e o que pode mentir) vai no system prompt em toda chamada; não depende da memória da conversa.
3. **Validação antes de exibir.** Toda fala passa por [`validator.ts`](../server/src/dialogue/validator.ts), que rejeita confissão, nomes inexistentes, horários fora do roteiro e textos longos demais. Se a fala for rejeitada, o modelo tenta mais uma vez recebendo o motivo; se falhar de novo, entra a fala roteirizada.
4. **Perguntas fora do caso** (nomes que não existem) recebem resposta controlada pelo backend, sem chamar o modelo.
5. **Custo e latência:** limite de 15 perguntas por suspeito, cache de perguntas repetidas, `effort: low`, prompt caching no system prompt e indicador "pensando..." na interface.
6. **Modo Mock:** sem chave de API, o jogo roda inteiro com as falas roteirizadas. Esse modo também é o fallback em caso de erro da API.

## Registro de sessões

| Data | Sessão | Resultado |
|---|---|---|
| 24/09/2026 | Claude Code: plano de implementação a partir do PDF do CP4 | Plano aprovado (MVP enxuto, Mock + Claude, imagens via Bing) |
| 24/09/2026 | Claude Code: implementação completa do MVP | Jogo jogável de ponta a ponta, 21 testes automatizados, 2 imagens do CP4 integradas |
