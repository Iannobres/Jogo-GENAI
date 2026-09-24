import type { DialogueProvider, DialogueRequest, DialogueOutput } from './provider';

/** Devolve a fala roteirizada do caso. Funciona sem chave de API e serve de fallback. */
export const mockProvider: DialogueProvider = {
  name: 'mock',
  async generate(req: DialogueRequest): Promise<DialogueOutput> {
    return { fala: req.reference.text, gesto: req.reference.gesture, emocao: req.emotion };
  },
};
