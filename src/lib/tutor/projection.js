// AI input only. Never use this lossy representation for VM restoration.
/* eslint-disable max-len, no-loop-func */
const labels = {
    event_whenflagclicked: 'when green flag clicked',
    event_whenkeypressed: 'when key pressed',
    event_whenbroadcastreceived: 'when I receive broadcast',
    event_broadcast: 'broadcast',
    event_broadcastandwait: 'broadcast and wait',
    control_repeat: 'repeat',
    control_forever: 'forever',
    control_if: 'if',
    control_if_else: 'if / else',
    control_wait: 'wait seconds',
    control_repeat_until: 'repeat until',
    control_wait_until: 'wait until',
    motion_movesteps: 'move steps',
    motion_turnright: 'turn clockwise degrees',
    motion_turnleft: 'turn counterclockwise degrees',
    motion_changexby: 'change x by',
    motion_changeyby: 'change y by',
    motion_setx: 'set x',
    motion_sety: 'set y',
    data_setvariableto: 'set variable',
    data_changevariableby: 'change variable by',
    looks_say: 'say',
    looks_sayforsecs: 'say for seconds',
    procedures_definition: 'define custom block',
    procedures_call: 'call custom block',
    procedures_prototype: 'custom block signature'
};
const valueText = value => {
    const text = JSON.stringify(value);
    return text && text.length > 2000 ? `${text.slice(0, 2000)}… [truncated]` : text;
};
export const tutorProjection = project => {
    const lines = [];
    let budget = 1000;
    for (const target of project.targets || []) {
        lines.push(`${target.isStage ? 'Stage' : 'Sprite'} ${JSON.stringify(target.name)}`);
        const properties = {};
        for (const key of ['x', 'y', 'direction', 'size', 'visible', 'rotationStyle', 'currentCostume', 'volume', 'tempo']) {
            if (Object.prototype.hasOwnProperty.call(target, key)) properties[key] = target[key];
        }
        if (Object.keys(properties).length) lines.push(`Properties: ${JSON.stringify(properties)}`);
        for (const section of ['variables', 'lists', 'broadcasts']) {
            const entries = Object.entries(target[section] || {}).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
            for (const [id, value] of entries) lines.push(`${section} [${id}]: ${valueText(value)}`);
        }
        for (const kind of ['costumes', 'sounds']) {
            const names = (target[kind] || []).map(asset => asset.name);
            if (names.length) lines.push(`${kind}: ${JSON.stringify(names)}`);
        }
        for (const [id, comment] of Object.entries(target.comments || {}).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
            lines.push(`Comment [${id}]${comment.blockId ? ` on [${comment.blockId}]` : ''}: ${valueText(comment.text)}`);
        }
        const blocks = target.blocks || {};
        const visited = new Set();
        const literal = item => (Array.isArray(item) ?
            (item[0] === 12 ? `variable ${valueText(item[1])} [${item[2]}]` :
                item[0] === 13 ? `list ${valueText(item[1])} [${item[2]}]` : valueText(item[1])) : valueText(item));
        const block = (id, depth, chain = true) => {
            if (!id) return;
            if (depth > 30 || --budget < 0) {
                lines.push('… [script limit]'); return;
            }
            const indent = '  '.repeat(depth);
            if (visited.has(id)) {
                lines.push(`${indent}reference [${id}]`); return;
            }
            visited.add(id);
            const b = blocks[id];
            if (!b) {
                lines.push(`${indent}missing block [${id}]`); return;
            }
            if (Array.isArray(b)) {
                lines.push(`${indent}[${id}] ${literal(b)}`); return;
            }
            const name = labels[b.opcode] || String(b.opcode).replace(/_/g, ' ');
            const fields = Object.keys(b.fields || {}).sort()
                .map(key => `${key}=${valueText(b.fields[key][0])}`);
            lines.push(`${indent}[${id}] ${name} (opcode: ${b.opcode})${fields.length ? ` (${fields.join(', ')})` : ''}`);
            if (b.mutation?.proccode) lines.push(`${indent}  signature: ${valueText(b.mutation.proccode)}`);
            if (b.mutation?.argumentnames) lines.push(`${indent}  arguments: ${b.mutation.argumentnames}`);
            for (const key of Object.keys(b.inputs || {}).sort()) {
                const input = b.inputs[key];
                const active = input[1] === null ? input[2] : input[1];
                lines.push(`${indent}  ${key}:`);
                if (typeof active === 'string') block(active, depth + 2);
                else lines.push(`${indent}    ${literal(active)}`);
            }
            if (chain && b.next) block(b.next, depth);
        };
        for (const id of Object.keys(blocks).sort()) {
            if (blocks[id].topLevel || Array.isArray(blocks[id])) {
                lines.push('Script:'); block(id, 1);
            }
        }
        // Preserve malformed/unattached blocks as context without recursing forever.
        for (const id of Object.keys(blocks).sort()) if (!visited.has(id)) block(id, 1);
    }
    if (project.extensions?.length) lines.push(`Extensions: ${JSON.stringify(project.extensions)}`);
    const text = lines.join('\n');
    return {version: 1, text: text.length > 190000 ? `${text.slice(0, 190000)}\n[Context truncated]` : text};
};
