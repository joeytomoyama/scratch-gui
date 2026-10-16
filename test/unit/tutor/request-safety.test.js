import {createPrivateAPI} from '../../../src/lib/private-project-api';

let api; let account; let fetcher;
beforeEach(() => {
    account = {getState: () => ({user: {id: 'u'}}), getAccessToken: jest.fn(async () => 'fresh')};
    fetcher = jest.fn(async () => ({ok: true, status: 200, json: async () => ({revision: 1, missingAssets: []})}));
    api = createPrivateAPI({account, userId: 'u', fetcher, baseURL: 'https://backend.example/api/'});
});
afterEach(() => api.dispose());
test('account switch while obtaining a fresh token prevents transmission', async () => {
    account.getAccessToken.mockImplementation(async () => {
        account.getState = () => ({user: {id: 'other'}}); return 'token';
    });
    await expect(api.save('id', {revision: 1}, new Map())).rejects.toThrow('Account changed');
    expect(fetcher).not.toHaveBeenCalled();
});
test('missing asset response cannot upload arbitrary files and errors do not expose server bodies', async () => {
    fetcher.mockResolvedValueOnce({ok: true, status: 200, json: async () => ({revision: 1, missingAssets: ['../../secret']})});
    await expect(api.save('id', {revision: 1}, new Map())).rejects.toThrow('Required asset unavailable');
    expect(fetcher).toHaveBeenCalledTimes(1);
    fetcher.mockResolvedValueOnce({ok: false, status: 403, body: 'secret-server-content'});
    await expect(api.save('id', {revision: 1}, new Map())).rejects.toMatchObject({status: 403});
});
test('manual help uses independent JSON endpoint and omits cookies', async () => {
    const body = {requestId: 'ask-id', question: 'Why?', context: {version: 1, text: 'Stage'}};
    await api.ask(body);
    expect(fetcher.mock.calls[0][0]).toBe('https://backend.example/api/v1/tutor/help');
    expect(fetcher.mock.calls[0][1]).toMatchObject({credentials: 'omit', redirect: 'error',
        headers: {Authorization: 'Bearer fresh', 'Content-Type': 'application/json'}, body: JSON.stringify(body)});
});

test('speech uploads raw container audio with a fresh token and receives bounded reply bytes', async () => {
    const audio = {type: 'audio/webm;codecs=opus'};
    fetcher.mockResolvedValueOnce({ok: true, status: 200, json: async () => ({question: 'Hola', language: 'es'})});
    expect(await api.transcribe('voice-id', audio)).toEqual({question: 'Hola', language: 'es'});
    expect(fetcher.mock.calls[0][0]).toContain('/v1/tutor/transcriptions/voice-id?language=auto');
    expect(fetcher.mock.calls[0][1]).toMatchObject({method: 'POST', body: audio,
        headers: {Authorization: 'Bearer fresh', 'Content-Type': audio.type}, credentials: 'omit', redirect: 'error'});
    const bytes = new Uint8Array([1, 2]).buffer;
    fetcher.mockResolvedValueOnce({ok: true, status: 200, arrayBuffer: async () => bytes});
    expect(await api.tutorAudio('voice-id')).toBe(bytes);
    expect(fetcher.mock.calls[1][0]).toContain('/v1/tutor/requests/voice-id/audio');
    expect(fetcher.mock.calls[1][1].body).toBeUndefined();
    expect(account.getAccessToken).toHaveBeenCalledTimes(2);
    fetcher.mockResolvedValueOnce({ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(512 * 1024 + 1)});
    await expect(api.tutorAudio('voice-id')).rejects.toThrow('Asset too large');
});

test('speech errors display only whitelisted codes, never provider messages', async () => {
    fetcher.mockResolvedValueOnce({ok: false, status: 422, json: async () => ({error: {code: 'no_speech', message: 'SECRET'}})});
    await expect(api.transcribe('id', {type: 'audio/webm'})).rejects.toThrow('No speech detected');
    fetcher.mockResolvedValueOnce({ok: false, status: 502, json: async () => ({error: {code: 'PRIVATE_PROVIDER_ERROR', message: 'SECRET'}})});
    await expect(api.transcribe('id', {type: 'audio/webm'})).rejects.toThrow('Voice request failed');
});
