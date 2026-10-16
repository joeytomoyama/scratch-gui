import {captureTutorPreviews} from './previews';
import {tutorProjection} from './projection';
import {captureTutorBlocks, tutorEditorContext} from './editor-context';
import {classroomLocales} from '../classroom-locales';
import {TutorHistory} from './history';

export class ManualTutor {
    constructor ({vm, api, makeId = () => crypto.randomUUID()}) {
        Object.assign(this, {vm, api, makeId});
        this.pending = null;
        this.history = new TutorHistory(JSON.parse(vm.toJSON(null, {allowOptimization: false})));
        this.changed = () => {
            clearTimeout(this.historyTimer);
            this.historyTimer = setTimeout(() => this.observe(), 300);
        };
        vm.on('PROJECT_CHANGED', this.changed);
    }
    observe () {
        clearTimeout(this.historyTimer);
        this.history.observe(JSON.parse(this.vm.toJSON(null, {allowOptimization: false})));
    }
    capture (question = '', course, projectId, language) {
        if (typeof question !== 'string' || question.length > 2000) {
            throw new Error('Questions must be text (up to 2,000 characters).');
        }
        const project = JSON.parse(this.vm.toJSON(null, {allowOptimization: false}));
        clearTimeout(this.historyTimer);
        this.history.observe(project);
        this.snapshot?.dispose();
        this.snapshot = captureTutorBlocks(this.vm, project);
        // Preview failure must never prevent Ask or its text/audio reply.
        try {
            this.previews = captureTutorPreviews(this.vm);
        } catch (e) {
            this.previews = null;
        }
        this.pending = {requestId: this.makeId(),
            question: question.trim(),
            // Optimized exports rename block IDs; tutor hints must refer to real workspace IDs.
            context: tutorProjection(project),
            editor: tutorEditorContext(this.vm),
            ...this.history.context(),
            ...(language && language !== 'auto' ? {language} : {}),
            ...(projectId ? {projectId} : {}),
            ...(course ? {course: {...course}} : {})};
    }
    ask (question = '', course, projectId, language) {
        this.capture(question, course, projectId, language);
        return this.retry();
    }
    async transcribe (audio, course, projectId, language = 'auto') {
        this.capture('', course, projectId, language);
        const pending = this.pending;
        const transcript = await this.api.transcribe(pending.requestId, audio, language);
        if (this.pending !== pending) throw new Error('Project or account changed.');
        if (!transcript?.question?.trim() || transcript.question.length > 2000 ||
            !classroomLocales.includes(transcript.language) ||
            (pending.language && transcript.language !== pending.language)) {
            throw new Error('Invalid transcription.');
        }
        pending.question = transcript.question.trim(); pending.language = transcript.language;
        return transcript;
    }
    async retry () {
        if (!this.pending) throw new Error('No pending question.');
        const pending = this.pending;
        const result = await this.api.ask(pending);
        if (this.pending !== pending || result.requestId !== pending.requestId) {
            throw new Error('Invalid tutor acknowledgement.');
        }
        if (result.status === 'complete' && result.feedback?.text) {
            this.history.remember(pending.requestId, pending.question, result.feedback.text);
        }
        return result;
    }
    dispose () {
        clearTimeout(this.historyTimer); this.vm.off('PROJECT_CHANGED', this.changed);
        this.snapshot?.dispose(); this.snapshot = null;
        this.previews = null;
        this.pending = null; this.api.dispose();
    }
}
