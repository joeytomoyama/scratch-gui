const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Decorative bands follow the flyout's own category boundaries and canvas transform.
 * Keep this dependency adapter here: no scratch-blocks fork or execution changes.
 */
class PaletteCategoryBackgrounds {
    constructor (workspace) {
        this.flyout = workspace.getFlyout();
        this.toolbox = workspace.toolbox_;
        this.canvas = this.flyout.getWorkspace().getCanvas();
        this.layer = document.createElementNS(SVG_NS, 'g');
        this.layer.setAttribute('class', 'paletteCategoryBackgrounds');
        this.layer.setAttribute('pointer-events', 'none');
        this.layer.setAttribute('aria-hidden', 'true');
        this.canvas.parentNode.insertBefore(this.layer, this.canvas);
        this.originalRecord = this.flyout.recordCategoryScrollPositions_;
        this.record = (...args) => {
            const result = this.originalRecord.apply(this.flyout, args);
            this.render();
            return result;
        };
        this.flyout.recordCategoryScrollPositions_ = this.record;
        this.observer = new MutationObserver(() => this.syncTransform());
        this.observer.observe(this.canvas, {attributes: true, attributeFilter: ['transform']});
        this.record();
    }

    syncTransform () {
        this.layer.setAttribute('transform', this.canvas.getAttribute('transform') || '');
    }

    render () {
        const positions = this.flyout.categoryScrollPositions || [];
        const scale = this.flyout.getWorkspace().scale;
        const width = this.flyout.getWidth() / scale;
        const signature = JSON.stringify(positions.map((section, index) => [
            section.position, (this.toolbox.getCategoryByIndex(index) || {}).colour_
        ])) + width + this.flyout.getWorkspace().scrollX;
        this.syncTransform();
        if (signature === this.signature) return;
        this.signature = signature;
        while (this.layer.firstChild) this.layer.removeChild(this.layer.firstChild);
        positions.forEach((section, index) => {
            const category = this.toolbox.getCategoryByIndex(index);
            if (!category) return;
            const start = index === 0 ? 0 : section.position;
            const end = positions[index + 1] ? positions[index + 1].position : start + 100000;
            const rect = document.createElementNS(SVG_NS, 'rect');
            rect.setAttribute('x', -this.flyout.getWorkspace().scrollX / scale);
            rect.setAttribute('y', start);
            rect.setAttribute('width', width);
            rect.setAttribute('height', end - start);
            rect.setAttribute('data-category', section.categoryId);
            // The approved palette tint is the category color mixed at 16% with white.
            rect.style.fill = `color-mix(in srgb, ${category.colour_} 16%, white)`;
            this.layer.appendChild(rect);
        });
    }

    dispose () {
        this.observer.disconnect();
        if (this.flyout.recordCategoryScrollPositions_ === this.record) {
            this.flyout.recordCategoryScrollPositions_ = this.originalRecord;
        }
        this.layer.remove();
    }
}

export default PaletteCategoryBackgrounds;
