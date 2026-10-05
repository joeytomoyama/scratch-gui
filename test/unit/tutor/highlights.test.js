/** @jest-environment jsdom */
import {EventEmitter} from 'events';
import {TutorHighlights, setTutorHighlights, captureTutorBlocks} from '../../../src/lib/tutor/highlights';
import {tutorEditorContext} from '../../../src/lib/tutor/editor-context';

const block = (id, type) => {
    const root = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.classList.add('blocklyBlockBackground'); root.appendChild(path);
    return {id, type, root, path, getSvgRoot: () => root};
};
let vm; let root; let workspace; let controller; let palette; let existing; let snapshot; let live;
const toolbox = () => '<xml><category id="motion"><block type="motion_movesteps"/></category>' +
    '<category id="control"><block type="control_forever"/></category></xml>';
const show = feedback => setTutorHighlights(vm, feedback, snapshot);
beforeEach(() => {
    jest.useFakeTimers();
    vm = new EventEmitter();
    live = {'student-loop': {opcode: 'control_forever', inputs: {}, fields: {}}};
    const target = {id: 'target', isOriginal: true, isStage: false, getName: () => 'Student',
        blocks: {getBlock: id => live[id]}};
    vm.runtime = {targets: [target]}; vm.editingTarget = target;
    vm.extensionManager = {isExtensionLoaded: () => false};
    snapshot = captureTutorBlocks(vm, {targets: [{name: 'Student', blocks: live}]});
    root = document.createElement('div');
    root.innerHTML = '<div class="scratchCategoryId-motion"></div><div class="scratchCategoryId-control"></div>';
    document.body.appendChild(root);
    palette = block('palette-move', 'motion_movesteps'); existing = block('student-loop', 'control_forever');
    root.appendChild(palette.root); root.appendChild(existing.root);
    workspace = {getFlyout: () => ({getWorkspace: () => ({getAllBlocks: () => [palette]})}),
        getBlockById: id => (id === existing.id ? existing : null)};
    controller = new TutorHighlights({vm, root, workspace, getToolboxXML: toolbox,
        blockTypes: {motion_movesteps: {}, control_forever: {}}});
});
afterEach(() => {
    controller.dispose(); snapshot.dispose(); root.remove(); jest.useRealTimers();
});
const add = {category: 'motion', opcode: 'motion_movesteps', action: 'add'};
const inspect = {category: 'control', opcode: 'control_forever', action: 'inspect', sprite: 'Student', id: 'student-loop'};
const remove = {...inspect, action: 'remove'};
const feedback = {highlights: {blocks: [add, inspect]}};

test('categories are immediate; palette and exact existing blocks wait the full eight seconds', () => {
    show(feedback);
    expect(root.querySelectorAll('.tutorCategoryHint')).toHaveLength(1);
    expect(root.querySelector('.scratchCategoryId-control').classList.contains('tutorCategoryHint')).toBe(false);
    jest.advanceTimersByTime(7999);
    expect(root.querySelectorAll('.tutorExactHint')).toHaveLength(0);
    jest.advanceTimersByTime(1);
    expect(palette.path.classList.contains('tutorExactHint')).toBe(true);
    expect(existing.path.classList.contains('tutorExactHint')).toBe(true);
    expect(existing.root.classList.contains('tutorExactHint')).toBe(false);
});

test('reference IDs, wrong sprites, catalog pairs, unknown types, legacy shapes and commands are ignored', () => {
    show({highlights: {categories: ['motion'], opcodes: ['motion_movesteps'], blocks: [
        {...inspect, id: 'reference-only'}, {...inspect, sprite: 'Other'}, {...add, category: 'body'},
        {...add, opcode: 'motion_fake'}, {...inspect, opcode: 'control_wait'}, {...inspect, action: 'execute'},
        {sprite: 'Student', id: 'student-loop'}]}});
    jest.advanceTimersByTime(8000);
    expect(root.querySelectorAll('.tutorCategoryHint, .tutorExactHint')).toHaveLength(0);
});

test('existing-only inspect guidance never highlights a category or palette', () => {
    show({highlights: {blocks: [inspect]}});
    jest.advanceTimersByTime(8000);
    expect(existing.path.classList.contains('tutorExactHint')).toBe(true);
    expect(palette.path.classList.contains('tutorExactHint')).toBe(false);
    expect(root.querySelectorAll('.tutorCategoryHint')).toHaveLength(0);
});

test('removal is red after eight seconds and never changes the VM', () => {
    const original = JSON.stringify(live);
    show({highlights: {blocks: [remove]}});
    jest.advanceTimersByTime(7999);
    expect(existing.path.classList.contains('tutorRemoveHint')).toBe(false);
    jest.advanceTimersByTime(1);
    expect(existing.path.classList.contains('tutorRemoveHint')).toBe(true);
    expect(existing.path.classList.contains('tutorExactHint')).toBe(false);
    expect(root.querySelectorAll('.tutorCategoryHint')).toHaveLength(0);
    expect(JSON.stringify(live)).toBe(original);
    show(null);
    expect(existing.path.classList.contains('tutorRemoveHint')).toBe(false);
});

test('removal wins duplicate inspect hints and stale red styling clears on new feedback', () => {
    show({highlights: {blocks: [remove, inspect]}});
    jest.advanceTimersByTime(8000);
    expect(existing.path.classList.contains('tutorRemoveHint')).toBe(true);
    show(feedback);
    expect(existing.path.classList.contains('tutorRemoveHint')).toBe(false);
    jest.advanceTimersByTime(8000);
    expect(existing.path.classList.contains('tutorExactHint')).toBe(true);
});

test('a mismatched ID never guesses a replacement, even if there is one unique matching type', () => {
    const actual = block('actual-think', 'looks_thinkforsecs'); root.appendChild(actual.root);
    live['actual-think'] = {opcode: actual.type};
    controller.blockTypes[actual.type] = {};
    workspace.getAllBlocks = () => [existing, actual];
    workspace.getBlockById = id => [existing, actual].find(candidate => candidate.id === id);
    show({highlights: {blocks: [{category: 'looks', sprite: 'Student', id: 'student-loop',
        opcode: actual.type, action: 'remove'}]}});
    jest.advanceTimersByTime(8000);
    expect(root.querySelectorAll('.tutorRemoveHint')).toHaveLength(0);
});

test('deleted or edited blocks since Ask are ignored, including edits made while the request is pending', () => {
    live['student-loop'].fields.VALUE = {value: 'changed'};
    vm.emit('PROJECT_CHANGED');
    show({highlights: {blocks: [remove]}});
    jest.advanceTimersByTime(8000);
    expect(root.querySelectorAll('.tutorRemoveHint')).toHaveLength(0);
    delete live['student-loop'].fields.VALUE; vm.emit('PROJECT_CHANGED');
    controller.refresh();
    expect(root.querySelectorAll('.tutorRemoveHint')).toHaveLength(0);
    delete live['student-loop']; vm.emit('PROJECT_CHANGED');
    expect(root.querySelectorAll('.tutorRemoveHint')).toHaveLength(0);
});

test('changing a nested input invalidates its parent hint but layout changes do not', () => {
    snapshot.dispose();
    live['student-loop'].inputs.VALUE = {block: 'literal'};
    live.literal = {opcode: 'text', fields: {TEXT: {value: 'one'}}};
    snapshot = captureTutorBlocks(vm, {targets: [{name: 'Student', blocks: live}]});
    show({highlights: {blocks: [inspect]}});
    jest.advanceTimersByTime(8000);
    live['student-loop'].x = 10; vm.emit('PROJECT_CHANGED');
    expect(existing.path.classList.contains('tutorExactHint')).toBe(true);
    live.literal.fields.TEXT.value = 'two'; vm.emit('PROJECT_CHANGED');
    expect(existing.path.classList.contains('tutorExactHint')).toBe(false);
});

test('refresh handles palette recreation and sprite navigation without restarting the timer', () => {
    show(feedback); jest.advanceTimersByTime(8000);
    palette.root.remove(); palette = block('new-palette', 'motion_movesteps'); root.appendChild(palette.root);
    vm.editingTarget = {getName: () => 'Other'};
    controller.refresh();
    expect(palette.path.classList.contains('tutorExactHint')).toBe(true);
    expect(existing.path.classList.contains('tutorExactHint')).toBe(false);
    vm.editingTarget = vm.runtime.targets[0]; controller.refresh();
    expect(existing.path.classList.contains('tutorExactHint')).toBe(true);
});

test('new Ask/reset removes marks, cancels delayed work and disposal removes listeners', () => {
    show(feedback); jest.advanceTimersByTime(4000);
    show(null); jest.advanceTimersByTime(8000);
    expect(root.querySelectorAll('.tutorCategoryHint, .tutorExactHint')).toHaveLength(0);
    show(feedback); jest.advanceTimersByTime(8000);
    controller.dispose(); snapshot.dispose();
    expect(root.querySelectorAll('.tutorCategoryHint, .tutorExactHint')).toHaveLength(0);
    expect(vm.listenerCount('TUTOR_HIGHLIGHTS')).toBe(0);
    expect(vm.listenerCount('PROJECT_CHANGED')).toBe(0);
});

test('Code tab remount preserves the remaining delay', () => {
    show(feedback); jest.advanceTimersByTime(3000);
    controller.dispose();
    controller = new TutorHighlights({vm, root, workspace, getToolboxXML: toolbox, blockTypes: {motion_movesteps: {}}});
    jest.advanceTimersByTime(4999);
    expect(root.querySelectorAll('.tutorExactHint')).toHaveLength(0);
    jest.advanceTimersByTime(1);
    expect(palette.path.classList.contains('tutorExactHint')).toBe(true);
});

test('editor availability includes dynamic category blocks and only loaded extensions; helpers cannot be added', () => {
    controller.blockTypes.pen_penDown = {};
    controller.blockTypes.sound_sounds_menu = {};
    controller.getToolboxXML = () => '<xml><category id="pen"><block type="pen_penDown"/></category>' +
        '<category id="sound"><shadow type="sound_sounds_menu"/></category><category custom="PROCEDURE"/></xml>';
    workspace.getToolboxCategoryCallback = () => () => {
        const call = document.createElement('block'); call.setAttribute('type', 'control_forever'); return [call];
    };
    expect(tutorEditorContext(vm).palette).toEqual(['pen_penDown', 'control_forever']);
    vm.extensionManager.isExtensionLoaded = id => id === 'pen';
    expect(tutorEditorContext(vm).extensions).toEqual(['pen']);
    const pen = document.createElement('div'); pen.className = 'scratchCategoryId-pen'; root.appendChild(pen);
    show({highlights: {blocks: [{category: 'pen', opcode: 'pen_penDown', action: 'add'},
        {category: 'sound', opcode: 'sound_sounds_menu', action: 'add'}]}});
    expect(pen.classList.contains('tutorCategoryHint')).toBe(true);
    vm.extensionManager.isExtensionLoaded = () => false; controller.refresh();
    expect(pen.classList.contains('tutorCategoryHint')).toBe(false);
    vm.editingTarget.isStage = true; vm.extensionManager.isExtensionLoaded = () => true; controller.refresh();
    expect(pen.classList.contains('tutorCategoryHint')).toBe(false);
});
