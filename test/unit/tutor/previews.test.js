/** @jest-environment jsdom */
import {captureTutorPreviews, registerTutorPreviews, renderTutorPreview} from '../../../src/lib/tutor/previews';
import {registerTutorEditor} from '../../../src/lib/tutor/editor-context';

const hint = {category: 'motion', opcode: 'motion_changexby', action: 'add', label: 'change x by'};
const xml = text => new DOMParser().parseFromString(text, 'text/xml').documentElement;
const setup = () => {
    const vm = {editingTarget: {getName: () => 'Cat'}};
    const original = {options: {RTL: false}};
    const dispose = jest.fn();
    const root = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    root.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'path'));
    const ScratchBlocks = {mainWorkspace: original, Events: {disable: jest.fn(), enable: jest.fn()},
        inject: jest.fn(() => { ScratchBlocks.mainWorkspace = {}; return {dispose}; }),
        Xml: {textToDom: xml, blockToDom: jest.fn(() => xml('<block type="motion_changexby" id="real"><next><block type="control_wait"/></next></block>')),
            domToBlock: jest.fn(() => ({getHeightWidth: () => ({width: 150, height: 40}), getSvgRoot: () => root}))}};
    const workspace = {getAllBlocks: () => [{id: 'real', type: 'motion_changexby'}]};
    const unregister = registerTutorPreviews(vm, {ScratchBlocks, workspace,
        getToolboxXML: () => '<xml><category><block type="motion_changexby"><value name="DX"><shadow type="math_number"><field name="NUM">10</field></shadow></value><statement name="SUBSTACK"><block type="control_wait"/></statement></block></category></xml>'});
    const context = registerTutorEditor(vm, () => ({target: {name: 'Cat', isStage: false}, palette: [hint.opcode], extensions: []}));
    return {vm, ScratchBlocks, original, dispose, cleanup: () => { unregister(); context(); }};
};

test('preview sources are immutable editor XML; inputs stay, scripts and IDs are excluded', () => {
    const s = setup();
    const capture = captureTutorPreviews(s.vm);
    const source = capture.sources.get(JSON.stringify(['add', hint.opcode]));
    expect(source.querySelector('field').textContent).toBe('10');
    expect(source.querySelector('statement')).toBeNull();
    const existing = capture.sources.get(JSON.stringify(['Cat', 'real', hint.opcode]));
    expect(existing.hasAttribute('id')).toBe(false);
    expect(existing.querySelector('next')).toBeNull();
    s.cleanup();
    expect(captureTutorPreviews(s.vm)).toBeNull();
});

test('renderer uses read-only Blockly, never model fields/HTML; restores workspace and cleans up', () => {
    const s = setup();
    const capture = captureTutorPreviews(s.vm);
    const host = document.createElement('span');
    expect(renderTutorPreview(host, {...hint, html: '<script>bad</script>', value: '99'}, capture)).toBe(true);
    expect(s.ScratchBlocks.inject.mock.calls[0][1]).toMatchObject({readOnly: true, sounds: false, scrollbars: false});
    const source = s.ScratchBlocks.Xml.domToBlock.mock.calls[0][0];
    expect(source.querySelector('field').textContent).toBe('10');
    expect(host.querySelector('svg').getAttribute('viewBox')).toBe('0 0 154 44');
    expect(host.querySelector('script')).toBeNull();
    expect(s.dispose).toHaveBeenCalledTimes(1);
    expect(s.ScratchBlocks.mainWorkspace).toBe(s.original);
    expect(s.ScratchBlocks.Events.enable).toHaveBeenCalledTimes(1);
    expect(document.body.children).toHaveLength(0);
    s.cleanup();
});

test('renderer cannot guess an existing ID, bypass availability or retain failed workspaces', () => {
    const s = setup();
    const capture = captureTutorPreviews(s.vm);
    const host = document.createElement('span');
    expect(renderTutorPreview(host, {...hint, action: 'inspect', sprite: 'Cat', id: 'wrong'}, capture)).toBe(false);
    expect(s.ScratchBlocks.inject).not.toHaveBeenCalled();
    capture.editor.palette = [];
    expect(renderTutorPreview(host, hint, capture)).toBe(false);
    capture.editor.palette = [hint.opcode];
    s.ScratchBlocks.Xml.domToBlock.mockImplementation(() => { throw new Error('unsupported'); });
    expect(renderTutorPreview(host, hint, capture)).toBe(false);
    expect(host.children).toHaveLength(0);
    expect(s.dispose).toHaveBeenCalledTimes(1);
    expect(s.ScratchBlocks.mainWorkspace).toBe(s.original);
    expect(document.body.children).toHaveLength(0);
    s.cleanup();
});

test('duplicate dynamic opcode choices fail closed rather than choosing a variable/procedure', () => {
    const vm = {editingTarget: {getName: () => 'Cat'}};
    const unregister = registerTutorPreviews(vm, {ScratchBlocks: {Xml: {textToDom: xml}},
        workspace: {getAllBlocks: () => []}, getToolboxXML: () =>
            '<xml><category><block type="procedures_call"/><block type="procedures_call"/></category></xml>'});
    expect(captureTutorPreviews(vm).sources.get(JSON.stringify(['add', 'procedures_call']))).toBeNull();
    unregister();
});
