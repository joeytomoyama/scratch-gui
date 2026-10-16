/** @jest-environment jsdom */
import React from 'react';
import {shallow, mount} from 'enzyme';
import {EventEmitter} from 'events';
import ConnectedSaveStatus from '../../../src/components/menu-bar/tw-save-status';
import TutorMenu from '../../../src/components/tutor/tutor-menu';

jest.mock('../../../src/components/menu-bar/toolbar-button.css', () => ({
    button: 'toolbar-button', saveButton: 'save-button', spinner: 'save-spinner'
}));
jest.mock('../../../src/lib/account/service', () => ({getAccountService: () => null}));

const SaveStatus = ConnectedSaveStatus.WrappedComponent;

test.each(['Saved', 'Save failed: network error'])('styled Save preserves its action for status %s', status => {
    const onSave = jest.fn();
    const wrapper = shallow(<SaveStatus alertsList={[]} persistence={{status}} onSave={onSave} />);
    const button = wrapper.find('button');
    expect(button.prop('type')).toBe('button');
    expect(button.prop('className')).toContain('toolbar-button');
    expect(button.prop('disabled')).toBe(false);
    expect(button.text()).toBe(status === 'Saved' ? 'Saved' : 'Retry Save');
    expect(onSave).not.toHaveBeenCalled();
    button.simulate('click');
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(button.find('[role="status"]').text()).toBe(button.text());
    expect(button.prop('title')).toBe(status);
    wrapper.unmount();
});

test('saving shows a reduced-motion-compatible spinner, prevents clicks and re-enables after completion or failure', () => {
    const onSave = jest.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const wrapper = mount(<SaveStatus alertsList={[]} persistence={{status: 'Saving', saving: 0}} onSave={onSave} />,
        {attachTo: container});
    expect(wrapper.find('button').prop('aria-busy')).toBe(true);
    expect(wrapper.find('.save-spinner').prop('aria-hidden')).toBe('true');
    expect(wrapper.find('button').text()).toBe('Saving…');
    wrapper.find('button').getDOMNode().click();
    expect(onSave).not.toHaveBeenCalled();
    for (const status of ['Saved', 'Save failed — Retry', 'Unsaved']) {
        wrapper.setProps({persistence: {status}});
        expect(wrapper.find('button').prop('disabled')).toBe(false);
        expect(wrapper.find('button').prop('aria-busy')).toBe(false);
        expect(wrapper.find('.save-spinner')).toHaveLength(0);
    }
    expect(wrapper.find('button').text()).toBe('Save');
    wrapper.find('button').getDOMNode().click();
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).not.toContain('Save to your computer');
    wrapper.unmount();
    container.remove();
});

test.each(['Sign in to save', 'Reload to access this project'])('Save remains natively disabled for status %s', status => {
    const wrapper = shallow(<SaveStatus alertsList={[]} persistence={{status}} onSave={jest.fn()} />);
    expect(wrapper.find('button').prop('disabled')).toBe(true);
    wrapper.unmount();
});

test('Ask Tutor uses the same toolbar style and opening it does not serialize the project', () => {
    const vm = {runtime: new EventEmitter(), emit: jest.fn(), toJSON: jest.fn()};
    const wrapper = shallow(<TutorMenu vm={vm} ready />);
    const trigger = wrapper.find('button').first();
    expect(trigger.prop('className')).toBe('toolbar-button');
    expect(trigger.prop('type')).toBe('button');
    trigger.simulate('click');
    expect(trigger.text()).toBe('Ask Tutor');
    expect(wrapper.find('[aria-label="Tutor chat"]')).toHaveLength(1);
    expect(wrapper.find('button').first().prop('aria-expanded')).toBe(true);
    expect(vm.toJSON).not.toHaveBeenCalled();
    wrapper.unmount();
});
