import React from 'react';
import PropTypes from 'prop-types';
import styles from './editor-layout.css';
import close from './icons/close.svg';
import menu from './icons/menu.svg';
import code from './icons/code.svg';
import sprites from './icons/sprites.svg';
import tutor from './icons/tutor.svg';
import blocks from './icons/blocks.svg';
import collapse from './icons/collapse.svg';
import expand from './icons/expand.svg';

const icons = {close, menu, code, sprites, tutor, blocks, collapse, expand};
const EditorIcon = ({name}) => (<img
    className={name === 'blocks' ? null : styles.icon}
    src={icons[name]}
    alt=""
    draggable={false}
/>);
EditorIcon.propTypes = {name: PropTypes.oneOf(Object.keys(icons)).isRequired};
export default EditorIcon;
