import VM from 'scratch-vm';
import {configureExtensionPolicy} from '../../../src/lib/classroom-extension-policy';

test('project runs and survives SB3 save/reload with classroom policy', async () => {
    const vm = new VM();
    configureExtensionPolicy(vm);
    const project = {
        targets: [{
            isStage: true, name: 'Stage', variables: {score: ['score', 0]}, lists: {}, broadcasts: {},
            blocks: {
                flag: {opcode: 'event_whenflagclicked', next: 'set', parent: null, inputs: {}, fields: {},
                    shadow: false, topLevel: true, x: 0, y: 0},
                set: {opcode: 'data_setvariableto', next: null, parent: 'flag',
                    inputs: {VALUE: [1, [4, '42']]}, fields: {VARIABLE: ['score', 'score']},
                    shadow: false, topLevel: false}
            }, comments: {}, currentCostume: 0, costumes: [], sounds: [], volume: 100
        }],
        monitors: [], extensions: [], meta: {semver: '3.0.0', vm: '0.2.0', agent: 'classroom-test'}
    };
    try {
        await vm.loadProject(JSON.stringify(project));
        vm.greenFlag();
        vm.runtime._step();
        expect(vm.runtime.getTargetForStage().variables.score.value).toBe(42);
        const saved = await vm.saveProjectSb3('arraybuffer');
        vm.clear();
        await vm.loadProject(saved);
        expect(vm.runtime.getTargetForStage().variables.score.value).toBe(42);
        const blocks = vm.runtime.getTargetForStage().blocks;
        expect(blocks.getScripts().map(id => blocks.getBlock(id).opcode)).toContain('event_whenflagclicked');
        await expect(vm.extensionManager.loadExtensionURL('microbit')).rejects.toThrow('not available');
    } finally {
        vm.quit();
    }
});
