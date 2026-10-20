import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';

import greenFlagIcon from '../editor-layout/icons/flag.svg';
import styles from './green-flag.css';

const preserveGameFocus = event => {
    event.preventDefault();
    event.currentTarget.ownerDocument.activeElement.blur();
};

const GreenFlagComponent = function (props) {
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
                styles.greenFlag,
                {
                    [styles.isActive]: active
                }
            )}
            type="button"
            title={title}
            onClick={onClick}
            // tw: also fire click when opening context menu (right click on all systems and alt+click on chromebooks)
            onContextMenu={onClick}
            // Keep mouse activation from taking focus away from the game's keyboard controls.
            onMouseDown={preserveGameFocus}
            {...componentProps}
        >
            <img
                alt=""
                draggable={false}
                src={greenFlagIcon}
            />
        </button>
    );
};
GreenFlagComponent.propTypes = {
    active: PropTypes.bool,
    className: PropTypes.string,
    onClick: PropTypes.func.isRequired,
    title: PropTypes.string
};
GreenFlagComponent.defaultProps = {
    active: false,
    title: 'Go'
};
export default GreenFlagComponent;
