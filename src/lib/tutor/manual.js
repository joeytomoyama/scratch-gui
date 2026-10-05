import {tutorProjection} from './projection';
import {captureTutorBlocks, tutorEditorContext} from './editor-context';

export class ManualTutor {
    constructor ({vm, api, makeId = () => crypto.randomUUID()}) {
        Object.assign(this, {vm, api, makeId});
        this.pending = null;
    }
    ask (question = '', course, projectId) {
        if (typeof question !== 'string' || question.length > 2000) {
            throw new Error('Questions must be text (up to 2,000 characters).');
        }
        const project = JSON.parse(this.vm.toJSON(null, {allowOptimization: false}));
        this.snapshot?.dispose();
        this.snapshot = captureTutorBlocks(this.vm, project);
        this.pending = {requestId: this.makeId(),
            question: question.trim(),
            // Optimized exports rename block IDs; tutor hints must refer to real workspace IDs.
            context: tutorProjection(project),
            editor: tutorEditorContext(this.vm),
            ...(projectId ? {projectId} : {}),
            ...(course ? {course: {...course}} : {})};
        return this.retry();
    }
    async retry () {
        if (!this.pending) throw new Error('No pending question.');
        const result = await this.api.ask(this.pending);
        if (result.requestId !== this.pending.requestId) throw new Error('Invalid tutor acknowledgement.');
        return result;
    }
    dispose () {
        this.snapshot?.dispose(); this.snapshot = null;
        this.pending = null; this.api.dispose();
    }
}
