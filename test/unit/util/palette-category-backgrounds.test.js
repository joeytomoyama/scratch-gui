/** @jest-environment jsdom */
import PaletteCategoryBackgrounds from '../../../src/lib/palette-category-backgrounds';

const setup = () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const canvas = document.createElementNS(svg.namespaceURI, 'g');
    svg.appendChild(canvas);
    document.body.appendChild(svg);
    const flyoutWorkspace = {getCanvas: () => canvas, scale: 1, scrollX: 0};
    const sections = [{categoryId: 'motion', position: 8}, {categoryId: 'looks', position: 120}];
    const originalRecord = jest.fn();
    const flyout = {
        getWorkspace: () => flyoutWorkspace,
        getWidth: () => 250,
        recordCategoryScrollPositions_: originalRecord,
        categoryScrollPositions: sections
    };
    const workspace = {
        getFlyout: () => flyout,
        toolbox_: {getCategoryByIndex: index => ({colour_: ['#4c97ff', '#9966ff'][index]})}
    };
    const backgrounds = new PaletteCategoryBackgrounds(workspace);
    return {backgrounds, flyout, flyoutWorkspace, canvas, originalRecord, sections};
};

afterEach(() => {
    document.body.innerHTML = '';
});

test('separate full-width bands meet at the category boundary and do not intercept block dragging', () => {
    const {backgrounds, canvas} = setup();
    const rects = backgrounds.layer.children;
    expect(backgrounds.layer.nextSibling).toBe(canvas);
    expect(backgrounds.layer.getAttribute('pointer-events')).toBe('none');
    expect(rects[0].getAttribute('y')).toBe('0');
    expect(rects[0].getAttribute('height')).toBe('120');
    expect(rects[1].getAttribute('y')).toBe('120');
    expect(rects[0].style.fill).toContain('#4c97ff 16%');
    expect(rects[1].style.fill).toContain('#9966ff 16%');
    backgrounds.dispose();
});

test('backgrounds track scrolling and zoom and rebuild when category layout changes', async () => {
    const {backgrounds, canvas, flyout, flyoutWorkspace, sections} = setup();
    canvas.setAttribute('transform', 'translate(0,-80) scale(0.75)');
    await Promise.resolve();
    expect(backgrounds.layer.getAttribute('transform')).toBe(canvas.getAttribute('transform'));
    flyoutWorkspace.scale = 0.75;
    sections[1].position = 200;
    flyout.recordCategoryScrollPositions_();
    expect(backgrounds.layer.children[0].getAttribute('height')).toBe('200');
    expect(Number(backgrounds.layer.children[0].getAttribute('width'))).toBeCloseTo(250 / 0.75);
    backgrounds.dispose();
});

test('dispose restores the dependency hook and removes decorative nodes', () => {
    const {backgrounds, flyout, originalRecord} = setup();
    backgrounds.dispose();
    expect(flyout.recordCategoryScrollPositions_).toBe(originalRecord);
    expect(document.querySelector('.paletteCategoryBackgrounds')).toBeNull();
});
