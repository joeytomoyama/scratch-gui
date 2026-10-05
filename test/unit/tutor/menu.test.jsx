/** @jest-environment jsdom */
import React from 'react';
import {shallow, mount} from 'enzyme';
import {JsonView} from 'react-json-view-lite';
import {EventEmitter} from 'events';
import {randomUUID} from 'crypto';
import TutorMenu from '../../../src/components/tutor/tutor-menu';
import {getAccountService} from '../../../src/lib/account/service';
import {accountProjectAPI} from '../../../src/lib/private-project-api';
jest.mock('../../../src/lib/account/service', () => ({getAccountService: jest.fn()}));
jest.mock('../../../src/lib/private-project-api', () => ({
    ...jest.requireActual('../../../src/lib/private-project-api'), accountProjectAPI: jest.fn()
}));
beforeAll(() => {
    // jsdom does not supply the browser's secure-context UUID API.
    Object.defineProperty(global.crypto, 'randomUUID', {value: randomUUID, configurable: true});
});
test('opening tutor or editing never requests context; Ask does not trigger persistence', async () => {
    process.env.BACKEND_BASE_URL = 'http://127.0.0.1:3001';
    const api = {ask: jest.fn(async body => ({requestId: body.requestId, status: 'acknowledged'})), dispose: jest.fn()};
    accountProjectAPI.mockReturnValue(api);
    getAccountService.mockReturnValue({subscribe: callback => {callback({user: {id: 'alice'}}); return () => {};}});
    const vm = new EventEmitter(); vm.runtime = new EventEmitter();
    vm.toJSON = jest.fn(() => JSON.stringify({targets: [{name: 'Latest sprite', blocks: {}}]}));
    const save = jest.fn(); vm.on('PRIVATE_PROJECT_SAVE', save);
    const wrapper = shallow(<TutorMenu vm={vm} ready />);
    wrapper.setState({open: true, question: 'How?'}); vm.emit('PROJECT_CHANGED');
    expect(api.ask).not.toHaveBeenCalled();
    await wrapper.instance().ask();
    expect(wrapper.state('open')).toBe(false);
    expect(api.ask).toHaveBeenCalledTimes(1); expect(save).not.toHaveBeenCalled();
    expect(api.ask.mock.calls[0][0].context.text).toContain('Latest sprite');
    expect(vm.toJSON).toHaveBeenCalledWith(null, {allowOptimization: false});
    expect(api.ask.mock.calls[0][0].projectId).toBeUndefined();
    const projectId = 'd6db2c94-636c-4161-a64e-03cbee6881b5';
    wrapper.setProps({projectId});
    await wrapper.instance().ask();
    expect(api.ask.mock.calls[1][0].projectId).toBe(projectId);
    wrapper.setProps({projectId: '0'});
    await wrapper.instance().ask(true);
    expect(api.ask.mock.calls[2][0]).toEqual(api.ask.mock.calls[1][0]);
    wrapper.unmount();
});

test('full feedback stays in the collapsible corner viewer and is not interpreted as HTML', async () => {
    process.env.BACKEND_BASE_URL = 'http://127.0.0.1:3001';
    const text = 'Check the jump condition. <script>not HTML</script>';
    const feedback = {id: 'reply-id', text, audio: false, highlights: {
        blocks: [{category: 'control', sprite: 'Student', id: 'wait-id', opcode: 'control_wait', action: 'remove'}]
    }};
    accountProjectAPI.mockReturnValue({ask: jest.fn(async body => ({requestId: body.requestId,
        status: 'complete', feedback})), dispose: jest.fn()});
    getAccountService.mockReturnValue({subscribe: callback => {callback({user: {id: 'alice'}}); return () => {};}});
    const vm = new EventEmitter(); vm.runtime = new EventEmitter();
    vm.toJSON = () => JSON.stringify({targets: [{name: 'Student', blocks: {}, meta: 'not sent'}]});
    const highlights = jest.fn(); vm.on('TUTOR_HIGHLIGHTS', highlights);
    const wrapper = shallow(<TutorMenu vm={vm} ready course={{course: 'jump-game'}} />);
    wrapper.setState({open: true, question: 'How do I jump?'});
    await wrapper.instance().ask();
    expect(highlights.mock.calls.some(([state]) => state?.receivedAt && state.hints)).toBe(true);
    expect(wrapper.find('[aria-label="AI tutor"]')).toHaveLength(0);
    expect(wrapper.find(JsonView).prop('data')).toEqual({request: null, response: feedback});
    const viewer = mount(wrapper.find(JsonView).getElement());
    viewer.find('[aria-label="expand JSON"]').first().simulate('click');
    expect(viewer.text()).toContain(text);
    expect(viewer.find('script')).toHaveLength(0);
    viewer.unmount();
    wrapper.find('button[aria-controls="tutor-reply-text"]').simulate('click');
    expect(wrapper.find('[aria-label="Tutor reply"]').prop('hidden')).toBe(true);
    expect(wrapper.find('button[aria-controls="tutor-reply-text"]').prop('aria-expanded')).toBe(false);
    expect(wrapper.find('button[aria-controls="tutor-reply-text"]').text()).toBe('Expand tutor reply');
    wrapper.find('button[aria-controls="tutor-reply-text"]').simulate('click');
    expect(wrapper.find('[aria-label="Tutor reply"]').prop('hidden')).toBe(false);
    expect(wrapper.find(JsonView).prop('data')).toEqual({request: null, response: feedback});
    expect(wrapper.find('script')).toHaveLength(0);
    expect(wrapper.find('[aria-label="AI tutor"]')).toHaveLength(0);
    wrapper.unmount();
    expect(highlights.mock.calls[highlights.mock.calls.length - 1][0]).toBe(null);
});

test('Ask accepts an empty question and reopens the reply for a new answer', async () => {
    process.env.BACKEND_BASE_URL = 'http://127.0.0.1:3001';
    const api = {ask: jest.fn(async body => ({requestId: body.requestId,
        status: 'complete', feedback: {text: 'Try adding keyboard input.'}})), dispose: jest.fn()};
    accountProjectAPI.mockReturnValue(api);
    getAccountService.mockReturnValue({subscribe: callback => {callback({user: {id: 'alice'}}); return () => {};}});
    const vm = new EventEmitter(); vm.runtime = new EventEmitter();
    vm.toJSON = () => JSON.stringify({targets: [{name: 'Motorcycle', blocks: {}}]});
    const wrapper = shallow(<TutorMenu vm={vm} ready course={{course: 'road'}} />);
    wrapper.setState({open: true, question: '', replyCollapsed: true});
    expect(wrapper.find('button').filterWhere(button => button.text().trim() === 'Ask now').prop('disabled')).toBe(false);
    await wrapper.instance().ask();
    expect(api.ask.mock.calls[0][0]).toMatchObject({question: '', course: {course: 'road'}});
    expect(api.ask.mock.calls[0][0].context.text).toContain('Motorcycle');
    expect(wrapper.find('[aria-label="Tutor reply"]').prop('hidden')).toBe(false);
    wrapper.unmount();
});

test('reply groups debug data under request and response and clears it on project change', async () => {
    process.env.BACKEND_BASE_URL = 'http://127.0.0.1:3001';
    const feedback = {text: 'Try input.'};
    const debugInput = {question: '', studentProject: {version: 1, text: 'Student'},
        completedReference: {version: 1, text: 'Reference'}};
    accountProjectAPI.mockReturnValue({ask: jest.fn(async body => ({requestId: body.requestId,
        status: 'complete', feedback, debugInput})), dispose: jest.fn()});
    getAccountService.mockReturnValue({subscribe: callback => {callback({user: {id: 'alice'}}); return () => {};}});
    const vm = new EventEmitter(); vm.runtime = new EventEmitter();
    vm.toJSON = () => JSON.stringify({targets: []});
    const wrapper = shallow(<TutorMenu vm={vm} ready />);
    await wrapper.instance().ask();
    expect(wrapper.find(JsonView).prop('data')).toEqual({request: debugInput, response: feedback});
    const viewer = mount(wrapper.find(JsonView).getElement());
    expect(viewer.text()).toContain('request');
    expect(viewer.text()).toContain('response');
    expect(viewer.text()).not.toContain('Reference');
    viewer.find('[aria-label="expand JSON"]').first().simulate('click');
    expect(viewer.text()).toContain('completedReference');
    viewer.find('[aria-label="collapse JSON"]').first().simulate('click');
    expect(viewer.text()).not.toContain('request');
    viewer.find('[aria-label="expand JSON"]').first().simulate('click');
    expect(viewer.text()).toContain('request');
    viewer.unmount();
    vm.runtime.emit('PROJECT_LOADED');
    expect(wrapper.state('debugInput')).toBe(null);
    expect(wrapper.find('[aria-label="Tutor reply"]')).toHaveLength(0);
    wrapper.unmount();
});

test('Ask closes immediately while pending and errors remain visible outside the closed panel', async () => {
    process.env.BACKEND_BASE_URL = 'http://127.0.0.1:3001';
    let reject;
    accountProjectAPI.mockReturnValue({ask: () => new Promise((resolve, fail) => {reject = fail;}), dispose: jest.fn()});
    getAccountService.mockReturnValue({subscribe: callback => {callback({user: {id: 'alice'}}); return () => {};}});
    const vm = new EventEmitter(); vm.runtime = new EventEmitter();
    vm.toJSON = () => JSON.stringify({targets: [{name: 'Student', blocks: {}}]});
    const wrapper = shallow(<TutorMenu vm={vm} ready />);
    wrapper.setState({open: true});
    const work = wrapper.instance().ask();
    expect(wrapper.state('open')).toBe(false);
    expect(wrapper.find('[aria-label="AI tutor"]')).toHaveLength(0);
    expect(wrapper.find('[role="status"]').text()).toBe('Waiting for tutor…');
    reject(new Error('Could not reach tutor.'));
    await work;
    expect(wrapper.find('[role="alert"]').text()).toBe('Could not reach tutor.');
    expect(wrapper.state('open')).toBe(false);
    wrapper.unmount();
});
