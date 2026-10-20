import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import saveIcon from '../editor-layout/icons/save.svg';
import React from 'react';
import InlineMessages from '../../containers/inline-messages.jsx';
import {filterInlineAlerts} from '../../reducers/alerts';

import styles from './save-status.css';
import toolbarStyles from './toolbar-button.css';

const TWSaveStatus = ({
    alertsList,
    persistence,
    onSave
}) => {
    const saving = persistence.status === 'Saving';
    const label = persistence.status.startsWith('Save failed') ? 'Retry Save' :
        saving ? 'Saving…' : persistence.status === 'Unsaved' ? 'Save' : persistence.status;
    const disabled = saving || persistence.status === 'Sign in to save' ||
        persistence.status === 'Reload to access this project';
    return (<React.Fragment>
        <button
            className={`${toolbarStyles.button} ${styles.saveButton}`}
            type="button"
            title={persistence.status}
            aria-busy={saving}
            onClick={onSave}
            disabled={disabled}
        >
            <img
                src={saveIcon}
                alt=""
                width={18}
                height={18}
            />
            {saving && <span
                className={styles.spinner}
                aria-hidden="true"
            />}
            <span role="status">{label}</span>
        </button>
        {filterInlineAlerts(alertsList).length > 0 && <InlineMessages />}
    </React.Fragment>);
};

TWSaveStatus.propTypes = {
    alertsList: PropTypes.arrayOf(PropTypes.object),
    persistence: PropTypes.object,
    onSave: PropTypes.func
};

const mapStateToProps = state => ({
    alertsList: state.scratchGui.alerts.alertsList,
    persistence: state.scratchGui.persistence,
    onSave: () => state.scratchGui.vm.emit('PRIVATE_PROJECT_SAVE')
});

export default connect(
    mapStateToProps,
    () => ({})
)(TWSaveStatus);
