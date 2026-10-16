/** @jest-environment node */
import fs from 'fs';
import os from 'os';
import path from 'path';
import {spawnSync} from 'child_process';

const chrome = process.env.CHROME_BIN || [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium'
].find(candidate => fs.existsSync(candidate));
const browserTest = chrome ? test : test.skip;

// Real renderer, hit testing and gesture handling, with disposable synthetic code.
// No app login, VM project, backend or provider calls are involved.
browserTest('Operators remain draggable after a collapsed locale/toolbox rebuild', () => {
    const repo = path.resolve(__dirname, '../..');
    const fileUrl = file => `file:///${file.replace(/\\/g, '/').replace(/^\//, '')}`;
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'palette-regression-'));
    const source = fs.readFileSync(path.join(repo, 'src/lib/responsive-block-palette.js'), 'utf8')
        .replace('export default ResponsiveBlockPalette;', '');
    const scripts = ['blockly_compressed_vertical.js', 'blocks_compressed.js',
        'blocks_compressed_vertical.js', 'msg/messages.js', 'msg/scratch_msgs.js']
        .map(file => `<script src="${fileUrl(path.join(repo, 'node_modules/scratch-blocks', file))}"></script>`)
        .join('');
    const operators = {
        operator_add: ['NUM1', 'NUM2'],
        operator_subtract: ['NUM1', 'NUM2'],
        operator_multiply: ['NUM1', 'NUM2'],
        operator_divide: ['NUM1', 'NUM2'],
        operator_random: ['FROM', 'TO'],
        operator_gt: ['OPERAND1', 'OPERAND2'],
        operator_lt: ['OPERAND1', 'OPERAND2'],
        operator_equals: ['OPERAND1', 'OPERAND2'],
        operator_and: [],
        operator_or: [],
        operator_not: [],
        operator_join: ['STRING1', 'STRING2']
    };
    const html = `<!doctype html><meta charset="utf-8">
<style>body{margin:0}#editor{position:relative;width:700px;height:600px}</style>
<div id="editor"></div><pre id="result">RUNNING</pre>${scripts}<script>${source}
const results = [];
const sleep = () => new Promise(resolve => setTimeout(resolve, 20));
const operators = ${JSON.stringify(operators)};
async function run(type, inputs, rtl) {
    const root = document.getElementById('editor');
    const values = inputs.map(name => '<value name="'+name+'"><shadow type="'+
        (name.startsWith('STRING') || name.startsWith('OPERAND') ? 'text' : 'math_number')+
        '"><field name="'+(name.startsWith('STRING') || name.startsWith('OPERAND') ? 'TEXT' : 'NUM')+
        '"/></shadow></value>').join('');
    const toolbox = '<xml><category name="Operators" id="operators" colour="#59c059" '+
        'secondaryColour="#389438"><block type="'+type+'">'+values+'</block></category></xml>';
    const workspace = Blockly.inject(root, {toolbox, rtl, scrollbars:true,
        media:${JSON.stringify(`${fileUrl(path.join(repo, 'node_modules/scratch-blocks/media'))}/`)}});
    const flyout = workspace.getFlyout();
    const palette = new ResponsiveBlockPalette(workspace, root);
    // Match Blocks.setLocale: discard old blocks, rebuild while collapsed, then
    // enable recycling for the subsequent sprite/toolbox update.
    flyout.setRecyclingEnabled(false);
    workspace.updateToolbox(toolbox);
    flyout.setRecyclingEnabled(true);
    workspace.updateToolbox(toolbox);
    workspace.toolbox_.scrollToCategoryById('operators');
    await sleep();
    const origin = workspace.getMetrics().absoluteLeft;
    const block = flyout.getWorkspace().getTopBlocks(false).find(block => block.type === type);
    const bounds = block.getSvgRoot().getBoundingClientRect();
    const x = bounds.left + bounds.width / 2, y = bounds.top + bounds.height / 2;
    const target = document.elementFromPoint(x, y);
    target.dispatchEvent(new MouseEvent('mousedown', {bubbles:true, cancelable:true,
        clientX:x, clientY:y, button:0, buttons:1}));
    const edge = flyout.svgGroup_.getBoundingClientRect();
    const endX = rtl ? edge.left - 40 : edge.right + 40;
    // Pick up the block while the pointer is still inside the open palette.
    const pickupX = x + (rtl ? -30 : 30);
    document.dispatchEvent(new MouseEvent('mousemove', {bubbles:true, cancelable:true,
        clientX:pickupX, clientY:y, buttons:1}));
    await sleep();
    const dragging = Boolean(workspace.isDragging());
    const collapsed = !flyout.isVisible();
    const stableOrigin = workspace.getMetrics().absoluteLeft === origin;
    document.dispatchEvent(new MouseEvent('mousemove', {bubbles:true, cancelable:true,
        clientX:endX, clientY:y+20, buttons:1}));
    document.dispatchEvent(new MouseEvent('mouseup', {bubbles:true, cancelable:true,
        clientX:endX, clientY:y+20, button:0}));
    await sleep();
    const dropped = workspace.getTopBlocks(false).some(block => block.type === type);
    workspace.toolbox_.scrollToCategoryById('operators');
    const reopened = flyout.isVisible();
    results.push({type, rtl, dragging, collapsed, stableOrigin, dropped, reopened});
    palette.dispose(); workspace.dispose(); root.innerHTML = '';
}
(async () => {
    try {
        for (const rtl of [false, true]) {
            for (const [type, inputs] of Object.entries(operators)) await run(type, inputs, rtl);
        }
    } catch (error) { results.push({error:error.message}); }
    document.getElementById('result').textContent = JSON.stringify(results);
})();
</script>`;
    try {
        const fixture = path.join(directory, 'fixture.html');
        fs.writeFileSync(fixture, html);
        const browser = spawnSync(chrome, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files',
            `--user-data-dir=${path.join(directory, 'profile')}`, '--window-size=1280,900',
            '--virtual-time-budget=10000', '--dump-dom', fileUrl(fixture)],
        {encoding: 'utf8', timeout: 25000, maxBuffer: 8 * 1024 * 1024});
        expect(browser.error).toBeUndefined();
        expect(browser.status).toBe(0);
        const output = browser.stdout.match(/<pre id="result">([\s\S]*?)<\/pre>/);
        expect(output).not.toBeNull();
        const results = JSON.parse(output[1]);
        expect(results).toHaveLength(Object.keys(operators).length * 2);
        expect(results.filter(result => !result.dragging || !result.collapsed || !result.stableOrigin ||
            !result.dropped || !result.reopened)).toEqual([]);
    } finally {
        if (path.resolve(path.dirname(directory)) !== path.resolve(os.tmpdir())) {
            throw new Error('Refusing to remove a fixture outside the temporary directory');
        }
        fs.rmSync(directory, {recursive: true, force: true, maxRetries: 5, retryDelay: 100});
    }
}, 30000);
