import {isAvailableHint, tutorEditorContext} from './editor-context';

const editors = new WeakMap();
export const registerTutorPreviews = (vm, editor) => {
    editors.set(vm, editor);
    return () => {
        if (editors.get(vm) === editor) editors.delete(vm);
    };
};
const key = hint => JSON.stringify(hint.action === 'add' ? ['add', hint.opcode] : [hint.sprite, hint.id, hint.opcode]);
const singleBlock = node => {
    const copy = node.cloneNode(true);
    // Show this block and its inputs, never a script or the contents of a loop.
    for (const child of copy.querySelectorAll('next, statement, comment, data')) child.remove();
    for (const block of [copy, ...copy.querySelectorAll('block, shadow')]) block.removeAttribute('id');
    return copy.querySelectorAll('*').length <= 200 ? copy : null;
};

// Only editor-owned XML. Never accept XML, field values or mutations from the reply.
export const captureTutorPreviews = vm => {
    const editor = editors.get(vm);
    if (!editor) return null;
    const {ScratchBlocks, workspace, getToolboxXML} = editor;
    const sources = new Map();
    const xml = ScratchBlocks.Xml.textToDom(getToolboxXML());
    for (const category of xml.querySelectorAll('category')) {
        const nodes = category.hasAttribute('custom') ?
            workspace.getToolboxCategoryCallback?.(category.getAttribute('custom'))?.(workspace) || [] : [category];
        for (const node of nodes) {
            const blocks = node.tagName?.toLowerCase() === 'block' ? [node] : node.querySelectorAll('block');
            for (const block of blocks) {
                const source = singleBlock(block);
                const id = key({action: 'add', opcode: block.getAttribute('type')});
                // Dynamic procedures/variables with the same opcode cannot be selected by this grammar.
                sources.set(id, sources.has(id) ? null : source);
            }
        }
    }
    const target = vm.editingTarget;
    for (const block of workspace.getAllBlocks(false).slice(0, 500)) {
        sources.set(key({sprite: target?.getName(), id: block.id, opcode: block.type}),
            singleBlock(ScratchBlocks.Xml.blockToDom(block, true)));
    }
    return {ScratchBlocks, sources, editor: tutorEditorContext(vm), media: workspace.options?.pathToMedia};
};

export const renderTutorPreview = (host, part, capture) => {
    if (!capture || (part.action === 'add' && !isAvailableHint(part, capture.editor))) return false;
    const source = capture.sources.get(key(part));
    if (!source || source.getAttribute('type') !== part.opcode) return false;
    const {ScratchBlocks} = capture;
    const staging = document.createElement('div');
    staging.style.cssText = 'position:fixed;left:-10000px;top:0;width:600px;height:400px;visibility:hidden';
    document.body.appendChild(staging);
    let workspace;
    const mainWorkspace = ScratchBlocks.mainWorkspace;
    ScratchBlocks.Events.disable();
    try {
        workspace = ScratchBlocks.inject(staging, {readOnly: true,
            scrollbars: false,
            sounds: false,
            media: capture.media,
            rtl: Boolean(mainWorkspace?.options?.RTL)});
        const block = ScratchBlocks.Xml.domToBlock(source.cloneNode(true), workspace);
        const size = block.getHeightWidth();
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', `0 0 ${size.width + 4} ${size.height + 4}`);
        svg.setAttribute('width', size.width + 4);
        svg.setAttribute('height', size.height + 4);
        svg.setAttribute('aria-hidden', 'true');
        svg.setAttribute('class', 'blocklySvg');
        const root = block.getSvgRoot().cloneNode(true);
        root.setAttribute('transform', 'translate(2,2)');
        svg.appendChild(root);
        host.appendChild(svg);
        return true;
    } catch (e) {
        return false;
    } finally {
        workspace?.dispose();
        ScratchBlocks.mainWorkspace = mainWorkspace;
        staging.remove();
        ScratchBlocks.Events.enable();
    }
};
