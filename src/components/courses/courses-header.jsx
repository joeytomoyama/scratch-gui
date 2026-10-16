import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import {FormattedMessage} from 'react-intl';
import {connect} from 'react-redux';

import AccountMenu from '../account/account-menu.jsx';
import SettingsMenu from '../menu-bar/settings-menu.jsx';
import {
    closeSettingsMenu,
    openSettingsMenu,
    settingsMenuOpen
} from '../../reducers/menus';
import styles from '../menu-bar/menu-bar.css';

// Share the editor's chrome and global settings without its project/VM actions.
const CoursesHeader = ({isRtl, onCloseSettings, onOpenSettings, settingsOpen}) => (
    <header className={styles.menuBar}>
        <div className={styles.mainMenu}>
            <div className={styles.fileGroup}>
                <SettingsMenu
                    canChangeLanguage
                    canChangeTheme
                    isRtl={isRtl}
                    onRequestClose={onCloseSettings}
                    onRequestOpen={onOpenSettings}
                    settingsMenuOpen={settingsOpen}
                />
                <a
                    className={classNames(styles.menuBarItem, styles.hoverable, styles.menuItemLink, styles.active)}
                    href="courses.html"
                    aria-current="page"
                >
                    <FormattedMessage
                        defaultMessage="Courses"
                        description="Link to the student course overview"
                        id="classroom.menuBar.courses"
                    />
                </a>
                <a
                    className={classNames(styles.menuBarItem, styles.hoverable, styles.menuItemLink)}
                    href="editor.html"
                >
                    <FormattedMessage
                        defaultMessage="Editor"
                        description="Link back to the project editor"
                        id="classroom.menuBar.editor"
                    />
                </a>
            </div>
        </div>
        <div className={styles.accountInfoGroup}>
            <AccountMenu />
        </div>
    </header>
);

CoursesHeader.propTypes = {
    isRtl: PropTypes.bool,
    onCloseSettings: PropTypes.func.isRequired,
    onOpenSettings: PropTypes.func.isRequired,
    settingsOpen: PropTypes.bool
};

const mapStateToProps = state => ({
    isRtl: state.locales.isRtl,
    settingsOpen: settingsMenuOpen(state)
});

const mapDispatchToProps = dispatch => ({
    onCloseSettings: () => dispatch(closeSettingsMenu()),
    onOpenSettings: () => dispatch(openSettingsMenu())
});

export default connect(mapStateToProps, mapDispatchToProps)(CoursesHeader);
