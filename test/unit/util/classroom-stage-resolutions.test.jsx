/** @jest-environment jsdom */
import React from 'react';
import {mount} from 'enzyme';
import {Provider} from 'react-redux';
import {IntlProvider} from 'react-intl';
import configureStore from 'redux-mock-store';
import SettingsModal from '../../../src/containers/tw-settings-modal';
import {stageResolutions, stageResolutionForSize} from '../../../src/lib/stage-resolutions';

jest.mock('../../../src/containers/modal.jsx', () => props => <div>{props.children}</div>);

const setup = (width = 480, height = 360) => {
    const vm = {setStageSize: jest.fn(), storeProjectOptions: jest.fn()};
    const store = configureStore()({scratchGui: {
        vm, mode: {isEmbedded: false}, customStageSize: {width, height},
        tw: {framerate: 30, interpolation: false, highQualityPen: false,
            runtimeOptions: {maxClones: 300, fencing: true, miscLimits: true},
            compilerOptions: {enabled: true, warpTimer: true}}
    }});
    const wrapper = mount(<IntlProvider locale="en"><Provider store={store}><SettingsModal /></Provider></IntlProvider>);
    return {wrapper, vm, select: wrapper.find('select')};
};

test('settings offer only Default and Mobile and apply each pair of dimensions atomically', () => {
    const {wrapper, vm, select} = setup();
    expect(select).toHaveLength(1);
    expect(select.find('option').map(option => option.text())).toEqual([
        'Default (480 × 360)', 'Mobile (360 × 640)'
    ]);
    expect(select.prop('value')).toBe('default');
    expect(select.closest('label').text()).toContain('Game resolution');
    expect(wrapper.find('input[type="number"]')).toHaveLength(0);
    select.simulate('change', {target: {value: 'mobile'}});
    select.simulate('change', {target: {value: 'default'}});
    expect(vm.setStageSize.mock.calls).toEqual([[360, 640], [480, 360]]);
    for (const value of ['640x360', '', 'constructor', '__proto__']) {
        select.simulate('change', {target: {value}});
    }
    expect(vm.setStageSize).toHaveBeenCalledTimes(2);
    wrapper.find('button').filterWhere(button => button.text() === 'Store settings in project').simulate('click');
    expect(vm.storeProjectOptions).toHaveBeenCalledTimes(1);
    wrapper.unmount();
});

test('mobile projects select Mobile; opening legacy dimensions never silently resizes them', () => {
    const mobile = setup(360, 640);
    expect(mobile.select.prop('value')).toBe('mobile');
    mobile.wrapper.unmount();
    const legacy = setup(480, 980);
    expect(legacy.select.prop('value')).toBe('');
    expect(legacy.select.find('option').filterWhere(option => !option.prop('disabled'))
        .map(option => option.prop('value'))).toEqual(['default', 'mobile']);
    expect(legacy.vm.setStageSize).not.toHaveBeenCalled();
    legacy.select.simulate('change', {target: {value: 'mobile'}});
    expect(legacy.vm.setStageSize).toHaveBeenCalledWith(360, 640);
    legacy.wrapper.unmount();
});

test('resolution identity uses exact dimensions, including the 9:16 mobile aspect ratio', () => {
    expect(stageResolutionForSize(480, 360)).toBe('default');
    expect(stageResolutionForSize(360, 640)).toBe('mobile');
    expect(stageResolutionForSize(720, 1280)).toBe('');
    expect(stageResolutionForSize(480, 980)).toBe('');
    expect(stageResolutions.mobile.width / stageResolutions.mobile.height).toBe(9 / 16);
});
