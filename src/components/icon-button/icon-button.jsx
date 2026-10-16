import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';
import TWRenderRecoloredImage from '../../lib/tw-recolor/render.jsx';
import styles from './icon-button.css';

const IconButton = ({
    img,
    disabled,
    className,
    title,
    onClick
}) => (
    <button
        className={classNames(
            styles.container,
            className,
            disabled ? styles.disabled : null
        )}
        disabled={disabled}
        type="button"
        onClick={disabled ? null : onClick}
    >
        <TWRenderRecoloredImage
            alt=""
            className={styles.icon}
            draggable={false}
            src={img}
        />
        <span className={styles.title}>
            {title}
        </span>
    </button>
);

IconButton.propTypes = {
    className: PropTypes.string,
    disabled: PropTypes.bool,
    img: PropTypes.oneOfType([PropTypes.func, PropTypes.string]),
    onClick: PropTypes.func.isRequired,
    title: PropTypes.node.isRequired
};

export default IconButton;
