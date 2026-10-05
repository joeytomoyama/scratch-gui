// Permission and device handles stay local; recording is uploaded only by Ask.
export class TutorRecorder {
    constructor (onResult, onError) {
        this.onResult = onResult; this.onError = onError;
    }
    async start () {
        if (!navigator.mediaDevices || typeof MediaRecorder === 'undefined') {
            throw new Error('Recording is unavailable. Please type your question instead.');
        }
        this.stream = await navigator.mediaDevices.getUserMedia({audio: true});
        if (this.cancelled) {
            this.release(); return;
        }
        try {
            const types = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'];
            const mimeType = types.find(type => MediaRecorder.isTypeSupported(type));
            this.recorder = new MediaRecorder(this.stream, mimeType ? {mimeType} : {});
            const chunks = [];
            let size = 0;
            this.recorder.ondataavailable = event => {
                size += event.data.size;
                if (size > 10 * 1024 * 1024) {
                    this.cancel();
                    this.onError('Recording exceeds 10 MB. Try a shorter question.');
                } else chunks.push(event.data);
            };
            this.recorder.onerror = () => {
                this.cancel(); this.onError('Recording failed. Please try text.');
            };
            this.recorder.onstop = () => {
                this.release();
                if (!this.cancelled) this.onResult(new Blob(chunks, {type: this.recorder.mimeType}));
            };
            this.recorder.start(250);
            this.timer = setTimeout(() => this.stop(), 60000);
        } catch (error) {
            this.release(); throw error;
        }
    }
    release () {
        clearTimeout(this.timer);
        if (this.stream) this.stream.getTracks().forEach(track => track.stop());
    }
    stop () {
        clearTimeout(this.timer);
        if (!this.recorder) this.cancelled = true; // Stop also cancels an outstanding permission prompt.
        if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop();
        this.release();
    }
    cancel () {
        this.cancelled = true; this.stop();
    }
}
