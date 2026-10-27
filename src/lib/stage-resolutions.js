const stageResolutions = Object.freeze({
    default: Object.freeze({width: 480, height: 360}),
    mobile: Object.freeze({width: 360, height: 640})
});

const stageResolutionForSize = (width, height) => Object.keys(stageResolutions).find(id =>
    stageResolutions[id].width === width && stageResolutions[id].height === height) || '';

export {stageResolutions, stageResolutionForSize};
