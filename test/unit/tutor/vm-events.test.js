import VM from 'scratch-vm';
import {ProjectPersistence} from '../../../src/lib/project-persistence';

test('real VM persists block positions, field edits and connection changes', async () => {
    const vm = new VM();
    let sync;
    try {
        await vm.loadProject(JSON.stringify({targets: [{isStage: true, name: 'Stage',
            variables: {}, lists: {}, broadcasts: {}, comments: {}, costumes: [], sounds: [],
            currentCostume: 0, volume: 100,
            blocks: {
                first: {opcode: 'event_whenflagclicked', next: null, parent: null, inputs: {}, fields: {},
                    topLevel: true, shadow: false, x: 0, y: 0},
                second: {opcode: 'looks_say', next: null, parent: null, inputs: {MESSAGE: [1, 'text']},
                    fields: {}, topLevel: true, shadow: false, x: 100, y: 100},
                text: {opcode: 'text', next: null, parent: 'second', inputs: {}, fields: {TEXT: ['Hello']},
                    topLevel: false, shadow: true}
            }}], monitors: [], extensions: [], meta: {semver: '3.0.0'}}));
        vm.setEditingTarget(vm.runtime.getTargetForStage().id);
        const api = {save: jest.fn(async (id, body) => ({revision: body.revision, missingAssets: []})),
            uploadMissing: jest.fn(async () => {}), dispose: jest.fn()};
        sync = new ProjectPersistence({vm, adapter: api, id: 'vm-test'});
        vm.blockListener({type: 'move', blockId: 'second', newCoordinate: {x: 130, y: 140}});
        await Promise.resolve(); await sync.flush();
        expect(api.save).toHaveBeenCalledTimes(1);
        expect(Object.values(api.save.mock.calls[0][1].project.targets[0].blocks)
            .find(block => block.opcode === 'looks_say').x).toBe(130);
        vm.blockListener({type: 'change', blockId: 'text', element: 'field', name: 'TEXT', newValue: 'Why?'});
        await Promise.resolve(); await sync.flush();
        expect(api.save).toHaveBeenCalledTimes(2);
        vm.blockListener({type: 'move', blockId: 'second', newParentId: 'first'});
        await Promise.resolve(); await sync.flush();
        expect(api.save).toHaveBeenCalledTimes(3);
        const savedBlocks = api.save.mock.calls[2][1].project.targets[0].blocks;
        const hat = Object.values(savedBlocks).find(block => block.opcode === 'event_whenflagclicked');
        expect(savedBlocks[hat.next].opcode).toBe('looks_say');
    } finally {
        if (sync) sync.dispose();
        vm.quit();
    }
}, 30000);
