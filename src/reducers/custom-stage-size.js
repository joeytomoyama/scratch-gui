import {stageResolutions, stageResolutionForSize} from '../lib/stage-resolutions';

const SET_CUSTOM_STAGE_SIZE = 'tw/custom-stage-size/SET';

const getDimensions = () => {
    // Running in node.js
    if (typeof URLSearchParams === 'undefined') {
        return null;
    }

    const urlParameters = new URLSearchParams(location.search);
    const dimensionsQuery = urlParameters.get('size');
    if (dimensionsQuery === null) {
        return null;
    }
    const match = dimensionsQuery.match(/^(\d+)[^\d]+(\d+)$/);
    if (!match) {
        // eslint-disable-next-line no-alert
        alert('Could not parse custom stage size');
        return null;
    }
    const [_, widthText, heightText] = match;
    if (!widthText || !heightText) {
        return null;
    }

    const id = stageResolutionForSize(+widthText, +heightText);
    return id ? stageResolutions[id] : null;
};

const defaultStageSize = stageResolutions.default;

const initialState = getDimensions() || defaultStageSize;

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case SET_CUSTOM_STAGE_SIZE:
        return Object.assign({}, state, {
            width: action.width,
            height: action.height
        });
    default:
        return state;
    }
};

const setCustomStageSize = function (width, height) {
    return {
        type: SET_CUSTOM_STAGE_SIZE,
        width,
        height
    };
};

export {
    reducer as default,
    initialState as customStageSizeInitialState,
    defaultStageSize,
    setCustomStageSize
};
