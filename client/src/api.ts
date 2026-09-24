import type {
  AccusationInput,
  BoardState,
  HealthResponse,
  InspectResponse,
  InterrogateRequest,
  InterrogateResponse,
  LabTest,
  PublicCase,
  SessionView,
} from '@caso404/shared';

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Erro ${res.status}`);
  return data as T;
}

export const api = {
  health: () => call<HealthResponse>('GET', '/health'),
  getCase: () => call<PublicCase>('GET', '/case'),
  newSession: () => call<SessionView>('POST', '/sessions'),
  getSession: (id: string) => call<SessionView>('GET', `/sessions/${id}`),
  moveScene: (id: string, sceneId: string) => call<InspectResponse>('POST', `/sessions/${id}/scene`, { sceneId }),
  inspect: (id: string, hotspotId: string) => call<InspectResponse>('POST', `/sessions/${id}/inspect`, { hotspotId }),
  sendToLab: (id: string, evidenceId: string, test: LabTest) =>
    call<InspectResponse>('POST', `/sessions/${id}/lab`, { evidenceId, test }),
  waitLab: (id: string) => call<InspectResponse>('POST', `/sessions/${id}/wait`),
  interrogate: (id: string, body: InterrogateRequest) =>
    call<InterrogateResponse>('POST', `/sessions/${id}/interrogate`, body),
  saveBoard: (id: string, board: BoardState) => call<SessionView>('PUT', `/sessions/${id}/board`, board),
  accuse: (id: string, acc: AccusationInput) => call<SessionView>('POST', `/sessions/${id}/accuse`, acc),
};
