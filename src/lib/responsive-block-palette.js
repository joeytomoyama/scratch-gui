// Keep at least this much coding space before reserving a permanent palette.
const MIN_WORKSPACE_WIDTH = 480;

/**
 * Instance-scoped adapter for Scratch's fixed-width vertical toolbox. In compact
 * mode the flyout overlays the workspace, so hiding it never shifts a live drag.
 * Keep dependency hooks here rather than changing scratch-blocks or project data.
 */
class ResponsiveBlockPalette {
    constructor (workspace, root) {
        this.workspace = workspace;
        this.root = root;
        this.flyout = workspace.getFlyout();
        this.toolbox = workspace.toolbox_;
        this.compact = false;
        this.collapsed = false;
        this.restorers = [];

        const originalWidth = this.toolbox.getWidth.bind(this.toolbox);
        this.fullWidth = originalWidth();
        this.categoryWidth = this.fullWidth - this.flyout.getWidth();
        this.hook(this.toolbox, 'getWidth', original => (...args) =>
            (this.compact && !this.positioning ? this.categoryWidth : original(...args)));
        // The upstream flyout positions itself using the combined rail/palette
        // width. Its own positioning still needs that width, including in RTL.
        this.hook(this.flyout, 'position', original => (...args) => {
            this.positioning = true;
            try {
                return original(...args);
            } finally {
                this.positioning = false;
            }
        });
        // A compact palette is an overlay, not a workspace deletion target.
        this.hook(this.toolbox, 'getClientRect', original => (...args) => {
            const autoClose = this.flyout.autoClose;
            if (this.compact) this.flyout.autoClose = true;
            try {
                return original(...args);
            } finally {
                this.flyout.autoClose = autoClose;
            }
        });
        ['scrollToCategoryById', 'scrollToCategoryByName'].forEach(method => {
            this.hook(this.toolbox, method, original => (...args) => {
                this.collapsed = false;
                const result = original(...args);
                this.flyout.position();
                return result;
            });
        });
        // Sprite, locale, variable and extension updates rebuild the flyout.
        // Let Blockly finish measuring it, then restore its collapsed state.
        this.hook(this.flyout, 'show', original => (...args) => {
            // show() first calls hide(), whose early return when already hidden
            // skips unbinding old block listeners. A locale rebuild disposes those
            // blocks; recycled replacements otherwise keep their stale listeners.
            // Restore visibility synchronously so hide() performs its cleanup.
            this.flyout.setVisible(true);
            const result = original(...args);
            if (this.compact && this.collapsed) this.flyout.setVisible(false);
            return result;
        });

        this.onMove = () => {
            // Run after Blockly has cloned the palette block and initialized its
            // drag surface. Capture works even when Blockly stops propagation.
            Promise.resolve().then(() => this.collapseAfterDrag());
        };
        this.onEnd = () => Promise.resolve().then(() => {
            if (!this.disposed) this.updateLayout();
        });
        document.addEventListener('mousemove', this.onMove, true);
        document.addEventListener('touchmove', this.onMove, true);
        document.addEventListener('mouseup', this.onEnd, true);
        document.addEventListener('touchend', this.onEnd, true);
        document.addEventListener('touchcancel', this.onEnd, true);
        this.onResize = () => this.updateLayout();
        window.addEventListener('resize', this.onResize);
        if (typeof ResizeObserver !== 'undefined') {
            this.observer = new ResizeObserver(this.onResize);
            this.observer.observe(root);
        }
        this.updateLayout();
    }

    hook (object, method, wrap) {
        const original = object[method];
        const replacement = wrap(original.bind(object));
        object[method] = replacement;
        this.restorers.push(() => {
            if (object[method] === replacement) object[method] = original;
        });
    }

    updateLayout () {
        const width = this.root.getBoundingClientRect().width;
        // Hidden Code tabs and active gestures must not change workspace origins.
        if (!width || this.workspace.isDragging()) return;
        const compact = width - this.fullWidth < MIN_WORKSPACE_WIDTH;
        if (compact === this.compact) return;
        this.compact = compact;
        this.collapsed = compact;
        this.root.setAttribute('data-compact-palette', String(compact));
        this.flyout.setVisible(!compact);
        this.workspace.resize();
    }

    collapseAfterDrag () {
        if (this.disposed || !this.compact || this.collapsed || !this.flyout.isVisible()) return;
        const gesture = this.workspace.currentGesture_;
        // Workspace drags and vertical palette scrolling must leave it open.
        if (!gesture || gesture.flyout_ !== this.flyout || !gesture.isDraggingBlock_) return;
        this.collapsed = true;
        // setVisible preserves palette blocks/listeners; hide() removes listeners.
        this.flyout.setVisible(false);
    }

    dispose () {
        this.disposed = true;
        if (this.observer) this.observer.disconnect();
        window.removeEventListener('resize', this.onResize);
        document.removeEventListener('mousemove', this.onMove, true);
        document.removeEventListener('touchmove', this.onMove, true);
        document.removeEventListener('mouseup', this.onEnd, true);
        document.removeEventListener('touchend', this.onEnd, true);
        document.removeEventListener('touchcancel', this.onEnd, true);
        this.restorers.reverse().forEach(restore => restore());
        this.root.removeAttribute('data-compact-palette');
    }
}

export default ResponsiveBlockPalette;
