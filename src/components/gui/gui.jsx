import classNames from 'classnames';
import omit from 'lodash.omit';
import PropTypes from 'prop-types';
import React from 'react';
import {defineMessages, FormattedMessage, injectIntl, intlShape} from 'react-intl';
import {connect} from 'react-redux';
import MediaQuery from 'react-responsive';
import {Tab, Tabs, TabList, TabPanel} from 'react-tabs';
import tabStyles from 'react-tabs/style/react-tabs.css';
import VM from 'scratch-vm';

import Blocks from '../../containers/blocks.jsx';
import CostumeTab from '../../containers/costume-tab.jsx';
import TargetPane from '../../containers/target-pane.jsx';
import SoundTab from '../../containers/sound-tab.jsx';
import StageWrapper from '../../containers/stage-wrapper.jsx';
import Loader from '../loader/loader.jsx';
import Box from '../box/box.jsx';
import MenuBar from '../menu-bar/menu-bar.jsx';
import CostumeLibrary from '../../containers/costume-library.jsx';
import BackdropLibrary from '../../containers/backdrop-library.jsx';
import Watermark from '../../containers/watermark.jsx';
import EditorLayout, {EditorPanel} from '../editor-layout/editor-layout.jsx';

import Backpack from '../../containers/backpack.jsx';
import BrowserModal from '../browser-modal/browser-modal.jsx';
import Alerts from '../../containers/alerts.jsx';
import DragLayer from '../../containers/drag-layer.jsx';
import ConnectionModal from '../../containers/connection-modal.jsx';
import TWSettingsModal from '../../containers/tw-settings-modal.jsx';
import TWSecurityManager from '../../containers/tw-security-manager.jsx';
import TWRestorePointManager from '../../containers/tw-restore-point-manager.jsx';
import TWFontsModal from '../../containers/tw-fonts-modal.jsx';
import TWUnknownPlatformModal from '../../containers/tw-unknown-platform-modal.jsx';
import TWInvalidProjectModal from '../../containers/tw-invalid-project-modal.jsx';

import {STAGE_SIZE_MODES, FIXED_WIDTH, UNCONSTRAINED_NON_STAGE_WIDTH} from '../../lib/layout-constants';
import {resolveStageSize} from '../../lib/screen-utils';
import {Theme} from '../../lib/themes';

import {isRendererSupported, isBrowserSupported} from '../../lib/tw-environment-support-prober';

import styles from './gui.css';
import addExtensionIcon from './icon--extensions.svg';
import codeIcon from '../editor-layout/icons/code.svg';
import costumesIcon from '../editor-layout/icons/costumes.svg';
import soundsIcon from '../editor-layout/icons/sounds.svg';

const messages = defineMessages({
    addExtension: {
        id: 'gui.gui.addExtension',
        description: 'Button to add an extension in the target pane',
        defaultMessage: 'Add Extension'
    }
});

const getFullscreenBackgroundColor = () => {
    const params = new URLSearchParams(location.search);
    if (params.has('fullscreen-background')) {
        return params.get('fullscreen-background');
    }
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return '#111';
    }
    return 'white';
};

const fullscreenBackgroundColor = getFullscreenBackgroundColor();

const GUIComponent = props => {
    const {
        accountNavOpen,
        activeTabIndex,
        alertsVisible,
        authorId,
        authorThumbnailUrl,
        authorUsername,
        basePath,
        backdropLibraryVisible,
        backpackHost,
        backpackVisible,
        blocksId,
        blocksTabVisible,
        canChangeLanguage,
        canChangeTheme,
        canCreateNew,
        canEditTitle,
        canManageFiles,
        canRemix,
        canSave,
        canCreateCopy,
        canShare,
        canUseCloud,
        children,
        connectionModalVisible,
        costumeLibraryVisible,
        costumesTabVisible,
        customStageSize,
        enableCommunity,
        intl,
        isCreating,
        isEmbedded,
        isFullScreen,
        isPlayerOnly,
        isRtl,
        isShared,
        isWindowFullScreen,
        isTotallyNormal,
        loading,
        logo,
        renderLogin,
        onClickAbout,
        onClickAccountNav,
        onCloseAccountNav,
        onClickAddonSettings,
        onClickPackager,
        onLogOut,
        onOpenRegistration,
        onToggleLoginOpen,
        onActivateCostumesTab,
        onActivateSoundsTab,
        onActivateTab,
        onClickLogo,
        onExtensionButtonClick,
        onProjectTelemetryEvent,
        onRequestCloseBackdropLibrary,
        onRequestCloseCostumeLibrary,
        onSeeCommunity,
        onShare,
        onStartSelectingFileUpload,
        securityManager,
        showComingSoon,
        showOpenFilePicker,
        showSaveFilePicker,
        soundsTabVisible,
        stageSizeMode,
        targetIsStage,
        theme,
        settingsModalVisible,
        fontsModalVisible,
        unknownPlatformModalVisible,
        invalidProjectModalVisible,
        vm,
        ...componentProps
    } = omit(props, 'dispatch');
    if (children) {
        return <Box {...componentProps}>{children}</Box>;
    }

    const tabClassNames = {
        tabs: styles.tabs,
        tab: classNames(tabStyles.reactTabsTab, styles.tab),
        tabList: classNames(tabStyles.reactTabsTabList, styles.tabList),
        tabPanel: classNames(tabStyles.reactTabsTabPanel, styles.tabPanel),
        tabPanelSelected: classNames(tabStyles.reactTabsTabPanelSelected, styles.isSelected),
        tabSelected: classNames(tabStyles.reactTabsTabSelected, styles.isSelected)
    };

    const unconstrainedWidth = (
        UNCONSTRAINED_NON_STAGE_WIDTH +
        FIXED_WIDTH +
        Math.max(0, customStageSize.width - FIXED_WIDTH)
    );
    return (<MediaQuery minWidth={unconstrainedWidth}>{isUnconstrained => {
        const stageSize = resolveStageSize(stageSizeMode, isUnconstrained);

        const alwaysEnabledModals = (
            <React.Fragment>
                <TWSecurityManager securityManager={securityManager} />
                <TWRestorePointManager />
                {settingsModalVisible && <TWSettingsModal />}
                {fontsModalVisible && <TWFontsModal />}
                {unknownPlatformModalVisible && <TWUnknownPlatformModal />}
                {invalidProjectModalVisible && <TWInvalidProjectModal />}
            </React.Fragment>
        );

        return isPlayerOnly ? (
            <React.Fragment>
                {/* TW: When the window is fullscreen, use an element to display the background color */}
                {/* The default color for transparency is inconsistent between browsers and there isn't an existing */}
                {/* element for us to style that fills the entire screen. */}
                {isWindowFullScreen ? (
                    <div
                        className={styles.fullscreenBackground}
                        style={{
                            backgroundColor: fullscreenBackgroundColor
                        }}
                    />
                ) : null}
                <StageWrapper
                    isFullScreen={isFullScreen}
                    isEmbedded={isEmbedded}
                    isRendererSupported={isRendererSupported()}
                    isRtl={isRtl}
                    loading={loading}
                    stageSize={STAGE_SIZE_MODES.full}
                    vm={vm}
                >
                    {alertsVisible ? (
                        <Alerts className={styles.alertsContainer} />
                    ) : null}
                </StageWrapper>
                {alwaysEnabledModals}
            </React.Fragment>
        ) : (
            <EditorLayout
                activeTabIndex={activeTabIndex}
                vm={vm}
                customStageSize={customStageSize}
                isFullScreen={isFullScreen}
                onActivateTab={onActivateTab}
            >
                {({mobile}) => (
                    <Box
                        className={styles.pageWrapper}
                        data-editor-page
                        dir={isRtl ? 'rtl' : 'ltr'}
                        style={{
                            minWidth: 1024,
                            minHeight: 640
                        }}
                        {...componentProps}
                    >
                        {alwaysEnabledModals}
                        {loading ? (
                            <Loader isFullScreen />
                        ) : null}
                        {isCreating ? (
                            <Loader
                                isFullScreen
                                messageId="gui.loader.creating"
                            />
                        ) : null}
                        {isBrowserSupported() ? null : (
                            <BrowserModal
                                isRtl={isRtl}
                            />
                        )}
                        {alertsVisible ? (
                            <Alerts className={styles.alertsContainer} />
                        ) : null}
                        {connectionModalVisible ? (
                            <ConnectionModal
                                vm={vm}
                            />
                        ) : null}
                        {costumeLibraryVisible ? (
                            <CostumeLibrary
                                vm={vm}
                                onRequestClose={onRequestCloseCostumeLibrary}
                            />
                        ) : null}
                        {backdropLibraryVisible ? (
                            <BackdropLibrary
                                vm={vm}
                                onRequestClose={onRequestCloseBackdropLibrary}
                            />
                        ) : null}
                        <EditorPanel name="menu">
                            <MenuBar
                                accountNavOpen={accountNavOpen}
                                authorId={authorId}
                                authorThumbnailUrl={authorThumbnailUrl}
                                authorUsername={authorUsername}
                                canChangeLanguage={canChangeLanguage}
                                canChangeTheme={canChangeTheme}
                                canCreateCopy={canCreateCopy}
                                canCreateNew={canCreateNew}
                                canEditTitle={canEditTitle}
                                canManageFiles={canManageFiles}
                                canRemix={canRemix}
                                canSave={canSave}
                                canShare={canShare}
                                className={styles.menuBarPosition}
                                enableCommunity={enableCommunity}
                                isShared={isShared}
                                isTotallyNormal={isTotallyNormal}
                                logo={logo}
                                renderLogin={renderLogin}
                                showComingSoon={showComingSoon}
                                showOpenFilePicker={showOpenFilePicker}
                                showSaveFilePicker={showSaveFilePicker}
                                onClickAbout={onClickAbout}
                                onClickAccountNav={onClickAccountNav}
                                onClickAddonSettings={onClickAddonSettings}
                                onClickPackager={onClickPackager}
                                onClickLogo={onClickLogo}
                                onCloseAccountNav={onCloseAccountNav}
                                onLogOut={onLogOut}
                                onOpenRegistration={onOpenRegistration}
                                onProjectTelemetryEvent={onProjectTelemetryEvent}
                                onSeeCommunity={onSeeCommunity}
                                onShare={onShare}
                                onStartSelectingFileUpload={onStartSelectingFileUpload}
                                onToggleLoginOpen={onToggleLoginOpen}
                            />
                        </EditorPanel>
                        <Box
                            className={styles.bodyWrapper}
                            data-editor-body
                        >
                            <Box
                                className={styles.flexWrapper}
                                data-editor-columns
                            >
                                <Box
                                    className={styles.editorWrapper}
                                    data-editor-region="code"
                                >
                                    <Tabs
                                        forceRenderTabPanel
                                        data-editor-tabs
                                        className={tabClassNames.tabs}
                                        selectedIndex={activeTabIndex}
                                        selectedTabClassName={tabClassNames.tabSelected}
                                        selectedTabPanelClassName={tabClassNames.tabPanelSelected}
                                        onSelect={onActivateTab}
                                    >
                                        <TabList
                                            className={tabClassNames.tabList}
                                            data-editor-tab-list
                                        >
                                            <Tab className={tabClassNames.tab}>
                                                <img
                                                    draggable={false}
                                                    src={codeIcon}
                                                />
                                                <FormattedMessage
                                                    defaultMessage="Code"
                                                    description="Button to get to the code panel"
                                                    id="gui.gui.codeTab"
                                                />
                                            </Tab>
                                            <Tab
                                                className={tabClassNames.tab}
                                                data-editor-asset-tab
                                                disabled={mobile}
                                                onClick={onActivateCostumesTab}
                                            >
                                                <img
                                                    draggable={false}
                                                    src={costumesIcon}
                                                />
                                                {targetIsStage ? (
                                                    <FormattedMessage
                                                        defaultMessage="Backdrops"
                                                        description="Button to get to the backdrops panel"
                                                        id="gui.gui.backdropsTab"
                                                    />
                                                ) : (
                                                    <FormattedMessage
                                                        defaultMessage="Costumes"
                                                        description="Button to get to the costumes panel"
                                                        id="gui.gui.costumesTab"
                                                    />
                                                )}
                                            </Tab>
                                            <Tab
                                                className={tabClassNames.tab}
                                                data-editor-asset-tab
                                                disabled={mobile}
                                                onClick={onActivateSoundsTab}
                                            >
                                                <img
                                                    draggable={false}
                                                    src={soundsIcon}
                                                />
                                                <FormattedMessage
                                                    defaultMessage="Sounds"
                                                    description="Button to get to the sounds panel"
                                                    id="gui.gui.soundsTab"
                                                />
                                            </Tab>
                                        </TabList>
                                        <TabPanel className={tabClassNames.tabPanel}>
                                            <Box className={styles.blocksWrapper}>
                                                <Blocks
                                                    key={`${blocksId}/${theme.id}`}
                                                    canUseCloud={canUseCloud}
                                                    grow={1}
                                                    isVisible={blocksTabVisible}
                                                    options={{
                                                        media: `${basePath}static/${theme.getBlocksMediaFolder()}/`
                                                    }}
                                                    stageSize={stageSize}
                                                    theme={theme}
                                                    vm={vm}
                                                />
                                            </Box>
                                            <Box
                                                className={styles.extensionButtonContainer}
                                                data-editor-extension
                                            >
                                                <button
                                                    className={styles.extensionButton}
                                                    title={intl.formatMessage(messages.addExtension)}
                                                    onClick={onExtensionButtonClick}
                                                >
                                                    <img
                                                        className={styles.extensionButtonIcon}
                                                        draggable={false}
                                                        src={addExtensionIcon}
                                                    />
                                                </button>
                                            </Box>
                                            <Box
                                                className={styles.watermark}
                                                data-editor-watermark
                                            >
                                                <Watermark />
                                            </Box>
                                        </TabPanel>
                                        <TabPanel className={tabClassNames.tabPanel}>
                                            {costumesTabVisible ? <CostumeTab
                                                vm={vm}
                                            /> : null}
                                        </TabPanel>
                                        <TabPanel className={tabClassNames.tabPanel}>
                                            {soundsTabVisible ? <SoundTab vm={vm} /> : null}
                                        </TabPanel>
                                    </Tabs>
                                    {backpackVisible ? (
                                        <div data-editor-backpack><Backpack host={backpackHost} /></div>
                                    ) : null}
                                </Box>

                                <Box
                                    className={classNames(styles.stageAndTargetWrapper, styles[stageSize])}
                                    data-editor-region="stage-and-targets"
                                >
                                    <StageWrapper
                                        isFullScreen={isFullScreen}
                                        isRendererSupported={isRendererSupported()}
                                        isRtl={isRtl}
                                        stageSize={stageSize}
                                        vm={vm}
                                    />
                                    <EditorPanel name="targets">
                                        <TargetPane
                                            stageSize={stageSize}
                                            vm={vm}
                                        />
                                    </EditorPanel>
                                </Box>
                            </Box>
                        </Box>
                        <DragLayer />
                    </Box>
                )}
            </EditorLayout>
        );
    }}</MediaQuery>);
};

GUIComponent.propTypes = {
    accountNavOpen: PropTypes.bool,
    activeTabIndex: PropTypes.number,
    authorId: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]), // can be false
    authorThumbnailUrl: PropTypes.string,
    authorUsername: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]), // can be false
    backdropLibraryVisible: PropTypes.bool,
    backpackHost: PropTypes.string,
    backpackVisible: PropTypes.bool,
    basePath: PropTypes.string,
    blocksTabVisible: PropTypes.bool,
    blocksId: PropTypes.string,
    canChangeLanguage: PropTypes.bool,
    canChangeTheme: PropTypes.bool,
    canCreateCopy: PropTypes.bool,
    canCreateNew: PropTypes.bool,
    canEditTitle: PropTypes.bool,
    canManageFiles: PropTypes.bool,
    canRemix: PropTypes.bool,
    canSave: PropTypes.bool,
    canShare: PropTypes.bool,
    canUseCloud: PropTypes.bool,
    children: PropTypes.node,
    costumeLibraryVisible: PropTypes.bool,
    costumesTabVisible: PropTypes.bool,
    customStageSize: PropTypes.shape({
        width: PropTypes.number,
        height: PropTypes.number
    }),
    enableCommunity: PropTypes.bool,
    intl: intlShape.isRequired,
    isCreating: PropTypes.bool,
    isEmbedded: PropTypes.bool,
    isFullScreen: PropTypes.bool,
    isPlayerOnly: PropTypes.bool,
    isRtl: PropTypes.bool,
    isShared: PropTypes.bool,
    isWindowFullScreen: PropTypes.bool,
    isTotallyNormal: PropTypes.bool,
    loading: PropTypes.bool,
    logo: PropTypes.string,
    onActivateCostumesTab: PropTypes.func,
    onActivateSoundsTab: PropTypes.func,
    onActivateTab: PropTypes.func,
    onClickAccountNav: PropTypes.func,
    onClickAddonSettings: PropTypes.func,
    onClickPackager: PropTypes.func,
    onClickLogo: PropTypes.func,
    onCloseAccountNav: PropTypes.func,
    onExtensionButtonClick: PropTypes.func,
    onLogOut: PropTypes.func,
    onOpenRegistration: PropTypes.func,
    onRequestCloseBackdropLibrary: PropTypes.func,
    onRequestCloseCostumeLibrary: PropTypes.func,
    onSeeCommunity: PropTypes.func,
    onShare: PropTypes.func,
    onStartSelectingFileUpload: PropTypes.func,
    onTabSelect: PropTypes.func,
    onToggleLoginOpen: PropTypes.func,
    renderLogin: PropTypes.func,
    securityManager: PropTypes.shape({}),
    showComingSoon: PropTypes.bool,
    showOpenFilePicker: PropTypes.func,
    showSaveFilePicker: PropTypes.func,
    soundsTabVisible: PropTypes.bool,
    stageSizeMode: PropTypes.oneOf(Object.keys(STAGE_SIZE_MODES)),
    targetIsStage: PropTypes.bool,
    theme: PropTypes.instanceOf(Theme),
    settingsModalVisible: PropTypes.bool,
    fontsModalVisible: PropTypes.bool,
    unknownPlatformModalVisible: PropTypes.bool,
    invalidProjectModalVisible: PropTypes.bool,
    vm: PropTypes.instanceOf(VM).isRequired
};
GUIComponent.defaultProps = {
    backpackHost: null,
    backpackVisible: false,
    basePath: './',
    blocksId: 'original',
    canChangeLanguage: true,
    canChangeTheme: true,
    canCreateNew: false,
    canEditTitle: false,
    canManageFiles: true,
    canRemix: false,
    canSave: false,
    canCreateCopy: false,
    canShare: false,
    canUseCloud: false,
    enableCommunity: false,
    isCreating: false,
    isShared: false,
    isTotallyNormal: false,
    loading: false,
    showComingSoon: false,
    stageSizeMode: STAGE_SIZE_MODES.large
};

const mapStateToProps = state => ({
    customStageSize: state.scratchGui.customStageSize,
    isWindowFullScreen: state.scratchGui.tw.isWindowFullScreen,
    // This is the button's mode, as opposed to the actual current state
    blocksId: 'classroom',
    stageSizeMode: state.scratchGui.stageSize.stageSize,
    theme: state.scratchGui.theme.theme
});

export default injectIntl(connect(
    mapStateToProps
)(GUIComponent));
