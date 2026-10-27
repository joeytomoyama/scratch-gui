// Local-only preview using the existing editor build, without app source changes.
const fs = require('fs');
const http = require('http');
const path = require('path');
const build = path.resolve(__dirname, '../../build');
const mime = {'.html': 'text/html', '.js': 'application/javascript', '.svg': 'image/svg+xml',
    '.png': 'image/png', '.css': 'text/css', '.json': 'application/json'};
const loader = `(async function () {
    while (!window.vm || !window.vm.runtime.renderer || !window.vm.runtime.targets.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    await new Promise(resolve => setTimeout(resolve, 1500));
    await window.vm.loadProject(await (await fetch('/little-wings.sb3')).arrayBuffer());
    window.vm.emitWorkspaceUpdate();
    window.vm.greenFlag();
    document.title = 'Little Wings - 360 x 640';
})();`;
http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/little-wings-loader.js') {
        res.setHeader('Content-Type', 'application/javascript'); res.end(loader); return;
    }
    if (url.pathname === '/little-wings.html') {
        res.setHeader('Content-Type', 'text/html');
        res.end(fs.readFileSync(path.join(build, 'editor.html'), 'utf8')
            .replace('</body>', '<script src="/little-wings-loader.js"></script></body>'));
        return;
    }
    const file = url.pathname === '/little-wings.sb3' ? path.join(__dirname, 'Little Wings.sb3') :
        path.resolve(build, `.${decodeURIComponent(url.pathname)}`);
    if ((!file.startsWith(build + path.sep) && file !== path.join(__dirname, 'Little Wings.sb3')) ||
        !fs.existsSync(file) || !fs.statSync(file).isFile()) {
        res.writeHead(404); res.end(); return;
    }
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
}).listen(8601, '127.0.0.1', () => console.log('Preview: http://127.0.0.1:8601/little-wings.html?size=360x640'));
