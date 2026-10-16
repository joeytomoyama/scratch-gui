import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';

import styles from './delete-button.css';
import deleteIcon from './icon--delete.svg';

const DeleteButton = props => (
    <button
        aria-label="Delete"
        className={classNames(
            styles.deleteButton,
            props.className
        )}
        type="button"
        tabIndex={props.tabIndex}
        onClick={props.onClick}
    >
        <span className={styles.deleteButtonVisible}>
            <img
                alt=""
                className={styles.deleteIcon}
                src={deleteIcon}
                draggable={false}
            />
        </span>
    </button>

);

DeleteButton.propTypes = {
    className: PropTypes.string,
    onClick: PropTypes.func.isRequired,
    tabIndex: PropTypes.number
};

DeleteButton.defaultProps = {
    tabIndex: 0
};

export default DeleteButton;
