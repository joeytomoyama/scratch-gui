import React from 'react';
import PropTypes from 'prop-types';
import {intlShape, injectIntl} from 'react-intl';
import bindAll from 'lodash.bindall';
import {connect} from 'react-redux';

import {setProjectUnchanged} from '../reducers/project-changed';
import {setProjectTitle} from '../reducers/project-title';
import {
    LoadingStates,
    getIsCreatingNew,
    getIsFetchingWithId,
    getIsLoading,
    getIsShowingProject,
    onFetchedProjectData,
    projectError,
    privateProjectFetched,
    setProjectId
} from '../reducers/project-state';
import {
    activateTab,
    BLOCKS_TAB_INDEX
} from '../reducers/editor-tab';

import log from './log';
import storage from './storage';
import {ProjectFetchError} from './tw-load-project-error';

import VM from 'scratch-vm';
import {getAccountService} from './account/service';
import {accountProjectAPI, isProjectId} from './private-project-api';
import {createCourseAPI} from './course-api';
/* eslint-disable max-len, react/sort-comp */


/* Higher Order Component to provide behavior for loading projects by id. If
 * there's no id, the default project is loaded.
 * @param {React.Component} WrappedComponent component to receive projectData prop
 * @returns {React.Component} component with project loading behavior
 */
const ProjectFetcherHOC = function (WrappedComponent) {
    class ProjectFetcherComponent extends React.Component {
        constructor (props) {
            super(props);
            bindAll(this, [
                'fetchProject'
            ]);
            storage.setAssetHost(props.assetHost);
            storage.setTranslatorFunction(props.intl.formatMessage);
            // props.projectId might be unset, in which case we use our default;
            // or it may be set by an even higher HOC, and passed to us.
            // Either way, we now know what the initial projectId should be, so
            // set it in the redux store.
            if (
                props.projectId !== '' &&
                props.projectId !== null &&
                typeof props.projectId !== 'undefined'
            ) {
                this.props.setProjectId(props.projectId.toString());
            }
        }
        componentDidUpdate (prevProps) {
            if (prevProps.assetHost !== this.props.assetHost) {
                storage.setAssetHost(this.props.assetHost);
            }
            if (this.props.isFetchingWithId && (!prevProps.isFetchingWithId || this.props.reduxProjectId !== prevProps.reduxProjectId)) {
                this.fetchProject(this.props.reduxProjectId, this.props.loadingState);
            }
            if (this.props.isShowingProject && prevProps.isLoadingProject) {
                this.props.onProjectUnchanged();
            }
            if (this.props.isShowingProject && (prevProps.isLoadingProject || prevProps.isCreatingNew)) {
                this.props.onActivateTab(BLOCKS_TAB_INDEX);
            }
        }
        fetchProject (projectId, loadingState) {
            this.privateAdapter?.dispose(); this.privateAdapter = null;
            this.stopWaiting?.(); this.stopWaiting = null;
            const courseLoad = projectId === '0' && this.props.courseId && !this.courseLoaded;
            if (isProjectId(projectId) || courseLoad) {
                const account = getAccountService();
                if (!account) {
                    this.props.onError(new Error('You must be signed in to view this project.')); return;
                }
                // Wait only for session restoration, not indefinitely for sign-in.
                let failed = false;
                const load = async ({user, loading}) => {
                    if (failed || this.props.reduxProjectId !== projectId) return;
                    if (this.loadingUser !== user?.id) {
                        this.privateAdapter?.dispose(); this.privateAdapter = null;
                        this.fetchingPrivate = null; this.loadingUser = user?.id;
                    }
                    if (loading) return;
                    if (!user) {
                        failed = true;
                        this.stopWaiting?.(); this.stopWaiting = null;
                        this.props.onError(new Error('You must be signed in to view this project.'));
                        return;
                    }
                    if (this.fetchingPrivate === projectId) return;
                    this.fetchingPrivate = projectId;
                    const adapter = courseLoad ? createCourseAPI(user.id) :
                        (this.props.createProjectAdapter || accountProjectAPI)(user.id);
                    this.privateAdapter = adapter;
                    try {
                        const saved = courseLoad ? {data: await adapter.project(this.props.courseId, this.props.courseDemo)} :
                            await adapter.load(projectId);
                        let title = saved.title;
                        if (typeof title !== 'string' && this.props.courseId) {
                            const titleAdapter = courseLoad ? adapter : createCourseAPI(user.id);
                            try {
                                title = (await titleAdapter.details(this.props.courseId)).title.slice(0, 100);
                            } catch (error) {
                                // Legacy saves should still open if their course metadata is unavailable.
                                if (courseLoad) throw error;
                            } finally {
                                if (titleAdapter !== adapter) titleAdapter.dispose();
                            }
                        }
                        if (this.privateAdapter !== adapter || this.props.reduxProjectId !== projectId || account.getState().user?.id !== user.id) {
                            return;
                        }
                        this.stopWaiting?.(); this.stopWaiting = null;
                        if (typeof title === 'string') this.props.onProjectTitleFetched(title);
                        if (courseLoad) {
                            this.courseLoaded = true;
                            this.courseTitle = title;
                            this.props.onFetchedProjectData(saved.data, loadingState);
                        } else this.props.onPrivateFetched(projectId, saved.data, saved.revision, user.id);
                    } catch (error) {
                        if (this.privateAdapter === adapter) this.props.onError(error);
                    } finally {
                        this.fetchingPrivate = null;
                    }
                };
                this.stopWaiting = account.subscribe(load);
                // subscribe immediately emits the current account state.
                if (failed) {
                    this.stopWaiting(); this.stopWaiting = null;
                }
                return;
            }
            if (projectId !== '0') {
                this.props.onError(new Error('Invalid private project ID.')); return;
            }
            // tw: clear and stop the VM before fetching
            // these will also happen later after the project is fetched, but fetching may take a while and
            // the project shouldn't be running while fetching the new project
            this.props.vm.clear();
            this.props.vm.quit();

            const assetPromise = storage.load(storage.AssetType.Project, '0', storage.DataFormat.JSON);

            return assetPromise
                .then(projectAsset => {
                    if (projectAsset) {
                        this.props.onFetchedProjectData(projectAsset.data, loadingState);
                    } else {
                        // We got a valid project token but no project data came back, so the token
                        // has likely expired or the project is otherwise unavailable.
                        // Throw to be caught by catch later on
                        throw new ProjectFetchError('Could not find project');
                    }
                })
                .catch(err => {
                    this.props.onError(err);
                    log.error(err);
                });
        }
        componentWillUnmount () {
            this.privateAdapter?.dispose(); this.privateAdapter = null;
            this.stopWaiting?.();
        }
        render () {
            const {
                /* eslint-disable no-unused-vars */
                assetHost,
                courseId,
                createProjectAdapter,
                intl,
                isLoadingProject: isLoadingProjectProp,
                loadingState,
                onActivateTab,
                onError: onErrorProp,
                onFetchedProjectData: onFetchedProjectDataProp,
                onProjectUnchanged,
                onPrivateFetched,
                onProjectTitleFetched,
                projectHost,
                projectId,
                reduxProjectId,
                setProjectId: setProjectIdProp,
                /* eslint-enable no-unused-vars */
                isFetchingWithId: isFetchingWithIdProp,
                ...componentProps
            } = this.props;
            return (
                <WrappedComponent
                    fetchingProject={isFetchingWithIdProp}
                    {...componentProps}
                    courseTitle={this.courseTitle}
                />
            );
        }
    }
    ProjectFetcherComponent.propTypes = {
        courseId: PropTypes.string,
        courseDemo: PropTypes.bool,
        createProjectAdapter: PropTypes.func,
        onPrivateFetched: PropTypes.func,
        onProjectTitleFetched: PropTypes.func,
        assetHost: PropTypes.string,
        canSave: PropTypes.bool,
        intl: intlShape.isRequired,
        isCreatingNew: PropTypes.bool,
        isFetchingWithId: PropTypes.bool,
        isLoadingProject: PropTypes.bool,
        isShowingProject: PropTypes.bool,
        loadingState: PropTypes.oneOf(LoadingStates),
        onActivateTab: PropTypes.func,
        onError: PropTypes.func,
        onFetchedProjectData: PropTypes.func,
        onProjectUnchanged: PropTypes.func,
        projectHost: PropTypes.string,
        projectToken: PropTypes.string,
        projectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        reduxProjectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        setProjectId: PropTypes.func,
        vm: PropTypes.instanceOf(VM)
    };
    ProjectFetcherComponent.defaultProps = {
        assetHost: 'https://assets.scratch.mit.edu',
        projectHost: ''
    };

    const mapStateToProps = state => ({
        isCreatingNew: getIsCreatingNew(state.scratchGui.projectState.loadingState),
        isFetchingWithId: getIsFetchingWithId(state.scratchGui.projectState.loadingState),
        isLoadingProject: getIsLoading(state.scratchGui.projectState.loadingState),
        isShowingProject: getIsShowingProject(state.scratchGui.projectState.loadingState),
        loadingState: state.scratchGui.projectState.loadingState,
        reduxProjectId: state.scratchGui.projectState.projectId,
        vm: state.scratchGui.vm
    });
    const mapDispatchToProps = dispatch => ({
        onPrivateFetched: (id, data, revision, owner) => dispatch(privateProjectFetched(id, data, revision, owner)),
        onProjectTitleFetched: title => dispatch(setProjectTitle(title)),
        onActivateTab: tab => dispatch(activateTab(tab)),
        onError: error => dispatch(projectError(error)),
        onFetchedProjectData: (projectData, loadingState) =>
            dispatch(onFetchedProjectData(projectData, loadingState)),
        setProjectId: projectId => dispatch(setProjectId(projectId)),
        onProjectUnchanged: () => dispatch(setProjectUnchanged())
    });
    // Allow incoming props to override redux-provided props. Used to mock in tests.
    const mergeProps = (stateProps, dispatchProps, ownProps) => Object.assign(
        {}, stateProps, dispatchProps, ownProps
    );
    return injectIntl(connect(
        mapStateToProps,
        mapDispatchToProps,
        mergeProps
    )(ProjectFetcherComponent));
};

export {
    ProjectFetcherHOC as default
};
