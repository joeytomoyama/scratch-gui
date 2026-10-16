import ProjectFetcherHOC from '../../../src/lib/project-fetcher-hoc.jsx';
import {getAccountService} from '../../../src/lib/account/service';
import reducer, {LoadingState, projectError} from '../../../src/reducers/project-state';
import {createCourseAPI} from '../../../src/lib/course-api';

jest.mock('react-redux', () => ({connect: () => Component => Component}));
jest.mock('react-intl', () => ({injectIntl: Component => Component, intlShape: require('prop-types').object}));
jest.mock('../../../src/lib/storage', () => ({setAssetHost: jest.fn(), setTranslatorFunction: jest.fn()}));
jest.mock('../../../src/lib/account/service', () => ({getAccountService: jest.fn()}));
jest.mock('../../../src/lib/course-api', () => ({createCourseAPI: jest.fn()}));

const id = '811cacd5-6645-4d84-b06d-8df6f330437f';
const Fetcher = ProjectFetcherHOC(() => null);
const setup = (initial, extra = {}) => {
    let state = initial;
    let notify;
    const unsubscribe = jest.fn();
    getAccountService.mockReturnValue({
        getState: () => state,
        subscribe: fn => { notify = fn; fn(state); return unsubscribe; }
    });
    const adapter = {load: jest.fn().mockResolvedValue({data: [], revision: 1}), dispose: jest.fn()};
    const props = {reduxProjectId: id, intl: {formatMessage: jest.fn()},
        createProjectAdapter: jest.fn(() => adapter), onError: jest.fn(), onPrivateFetched: jest.fn(),
        onFetchedProjectData: jest.fn(), onProjectTitleFetched: jest.fn(), ...extra};
    const fetcher = new Fetcher(props);
    fetcher.fetchProject(props.reduxProjectId, LoadingState.FETCHING_WITH_ID);
    return {props, fetcher, adapter, notify: next => { state = next; return notify(next); }};
};

test('signed-out private loading ends in the existing project error state', () => {
    const {props, fetcher} = setup({loading: false, user: null});
    expect(props.onError).toHaveBeenCalledWith(new Error('You must be signed in to view this project.'));
    const state = reducer({loadingState: LoadingState.FETCHING_WITH_ID}, projectError(props.onError.mock.calls[0][0]));
    expect(state.loadingState).toBe(LoadingState.ERROR);
    expect(props.createProjectAdapter).not.toHaveBeenCalled();
    fetcher.componentWillUnmount();
});

test.each([false, true])('course loading uses the correct SB3 and normal VM loading lifecycle (demo=%s)', async demo => {
    const api = {project: jest.fn().mockResolvedValue(new Uint8Array([1, 2])),
        details: jest.fn().mockResolvedValue({title: 'Build a game'}), dispose: jest.fn()};
    createCourseAPI.mockReturnValue(api);
    const {props, fetcher, notify} = setup({loading: true, user: null}, {reduxProjectId: '0', courseId: 'example', courseDemo: demo});
    await notify({loading: false, user: {id: 'alice'}});
    expect(api.project).toHaveBeenCalledWith('example', demo);
    expect(api.details).toHaveBeenCalledWith('example');
    expect(props.onProjectTitleFetched).toHaveBeenCalledWith('Build a game');
    expect(props.onFetchedProjectData).toHaveBeenCalledWith(new Uint8Array([1, 2]), LoadingState.FETCHING_WITH_ID);
    expect(props.onPrivateFetched).not.toHaveBeenCalled();
    fetcher.componentWillUnmount();
});

test('resuming preserves the student title without requesting or renaming course metadata', async () => {
    const {props, fetcher, notify, adapter} = setup({loading: true, user: null}, {courseId: 'example'});
    adapter.load.mockResolvedValue({data: [], revision: 3, title: 'My motorcycle game'});
    createCourseAPI.mockClear();
    await notify({loading: false, user: {id: 'alice'}});
    expect(props.onProjectTitleFetched).toHaveBeenCalledWith('My motorcycle game');
    expect(createCourseAPI).not.toHaveBeenCalled();
    fetcher.componentWillUnmount();
});

test('legacy course saves receive the course title; unavailable metadata does not block saved progress', async () => {
    for (const available of [true, false]) {
        const api = {details: available ? jest.fn().mockResolvedValue({title: 'Course title'}) :
            jest.fn().mockRejectedValue(new Error('Unavailable')), dispose: jest.fn()};
        createCourseAPI.mockReturnValue(api);
        const {props, fetcher, notify} = setup({loading: true, user: null}, {courseId: 'example'});
        await notify({loading: false, user: {id: 'alice'}});
        expect(props.onPrivateFetched).toHaveBeenCalledWith(id, [], 1, 'alice');
        expect(props.onError).not.toHaveBeenCalled();
        if (available) expect(props.onProjectTitleFetched).toHaveBeenCalledWith('Course title');
        else expect(props.onProjectTitleFetched).not.toHaveBeenCalled();
        expect(api.dispose).toHaveBeenCalled();
        fetcher.componentWillUnmount();
    }
});

test('session restoration waits, then reports signed out', async () => {
    const {props, fetcher, notify} = setup({loading: true, user: null});
    expect(props.onError).not.toHaveBeenCalled();
    await notify({loading: false, user: null});
    expect(props.onError).toHaveBeenCalledTimes(1);
    fetcher.componentWillUnmount();
});

test('restored signed-in session still loads the private project', async () => {
    const {props, fetcher, notify, adapter} = setup({loading: true, user: null});
    await notify({loading: false, user: {id: 'alice'}});
    expect(adapter.load).toHaveBeenCalledWith(id);
    expect(props.onPrivateFetched).toHaveBeenCalledWith(id, [], 1, 'alice');
    expect(props.onError).not.toHaveBeenCalled();
    fetcher.componentWillUnmount();
});
