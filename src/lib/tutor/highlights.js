// Isolated ScratchBlocks adapter. Suggestions never become editor commands.
import {captureTutorBlocks, isAvailableHint, registerTutorEditor, tutorEditorContext} from './editor-context';
import blockIndex from './block-index.json';

const states = new WeakMap();
const event = 'TUTOR_HIGHLIGHTS';
const toolboxCategory = {event: 'events', data: 'variables', dataLists: 'variables'};
export const setTutorHighlights = (vm, feedback, snapshot) => {
    // The real Ask flow supplies its pre-request snapshot. Direct consumers must also supply one for existing hints.
    const state = feedback ? {hints: feedback.highlights || {}, receivedAt: Date.now(), snapshot} : null;
    states.set(vm, state);
    vm.emit(event, state);
};
export {captureTutorBlocks};

export class TutorHighlights {
    constructor ({vm, workspace, root, blockTypes, getToolboxXML = () => ''}) {
        Object.assign(this, {vm, workspace, root, blockTypes, getToolboxXML});
        this.marked = new Map();
        this.unregister = registerTutorEditor(vm, () => this.editorContext());
        this.receive = state => {
            clearTimeout(this.timer);
            this.clear();
            this.state = state;
            this.refresh();
            if (state) {
                this.timer = setTimeout(() => this.refresh(), Math.max(0, 8000 - (Date.now() - state.receivedAt)));
            }
        };
        this.observer = new MutationObserver(() => this.refresh());
        this.observer.observe(root, {childList: true, subtree: true, attributes: true, attributeFilter: ['class']});
        vm.on(event, this.receive);
        this.changed = () => this.refresh();
        vm.on('PROJECT_CHANGED', this.changed);
        this.receive(states.get(vm));
    }
    editorContext () {
        const palette = new Set();
        const xml = new DOMParser().parseFromString(this.getToolboxXML(), 'text/xml');
        for (const category of xml.querySelectorAll('category')) {
            const nodes = category.hasAttribute('custom') ?
                this.workspace.getToolboxCategoryCallback?.(category.getAttribute('custom'))?.(this.workspace) || [] :
                [category];
            for (const node of nodes) {
                if (node.tagName?.toLowerCase() === 'block') palette.add(node.getAttribute('type'));
                for (const block of node.querySelectorAll?.('block') || []) palette.add(block.getAttribute('type'));
            }
        }
        return {target: {name: this.vm.editingTarget?.getName() || '',
            isStage: Boolean(this.vm.editingTarget?.isStage)},
        palette: [...palette].filter(opcode => Object.prototype.hasOwnProperty.call(this.blockTypes, opcode)),
        extensions: [...new Set(Object.values(blockIndex).map(info => info.extension)
            .filter(id =>
                id && this.vm.extensionManager?.isExtensionLoaded(id)))]};
    }
    refresh () {
        const desired = new Map();
        const hints = this.state?.hints;
        if (hints) {
            const editor = tutorEditorContext(this.vm);
            const additions = new Set();
            const categories = new Set();
            const existing = new Map();
            for (const hint of (Array.isArray(hints.blocks) ? hints.blocks : []).slice(0, 12)) {
                if (!hint || !['add', 'inspect', 'remove'].includes(hint.action) ||
                    !Object.prototype.hasOwnProperty.call(this.blockTypes, hint.opcode)) continue;
                if (hint.action === 'add') {
                    if (!isAvailableHint(hint, editor)) continue;
                    additions.add(hint.opcode);
                    categories.add(toolboxCategory[hint.category] || hint.category);
                    continue;
                }
                if (typeof hint.sprite !== 'string' || typeof hint.id !== 'string') continue;
                const target = this.vm.runtime.targets?.find(item => item.isOriginal && item.getName() === hint.sprite);
                const block = target?.blocks.getBlock(hint.id);
                if (!block || block.opcode !== hint.opcode ||
                    !isAvailableHint(hint, editor, {isStage: Boolean(target.isStage)}) ||
                    !this.state.snapshot?.matches(target, hint.id)) continue;
                if (target === this.vm.editingTarget && existing.get(hint.id)?.action !== 'remove') {
                    existing.set(hint.id, hint);
                }
            }
            // Category identifiers have been validated against the catalog, never raw model selectors.
            for (const category of categories) {
                const element = this.root.querySelector(`.scratchCategoryId-${category}`);
                if (element) desired.set(element, 'tutorCategoryHint');
            }
            if (Date.now() - this.state.receivedAt >= 8000) {
                const flyout = this.workspace.getFlyout()?.getWorkspace();
                for (const block of flyout?.getAllBlocks(false) || []) {
                    if (additions.has(block.type)) this.markBlock(block, desired);
                }
                for (const [id, hint] of existing) {
                    const block = this.workspace.getBlockById(id);
                    if (block?.type === hint.opcode) {
                        this.markBlock(block, desired, hint.action === 'remove' ? 'tutorRemoveHint' : 'tutorExactHint');
                    }
                }
            }
        }
        for (const [element, name] of this.marked) if (desired.get(element) !== name) element.classList.remove(name);
        for (const [element, name] of desired) if (!element.classList.contains(name)) element.classList.add(name);
        this.marked = desired;
    }
    markBlock (block, desired, className = 'tutorExactHint') {
        const path = block?.getSvgRoot()?.querySelector('.blocklyBlockBackground');
        if (path) desired.set(path, className);
    }
    clear () {
        for (const [element, name] of this.marked) element.classList.remove(name);
        this.marked.clear();
    }
    dispose () {
        clearTimeout(this.timer);
        this.observer.disconnect();
        this.unregister();
        this.vm.off(event, this.receive);
        this.vm.off('PROJECT_CHANGED', this.changed);
        this.clear();
    }
}
