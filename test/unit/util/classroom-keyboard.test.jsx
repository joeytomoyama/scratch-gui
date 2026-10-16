/** @jest-environment jsdom */
import React from 'react';
import {mount} from 'enzyme';
import configureStore from 'redux-mock-store';
import VM from 'scratch-vm';
import vmListenerHOC from '../../../src/lib/vm-listener-hoc';

jest.mock('scratch-vm', () => {
    const {EventEmitter} = require('events');
    return class extends EventEmitter {
        constructor () {
            super();
            this.runtime = new EventEmitter();
            this.runtime.ioDevices = {keyboard: {hasUsedKey: () => false}};
        }
    };
});

let wrapper;
let vm;
beforeEach(() => {
    vm = new VM();
    vm.postIOData = jest.fn();
    const store = configureStore()({scratchGui: {
        vm, mode: {}, modals: {}, tw: {hasCloudVariables: false}, editorTab: {activeTabIndex: 0}
    }});
    const Listener = vmListenerHOC(() => <div />);
    wrapper = mount(<Listener store={store} />);
    vm.postIOData.mockClear();
});
afterEach(() => {
    wrapper.unmount();
    document.body.innerHTML = '';
});

test.each(['button', 'input', 'textarea', 'select'])('UI %s key releases retain browser defaults', tag => {
    const control = document.createElement(tag);
    document.body.appendChild(control);
    const down = new KeyboardEvent('keydown', {key: ' ', keyCode: 32, bubbles: true, cancelable: true});
    control.dispatchEvent(down);
    expect(vm.postIOData).not.toHaveBeenCalled();
    expect(down.defaultPrevented).toBe(false);
    const up = new KeyboardEvent('keyup', {key: ' ', keyCode: 32, bubbles: true, cancelable: true});
    control.dispatchEvent(up);
    expect(up.defaultPrevented).toBe(false);
    expect(vm.postIOData).toHaveBeenLastCalledWith('keyboard', {key: ' ', keyCode: 32, isDown: false});
});

test('Enter key releases on buttons retain browser defaults', () => {
    const button = document.createElement('button');
    document.body.appendChild(button);
    const event = new KeyboardEvent('keyup', {key: 'Enter', keyCode: 13, bubbles: true, cancelable: true});
    button.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
});

test.each([32, 37, 38, 39, 40])('game key %s still prevents page scrolling', keyCode => {
    const event = new KeyboardEvent('keydown', {keyCode, bubbles: true, cancelable: true});
    document.body.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(vm.postIOData).toHaveBeenLastCalledWith('keyboard', {key: keyCode, keyCode, isDown: true});
});

test('game keys are released even when focus moves to a UI control', () => {
    document.body.dispatchEvent(new KeyboardEvent('keydown', {key: 'a', keyCode: 65, bubbles: true}));
    const button = document.createElement('button');
    document.body.appendChild(button);
    button.focus();
    button.dispatchEvent(new KeyboardEvent('keyup', {key: 'a', keyCode: 65, bubbles: true}));
    expect(vm.postIOData.mock.calls).toEqual([
        ['keyboard', {key: 'a', keyCode: 65, isDown: true}],
        ['keyboard', {key: 'a', keyCode: 65, isDown: false}]
    ]);
});

test.each([[8, 'backspace'], [46, 'delete']])('game-used %s does not delete workspace blocks', (keyCode, key) => {
    jest.spyOn(vm.runtime.ioDevices.keyboard, 'hasUsedKey').mockReturnValue(true);
    const listener = jest.fn();
    document.addEventListener('keydown', listener);
    document.body.dispatchEvent(new KeyboardEvent('keydown', {key, keyCode, bubbles: true, cancelable: true}));
    expect(listener).not.toHaveBeenCalled();
    document.removeEventListener('keydown', listener);
});
