/** @jest-environment jsdom */
import ResponsiveBlockPalette from '../../../src/lib/responsive-block-palette';

const setup = (width = 700, rtl = false) => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    let rootWidth = width;
    root.getBoundingClientRect = () => ({width: rootWidth, left: 0, right: rootWidth, top: 0, bottom: 600});
    let visible = true;
    const flyout = {
        autoClose: false,
        getWidth: () => 250,
        isVisible: () => visible,
        setVisible: jest.fn(value => { visible = value; }),
        svgGroup_: {getBoundingClientRect: () => ({left: rtl ? rootWidth - 310 : 60,
            right: rtl ? rootWidth - 60 : 310})},
        show: jest.fn(() => { visible = true; }),
        position: jest.fn()
    };
    const toolbox = {
        getWidth: () => 310,
        getClientRect: () => ({width: flyout.autoClose ? 60 : 310}),
        scrollToCategoryById: jest.fn(() => flyout.setVisible(true)),
        scrollToCategoryByName: jest.fn(() => flyout.setVisible(true))
    };
    const workspace = {
        RTL: rtl,
        getFlyout: () => flyout,
        toolbox_: toolbox,
        isDragging: jest.fn(() => false),
        resize: jest.fn(),
        currentGesture_: null
    };
    // Positioning must retain upstream width while workspace metrics reserve
    // only the rail. This is what keeps both LTR and RTL overlay origins stable.
    flyout.position.mockImplementation(() => toolbox.getWidth());
    const originals = {getWidth: toolbox.getWidth, position: flyout.position, show: flyout.show};
    const palette = new ResponsiveBlockPalette(workspace, root);
    return {palette, workspace, root, toolbox, flyout, originals, setWidth: value => { rootWidth = value; }};
};

afterEach(() => { document.body.innerHTML = ''; });

test('picking up a block inside the palette collapses it without a workspace resize', async () => {
    const s = setup();
    expect(s.flyout.isVisible()).toBe(false);
    expect(s.toolbox.getWidth()).toBe(60);
    s.toolbox.scrollToCategoryById('motion');
    expect(s.flyout.isVisible()).toBe(true);
    expect(s.flyout.position()).toBe(310);
    expect(s.toolbox.getWidth()).toBe(60);
    const resizes = s.workspace.resize.mock.calls.length;
    s.workspace.currentGesture_ = {flyout_: s.flyout, isDraggingBlock_: true};
    document.dispatchEvent(new MouseEvent('mousemove', {clientX: 160, clientY: 100}));
    await Promise.resolve();
    expect(s.flyout.isVisible()).toBe(false);
    expect(s.workspace.resize).toHaveBeenCalledTimes(resizes);
    s.toolbox.scrollToCategoryById('motion'); // Same selected category still reopens.
    expect(s.flyout.isVisible()).toBe(true);
    expect(s.flyout.autoClose).toBe(false); // Preserve upstream click/drag semantics.
    s.palette.dispose();
});

test('palette scrolling, clicks and workspace dragging do not collapse it', () => {
    const s = setup();
    s.toolbox.scrollToCategoryByName('Motion');
    s.workspace.currentGesture_ = {flyout_: s.flyout, isDraggingBlock_: false};
    s.palette.collapseAfterDrag(350, 100);
    s.workspace.currentGesture_ = {flyout_: null, isDraggingBlock_: true};
    s.palette.collapseAfterDrag(350, 100);
    s.workspace.currentGesture_ = null;
    s.palette.collapseAfterDrag();
    expect(s.flyout.isVisible()).toBe(true);
    s.palette.dispose();
});

test('touch block pickup collapses inside an RTL palette', async () => {
    const s = setup(700, true);
    s.toolbox.scrollToCategoryById('motion');
    s.workspace.currentGesture_ = {flyout_: s.flyout, isDraggingBlock_: true};
    const event = new Event('touchmove');
    Object.defineProperty(event, 'touches', {value: [{clientX: 500, clientY: 100}]});
    document.dispatchEvent(event);
    await Promise.resolve();
    expect(s.flyout.isVisible()).toBe(false);
    s.palette.dispose();
});

test('palette rebuilds preserve collapsed or explicitly opened state', () => {
    const s = setup();
    s.flyout.show([]);
    expect(s.flyout.isVisible()).toBe(false);
    s.toolbox.scrollToCategoryById('data');
    s.flyout.show([]);
    expect(s.flyout.isVisible()).toBe(true);
    s.palette.dispose();
});

test('wide panes retain the full palette, and resizing transitions in both directions', () => {
    const s = setup(1000);
    expect(s.flyout.isVisible()).toBe(true);
    expect(s.toolbox.getWidth()).toBe(310);
    s.setWidth(700);
    window.dispatchEvent(new Event('resize'));
    expect(s.flyout.isVisible()).toBe(false);
    s.setWidth(1000);
    window.dispatchEvent(new Event('resize'));
    expect(s.flyout.isVisible()).toBe(true);
    expect(s.toolbox.getWidth()).toBe(310);
    s.palette.dispose();
});

test('hidden tabs and in-progress drags defer responsive changes until the gesture ends', async () => {
    const s = setup(1000);
    s.setWidth(0);
    s.palette.updateLayout();
    expect(s.palette.compact).toBe(false);
    s.setWidth(700);
    s.workspace.isDragging.mockReturnValue(true);
    s.palette.updateLayout();
    expect(s.palette.compact).toBe(false);
    s.workspace.isDragging.mockReturnValue(false);
    document.dispatchEvent(new MouseEvent('mouseup'));
    await Promise.resolve();
    expect(s.palette.compact).toBe(true);
    s.palette.dispose();
});

test('compact deletion targets cover only the rail, and disposal restores hooks and ignores pending moves', async () => {
    const s = setup();
    expect(s.toolbox.getClientRect().width).toBe(60);
    expect(s.flyout.autoClose).toBe(false);
    s.toolbox.scrollToCategoryById('motion');
    s.workspace.currentGesture_ = {flyout_: s.flyout, isDraggingBlock_: true};
    document.dispatchEvent(new MouseEvent('mousemove', {clientX: 350, clientY: 100}));
    s.palette.dispose();
    await Promise.resolve();
    expect(s.flyout.isVisible()).toBe(true);
    expect(s.toolbox.getWidth).toBe(s.originals.getWidth);
    expect(s.flyout.position).toBe(s.originals.position);
    expect(s.flyout.show).toBe(s.originals.show);
    expect(s.root.hasAttribute('data-compact-palette')).toBe(false);
});
