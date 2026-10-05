import JSZip from '@turbowarp/jszip';
import VM from 'scratch-vm';
import {createPrivateAPI} from '../../../src/lib/private-project-api';

test('private adapter restores exact JSON and immutable bytes in an SB3 and uses fresh tokens', async () => {
    const name = 'a'.repeat(32) + '.svg';
    const bytes = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>');
    const project = {targets: [{isStage: true, name: 'Stage', variables: {}, lists: {}, broadcasts: {}, comments: {},
        blocks: {a: {opcode: 'event_whenflagclicked', topLevel: true, shadow: false, parent: null, next: null,
            inputs: {}, fields: {}, x: 153, y: -92}}, costumes: [], sounds: []}], monitors: [], extensions: [], meta: {semver: '3.0.0'}};
    const saved = {revision: 7, project, assets: [{fileName: name, byteLength: bytes.length}]};
    const account = {getState: () => ({user: {id: 'alice'}}), getAccessToken: jest.fn(async () => 'fresh-token')};
    const fetcher = jest.fn(async url => ({ok: true, status: 200,
        json: async () => saved, arrayBuffer: async () => bytes.buffer}));
    const api = createPrivateAPI({account, userId: 'alice', baseURL: 'http://localhost:3001', fetcher});
    const result = await api.load('private-id');
    const zip = await JSZip.loadAsync(result.data);
    expect(JSON.parse(await zip.file('project.json').async('string'))).toEqual(project);
    expect(Array.from(await zip.file(name).async('uint8array'))).toEqual(Array.from(bytes));
    expect(account.getAccessToken).toHaveBeenCalledTimes(2);
    for (const [, options] of fetcher.mock.calls) {
        expect(options.credentials).toBe('omit'); expect(options.headers.Authorization).toBe('Bearer fresh-token');
    }
    const vm = new VM();
    try {
        await vm.loadProject(result.data);
        const restored = JSON.parse(vm.toJSON());
        expect(restored.targets[0].blocks.a.x).toBe(153);
        expect(restored.targets[0].blocks.a.y).toBe(-92);
    } finally { vm.quit(); api.dispose(); }
});
test('save sends JSON before only requested assets, and acknowledges after uploads', async () => {
    const fileName = 'a'.repeat(32) + '.svg'; const bytes = new Uint8Array([1, 2]);
    const fetcher = jest.fn(async (url, options) => options.headers['Content-Type'] === 'application/json' ?
        {ok: true, status: 200, json: async () => ({revision: 1, missingAssets: [fileName]})} : {ok: true, status: 204});
    const account = {getState: () => ({user: {id: 'alice'}}), getAccessToken: async () => 'token'};
    const api = createPrivateAPI({account, userId: 'alice', baseURL: 'http://localhost', fetcher});
    await api.save('id', {revision: 1, project: {}, assets: []}, new Map([[fileName, bytes]]));
    expect(fetcher.mock.calls[0][0]).toContain('/v1/projects/id/revisions/1');
    expect(fetcher.mock.calls[1][0]).toContain('/assets/');
    expect(fetcher.mock.calls[1][1].body).toBe(bytes);
    api.dispose();
});
