import reducer, {adoptPrivateProject, privateProjectFetched, LoadingState, requestNewProject,
    requestProjectUpload, onLoadedProject} from '../../../src/reducers/project-state';

test('first private save adopts a UUID without refetching and retains owner/revision', () => {
    const state = {loadingState: LoadingState.SHOWING_WITHOUT_ID, projectId: '0'};
    const saved = reducer(state, adoptPrivateProject('uuid', 8, 'alice'));
    expect(saved).toMatchObject({projectId: 'uuid', privateRevision: 8, privateOwner: 'alice',
        loadingState: LoadingState.SHOWING_WITH_ID});
});
test('private fetch loads through VM lifecycle; a late different-project result is ignored', () => {
    const state = {loadingState: LoadingState.FETCHING_WITH_ID, projectId: 'uuid'};
    expect(reducer(state, privateProjectFetched('other', [], 2, 'alice'))).toBe(state);
    const result = reducer(state, privateProjectFetched('uuid', new Uint8Array([1]), 5, 'alice'));
    expect(result.loadingState).toBe(LoadingState.LOADING_VM_WITH_ID);
    expect(reducer(result, onLoadedProject(result.loadingState, false, true)).loadingState)
        .toBe(LoadingState.SHOWING_WITH_ID);
});
test('new projects and local imports start without the old private identity', () => {
    const saved = {loadingState: LoadingState.SHOWING_WITH_ID, projectId: 'uuid', privateOwner: 'alice'};
    expect(reducer(saved, requestNewProject(false)).projectId).toBe('0');
    const uploading = reducer(saved, requestProjectUpload(saved.loadingState));
    expect(reducer(uploading, onLoadedProject(uploading.loadingState, false, true)).projectId).toBe('0');
});
