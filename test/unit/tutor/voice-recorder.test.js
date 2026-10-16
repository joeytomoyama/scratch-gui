/** @jest-environment jsdom */
import {VoiceRecorder} from '../../../src/lib/tutor/voice-recorder';

class Recorder {
    static isTypeSupported (type) {return type.startsWith('audio/webm');}
    constructor (stream, options) {this.mimeType = options.mimeType; this.state = 'inactive'; Recorder.last = this;}
    start () {this.state = 'recording';}
    stop () {
        this.state = 'inactive';
        this.ondataavailable?.({data: new Blob(['recording'])}); this.onstop?.();
    }
}
const fixture = options => {
    const track = {stop: jest.fn()}; const stream = {getTracks: () => [track]};
    const media = {getUserMedia: jest.fn(async () => stream)};
    const callbacks = {onAudio: jest.fn(), onState: jest.fn(), onError: jest.fn()};
    const voice = new VoiceRecorder({media, Recorder, ...callbacks, ...options});
    return {voice, media, stream, track, ...callbacks};
};
beforeEach(() => {jest.useFakeTimers();});
afterEach(() => {jest.useRealTimers();});

test('microphone is requested only on start; release produces a container audio blob and stops tracks', async () => {
    const {voice, media, onState, onAudio, track} = fixture();
    expect(media.getUserMedia).not.toHaveBeenCalled();
    await voice.start(); await voice.start();
    expect(media.getUserMedia).toHaveBeenCalledTimes(1);
    expect(media.getUserMedia.mock.calls[0][0].video).toBe(false);
    jest.advanceTimersByTime(1000); voice.stop();
    expect(onState.mock.calls.map(args => args[0])).toEqual(['permission', 'recording', 'idle']);
    expect(onAudio).toHaveBeenCalledTimes(1);
    expect(onAudio.mock.calls[0][0].type).toBe('audio/webm;codecs=opus');
    expect(track.stop).toHaveBeenCalled(); expect(voice.active).toBe(null);
});

test('releasing while permission is pending discards capture and stops a late microphone stream', async () => {
    const {voice, media, stream, track, onAudio} = fixture();
    let grant;
    media.getUserMedia.mockImplementation(() => new Promise(resolve => {grant = resolve;}));
    const start = voice.start(); voice.stop(); grant(stream); await start;
    expect(track.stop).toHaveBeenCalledTimes(1); expect(onAudio).not.toHaveBeenCalled();
});

test('the sixty-second cap sends once; cancellation never sends', async () => {
    const {voice, onAudio, track} = fixture();
    await voice.start(); jest.advanceTimersByTime(60000); voice.stop();
    expect(onAudio).toHaveBeenCalledTimes(1); expect(track.stop).toHaveBeenCalled();
    await voice.start(); voice.cancel(); jest.advanceTimersByTime(60000);
    expect(onAudio).toHaveBeenCalledTimes(1);
});

test('short taps, oversized recordings and disconnected microphones do not send', async () => {
    const short = fixture(); await short.voice.start(); short.voice.stop();
    expect(short.onAudio).not.toHaveBeenCalled(); expect(short.onError).toHaveBeenCalled();
    const large = fixture({maxBytes: 2}); await large.voice.start(); jest.advanceTimersByTime(1000); large.voice.stop();
    expect(large.onAudio).not.toHaveBeenCalled(); expect(large.track.stop).toHaveBeenCalled();
    const disconnected = fixture(); await disconnected.voice.start(); disconnected.track.onended();
    expect(disconnected.onAudio).not.toHaveBeenCalled(); expect(disconnected.onError).toHaveBeenCalled();
});

test('permission denial and missing browser support have accessible text fallbacks', async () => {
    const denied = fixture(); denied.media.getUserMedia.mockRejectedValue({name: 'NotAllowedError'});
    await denied.voice.start(); expect(denied.onError.mock.calls[0][0]).toContain('permission was denied');
    const missing = fixture({Recorder: null}); await missing.voice.start();
    expect(missing.media.getUserMedia).not.toHaveBeenCalled(); expect(missing.onError).toHaveBeenCalled();
});
