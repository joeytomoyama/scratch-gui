import {EventEmitter} from 'events';
import {ProjectPersistence} from '../../../src/lib/project-persistence';

let vm; let api; let saver; let data; let states;
const settle = async () => { for (let i = 0; i < 15; i++) await Promise.resolve(); };
const tick = async ms => { jest.advanceTimersByTime(ms); await settle(); };
beforeEach(() => {
    jest.useFakeTimers();
    data = {targets: [{blocks: {a: {opcode: 'motion_movesteps', x: 1, y: 2}}}]};
    vm = new EventEmitter(); vm.toJSON = () => JSON.stringify(data); vm.serializeAssets = () => [];
    api = {save: jest.fn(async () => ({})), dispose: jest.fn()}; states = [];
    saver = new ProjectPersistence({vm, adapter: api, id: 'stable-id', onState: s => states.push(s)});
});
afterEach(() => { saver.dispose(); jest.useRealTimers(); });
test('idle does not save; layout edits save 20 seconds after first dirty even during continued editing', async () => {
    await tick(60000); expect(api.save).not.toHaveBeenCalled();
    vm.emit('PROJECT_CHANGED'); await tick(15000);
    data.targets[0].blocks.a.x = 88; vm.emit('PROJECT_CHANGED');
    await tick(4999); expect(api.save).not.toHaveBeenCalled();
    await tick(1); expect(api.save).toHaveBeenCalledTimes(1);
    expect(api.save.mock.calls[0][1].project.targets[0].blocks.a.x).toBe(88);
    expect(saver.dirty()).toBe(false);
    await tick(60000); expect(api.save).toHaveBeenCalledTimes(1);
});
test('manual Save captures immediately and an in-flight edit remains dirty until the next save', async () => {
    let release;
    api.save.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    vm.emit('PROJECT_CHANGED'); const first = saver.flush(false); await settle();
    data.targets[0].blocks.a.x = 99; vm.emit('PROJECT_CHANGED');
    release({}); await first;
    expect(saver.committed).toBe(1); expect(saver.generation).toBe(2); expect(saver.dirty()).toBe(true);
    expect(states[states.length - 1].status).toBe('Unsaved');
    await tick(20000); expect(api.save).toHaveBeenCalledTimes(2);
    expect(saver.dirty()).toBe(false);
});
test('failed requests retry the exact captured payload, then save newer edits separately', async () => {
    api.save.mockRejectedValueOnce(new Error('lost response'));
    vm.emit('PROJECT_CHANGED'); await expect(saver.flush()).rejects.toThrow();
    data.targets[0].blocks.a.x = 200; vm.emit('PROJECT_CHANGED');
    const original = api.save.mock.calls[0][1];
    await saver.flush(false);
    expect(api.save.mock.calls[1][1]).toEqual(original);
    expect(saver.dirty()).toBe(true);
    await saver.flush(); expect(api.save.mock.calls[2][1].revision).toBe(2);
    expect(saver.dirty()).toBe(false);
});
test('manual save of an unchanged project captures current runtime values without waiting', async () => {
    await saver.flush();
    data.targets[0].variables = {score: ['score', 12]};
    await saver.flush();
    expect(api.save.mock.calls[1][1].project.targets[0].variables.score[1]).toBe(12);
});

test('course saves include course context in the immutable retry payload', async () => {
    saver.dispose();
    saver = new ProjectPersistence({vm, adapter: api, id: 'stable-id', courseId: 'road'});
    api.save.mockRejectedValueOnce(new Error('retry'));
    await expect(saver.flush()).rejects.toThrow('retry');
    const original = api.save.mock.calls[0][1];
    expect(original.courseId).toBe('road');
    await saver.flush();
    expect(api.save.mock.calls[1][1]).toBe(original);
});
