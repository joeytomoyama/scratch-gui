/** @jest-environment jsdom */
const originalUrl = window.location.href;

afterEach(() => window.history.replaceState({}, '', originalUrl));

test.each([
    ['', {width: 480, height: 360}],
    ['480x360', {width: 480, height: 360}],
    ['360x640', {width: 360, height: 640}],
    ['480x980', {width: 480, height: 360}],
    ['640x360', {width: 480, height: 360}],
    ['720x1280', {width: 480, height: 360}],
    ['0x0', {width: 480, height: 360}]
])('URL resolution %s initializes to a supported preset', (size, expected) => {
    window.history.replaceState({}, '', size ? `/?size=${size}` : '/');
    jest.isolateModules(() => {
        const {customStageSizeInitialState} = require('../../../src/reducers/custom-stage-size');
        expect(customStageSizeInitialState).toEqual(expected);
    });
});

test('VM events retain exact loaded-project dimensions so Redux and the renderer remain in sync', () => {
    const {default: reducer, setCustomStageSize} = require('../../../src/reducers/custom-stage-size');
    expect(reducer(undefined, setCustomStageSize(360, 640))).toEqual({width: 360, height: 640});
    expect(reducer(undefined, setCustomStageSize(480, 980))).toEqual({width: 480, height: 980});
});
