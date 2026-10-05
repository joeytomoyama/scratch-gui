import {TutorRecorder} from '../../../src/lib/tutor/recorder';

let stop; let result; let error; let recorder;
beforeEach(() => {
    jest.useFakeTimers();
    stop = jest.fn(); result = jest.fn(); error = jest.fn();
    Object.defineProperty(navigator, 'mediaDevices', {configurable: true,
        value: {getUserMedia: jest.fn(async () => ({getTracks: () => [{stop}]}))}});
    global.MediaRecorder = class {
        static isTypeSupported () { return true; }
        constructor () { this.mimeType = 'audio/webm'; this.state = 'inactive'; }
        start () { this.state = 'recording'; }
        stop () {
            this.state = 'inactive';
            this.ondataavailable({data: new Blob(['voice'])});
            this.onstop();
        }
    };
    recorder = new TutorRecorder(result, error);
});
afterEach(() => { recorder.cancel(); delete global.MediaRecorder; jest.useRealTimers(); });

test('does not capture until explicitly started; stops automatically at 60 seconds', async () => {
    expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled();
    await recorder.start();
    jest.advanceTimersByTime(60000);
    expect(stop).toHaveBeenCalled();
    expect(result).toHaveBeenCalledTimes(1);
    expect(result.mock.calls[0][0].type).toBe('audio/webm');
});
test('cancel releases microphone and discards the recording', async () => {
    await recorder.start(); recorder.cancel();
    expect(stop).toHaveBeenCalled(); expect(result).not.toHaveBeenCalled();
});
test('cancel while permission is pending releases a subsequently granted device', async () => {
    let grant;
    navigator.mediaDevices.getUserMedia.mockReturnValue(new Promise(resolve => { grant = resolve; }));
    const start = recorder.start(); recorder.cancel();
    grant({getTracks: () => [{stop}]}); await start;
    expect(stop).toHaveBeenCalled(); expect(result).not.toHaveBeenCalled();
});
test('oversized recording is discarded', async () => {
    await recorder.start();
    recorder.recorder.ondataavailable({data: {size: 11 * 1024 * 1024}});
    expect(error).toHaveBeenCalled(); expect(result).not.toHaveBeenCalled();
    expect(stop).toHaveBeenCalled();
});
