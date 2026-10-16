import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';

import styles from './button.css';

const ButtonComponent = ({
    className,
    disabled,
    iconClassName,
    iconSrc,
    iconWidth,
    iconHeight,
    onClick,
    children,
    ...props
}) => {

    const icon = iconSrc && (
        <img
            alt=""
            className={classNames(iconClassName, styles.icon)}
            draggable={false}
            src={iconSrc}
            height={iconHeight}
            width={iconWidth}
        />
    );

    return (
        <button
            className={classNames(
                styles.outlinedButton,
                className
            )}
            disabled={disabled}
            type="button"
            onClick={onClick}
            {...props}
        >
            {icon}
            <span className={styles.content}>{children}</span>
        </button>
    );
};

ButtonComponent.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
    disabled: PropTypes.bool,
    iconClassName: PropTypes.string,
    iconSrc: PropTypes.string,
    iconHeight: PropTypes.number,
    iconWidth: PropTypes.number,
    onClick: PropTypes.func
};

export default ButtonComponent;
