/** @jest-environment jsdom */
import {EventEmitter} from 'events';
import ProjectSaverHOC from '../../../src/lib/project-saver-hoc';
import TitledHOC from '../../../src/lib/titled-hoc';
import {getAccountService} from '../../../src/lib/account/service';

jest.mock('react-redux', () => ({connect: () => Component => Component}));
jest.mock('react-intl', () => ({injectIntl: Component => Component, defineMessages: messages => messages,
    intlShape: require('prop-types').object}));
jest.mock('../../../src/lib/account/service', () => ({getAccountService: jest.fn()}));

const Saver = ProjectSaverHOC(() => null);
const Titled = TitledHOC(() => null);

test.each([true, false])('finishing a new starter keeps the fetched course name; freestyle stays supported (course=%s)', course => {
    const props = {courseTitle: course ? 'Course title' : null,
        intl: {formatMessage: () => 'Project'}, reduxProjectTitle: course ? 'Course title' : 'Project',
        isShowingWithoutId: true, isAnyCreatingNewState: false, onChangedProjectTitle: jest.fn(),
        onUpdateProjectTitle: jest.fn()};
    const titled = new Titled(props);
    titled.componentDidUpdate({...props, isAnyCreatingNewState: true, isShowingWithoutId: false});
    expect(props.onChangedProjectTitle).toHaveBeenCalledWith(course ? 'Course title' : 'Project', !course);
    expect(props.onUpdateProjectTitle).toHaveBeenCalledWith(course ? 'Course title' : 'Project', !course);
});

test('loading the course name is not a dirty edit; a student rename alone is autosaved', async () => {
    jest.useFakeTimers();
    const previousBackend = process.env.BACKEND_BASE_URL;
    process.env.BACKEND_BASE_URL = 'http://localhost:3001';
    const vm = new EventEmitter();
    vm.toJSON = () => JSON.stringify({targets: [{name: 'Stage', blocks: {}}]});
    vm.serializeAssets = () => [];
    const api = {save: jest.fn().mockResolvedValue({}), dispose: jest.fn()};
    getAccountService.mockReturnValue({subscribe: fn => {fn({user: {id: 'alice'}}); return () => {};}});
    const saver = new Saver({vm, ready: false, projectTitle: 'Project', revision: 5, owner: 'alice',
        id: '811cacd5-6645-4d84-b06d-8df6f330437f', createProjectAdapter: () => api,
        noBeforeUnloadHandler: true, onStatus: jest.fn(), onAdopt: jest.fn()});
    try {
        saver.componentDidMount();
        const loading = saver.props;
        saver.props = {...loading, ready: true, projectTitle: 'Course title'};
        saver.componentDidUpdate(loading);
        expect(saver.controller.dirty()).toBe(false);
        expect(api.save).not.toHaveBeenCalled();
        const loaded = saver.props;
        saver.props = {...loaded, projectTitle: 'My version'};
        saver.componentDidUpdate(loaded);
        expect(saver.controller.dirty()).toBe(true);
        const event = {preventDefault: jest.fn()};
        saver.unload(event);
        expect(event.preventDefault).toHaveBeenCalled();
        jest.advanceTimersByTime(20000);
        for (let i = 0; i < 15; i++) await Promise.resolve();
        expect(api.save).toHaveBeenCalledTimes(1);
        expect(api.save.mock.calls[0][1]).toMatchObject({title: 'My version', revision: 6});
        expect(saver.controller.dirty()).toBe(false);
    } finally {
        saver.componentWillUnmount();
        if (typeof previousBackend === 'string') process.env.BACKEND_BASE_URL = previousBackend;
        else delete process.env.BACKEND_BASE_URL;
        jest.useRealTimers();
    }
});
