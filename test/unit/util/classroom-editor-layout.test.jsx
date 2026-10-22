/** @jest-environment jsdom */
import React, {useEffect, useRef} from 'react';
import {mount} from 'enzyme';
import {act} from 'react-dom/test-utils';
import EditorLayout, {EditorPanel} from '../../../src/components/editor-layout/editor-layout';
import {editorGeometry, fitStage} from '../../../src/lib/editor-layout';
import SheetTransition from '../../../src/components/editor-layout/sheet-transition';

jest.mock('../../../src/containers/controls.jsx', () => () => null);

const initial = {width: window.innerWidth, height: window.innerHeight};
const resize = (width, height) => {
    Object.defineProperty(window, 'innerWidth', {value: width, configurable: true});
    Object.defineProperty(window, 'innerHeight', {value: height, configurable: true});
    window.dispatchEvent(new Event('resize'));
};
afterEach(() => resize(initial.width, initial.height));

test.each([[360, 640], [480, 360], [480, 980]])('stage %sx%s fits every mobile display state without changing project dimensions', (w, h) => {
    for (const width of [320, 390, 844]) {
        for (const height of [390, 844]) {
            for (const panel of ['code', null, 'sprites', 'tutor']) {
                for (const preview of ['compact', 'hidden']) {
                    const result = editorGeometry({width, height, nativeWidth: w, nativeHeight: h, panel, preview});
                    expect(result.stage.width / result.stage.height).toBeCloseTo(w / h, 8);
                    expect(result.stage.width).toBeLessThanOrEqual(width);
                    expect(result.stage.height).toBeLessThanOrEqual(result.previewHeight);
                    expect(result.stage.widthDefault).toBe(w);
                    expect(result.stage.heightDefault).toBe(h);
                }
            }
        }
    }
});

test('portrait preview uses the approved 220px height with twelve pixels of vertical padding', () => {
    expect(fitStage(360, 640, 214, 220)).toMatchObject({width: 123.75, height: 220});
    const geometry = editorGeometry({width: 390, height: 844, nativeWidth: 360, nativeHeight: 640,
        panel: 'code', preview: 'compact'});
    expect(geometry.previewHeight).toBe(244);
    expect(geometry.codeHeight).toBe(528);
    expect(geometry.stage.height).toBe(220);
});

test('Code/Play, sheets, menu, preview collapse and desktop resize keep one mounted editor', () => {
    resize(390, 844);
    const mounts = jest.fn(); const disposals = jest.fn(); const activate = jest.fn();
    const Probe = () => {
        const identity = useRef('workspace-and-canvas');
        useEffect(() => { mounts(); return disposals; }, []);
        return <div data-probe={identity.current} />;
    };
    let wrapper;
    act(() => { wrapper = mount(<EditorLayout vm={{}} customStageSize={{width: 360, height: 640}}
        onActivateTab={activate}><EditorPanel name="menu" /><EditorPanel name="targets"><input data-sprite-draft defaultValue="Sprite1" /></EditorPanel><Probe /></EditorLayout>); });
    const probe = wrapper.find('[data-probe]').getDOMNode();
    const spriteDraft = wrapper.find('[data-sprite-draft]').getDOMNode();
    const clickNav = index => act(() => { wrapper.find('nav button').at(index).simulate('click'); });
    clickNav(0); wrapper.update();
    expect(wrapper.find('[data-editor-shell]').prop('data-panel')).toBe('play');
    clickNav(0); wrapper.update();
    expect(wrapper.find('[data-editor-shell]').prop('data-panel')).toBe('code');
    act(() => { wrapper.find('[aria-label="Open project menu"]').simulate('click'); }); wrapper.update();
    expect(wrapper.find('[data-editor-shell]').prop('data-menu-open')).toBe(true);
    clickNav(1); wrapper.update();
    expect(wrapper.find('[data-editor-shell]').prop('data-panel')).toBe('sprites');
    clickNav(2); wrapper.update();
    clickNav(0); wrapper.update();
    act(() => { wrapper.find('button').filterWhere(n => n.text() === 'Hide').simulate('click'); }); wrapper.update();
    expect(wrapper.find('[data-editor-shell]').prop('data-preview')).toBe('hidden');
    act(() => resize(1440, 1000)); wrapper.update();
    expect(wrapper.find('[data-editor-shell]').prop('data-mobile')).toBe(false);
    expect(wrapper.find('[data-probe]').getDOMNode()).toBe(probe);
    expect(wrapper.find('[data-sprite-draft]').getDOMNode()).toBe(spriteDraft);
    expect(mounts).toHaveBeenCalledTimes(1);
    expect(disposals).not.toHaveBeenCalled();
    wrapper.unmount();
    expect(disposals).toHaveBeenCalledTimes(1);
});

test('short landscape phones reserve enough Code height for the workspace zoom controls', () => {
    const geometry = editorGeometry({width: 844, height: 390, nativeWidth: 360, nativeHeight: 640,
        panel: 'code', preview: 'compact'});
    expect(geometry.codeHeight).toBe(220);
    expect(geometry.previewHeight).toBe(98);
});

test.each([1, 2])('return asset tab %s to Code on mobile without remounting the editor', tab => {
    resize(1440, 1000);
    const activate = jest.fn();
    let wrapper;
    act(() => { wrapper = mount(<EditorLayout vm={{}} customStageSize={{width: 480, height: 980}}
        activeTabIndex={tab} onActivateTab={activate}>
        {({mobile}) => <div data-probe="editor" data-mobile-assets-disabled={mobile} />}
    </EditorLayout>); });
    const editor = wrapper.find('[data-probe]').getDOMNode();
    expect(activate).not.toHaveBeenCalled();
    act(() => resize(390, 844)); wrapper.update();
    expect(activate).toHaveBeenLastCalledWith(0);
    expect(wrapper.find('[data-probe]').prop('data-mobile-assets-disabled')).toBe(true);
    expect(wrapper.find('[data-probe]').getDOMNode()).toBe(editor);
    // Another request to open an asset editor while already on mobile is also
    // redirected, rather than leaving the user on a hidden tab.
    act(() => { wrapper.setProps({activeTabIndex: 0}); });
    activate.mockClear();
    act(() => { wrapper.setProps({activeTabIndex: tab}); });
    expect(activate).toHaveBeenCalledWith(0);
    act(() => resize(1440, 1000)); wrapper.update();
    activate.mockClear();
    act(() => { wrapper.setProps({activeTabIndex: 0}); });
    act(() => { wrapper.setProps({activeTabIndex: tab}); });
    expect(activate).not.toHaveBeenCalled();
    expect(wrapper.find('[data-probe]').prop('data-mobile-assets-disabled')).toBe(false);
    wrapper.unmount();
});


test.each([false, true])('sheets disable closing content and cancel disposal on rapid reopening (retained: %s)', keepMounted => {
    jest.useFakeTimers();
    const mounts = jest.fn(); const disposals = jest.fn();
    const Probe = () => {
        useEffect(() => { mounts(); return disposals; }, []);
        return <input defaultValue="draft" />;
    };
    let wrapper;
    act(() => { wrapper = mount(<SheetTransition open keepMounted={keepMounted}><section><Probe /></section></SheetTransition>); });
    const input = wrapper.find('input').getDOMNode();
    act(() => { wrapper.setProps({open: false}); }); wrapper.update();
    expect(wrapper.find('section').prop('data-sheet-state')).toBe('closing');
    expect(wrapper.find('section').prop('aria-hidden')).toBe(true);
    expect(wrapper.find('section').prop('inert')).toBe('');
    act(() => { jest.advanceTimersByTime(90); wrapper.setProps({open: true}); });
    act(() => { jest.advanceTimersByTime(180); }); wrapper.update();
    expect(wrapper.find('input').getDOMNode()).toBe(input);
    expect(mounts).toHaveBeenCalledTimes(1);
    expect(disposals).not.toHaveBeenCalled();
    expect(wrapper.find('section').prop('data-sheet-state')).toBe('open');
    expect(wrapper.find('section').prop('inert')).toBe(null);
    act(() => { wrapper.setProps({open: false}); });
    act(() => { jest.advanceTimersByTime(180); }); wrapper.update();
    expect(wrapper.find('input')).toHaveLength(keepMounted ? 1 : 0);
    wrapper.unmount();
    jest.useRealTimers();
});
