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
