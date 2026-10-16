// Bounded session-only learning context. Never used for persistence or restoration.
const canonical = value => {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.keys(value).sort()
            .map(key => [key, canonical(value[key])]));
    }
    return value;
};
const index = project => {
    const result = new Map();
    for (const target of project.targets || []) {
        for (const [id, block] of Object.entries(target.blocks || {})) {
            if (!block || Array.isArray(block) || block.shadow) continue;
            const logic = canonical({opcode: block.opcode,
                inputs: block.inputs,
                fields: block.fields,
                next: block.next,
                parent: block.parent,
                mutation: block.mutation});
            // Resolve shadow values so editing a number counts as modifying its owning block.
            const shadows = {};
            for (const input of Object.values(block.inputs || {})) {
                for (const ref of input) {
                    if (typeof ref === 'string' && target.blocks[ref]?.shadow) {
                        shadows[ref] = canonical(target.blocks[ref].fields);
                    }
                }
            }
            result.set(`${target.id || target.name}:${id}`, {sprite: target.name,
                id,
                opcode: block.opcode,
                signature: JSON.stringify({logic, shadows})});
        }
    }
    return result;
};
export class TutorHistory {
    constructor (project, now = () => new Date().toISOString()) {
        this.previous = index(project); this.changes = []; this.conversation = []; this.now = now;
    }
    observe (project) {
        const next = index(project);
        const timestamp = this.now();
        for (const [key, entry] of next) {
            const old = this.previous.get(key);
            if (!old || old.signature !== entry.signature) {
                this.changes.push({sprite: entry.sprite,
                    id: entry.id,
                    opcode: entry.opcode,
                    action: old ? 'modified' : 'added',
                    timestamp});
            }
        }
        for (const [key, entry] of this.previous) {
            if (!next.has(key)) {
                this.changes.push({sprite: entry.sprite,
                    id: entry.id,
                    opcode: entry.opcode,
                    action: 'removed',
                    timestamp});
            }
        }
        this.changes = this.changes.slice(-40); this.previous = next;
    }
    remember (requestId, question, text) {
        if (this.conversation.some(exchange => exchange.requestId === requestId)) return;
        this.conversation.push({requestId, question, reply: text});
        this.conversation = this.conversation.slice(-4);
    }
    context () {
        return {recentChanges: this.changes.map(change => ({...change})),
            recentConversation: this.conversation.map(({question, reply}) => ({question, reply}))};
    }
}
