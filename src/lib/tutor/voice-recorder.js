// Recording lives only in memory. Releasing while permission is pending cancels capture.
export class VoiceRecorder {
    constructor ({onAudio, onState, onError, media = navigator.mediaDevices, Recorder = window.MediaRecorder,
        maxMs = 60000, maxBytes = 2 * 1024 * 1024}) {
        Object.assign(this, {onAudio, onState, onError, media, Recorder, maxMs, maxBytes});
    }
    get supported () {
        return Boolean(this.media?.getUserMedia && this.Recorder);
    }
    async start () {
        if (this.active) return;
        if (!this.supported) {
            return this.onError('Voice recording is unavailable in this browser. You can type instead.');
        }
        const session = {chunks: [], size: 0, stream: null, recorder: null};
        this.active = session; this.onState('permission');
        try {
            const stream = await this.media.getUserMedia({audio: {channelCount: 1, echoCancellation: true},
                video: false});
            // Each start owns this session; late streams are explicitly stopped below.
            // eslint-disable-next-line require-atomic-updates
            session.stream = stream;
            if (this.active !== session) {
                session.stream.getTracks().forEach(track => track.stop()); return;
            }
            const mimeType = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4']
                .find(type => this.Recorder.isTypeSupported(type));
            if (!mimeType) throw new Error('unsupported');
            const recorder = new this.Recorder(session.stream, {mimeType, audioBitsPerSecond: 64000});
            session.recorder = recorder;
            recorder.ondataavailable = event => {
                if (this.active !== session) return;
                session.size += event.data.size;
                if (session.size > this.maxBytes) {
                    this.cancel(); this.onError('Recording is too large. Please try a shorter question.'); return;
                }
                if (event.data.size) session.chunks.push(event.data);
            };
            recorder.onerror = () => {
                if (this.active !== session) return;
                this.cancel(); this.onError('Recording failed. Please try again or type your question.');
            };
            recorder.onstop = () => {
                this.release(session);
                if (this.active !== session) return;
                this.active = null; this.onState('idle');
                const audio = new Blob(session.chunks, {type: recorder.mimeType || mimeType});
                if (!audio.size || Date.now() - session.started < 250) {
                    this.onError('Hold the microphone button while you ask your question.'); return;
                }
                this.onAudio(audio);
            };
            session.stream.getTracks().forEach(track => {
                track.onended = () => {
                    if (this.active === session) {
                        this.cancel(); this.onError('Microphone disconnected. You can type your question.');
                    }
                };
            });
            session.started = Date.now(); recorder.start(1000);
            session.timer = setTimeout(() => this.stop(), this.maxMs);
            this.onState('recording');
        } catch (error) {
            if (this.active !== session) return;
            this.cancel();
            this.onError(error.name === 'NotAllowedError' ?
                'Microphone permission was denied. Allow microphone access or type your question.' :
                'Microphone unavailable. Check your microphone or type your question.');
        }
    }
    stop () {
        const session = this.active;
        if (!session) return;
        if (!session.recorder) return this.cancel();
        clearTimeout(session.timer);
        if (session.recorder.state !== 'inactive') session.recorder.stop();
    }
    release (session) {
        clearTimeout(session.timer);
        session.stream?.getTracks().forEach(track => {
            track.onended = null; track.stop();
        });
    }
    cancel () {
        const session = this.active;
        if (!session) return;
        this.active = null;
        if (session.recorder?.state !== 'inactive') session.recorder?.stop();
        this.release(session); this.onState('idle');
    }
}
