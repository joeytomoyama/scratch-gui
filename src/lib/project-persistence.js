import saveProjectToServer from './save-project-to-server';

export const captureProject = vm => {
    const project = JSON.parse(vm.toJSON());
    const files = new Map(vm.serializeAssets().map(file => [file.fileName, new Uint8Array(file.fileContent)]));
    const assets = Array.from(files, ([fileName, bytes]) => ({fileName, byteLength: bytes.byteLength}));
    return {project, assets, files};
};

export class ProjectPersistence {
    constructor ({vm, adapter, id, courseId, revision = 0, onState = () => {}, onSaved = () => {},
        save = saveProjectToServer, delay = 20000}) {
        Object.assign(this, {vm, adapter, id, courseId, revision, onState, onSaved, save, delay});
        this.generation = 0; this.committed = 0; this.saving = null;
        this.dirtySince = null; this.timer = null; this.job = null; this.flight = null; this.disposed = false;
        this.changed = () => this.edit();
        vm.on('PROJECT_CHANGED', this.changed);
    }
    emit (status) {
        this.onState({status,
            generation: this.generation,
            committed: this.committed,
            saving: this.saving,
            projectId: this.id,
            revision: this.revision});
    }
    dirty () {
        return this.generation > this.committed || Boolean(this.job);
    }
    edit () {
        if (this.disposed) return;
        this.generation++;
        if (this.dirtySince === null) this.dirtySince = Date.now();
        this.emit(this.flight ? 'Saving' : 'Unsaved');
        this.schedule();
    }
    schedule () {
        if (this.disposed || this.timer || this.flight || !this.dirty()) return;
        this.timer = setTimeout(() => {
            this.timer = null; this.flush(false).catch(() => {});
        },
        Math.max(0, this.delay - (Date.now() - this.dirtySince)));
    }
    async flush (manual = true) {
        if (this.disposed) return;
        if (this.flight) {
            await this.flight;
            if (this.dirty()) return this.flush(manual);
            return;
        }
        if (!manual && !this.dirty() && this.revision) return;
        clearTimeout(this.timer); this.timer = null;
        if (!this.job) {
            let captured;
            try {
                captured = captureProject(this.vm);
            } catch (error) {
                this.emit('Save failed — Retry'); throw error;
            }
            this.job = {generation: this.generation,
                files: captured.files,
                body: {revision: ++this.revision,
                    project: captured.project,
                    assets: captured.assets,
                    summary: [],
                    ...(this.courseId ? {courseId: this.courseId} : {})}};
        }
        const job = this.job;
        this.saving = job.generation; this.dirtySince = null;
        this.emit('Saving');
        this.flight = Promise.resolve().then(() => this.save(this.adapter, this.id, job.body, job.files));
        try {
            await this.flight;
            if (this.disposed) return;
            this.committed = job.generation; this.job = null; this.saving = null;
            this.onSaved(this.id, job.body.revision);
            this.emit(this.dirty() ? 'Unsaved' : 'Saved');
        } catch (error) {
            if (!this.disposed) this.emit('Save failed — Retry');
            throw error;
        } finally {
            this.flight = null; this.saving = null;
            if (!this.job && this.dirty()) this.schedule();
        }
        if (manual && !this.disposed && !this.job && this.dirty()) return this.flush(true);
    }
    dispose () {
        this.disposed = true; clearTimeout(this.timer);
        this.vm.off('PROJECT_CHANGED', this.changed); this.adapter.dispose();
    }
}
