/** @jest-environment jsdom */
import React, {useEffect, useRef} from 'react';
import {mount} from 'enzyme';
import {act} from 'react-dom/test-utils';
import EditorLayout, {EditorPanel} from '../../../src/components/editor-layout/editor-layout';
import {editorGeometry, fitStage} from '../../../src/lib/editor-layout';

jest.mock('../../../src/containers/controls.jsx', () => () => null);

const initial = {width: window.innerWidth, height: window.innerHeight};
const resize = (width, height) => {
    Object.defineProperty(window, 'innerWidth', {value: width, configurable: true});
    Object.defineProperty(window, 'innerHeight', {value: height, configurable: true});
    window.dispatchEvent(new Event('resize'));
};
afterEach(() => resize(initial.width, initial.height));

test.each([[360, 640], [480, 360]])('stage %sx%s fits every mobile display state without changing project dimensions', (w, h) => {
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
        onActivateTab={activate}><EditorPanel name="menu" /><EditorPanel name="targets" /><Probe /></EditorLayout>); });
    const probe = wrapper.find('[data-probe]').getDOMNode();
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
