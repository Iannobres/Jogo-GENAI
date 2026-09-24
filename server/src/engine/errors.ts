/** Erro de regra de jogo: vira resposta HTTP com o status indicado. */
export class GameError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}
