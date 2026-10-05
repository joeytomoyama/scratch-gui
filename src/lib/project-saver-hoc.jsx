import React from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {getAccountService} from './account/service';
import {accountProjectAPI, isProjectId} from './private-project-api';
import {ProjectPersistence} from './project-persistence';
import {courseIdFromURL} from './course-api';
import {getIsShowingProject, adoptPrivateProject} from '../reducers/project-state';
import {updatePersistence} from '../reducers/persistence';
/* eslint-disable react/sort-comp */

// Reuses the GUI's saver HOC boundary, with an injectable adapter and save callback.
export default WrappedComponent => {
    class ProjectSaver extends React.Component {
        componentDidMount () {
            if (this.props.courseDemo) return;
            this.mounted = true;
            this.account = getAccountService();
            this.saveNow = () => this.controller?.flush().catch(() => {});
            this.unload = event => {
                if (this.controller?.dirty() || (!this.controller && this.props.projectChanged)) {
                    event.preventDefault(); event.returnValue = '';
                }
            };
            this.props.vm.on('PRIVATE_PROJECT_SAVE', this.saveNow);
            if (!this.props.noBeforeUnloadHandler) window.addEventListener('beforeunload', this.unload);
            if (this.props.onSetProjectSaver) this.props.onSetProjectSaver(this.saveNow);
            this.unsubscribe = this.account?.subscribe(({user}) => {
                if (this.userId !== user?.id) {
                    this.controller?.dispose(); this.controller = null;
                    this.userId = user?.id;
                    this.reconcile();
                }
            });
            this.reconcile();
        }
        componentDidUpdate () {
            this.reconcile();
        }
        reconcile () {
            if (!this.mounted || this.props.courseDemo) return;
            if (!this.props.ready) {
                this.controller?.dispose(); this.controller = null; return;
            }
            if (!this.userId || !process.env.BACKEND_BASE_URL) {
                if (this.lastStatus !== 'Sign in to save') {
                    this.lastStatus = 'Sign in to save'; this.props.onStatus({status: this.lastStatus});
                }
                return;
            }
            if (this.controller) return;
            // Loaded private projects are bound to the account that fetched them.
            if (isProjectId(this.props.id) && this.props.owner !== this.userId) {
                if (this.lastStatus !== 'Reload to access this project') {
                    this.lastStatus = 'Reload to access this project'; this.props.onStatus({status: this.lastStatus});
                }
                return;
            }
            const id = isProjectId(this.props.id) ? this.props.id : crypto.randomUUID();
            const revision = isProjectId(this.props.id) ? this.props.revision || 0 : 0;
            this.controller = new ProjectPersistence({vm: this.props.vm,
                id,
                courseId: courseIdFromURL(),
                revision,
                adapter: (this.props.createProjectAdapter || accountProjectAPI)(this.userId),
                save: this.props.onUpdateProjectData,
                onState: value => {
                    this.lastStatus = value.status; this.props.onStatus(value);
                },
                onSaved: (projectId, savedRevision) => this.props.onAdopt(projectId, savedRevision, this.userId)});
            this.controller.emit(revision ? 'Saved' : 'Unsaved');
            if (!revision && this.props.projectChanged) this.controller.edit();
        }
        componentWillUnmount () {
            if (this.props.courseDemo) return;
            this.mounted = false; this.controller?.dispose(); this.unsubscribe?.();
            this.props.vm.off('PRIVATE_PROJECT_SAVE', this.saveNow);
            window.removeEventListener('beforeunload', this.unload);
            this.props.onSetProjectSaver?.(null);
        }
        render () {
            /* eslint-disable no-unused-vars */
            const {ready, id, revision, owner, onStatus, onAdopt, createProjectAdapter, courseDemo,
                noBeforeUnloadHandler, onSetProjectSaver, onUpdateProjectData, ...props} = this.props;
            /* eslint-enable no-unused-vars */
            return <WrappedComponent {...props} />;
        }
    }
    ProjectSaver.propTypes = {
        courseDemo: PropTypes.bool,
        vm: PropTypes.object,
        ready: PropTypes.bool,
        id: PropTypes.string,
        revision: PropTypes.number,
        owner: PropTypes.string,
        projectChanged: PropTypes.bool,
        onStatus: PropTypes.func,
        onAdopt: PropTypes.func,
        createProjectAdapter: PropTypes.func,
        onUpdateProjectData: PropTypes.func,
        noBeforeUnloadHandler: PropTypes.bool,
        onSetProjectSaver: PropTypes.func
    };
    return connect(state => ({vm: state.scratchGui.vm,
        ready: getIsShowingProject(state.scratchGui.projectState.loadingState),
        id: state.scratchGui.projectState.projectId,
        revision: state.scratchGui.projectState.privateRevision,
        owner: state.scratchGui.projectState.privateOwner,
        projectChanged: state.scratchGui.projectChanged}), dispatch => ({
        onStatus: value => dispatch(updatePersistence(value)),
        onAdopt: (id, revision, owner) => dispatch(adoptPrivateProject(id, revision, owner))
    }))(ProjectSaver);
};
