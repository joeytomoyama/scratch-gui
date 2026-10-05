import {connect} from 'react-redux';
import {FormattedMessage} from 'react-intl';
import PropTypes from 'prop-types';
import React from 'react';
import InlineMessages from '../../containers/inline-messages.jsx';
import SB3Downloader from '../../containers/sb3-downloader.jsx';
import {filterInlineAlerts} from '../../reducers/alerts';

import styles from './save-status.css';

const TWSaveStatus = ({
    alertsList,
    fileHandle,
    projectChanged,
    persistence,
    onSave,
    showSaveFilePicker
}) => (<React.Fragment>
    <button
        type="button"
        onClick={onSave}
        disabled={persistence.status === 'Sign in to save' || persistence.status === 'Reload to access this project'}
    >
        {persistence.status.startsWith('Save failed') ? 'Retry Save' : 'Save'}
    </button>
    <span role="status">{persistence.status}</span>
    {
        filterInlineAlerts(alertsList).length > 0 ? (
            <InlineMessages />
        ) : projectChanged && (
            <SB3Downloader
                showSaveFilePicker={showSaveFilePicker}
            >
                {(_className, _downloadProjectCallback, {smartSave}) => (
                    <div
                        onClick={smartSave}
                        className={styles.saveNow}
                    >
                        {fileHandle ? (
                            <FormattedMessage
                                defaultMessage="Save as {file}"
                                description="Menu bar item to save project to an existing file on the user's computer"
                                id="tw.menuBar.saveAs"
                                values={{
                                    file: fileHandle.name
                                }}
                            />
                        ) : (
                            <FormattedMessage
                                defaultMessage="Save to your computer"
                                description="Menu bar item for downloading a project to your computer"
                                id="gui.menuBar.downloadToComputer"
                            />
                        )}
                    </div>
                )}
            </SB3Downloader>
        )}</React.Fragment>);

TWSaveStatus.propTypes = {
    alertsList: PropTypes.arrayOf(PropTypes.object),
    fileHandle: PropTypes.shape({
        name: PropTypes.string
    }),
    projectChanged: PropTypes.bool,
    persistence: PropTypes.object,
    onSave: PropTypes.func,
    showSaveFilePicker: PropTypes.func
};

const mapStateToProps = state => ({
    alertsList: state.scratchGui.alerts.alertsList,
    fileHandle: state.scratchGui.tw.fileHandle,
    projectChanged: state.scratchGui.projectChanged,
    persistence: state.scratchGui.persistence,
    onSave: () => state.scratchGui.vm.emit('PRIVATE_PROJECT_SAVE')
});

export default connect(
    mapStateToProps,
    () => ({})
)(TWSaveStatus);
