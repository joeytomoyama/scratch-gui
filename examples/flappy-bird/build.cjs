/* Build a portable Scratch 3 project using only standard Scratch blocks. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Zip = require('@turbowarp/jszip');
const root = __dirname;
const zip = new Zip();
let serial = 0;
const num = n => [1, [4, String(n)]];
const str = s => [1, [10, s]];
const variable = name => [3, [12, name, name], [4, '0']];
const broadcasts = {reset: 'reset', play: 'play', died: 'died', spawn: 'spawn'};
const targets = [];
function target(name, stage = false) {
    const t = {isStage: stage, name, variables: {}, lists: {}, broadcasts: stage ? broadcasts : {},
        blocks: {}, comments: {}, currentCostume: 0, costumes: [], sounds: [], volume: 100,
        layerOrder: targets.length, ...(stage ? {tempo: 60, videoTransparency: 50, videoState: 'off', textToSpeechLanguage: null} :
            {visible: true, x: 0, y: 0, size: 100, direction: 90, draggable: false, rotationStyle: 'all around'})};
    targets.push(t);
    return t;
}
function block(t, opcode, inputs = {}, fields = {}) {
    const id = `b${++serial}`;
    t.blocks[id] = {opcode, next: null, parent: null, inputs, fields, shadow: false, topLevel: false};
    for (const value of Object.values(inputs)) {
        if (typeof value[1] === 'string' && t.blocks[value[1]]) t.blocks[value[1]].parent = id;
    }
    return id;
}
const ref = id => [2, id];
function chain(t, ...ids) {
    ids.forEach((id, i) => {if (i) {t.blocks[ids[i - 1]].next = id; t.blocks[id].parent = ids[i - 1];}});
    return ids[0];
}
function script(t, hat, ...ids) {
    chain(t, hat, ...ids);
    Object.assign(t.blocks[hat], {topLevel: true, x: 40 + 420 * Object.values(t.blocks).filter(b => b.topLevel).length, y: 40});
}
function procedure(t, name, x, y, ...body) {
    const prototype = block(t, 'procedures_prototype');
    Object.assign(t.blocks[prototype], {shadow: true, mutation: {tagName: 'mutation', children: [],
        proccode: name, argumentids: '[]', argumentnames: '[]', argumentdefaults: '[]',
        warp: name === 'Wait for restart' ? 'false' : 'true'}});
    const definition = block(t, 'procedures_definition', {custom_block: [1, prototype]});
    script(t, definition, ...body);
    Object.assign(t.blocks[definition], {x, y});
}
function call(t, name) {
    const id = block(t, 'procedures_call');
    t.blocks[id].mutation = {tagName: 'mutation', children: [], proccode: name, argumentids: '[]',
        warp: name === 'Wait for restart' ? 'false' : 'true'};
    return id;
}
const receive = (t, name) => block(t, 'event_whenbroadcastreceived', {}, {BROADCAST_OPTION: [name, name]});
const send = (t, name) => block(t, 'event_broadcast', {BROADCAST_INPUT: [1, [11, name, name]]});
const set = (t, name, value) => block(t, 'data_setvariableto', {VALUE: value}, {VARIABLE: [name, name]});
const change = (t, name, value) => block(t, 'data_changevariableby', {VALUE: value}, {VARIABLE: [name, name]});
const wait = (t, seconds) => block(t, 'control_wait', {DURATION: num(seconds)});
const eq = (t, a, b) => ref(block(t, 'operator_equals', {OPERAND1: a, OPERAND2: b}));
const op = (t, name, a, b) => ref(block(t, `operator_${name}`, {[name === 'and' || name === 'or' ? 'OPERAND1' : 'NUM1']: a, [name === 'and' || name === 'or' ? 'OPERAND2' : 'NUM2']: b}));
const compare = (t, name, a, b) => ref(block(t, `operator_${name}`, {OPERAND1: a, OPERAND2: b}));
const iff = (t, condition, ...body) => block(t, 'control_if', {CONDITION: condition, SUBSTACK: ref(chain(t, ...body))});
const until = (t, condition, ...body) => block(t, 'control_repeat_until', {CONDITION: condition, SUBSTACK: ref(chain(t, ...body))});
const forever = (t, ...body) => block(t, 'control_forever', {SUBSTACK: ref(chain(t, ...body))});
const waitUntil = (t, condition) => block(t, 'control_wait_until', {CONDITION: condition});
function pressed(t) {
    const menu = block(t, 'sensing_keyoptions', {}, {KEY_OPTION: ['space', null]});
    t.blocks[menu].shadow = true;
    const key = ref(block(t, 'sensing_keypressed', {KEY_OPTION: [1, menu]}));
    return op(t, 'or', key, ref(block(t, 'sensing_mousedown')));
}
const not = (t, input) => ref(block(t, 'operator_not', {OPERAND: input}));
function costume(t, name, data, format, cx, cy) {
    const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const hash = crypto.createHash('md5').update(bytes).digest('hex');
    zip.file(`${hash}.${format}`, bytes);
    t.costumes.push({assetId: hash, name, bitmapResolution: 1, md5ext: `${hash}.${format}`,
        dataFormat: format, rotationCenterX: cx, rotationCenterY: cy});
}
const svg = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
const stage = target('Stage', true);
for (const [name, value] of Object.entries({Score: 0, 'Game state': 0, 'Gap center': 0})) stage.variables[name] = [name, value];
costume(stage, 'Sunny sky', svg(360, 640,
    '<rect width="360" height="640" fill="#8edce5"/>' +
    '<g fill="#eafff6"><ellipse cx="45" cy="120" rx="55" ry="17"/><ellipse cx="300" cy="235" rx="75" ry="20"/><ellipse cx="195" cy="60" rx="45" ry="14"/></g>' +
    '<path d="M0 580Q50 525 100 575Q155 510 220 570Q280 525 360 575V640H0Z" fill="#a7d99a"/>' +
    '<rect y="614" width="360" height="26" fill="#e8cd8b"/><rect y="610" width="360" height="7" fill="#548c58"/>'), 'svg', 180, 320);
// The hidden originals produce matched top/bottom clones with one shared gap value.
script(stage, block(stage, 'event_whenflagclicked'), forever(stage,
    waitUntil(stage, eq(stage, variable('Game state'), num(1))),
    set(stage, 'Gap center', ref(block(stage, 'operator_random', {FROM: num(-60), TO: num(90)}))),
    send(stage, 'spawn'), wait(stage, 1.85)));

const bird = target('Bird');
bird.x = -70;
bird.size = 70;
bird.variables.Velocity = ['Velocity', 0];
bird.variables.Held = ['Held', 0];
costume(bird, 'Wing up', fs.readFileSync(path.join(root, 'assets/bird-up.png')), 'png', 30, 30);
costume(bird, 'Wing down', fs.readFileSync(path.join(root, 'assets/bird-down.png')), 'png', 30, 30);
function touching(name) {
    const menu = block(bird, 'sensing_touchingobjectmenu', {}, {TOUCHINGOBJECTMENU: [name, null]});
    bird.blocks[menu].shadow = true;
    return ref(block(bird, 'sensing_touchingobject', {TOUCHINGOBJECTMENU: [1, menu]}));
}
const yPos = () => ref(block(bird, 'motion_yposition'));
const hit = () => op(bird, 'or', op(bird, 'or', touching('Lower pipe'), touching('Upper pipe')),
    op(bird, 'or', compare(bird, 'lt', yPos(), num(-275)), compare(bird, 'gt', yPos(), num(302))));
script(bird, block(bird, 'event_whenflagclicked'), forever(bird,
    call(bird, 'Reset round'), waitUntil(bird, pressed(bird)), call(bird, 'Start flying'),
    until(bird, eq(bird, variable('Game state'), num(2)),
        call(bird, 'Read flap input'), call(bird, 'Move bird'), call(bird, 'Check collisions')),
    call(bird, 'Wait for restart')));
procedure(bird, 'Wait for restart', 40, 1000,
    wait(bird, 0.5), waitUntil(bird, not(bird, pressed(bird))), waitUntil(bird, pressed(bird)));
procedure(bird, 'Reset round', 620, 40,
    set(bird, 'Game state', num(0)), set(bird, 'Score', num(0)), set(bird, 'Velocity', num(0)), set(bird, 'Held', num(1)),
    send(bird, 'reset'), block(bird, 'motion_gotoxy', {X: num(-70), Y: num(20)}),
    block(bird, 'motion_pointindirection', {DIRECTION: num(90)}), block(bird, 'looks_show'));
procedure(bird, 'Start flying', 620, 580,
    set(bird, 'Velocity', num(6)), set(bird, 'Game state', num(1)), send(bird, 'play'));
procedure(bird, 'Read flap input', 1120, 40,
    iff(bird, not(bird, pressed(bird)), set(bird, 'Held', num(0))),
    iff(bird, op(bird, 'and', pressed(bird), eq(bird, variable('Held'), num(0))),
        set(bird, 'Velocity', num(6)), set(bird, 'Held', num(1))));
procedure(bird, 'Move bird', 620, 880,
    change(bird, 'Velocity', num(-0.36)), block(bird, 'motion_changeyby', {DY: variable('Velocity')}),
    block(bird, 'motion_pointindirection', {DIRECTION: op(bird, 'subtract', num(90), op(bird, 'multiply', variable('Velocity'), num(3)))}));
procedure(bird, 'Check collisions', 1120, 580,
    iff(bird, hit(), set(bird, 'Game state', num(2)), send(bird, 'died')));
const animationHat = block(bird, 'event_whenflagclicked');
script(bird, animationHat, forever(bird,
    iff(bird, eq(bird, variable('Game state'), num(1)), block(bird, 'looks_nextcostume')), wait(bird, 0.12)));
Object.assign(bird.blocks[animationHat], {x: 40, y: 600});

for (const upper of [false, true]) {
    const t = target(upper ? 'Upper pipe' : 'Lower pipe');
    t.visible = false;
    t.size = 65;
    t.variables.Passed = ['Passed', 0];
    t.variables.Clone = ['Clone', 0];
    // Keep the original cap at its native proportions; extend only the shaft
    // by composing slices of the original PNG in a taller SVG costume.
    const pipeData = fs.readFileSync(path.join(root, upper ? 'assets/pipe-top.png' : 'assets/pipe.png')).toString('base64');
    const image = `<image width="100" height="400" href="data:image/png;base64,${pipeData}"/>`;
    const capY = upper ? 346 : 0;
    const shaftY = upper ? 0 : 54;
    const cap = `<svg x="0" y="${upper ? 846 : 0}" width="100" height="54" viewBox="0 ${capY} 100 54">${image}</svg>`;
    const shaft = `<svg x="0" y="${upper ? 0 : 54}" width="100" height="846" viewBox="0 ${shaftY} 100 346" preserveAspectRatio="none">${image}</svg>`;
    costume(t, 'Red pipe (portrait)', svg(100, 900, cap + shaft), 'svg', 50, 450);
    script(t, block(t, 'event_whenflagclicked'), block(t, 'looks_hide'));
    const menu = block(t, 'control_create_clone_of_menu', {}, {CLONE_OPTION: ['_myself_', null]});
    t.blocks[menu].shadow = true;
    script(t, receive(t, 'spawn'), iff(t, eq(t, variable('Clone'), num(0)),
        block(t, 'control_create_clone_of', {CLONE_OPTION: [1, menu]})));
    script(t, receive(t, 'reset'), block(t, 'control_delete_this_clone'));
    const body = [block(t, 'motion_changexby', {DX: num(-2.6)})];
    if (!upper) body.push(iff(t, op(t, 'and', compare(t, 'lt', ref(block(t, 'motion_xposition')), num(-108)),
        eq(t, variable('Passed'), num(0))), change(t, 'Score', num(1)), set(t, 'Passed', num(1))));
    script(t, block(t, 'control_start_as_clone'), set(t, 'Clone', num(1)), set(t, 'Passed', num(0)),
        block(t, 'motion_gotoxy', {X: num(220), Y: op(t, 'add', variable('Gap center'), num(upper ? 367.5 : -367.5))}),
        block(t, 'looks_show'),
        until(t, op(t, 'or', compare(t, 'lt', ref(block(t, 'motion_xposition')), num(-195)),
            eq(t, variable('Game state'), num(0))), iff(t, eq(t, variable('Game state'), num(1)), ...body)),
        block(t, 'control_delete_this_clone'));
}
const card = target('Instructions');
costume(card, 'Ready', svg(310, 125, '<rect width="310" height="125" rx="14" fill="#fff8e5" stroke="#405850" stroke-width="4"/><g font-family="sans-serif" text-anchor="middle" fill="#344c45"><text x="155" y="39" font-size="27" font-weight="bold">LITTLE WINGS</text><text x="155" y="72" font-size="17">Tap / click or press SPACE</text><text x="155" y="100" font-size="15">Fly through the gaps!</text></g>'), 'svg', 155, 62.5);
costume(card, 'Game over', svg(310, 125, '<rect width="310" height="125" rx="14" fill="#fff8e5" stroke="#405850" stroke-width="4"/><g font-family="sans-serif" text-anchor="middle" fill="#344c45"><text x="155" y="42" font-size="29" font-weight="bold">GAME OVER</text><text x="155" y="78" font-size="17">Tap / SPACE to try again</text><text x="155" y="103" font-size="14">Your score is at the top left</text></g>'), 'svg', 155, 62.5);
card.y = 150;
script(card, receive(card, 'reset'), block(card, 'looks_switchcostumeto', {COSTUME: str('Ready')}), block(card, 'looks_show'));
script(card, receive(card, 'play'), block(card, 'looks_hide'));
script(card, receive(card, 'died'), block(card, 'looks_switchcostumeto', {COSTUME: str('Game over')}), block(card, 'looks_show'));
// Instructions remain above the moving pipes.
card.layerOrder = 10;
const project = {targets, monitors: [{id: 'Score', mode: 'default', opcode: 'data_variable', params: {VARIABLE: 'Score'},
    spriteName: null, value: 0, width: 0, height: 0, x: 72, y: -128, visible: true, sliderMin: 0, sliderMax: 100, isDiscrete: true}],
extensions: [], meta: {semver: '3.0.0', vm: '0.2.0', agent: 'Little Wings / Scratch 3'}};
zip.file('project.json', JSON.stringify(project));
zip.generateAsync({type: 'nodebuffer', compression: 'DEFLATE'}).then(data => {
    fs.writeFileSync(path.join(root, 'Little Wings.sb3'), data);
    console.log(`Created Little Wings.sb3 (${data.length} bytes; ${serial} standard blocks)`);
});
