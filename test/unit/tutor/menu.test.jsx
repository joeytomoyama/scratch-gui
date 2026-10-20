/** @jest-environment jsdom */
import React from 'react';
import {shallow, mount} from 'enzyme';
import {JsonView} from 'react-json-view-lite';
import {EventEmitter} from 'events';
import {randomUUID} from 'crypto';
import EditorContext from '../../../src/components/editor-layout/editor-context';
import TutorMenu from '../../../src/components/tutor/tutor-menu';
import {getAccountService} from '../../../src/lib/account/service';
import {accountProjectAPI} from '../../../src/lib/private-project-api';
import {VoiceRecorder} from '../../../src/lib/tutor/voice-recorder';
import {classroomLocales} from '../../../src/lib/classroom-locales';

jest.mock('../../../src/lib/account/service', () => ({getAccountService: jest.fn()}));
jest.mock('../../../src/lib/private-project-api', () => ({
    ...jest.requireActual('../../../src/lib/private-project-api'), accountProjectAPI: jest.fn()
}));

let wrapper;
let container;
let accountChanged;
const previousBackendURL = process.env.BACKEND_BASE_URL;
beforeAll(() => {
    Object.defineProperty(global.crypto, 'randomUUID', {value: randomUUID, configurable: true});
});
beforeEach(() => {
    jest.clearAllMocks();
    process.env.BACKEND_BASE_URL = 'http://127.0.0.1:3001';
});
afterEach(() => {
    if (wrapper) wrapper.unmount();
    container?.remove();
    wrapper = null; container = null;
});
afterAll(() => {
    if (previousBackendURL === undefined) delete process.env.BACKEND_BASE_URL;
    else process.env.BACKEND_BASE_URL = previousBackendURL;
});

const setup = ({user = {id: 'alice'}, ready = true, mounted = false, locale = 'en', answer = {text: 'Try adding keyboard input.'}} = {}) => {
    const api = {ask: jest.fn(async body => ({requestId: body.requestId, status: 'complete', feedback: answer})), dispose: jest.fn()};
    accountProjectAPI.mockReturnValue(api);
    getAccountService.mockReturnValue({subscribe: callback => {
        accountChanged = callback; callback({user}); return jest.fn();
    }});
    const vm = new EventEmitter(); vm.runtime = new EventEmitter();
    vm.toJSON = jest.fn(() => JSON.stringify({targets: [{name: 'Latest sprite', blocks: {}}]}));
    const element = <TutorMenu vm={vm} ready={ready} locale={locale} course={{course: 'road'}} />;
    if (mounted) {
        container = document.createElement('div'); document.body.appendChild(container);
        wrapper = mount(element, {attachTo: container});
    } else wrapper = shallow(element);
    // Session initialization captures a local baseline; assertions below count user actions.
    vm.toJSON.mockClear();
    return {api, vm};
};

test('opening or typing never sends context; sending keeps one chat open and does not save', async () => {
    const {api, vm} = setup();
    const save = jest.fn(); vm.on('PRIVATE_PROJECT_SAVE', save);
    wrapper.find('button').first().simulate('click');
    wrapper.find('textarea').simulate('change', {target: {value: 'How?'}});
    vm.emit('PROJECT_CHANGED');
    expect(wrapper.find('button').first().text()).toBe('Ask Tutor');
    expect(wrapper.find('[aria-label="Tutor chat"]')).toHaveLength(1);
    expect(wrapper.text()).not.toContain('Only pressing Ask sends');
    expect(api.ask).not.toHaveBeenCalled();
    expect(vm.toJSON).not.toHaveBeenCalled();
    await wrapper.instance().ask();
    expect(wrapper.state('open')).toBe(true);
    expect(wrapper.state('question')).toBe('');
    expect(wrapper.find('[role="log"]').text()).toContain('How?');
    expect(wrapper.find('[role="log"]').text()).toContain('Try adding keyboard input.');
    expect(wrapper.find('[aria-label="Tutor chat"]')).toHaveLength(1);
    expect(wrapper.find(JsonView)).toHaveLength(0);
    expect(save).not.toHaveBeenCalled();
    expect(api.ask.mock.calls[0][0]).toMatchObject({question: 'How?', course: {course: 'road'}});
    expect(api.ask.mock.calls[0][0].context.text).toContain('Latest sprite');
    expect(vm.toJSON).toHaveBeenCalledWith(null, {allowOptimization: false});
    expect(api.ask.mock.calls[0][0].projectId).toBeUndefined();
});

test('multiple questions and answers remain ordered and survive closing and reopening', async () => {
    const {api} = setup();
    for (const question of ['First question', 'Second question']) {
        api.ask.mockImplementationOnce(async body => ({requestId: body.requestId, status: 'complete', feedback: {text: `Answer to ${question}`}}));
        wrapper.setState({question});
        await wrapper.instance().ask();
    }
    const log = wrapper.find('[role="log"]').text();
    expect(log.indexOf('First question')).toBeLessThan(log.indexOf('Answer to First question'));
    expect(log.indexOf('Answer to First question')).toBeLessThan(log.indexOf('Second question'));
    expect(wrapper.state('exchanges')).toHaveLength(2);
    wrapper.instance().close();
    expect(wrapper.find('[aria-label="Tutor chat"]')).toHaveLength(0);
    wrapper.find('button').first().simulate('click');
    expect(wrapper.find('[role="log"]').text()).toBe(log);
    expect(api.ask).toHaveBeenCalledTimes(2);
    expect(api.ask.mock.calls[1][0].recentConversation).toEqual([
        {question: 'First question', reply: 'Answer to First question'}
    ]);
});

test('optional blank question requests a hint and includes the actual project ID', async () => {
    const {api} = setup();
    const projectId = 'd6db2c94-636c-4161-a64e-03cbee6881b5';
    wrapper.setProps({projectId});
    await wrapper.instance().ask();
    expect(api.ask.mock.calls[0][0]).toMatchObject({question: '', projectId});
    expect(wrapper.find('[role="log"]').text()).toContain('Suggest a next step.');
    wrapper.setProps({projectId: '0'});
    await wrapper.instance().ask();
    expect(api.ask.mock.calls[1][0].projectId).toBeUndefined();
});

test('plain tutor text is escaped, highlights still fire, and JSON stays collapsible', async () => {
    const text = 'Check the jump condition. <script>not HTML</script>';
    const answer = {id: 'reply-id', text, highlights: {blocks: [{category: 'control', opcode: 'control_wait', action: 'add'}]}};
    const {vm} = setup({answer});
    const highlights = jest.fn(); vm.on('TUTOR_HIGHLIGHTS', highlights);
    await wrapper.instance().ask();
    expect(wrapper.find('[role="log"]').text()).toContain(text);
    expect(wrapper.find('script')).toHaveLength(0);
    expect(highlights.mock.calls.some(([state]) => state?.receivedAt && state.hints)).toBe(true);
    wrapper.find('[aria-label="Show JSON"]').simulate('click');
    expect(wrapper.find(JsonView).prop('data')).toEqual({request: null, response: answer});
    expect(wrapper.find('[role="log"]').prop('hidden')).toBe(true);
    const viewer = mount(wrapper.find(JsonView).getElement());
    viewer.find('[aria-label="expand JSON"]').first().simulate('click');
    expect(viewer.text()).toContain(text);
    expect(viewer.find('script')).toHaveLength(0);
    viewer.find('[aria-label="collapse JSON"]').first().simulate('click');
    expect(viewer.text()).not.toContain('response');
    viewer.unmount();
    wrapper.find('[aria-label="Show chat"]').simulate('click');
    expect(wrapper.find('[role="log"]').text()).toContain(text);
    wrapper.unmount(); wrapper = null;
    expect(highlights.mock.calls[highlights.mock.calls.length - 1][0]).toBe(null);
});

test('JSON can inspect earlier exchanges as a single request/response object', async () => {
    const {api} = setup();
    const replies = [];
    for (const question of ['First', 'Second']) {
        const feedback = {text: `${question} answer`};
        const debugInput = {question, studentProject: {text: 'Student'}, completedReference: {text: 'Reference'}};
        replies.push({request: debugInput, response: feedback});
        api.ask.mockImplementationOnce(async body => ({requestId: body.requestId, status: 'complete', feedback, debugInput}));
        wrapper.setState({question}); await wrapper.instance().ask();
    }
    wrapper.find('[aria-label="Show JSON"]').simulate('click');
    expect(wrapper.find(JsonView).prop('data')).toEqual(replies[1]);
    wrapper.find('[aria-label="Inspect exchange"]').simulate('change', {target: {value: String(wrapper.state('exchanges')[0].id)}});
    expect(wrapper.find(JsonView).prop('data')).toEqual(replies[0]);
});

test('JSON shows transient highlight rejection diagnostics and retains them on cached retry', async () => {
    const {api} = setup();
    const debugHighlights = {received: 2, accepted: 1, rejected: 1,
        reasons: [{index: 1, reason: 'category_mismatch', expectedCategory: 'control'}]};
    const feedback = {text: 'Check this block.', highlights: {blocks: []}};
    api.ask.mockImplementationOnce(async body => ({requestId: body.requestId, status: 'complete',
        feedback, debugHighlights}));
    wrapper.setState({question: 'Help'}); await wrapper.instance().ask();
    wrapper.find('[aria-label="Show JSON"]').simulate('click');
    expect(wrapper.find(JsonView).prop('data').highlightDiagnostics).toEqual(debugHighlights);
    api.ask.mockImplementationOnce(async body => ({requestId: body.requestId, status: 'complete', feedback}));
    await wrapper.instance().ask(true);
    expect(wrapper.find(JsonView).prop('data').highlightDiagnostics).toEqual(debugHighlights);
});

test('pending requests prevent duplicate sends, and closing does not lose the reply', async () => {
    const {api} = setup();
    let finish;
    api.ask.mockImplementationOnce(body => new Promise(resolve => {finish = () => resolve({requestId: body.requestId, status: 'complete', feedback: {text: 'Ready'}});}));
    wrapper.setState({question: 'Help'});
    const work = wrapper.instance().ask();
    expect(wrapper.find('textarea').prop('disabled')).toBe(false);
    expect(wrapper.find('ButtonComponent').prop('disabled')).toBe(true);
    expect(wrapper.find('[role="log"]').text()).toContain('Waiting for tutor…');
    await wrapper.instance().ask();
    expect(api.ask).toHaveBeenCalledTimes(1);
    wrapper.setState({question: 'A draft for the next question'});
    wrapper.instance().close(); finish(); await work;
    expect(wrapper.state('question')).toBe('A draft for the next question');
    expect(wrapper.state('open')).toBe(false);
    wrapper.find('button').first().simulate('click');
    expect(wrapper.find('[role="log"]').text()).toContain('Ready');
});

test('failed transport remains in the chat and retries the same exchange and snapshot', async () => {
    const {api, vm} = setup();
    api.ask.mockRejectedValueOnce(new Error('Could not reach tutor.'));
    wrapper.setState({question: 'Original question'});
    await wrapper.instance().ask();
    expect(wrapper.find('[role="alert"]').text()).toBe('Could not reach tutor.');
    expect(wrapper.text()).toContain('Retry same request');
    wrapper.setState({question: 'Draft for later'});
    await wrapper.instance().ask(true);
    expect(wrapper.state('exchanges')).toHaveLength(1);
    expect(wrapper.state('exchanges')[0].question).toBe('Original question');
    expect(wrapper.state('question')).toBe('Draft for later');
    expect(wrapper.find('[role="alert"]')).toHaveLength(0);
    expect(api.ask.mock.calls[1][0]).toEqual(api.ask.mock.calls[0][0]);
    expect(vm.toJSON).toHaveBeenCalledTimes(1);
});

test('processing retries preserve provider debug input when the cache omits it', async () => {
    const {api} = setup();
    const debugInput = {studentProject: {text: 'Student'}};
    api.ask.mockImplementationOnce(async body => ({requestId: body.requestId, status: 'processing', debugInput}));
    await wrapper.instance().ask();
    expect(wrapper.text()).toContain('Analysis is pending');
    await wrapper.instance().ask(true);
    wrapper.find('[aria-label="Show JSON"]').simulate('click');
    expect(wrapper.find(JsonView).prop('data').request).toEqual(debugInput);
    expect(wrapper.state('exchanges')).toHaveLength(1);
});

test.each(['project', 'account'])('%s changes clear conversation/debug data and ignore old in-flight replies', async reason => {
    const {api, vm} = setup();
    await wrapper.instance().ask();
    let finish;
    api.ask.mockImplementationOnce(body => new Promise(resolve => {finish = () => resolve({requestId: body.requestId, status: 'complete', feedback: {text: 'Old answer'}});}));
    const work = wrapper.instance().ask();
    if (reason === 'project') vm.runtime.emit('PROJECT_LOADED');
    else accountChanged({user: null});
    finish(); await work;
    expect(wrapper.state('exchanges')).toEqual([]);
    expect(wrapper.state('busy')).toBe(false);
    expect(wrapper.state('selected')).toBe(null);
    expect(wrapper.text()).not.toContain('Old answer');
    expect(api.dispose).toHaveBeenCalled();
});

test.each([{user: null}, {ready: false}])('sending is unavailable without an account or loaded project (%j)', async options => {
    const {api, vm} = setup(options);
    wrapper.setState({open: true});
    expect(wrapper.find('textarea').prop('disabled')).toBe(true);
    await wrapper.instance().ask();
    expect(api.ask).not.toHaveBeenCalled();
    expect(vm.toJSON).not.toHaveBeenCalled();
});

test('Enter sends; Shift+Enter and IME composition do not send', async () => {
    setup(); wrapper.setState({open: true});
    const ask = jest.spyOn(wrapper.instance(), 'ask').mockResolvedValue();
    const preventDefault = jest.fn();
    for (const options of [{shiftKey: true}, {nativeEvent: {isComposing: true}}, {keyCode: 229}]) {
        wrapper.find('textarea').simulate('keydown', {key: 'Enter', nativeEvent: {}, preventDefault, ...options});
    }
    expect(ask).not.toHaveBeenCalled();
    expect(preventDefault).not.toHaveBeenCalled();
    wrapper.find('textarea').simulate('keydown', {key: 'Enter', nativeEvent: {}, preventDefault});
    expect(ask).toHaveBeenCalledTimes(1);
    expect(preventDefault).toHaveBeenCalledTimes(1);
});

test('the message log scrolls after sends/replies and reopening, with no scrolling while closed', async () => {
    const {api} = setup({mounted: true});
    wrapper.find('button').first().simulate('click');
    const log = wrapper.find('[role="log"]').getDOMNode();
    Object.defineProperty(log, 'scrollHeight', {value: 500, configurable: true});
    await wrapper.instance().ask(); wrapper.update();
    expect(log.scrollTop).toBe(500);
    log.scrollTop = 0;
    Object.defineProperty(log, 'scrollHeight', {value: 750, configurable: true});
    let finish;
    api.ask.mockImplementationOnce(body => new Promise(resolve => {finish = () => resolve({requestId: body.requestId, status: 'complete', feedback: {text: 'Newest answer'}});}));
    const work = wrapper.instance().ask();
    expect(log.scrollTop).toBe(750);
    log.scrollTop = 0; finish(); await work;
    expect(log.scrollTop).toBe(750);
    wrapper.instance().close();
    const instance = wrapper.instance();
    const detachedLog = {scrollHeight: 900, scrollTop: 0};
    instance.chatLog = detachedLog;
    instance.componentDidUpdate(wrapper.props(), {...wrapper.state(), exchanges: []});
    expect(detachedLog.scrollTop).toBe(0);
    wrapper.find('button').first().simulate('click');
    expect(wrapper.find('[role="log"]').text()).toContain('Newest answer');
});

test('composer is focused on open and Escape restores focus to Ask Tutor', () => {
    setup({mounted: true});
    const trigger = wrapper.find('button').first().getDOMNode();
    trigger.click(); wrapper.update();
    expect(document.activeElement).toBe(wrapper.find('textarea').getDOMNode());
    wrapper.find('textarea').simulate('keydown', {key: 'Escape', nativeEvent: {}, stopPropagation: jest.fn()});
    expect(wrapper.state('open')).toBe(false);
    expect(document.activeElement).toBe(trigger);
});

test('the native Send button submits once without closing or navigating', async () => {
    const {api} = setup({mounted: true});
    const ask = jest.spyOn(wrapper.instance(), 'ask');
    wrapper.find('button').first().simulate('click');
    wrapper.find('textarea').simulate('change', {target: {value: 'Help with movement'}});
    wrapper.find('button[type="submit"]').getDOMNode().click();
    await ask.mock.results[0].value; wrapper.update();
    expect(api.ask).toHaveBeenCalledTimes(1);
    expect(api.ask.mock.calls[0][0].question).toBe('Help with movement');
    expect(wrapper.state('open')).toBe(true);
    expect(wrapper.state('exchanges')[0].feedback.text).toBe('Try adding keyboard input.');
});

test.each(['text', 'voice'])('%s questions produce text/highlights and an autoplayable, replayable reply', async mode => {
    const play = jest.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    const pause = jest.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    URL.createObjectURL = jest.fn(() => 'blob:tutor-audio'); URL.revokeObjectURL = jest.fn();
    try {
        const {api, vm} = setup({mounted: true, locale: 'de'});
        api.transcribe = jest.fn(async () => ({question: 'Wie springe ich?', language: 'de'}));
        api.tutorAudio = jest.fn(async () => new Uint8Array([1, 2, 3]).buffer);
        wrapper.setState({question: 'Typed question'});
        await wrapper.instance().ask(false, mode === 'voice' ? new Blob(['voice'], {type: 'audio/webm'}) : null);
        wrapper.update();
        expect(api.tutorAudio).toHaveBeenCalledWith(api.ask.mock.calls[0][0].requestId);
        expect(wrapper.find('audio').prop('controls')).toBe(true);
        expect(wrapper.find('audio').prop('src')).toBe('blob:tutor-audio');
        expect(play).toHaveBeenCalledTimes(1);
        expect(vm.toJSON).toHaveBeenCalledTimes(1);
        expect(wrapper.state('exchanges')[0].status).toBe('complete');
        if (mode === 'voice') {
            expect(api.ask.mock.calls[0][0]).toMatchObject({question: 'Wie springe ich?', language: 'de'});
            expect(wrapper.find('[role="log"]').text()).toContain('You · voice');
            expect(wrapper.state('question')).toBe('Typed question');
        } else expect(api.transcribe).not.toHaveBeenCalled();
        wrapper.instance().close(); expect(pause).toHaveBeenCalled();
        wrapper.setState({open: true}); expect(play).toHaveBeenCalledTimes(1);
        vm.runtime.emit('PROJECT_LOADED'); expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:tutor-audio');
    } finally {play.mockRestore(); pause.mockRestore();}
});

test('blocked autoplay shows a play hint; failed TTS never discards text or retries DeepSeek', async () => {
    const play = jest.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValue(Error('autoplay blocked'));
    const pause = jest.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    URL.createObjectURL = jest.fn(() => 'blob:reply'); URL.revokeObjectURL = jest.fn();
    try {
        const {api} = setup({mounted: true});
        api.tutorAudio = jest.fn(async () => new Uint8Array([1]).buffer);
        await wrapper.instance().ask(); wrapper.update();
        expect(wrapper.text()).toContain('Press play to hear the tutor.');
        api.tutorAudio.mockRejectedValueOnce(Error('TTS down'));
        await wrapper.instance().ask(); wrapper.update();
        expect(wrapper.state('exchanges')[1].feedback.text).toBe('Try adding keyboard input.');
        expect(wrapper.text()).toContain('Spoken reply unavailable');
        expect(api.ask).toHaveBeenCalledTimes(2);
    } finally {play.mockRestore(); pause.mockRestore();}
});

test('project reset while transcription is pending cannot send stale context to DeepSeek', async () => {
    const {api, vm} = setup();
    let finish;
    api.transcribe = jest.fn(() => new Promise(resolve => {finish = resolve;}));
    const work = wrapper.instance().ask(false, new Blob(['voice'], {type: 'audio/webm'}));
    expect(wrapper.state('exchanges')[0].status).toBe('transcribing');
    vm.runtime.emit('PROJECT_LOADED'); finish({question: 'Old speech', language: 'en'}); await work;
    expect(api.ask).not.toHaveBeenCalled(); expect(wrapper.state('exchanges')).toEqual([]);
});

test('failed transcription never sends an empty DeepSeek question or offers a wrong-request retry', async () => {
    const {api} = setup();
    api.transcribe = jest.fn(async () => {throw Error('No speech detected');});
    await wrapper.instance().ask(false, new Blob(['voice'], {type: 'audio/webm'}));
    expect(api.ask).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('No speech detected');
    expect(wrapper.instance().tutor.pending).toBe(null);
    expect(wrapper.find('button').filterWhere(button => button.text() === 'Retry same request')).toHaveLength(0);
});

test('pointer and keyboard holds release to send, while cancel and close discard the recording', () => {
    setup(); wrapper.setState({open: true});
    const instance = wrapper.instance();
    const start = jest.spyOn(instance.recorder, 'start').mockImplementation(() => {});
    const stop = jest.spyOn(instance.recorder, 'stop').mockImplementation(() => {});
    const cancel = jest.spyOn(instance.recorder, 'cancel').mockImplementation(() => {});
    const event = {button: 0, pointerId: 1, preventDefault: jest.fn(), currentTarget: {setPointerCapture: jest.fn()}};
    const mic = () => wrapper.find('[aria-label="Hold to talk"]');
    mic().simulate('pointerdown', event); mic().simulate('pointerup');
    expect(start).toHaveBeenCalledTimes(1); expect(stop).toHaveBeenCalledTimes(1);
    mic().simulate('keydown', {key: ' ', preventDefault: jest.fn(), repeat: false});
    mic().simulate('keydown', {key: ' ', preventDefault: jest.fn(), repeat: true});
    mic().simulate('keyup', {key: ' ', preventDefault: jest.fn()});
    expect(start).toHaveBeenCalledTimes(2); expect(stop).toHaveBeenCalledTimes(2);
    mic().simulate('pointercancel'); instance.close(); expect(cancel).toHaveBeenCalledTimes(2);
    expect(instance.holding).toBe(false);
    expect(instance.recorder).toBeInstanceOf(VoiceRecorder);
});

test.each(classroomLocales)('Settings language %s reaches both typed and voice tutor requests', async locale => {
    const {api} = setup({locale});
    wrapper.setState({open: true});
    expect(wrapper.find('[aria-label="Tutor language"]')).toHaveLength(0);
    // Even a blank typed question requests a reply in the Settings language.
    await wrapper.instance().ask();
    expect(api.ask.mock.calls[0][0]).toMatchObject({question: '', language: locale});
    api.transcribe = jest.fn(async () => ({question: 'Question', language: locale}));
    const audio = new Blob(['voice'], {type: 'audio/webm'});
    await wrapper.instance().ask(false, audio);
    expect(api.transcribe).toHaveBeenCalledWith(api.ask.mock.calls[1][0].requestId, audio, locale);
    expect(api.ask.mock.calls[1][0]).toMatchObject({question: 'Question', language: locale});
});

test('language changes affect new questions, never an in-flight transcription or immutable retry', async () => {
    const {api} = setup({locale: 'de'});
    let finish;
    api.transcribe = jest.fn(() => new Promise(resolve => {finish = resolve;}));
    api.ask.mockRejectedValueOnce(Error('Network error'));
    const work = wrapper.instance().ask(false, new Blob(['voice'], {type: 'audio/webm'}));
    wrapper.setProps({locale: 'ja'});
    finish({question: 'Was soll ich machen?', language: 'de'}); await work;
    await wrapper.instance().ask(true);
    expect(api.ask.mock.calls[0][0].language).toBe('de');
    expect(api.ask.mock.calls[1][0]).toEqual(api.ask.mock.calls[0][0]);
    await wrapper.instance().ask();
    expect(api.ask.mock.calls[2][0].language).toBe('ja');
});

test('recordings keep the language selected on press even if Settings changes before release', async () => {
    const {api} = setup({locale: 'es'});
    const instance = wrapper.instance();
    jest.spyOn(instance.recorder, 'start').mockImplementation(() => {});
    const ask = jest.spyOn(instance, 'ask');
    api.transcribe = jest.fn(async () => ({question: '¿Cómo salto?', language: 'es'}));
    instance.startRecording();
    wrapper.setProps({locale: 'de'});
    instance.recorder.onAudio(new Blob(['voice'], {type: 'audio/webm'}));
    await ask.mock.results[0].value;
    expect(api.transcribe.mock.calls[0][2]).toBe('es');
    expect(api.ask.mock.calls[0][0].language).toBe('es');
});

test('transcription cannot override the Settings language', async () => {
    const {api} = setup({locale: 'de'});
    api.transcribe = jest.fn(async () => ({question: 'Question', language: 'en'}));
    await wrapper.instance().ask(false, new Blob(['voice'], {type: 'audio/webm'}));
    expect(api.ask).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Invalid transcription.');
});


test('structured feedback renders inline chips while preserving the JSON response and plain audio text', async () => {
    setup({mounted: true, answer: {text: 'Use wait with 2.', parts: [
        {type: 'text', text: 'Use '}, {type: 'block', label: 'wait', opcode: 'control_wait', category: 'control', action: 'add'},
        {type: 'text', text: ' with '}, {type: 'value', text: '2'}, {type: 'text', text: '.'}
    ], highlights: {blocks: []}}});
    await wrapper.instance().ask();
    wrapper.update();
    expect(wrapper.find('[role="img"]').prop('aria-label')).toBe('wait');
    expect(wrapper.find('[role="log"]').text()).toContain('Use wait with 2.');
    expect(wrapper.state('exchanges')[0].response.feedback.parts[3]).toEqual({type: 'value', text: '2'});
});

test('mobile sheet lives outside the menu, preserves drafts, and cancels recording on panel changes', () => {
    const {api, vm} = setup({mounted: true});
    wrapper.unmount();
    const setPanel = jest.fn();
    const MobileView = ({panel}) => (<EditorContext.Provider value={{mobile: true, panel, setPanel, viewportHeight: 844}}>
        <TutorMenu vm={vm} ready locale="en" />
    </EditorContext.Provider>);
    wrapper = mount(<MobileView panel="tutor" />, {attachTo: container});
    vm.toJSON.mockClear();
    const instance = wrapper.find(TutorMenu).instance();
    const chat = document.getElementById('tutor-chat');
    expect(chat).not.toBe(null);
    expect(container.contains(chat)).toBe(false);
    wrapper.find('textarea').simulate('change', {target: {value: 'Keep my draft'}});
    jest.spyOn(instance.recorder, 'start').mockImplementation(() => {});
    const cancel = jest.spyOn(instance.recorder, 'cancel').mockImplementation(() => {});
    instance.startRecording();
    wrapper.setProps({panel: 'code'});
    expect(document.getElementById('tutor-chat')).toBe(null);
    expect(instance.holding).toBe(false);
    expect(cancel).toHaveBeenCalledTimes(1);
    wrapper.setProps({panel: 'tutor'});
    expect(wrapper.find('textarea').prop('value')).toBe('Keep my draft');
    expect(api.ask).not.toHaveBeenCalled();
    expect(vm.toJSON).not.toHaveBeenCalled();
});
