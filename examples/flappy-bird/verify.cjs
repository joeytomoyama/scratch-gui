// Browser verification against this checkout's existing build/ output.
// Requires Playwright (NODE_PATH can point to the bundled workspace runtime).
const fs = require('fs');
const path = require('path');
const http = require('http');
const assert = require('assert');
const {chromium} = require('playwright');
const repo = path.resolve(__dirname, '../..');
const mime = {'.html': 'text/html', '.js': 'application/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.css': 'text/css'};
const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const file = url.pathname === '/game.sb3' ? path.join(__dirname, 'Little Wings.sb3') :
        path.join(repo, 'build', decodeURIComponent(url.pathname));
    if (!file.startsWith(repo + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
        res.writeHead(404); res.end(); return;
    }
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
});
(async () => {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const browser = await chromium.launch({executablePath: process.env.CHROME_BIN || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
        headless: true, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required']});
    try {
        const page = await browser.newPage({viewport: {width: 1440, height: 1000}});
        await page.goto(`http://127.0.0.1:${server.address().port}/editor.html?size=360x640`);
        await page.waitForFunction(() => window.vm && window.vm.runtime.renderer, null, {timeout: 60000});
        await page.waitForTimeout(2000);
        await page.evaluate(async () => {
            await window.vm.loadProject(await (await fetch('/game.sb3')).arrayBuffer());
            window.vm.start(); window.vm.greenFlag();
        });
        await page.waitForTimeout(500);
        const state = () => page.evaluate(() => {
            const vm = window.vm;
            const s = vm.runtime.getTargetForStage();
            const bird = vm.runtime.targets.find(t => t.getName() === 'Bird');
            return {state: s.variables['Game state'].value, score: s.variables.Score.value,
                y: bird.y, clones: vm.runtime.targets.filter(t => !t.isOriginal).length,
                costumes: vm.runtime.targets.filter(t => t.isOriginal).flatMap(t => t.sprite.costumes.map(c => ({name: c.name, skinId: c.skinId}))) };
        });
        const key = async pressed => page.evaluate(p => window.vm.postIOData('keyboard', {key: ' ', isDown: p}), pressed);
        assert.equal((await state()).state, 0, 'ready screen');
        assert((await state()).costumes.every(c => typeof c.skinId === 'number'), 'all costumes rendered');
        await key(true); await page.waitForTimeout(80); await key(false);
        assert.equal((await state()).state, 1, 'space starts game');
        await page.waitForTimeout(180);
        const before = (await state()).y;
        await key(true); await page.waitForTimeout(100); await key(false);
        assert((await state()).y > before, 'a new press flaps upward');
        // Aim a disposable autopilot at the nearest gap using actual VM input.
        // It never changes blocks, coordinates, collision flags or score.
        await page.evaluate(() => {
            window.pilot = setInterval(() => {
                const vm = window.vm, stage = vm.runtime.getTargetForStage();
                if (stage.variables['Game state'].value !== 1) return;
                const bird = vm.runtime.targets.find(t => t.getName() === 'Bird');
                const pipes = vm.runtime.targets.filter(t => !t.isOriginal && t.getName() === 'Lower pipe' && t.x > -120)
                    .sort((a, b) => a.x - b.x);
                const goal = pipes.length ? pipes[0].y + 367.5 : 0;
                const v = bird.variables.Velocity.value;
                const flap = bird.y < goal - 12 && v < 0;
                vm.postIOData('keyboard', {key: ' ', isDown: flap});
            }, 40);
        });
        await page.waitForFunction(() => window.vm.runtime.getTargetForStage().variables.Score.value >= 3,
            null, {timeout: 18000});
        const playing = await state();
        assert(playing.clones <= 8, 'clones stay bounded');
        const canvas = page.locator('canvas').filter({visible: true}).first();
        // Save the whole editor too, so the editable blocks are visible in review.
        await page.screenshot({path: path.join(__dirname, 'preview.png')});
        if (await canvas.count()) await canvas.screenshot({path: path.join(__dirname, 'stage-preview.png')});
        await page.evaluate(() => {clearInterval(window.pilot); window.vm.postIOData('keyboard', {key: ' ', isDown: false});});
        await page.waitForFunction(() => window.vm.runtime.getTargetForStage().variables['Game state'].value === 2,
            null, {timeout: 5000});
        await page.waitForTimeout(600);
        await key(true); await page.waitForTimeout(150); await key(false);
        assert.equal((await state()).state, 1, 'one press restarts');
        assert.equal((await state()).score, 0, 'restart resets score');
        // Test real sprite collision, separately from floor/ceiling collision.
        await page.waitForFunction(() => window.vm.runtime.targets.some(t => !t.isOriginal && t.getName() === 'Lower pipe'));
        await page.evaluate(() => {
            window.vm.runtime.targets.find(t => t.getName() === 'Bird').setXY(-70, 20);
            const pipe = window.vm.runtime.targets.find(t => !t.isOriginal && t.getName() === 'Lower pipe');
            pipe.setXY(-70, 20);
        });
        await page.waitForFunction(() => window.vm.runtime.getTargetForStage().variables['Game state'].value === 2);
        const saved = await page.evaluate(async () => Array.from(new Uint8Array(await (await window.vm.saveProjectSb3()).arrayBuffer())));
        await page.evaluate(async bytes => {
            await window.vm.loadProject(new Uint8Array(bytes).buffer);
            window.vm.greenFlag();
        }, saved);
        await page.waitForTimeout(150);
        assert.equal((await state()).state, 0, 'saved project reloads and starts ready');
        console.log(JSON.stringify({result: 'PASS', scored: playing.score, clones: playing.clones,
            checks: ['rendered costumes', 'ready', 'space start', 'flap', 'three points through gaps', 'bounded clones',
                'floor/ceiling game over', 'single-press restart', 'score reset', 'pipe collision', 'save/reload']}, null, 2));
    } finally {await browser.close(); server.close();}
})().catch(error => {console.error(error); server.close(); process.exitCode = 1;});
