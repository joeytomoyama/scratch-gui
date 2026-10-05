import {applyMiddleware, compose, combineReducers} from 'redux';
import alertsReducer, {alertsInitialState} from './alerts';
import assetDragReducer, {assetDragInitialState} from './asset-drag';
import colorPickerReducer, {colorPickerInitialState} from './color-picker';
import connectionModalReducer, {connectionModalInitialState} from './connection-modal';
import customProceduresReducer, {customProceduresInitialState} from './custom-procedures';
import blockDragReducer, {blockDragInitialState} from './block-drag';
import editorTabReducer, {editorTabInitialState} from './editor-tab';
import hoveredTargetReducer, {hoveredTargetInitialState} from './hovered-target';
import menuReducer, {menuInitialState} from './menus';
import micIndicatorReducer, {micIndicatorInitialState} from './mic-indicator';
import modalReducer, {modalsInitialState} from './modals';
import modeReducer, {modeInitialState} from './mode';
import monitorReducer, {monitorsInitialState} from './monitors';
import monitorLayoutReducer, {monitorLayoutInitialState} from './monitor-layout';
import projectChangedReducer, {projectChangedInitialState} from './project-changed';
import persistenceReducer, {initialState as persistenceInitialState} from './persistence';
import projectStateReducer, {projectStateInitialState} from './project-state';
import projectTitleReducer, {projectTitleInitialState} from './project-title';
import fontsLoadedReducer, {fontsLoadedInitialState} from './fonts-loaded';
import restoreDeletionReducer, {restoreDeletionInitialState} from './restore-deletion';
import stageSizeReducer, {stageSizeInitialState} from './stage-size';
import targetReducer, {targetsInitialState} from './targets';
import themeReducer, {themeInitialState} from './theme';
import toolboxReducer, {toolboxInitialState} from './toolbox';
import twReducer, {twInitialState} from './tw';
import customStageSizeReducer, {customStageSizeInitialState} from './custom-stage-size';
import vmReducer, {vmInitialState} from './vm';
import vmStatusReducer, {vmStatusInitialState} from './vm-status';
import workspaceMetricsReducer, {workspaceMetricsInitialState} from './workspace-metrics';
import throttle from 'redux-throttle';


const guiMiddleware = compose(applyMiddleware(throttle(300, {leading: true, trailing: true})));

const guiInitialState = {
    alerts: alertsInitialState,
    assetDrag: assetDragInitialState,
    blockDrag: blockDragInitialState,
    colorPicker: colorPickerInitialState,
    connectionModal: connectionModalInitialState,
    customStageSize: customStageSizeInitialState,
    customProcedures: customProceduresInitialState,
    editorTab: editorTabInitialState,
    mode: modeInitialState,
    hoveredTarget: hoveredTargetInitialState,
    stageSize: stageSizeInitialState,
    menus: menuInitialState,
    micIndicator: micIndicatorInitialState,
    modals: modalsInitialState,
    monitors: monitorsInitialState,
    monitorLayout: monitorLayoutInitialState,
    projectChanged: projectChangedInitialState,
    persistence: persistenceInitialState,
    projectState: projectStateInitialState,
    projectTitle: projectTitleInitialState,
    fontsLoaded: fontsLoadedInitialState,
    restoreDeletion: restoreDeletionInitialState,
    targets: targetsInitialState,
    theme: themeInitialState,
    toolbox: toolboxInitialState,
    tw: twInitialState,
    vm: vmInitialState,
    vmStatus: vmStatusInitialState,
    workspaceMetrics: workspaceMetricsInitialState
};

const initPlayer = function (currentState) {
    return Object.assign(
        {},
        currentState,
        {mode: {
            isEmbedded: false,
            isFullScreen: currentState.mode.isFullScreen,
            isPlayerOnly: true,
            // When initializing in player mode, make sure to reset
            // hasEverEnteredEditorMode
            hasEverEnteredEditor: false
        }}
    );
};
const initFullScreen = function (currentState) {
    return Object.assign(
        {},
        currentState,
        {mode: {
            isEmbedded: false,
            isFullScreen: true,
            isPlayerOnly: currentState.mode.isPlayerOnly,
            hasEverEnteredEditor: currentState.mode.hasEverEnteredEditor
        }}
    );
};

const initEmbedded = function (currentState) {
    return Object.assign(
        {},
        currentState,
        {mode: {
            isEmbedded: true,
            // tw: embed does not need isFullScreen anymore
            isFullScreen: false,
            isPlayerOnly: true,
            hasEverEnteredEditor: false
        }}
    );
};


const guiReducer = combineReducers({
    alerts: alertsReducer,
    assetDrag: assetDragReducer,
    blockDrag: blockDragReducer,
    colorPicker: colorPickerReducer,
    connectionModal: connectionModalReducer,
    customStageSize: customStageSizeReducer,
    customProcedures: customProceduresReducer,
    editorTab: editorTabReducer,
    mode: modeReducer,
    hoveredTarget: hoveredTargetReducer,
    stageSize: stageSizeReducer,
    menus: menuReducer,
    micIndicator: micIndicatorReducer,
    modals: modalReducer,
    monitors: monitorReducer,
    monitorLayout: monitorLayoutReducer,
    projectChanged: projectChangedReducer,
    persistence: persistenceReducer,
    projectState: projectStateReducer,
    projectTitle: projectTitleReducer,
    fontsLoaded: fontsLoadedReducer,
    restoreDeletion: restoreDeletionReducer,
    targets: targetReducer,
    theme: themeReducer,
    toolbox: toolboxReducer,
    tw: twReducer,
    vm: vmReducer,
    vmStatus: vmStatusReducer,
    workspaceMetrics: workspaceMetricsReducer
});

export {
    guiReducer as default,
    guiInitialState,
    guiMiddleware,
    initEmbedded,
    initFullScreen,
    initPlayer
};
