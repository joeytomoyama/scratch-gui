import VM from 'scratch-vm';
import {ManualTutor} from '../../../src/lib/tutor/manual';
import {registerTutorEditor} from '../../../src/lib/tutor/editor-context';

test('Ask preserves real VM IDs, captures editor availability and invalidates pending guidance on an input edit', async () => {
    const vm = new VM();
    let tutor;
    let unregister;
    try {
        await vm.loadProject(JSON.stringify({targets: [{isStage: true, name: 'Stage',
            variables: {}, lists: {}, broadcasts: {}, comments: {}, costumes: [], sounds: [],
            currentCostume: 0, volume: 100, blocks: {
                'actual-wait': {opcode: 'control_wait', next: null, parent: null, inputs: {DURATION: [1, 'actual-number']},
                    fields: {}, topLevel: true, shadow: false, x: 0, y: 0},
                'actual-number': {opcode: 'math_number', next: null, parent: 'actual-wait', inputs: {},
                    fields: {NUM: ['1']}, topLevel: false, shadow: true}
            }}], monitors: [], extensions: [], meta: {semver: '3.0.0'}}));
        const target = vm.runtime.getTargetForStage();
        vm.setEditingTarget(target.id);
        const editor = {target: {name: 'Stage', isStage: true}, palette: ['control_wait'], extensions: []};
        unregister = registerTutorEditor(vm, () => editor);
        let finish;
        const api = {ask: jest.fn(body => new Promise(resolve => {finish = () => resolve({requestId: body.requestId,
            status: 'complete', feedback: {text: 'Inspect the wait.', highlights: {blocks: []}}});})), dispose: jest.fn()};
        tutor = new ManualTutor({vm, api, makeId: () => 'request-id'});
        const work = tutor.ask('');
        expect(api.ask.mock.calls[0][0].context.text).toContain('[actual-wait]');
        expect(api.ask.mock.calls[0][0].context.text).toContain('(opcode: control_wait)');
        expect(api.ask.mock.calls[0][0].editor).toEqual(editor);
        expect(tutor.snapshot.matches(target, 'actual-wait')).toBe(true);
        vm.blockListener({type: 'change', blockId: 'actual-number', element: 'field', name: 'NUM', newValue: '2'});
        expect(tutor.snapshot.matches(target, 'actual-wait')).toBe(false);
        finish(); await work;
        expect(tutor.snapshot.matches(target, 'actual-wait')).toBe(false);
        // Resolve the same request receipt without recapturing project state or availability.
        const retry = tutor.retry(); finish(); await retry;
        expect(api.ask.mock.calls[1][0]).toEqual(api.ask.mock.calls[0][0]);
        let transcribed;
        api.transcribe = jest.fn(() => new Promise(resolve => {transcribed = resolve;}));
        const voice = tutor.transcribe({type: 'audio/webm'}, {course: 'road'}, null);
        expect(tutor.pending.recentChanges).toEqual([expect.objectContaining({
            sprite: 'Stage', id: 'actual-wait', opcode: 'control_wait', action: 'modified'
        })]);
        expect(tutor.pending.recentConversation).toEqual([{question: '', reply: 'Inspect the wait.'}]);
        expect(tutor.snapshot.matches(target, 'actual-wait')).toBe(true);
        expect(tutor.pending.context.text).toContain('[actual-wait]');
        vm.blockListener({type: 'change', blockId: 'actual-number', element: 'field', name: 'NUM', newValue: '3'});
        expect(tutor.snapshot.matches(target, 'actual-wait')).toBe(false);
        transcribed({question: 'Was macht der Block?', language: 'de'}); await voice;
        const spokenReply = tutor.retry(); finish(); await spokenReply;
        expect(api.ask.mock.calls[2][0]).toMatchObject({question: 'Was macht der Block?', language: 'de', course: {course: 'road'}});
        expect(tutor.snapshot.matches(target, 'actual-wait')).toBe(false);
    } finally {
        tutor?.dispose(); unregister?.(); vm.quit();
    }
}, 30000);
