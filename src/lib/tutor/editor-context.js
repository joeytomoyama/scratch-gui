import blockIndex from './block-index.json';

const editors = new WeakMap();
export const registerTutorEditor = (vm, read) => {
    editors.set(vm, read);
    return () => {
        if (editors.get(vm) === read) editors.delete(vm);
    };
};
export const tutorEditorContext = vm => editors.get(vm)?.() || {
    target: {name: vm.editingTarget?.getName() || '', isStage: Boolean(vm.editingTarget?.isStage)},
    palette: [],
    extensions: []
};
export const isAvailableHint = (hint, editor, target = editor?.target) => {
    const info = Object.prototype.hasOwnProperty.call(blockIndex, hint?.opcode) ? blockIndex[hint.opcode] : null;
    return Boolean(info && hint.category === info.category && target &&
        (!info.targets || info.targets.includes(target.isStage ? 'STAGE' : 'SPRITE')) &&
        (!info.extension || editor?.extensions?.includes(info.extension)) &&
        (hint.action !== 'add' || (!info.inputOnly && editor?.palette.includes(hint.opcode))));
};

// Ignore layout and running state, but include children/inputs so editing a literal invalidates its parent hint.
const fingerprint = (target, id, visited = new Set()) => {
    if (!id || visited.has(id) || visited.size >= 1000) return null;
    visited.add(id);
    const block = target.blocks.getBlock(id);
    if (!block) return null;
    return JSON.stringify({opcode: block.opcode,
        fields: block.fields,
        inputs: block.inputs,
        mutation: block.mutation,
        next: block.next,
        parent: block.parent,
        shadow: block.shadow,
        children: Object.values(block.inputs || {}).map(input => [
            fingerprint(target, input.block, visited), fingerprint(target, input.shadow, visited)
        ])});
};
export const captureTutorBlocks = (vm, project) => {
    const entries = new Map();
    for (const target of vm.runtime.targets || []) {
        if (!target.isOriginal) continue;
        const serialized = project?.targets?.find(item => item.name === target.getName() &&
            Boolean(item.isStage) === Boolean(target.isStage));
        const blocks = serialized?.blocks || {};
        entries.set(target, new Map(Object.keys(blocks).map(id => [id, fingerprint(target, id)])));
    }
    const invalid = new Set();
    const matches = (target, id) => {
        const record = entries.get(target);
        const key = `${target.id || target.getName()}:${id}`;
        if (!record?.has(id) || !record.get(id) || invalid.has(key)) return false;
        if (record.get(id) !== fingerprint(target, id)) {
            invalid.add(key); return false;
        }
        return true;
    };
    const changed = () => {
        for (const [target, blocks] of entries) for (const id of blocks.keys()) matches(target, id);
    };
    vm.on('PROJECT_CHANGED', changed);
    return {matches, dispose: () => vm.off('PROJECT_CHANGED', changed)};
};
