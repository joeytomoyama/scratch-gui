import React, {useEffect, useState} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import styles from './sheet-transition.css';

export const SHEET_EXIT_MS = 180;

// Retain the closing surface long enough to animate, but make it inert as soon
// as it closes. Reopening cancels the pending disposal.
const SheetTransition = ({open, enabled = true, keepMounted, children}) => {
    const [present, setPresent] = useState(open);
    useEffect(() => {
        if (open) setPresent(true);
        const timer = open ? null : setTimeout(() => setPresent(false), SHEET_EXIT_MS);
        return () => clearTimeout(timer);
    }, [open]);
    if (!enabled) return children;
    if (!open && !present && !keepMounted) return null;
    return React.cloneElement(children, {
        'className': classNames(children.props.className, styles.sheet),
        'data-sheet-state': open ? 'open' : present ? 'closing' : 'closed',
        'aria-hidden': !open,
        'aria-modal': open && children.props['aria-modal'],
        'inert': open ? null : ''
    });
};
SheetTransition.propTypes = {
    open: PropTypes.bool.isRequired,
    enabled: PropTypes.bool,
    keepMounted: PropTypes.bool,
    children: PropTypes.element.isRequired
};
export default SheetTransition;
