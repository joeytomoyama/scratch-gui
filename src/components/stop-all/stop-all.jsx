import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';

import stopAllIcon from './icon--stop-all.svg';
import styles from './stop-all.css';

const preserveGameFocus = event => {
    event.preventDefault();
    event.currentTarget.ownerDocument.activeElement.blur();
};

const StopAllComponent = function (props) {
    const {
        active,
        className,
        onClick,
        title,
        ...componentProps
    } = props;
    return (
        <button
            aria-label={title}
            className={classNames(
                className,
                styles.stopAll,
                {
                    [styles.isActive]: active
                }
            )}
            type="button"
            title={title}
            onClick={onClick}
            // Keep mouse activation from taking focus away from the game's keyboard controls.
            onMouseDown={preserveGameFocus}
            {...componentProps}
        >
            <img
                alt=""
                draggable={false}
                src={stopAllIcon}
            />
        </button>
    );
};

StopAllComponent.propTypes = {
    active: PropTypes.bool,
    className: PropTypes.string,
    onClick: PropTypes.func.isRequired,
    title: PropTypes.string
};

StopAllComponent.defaultProps = {
    active: false,
    title: 'Stop'
};

export default StopAllComponent;
