/** @jest-environment jsdom */
import fs from 'fs';
import path from 'path';
import postcss from 'postcss';
import postcssImport from 'postcss-import';
import postcssVars from 'postcss-simple-vars';
import {Theme} from '../../../src/lib/themes';

const sourceRoot = path.resolve(__dirname, '../../../src');
const compile = async file => {
    const from = path.join(sourceRoot, file);
    const result = await postcss([postcssImport(), postcssVars()]).process(fs.readFileSync(from, 'utf8'), {from});
    return result.css;
};
const render = (css, theme, markup) => {
    const colors = theme.getGuiColors();
    // jsdom does not resolve CSS custom properties. Substitute actual editor theme values.
    const resolved = css.replace(/var\(--([\w-]+)\)/g, (match, name) => {
        expect(colors[name]).toBeDefined();
        return colors[name];
    });
    document.head.innerHTML = '';
    const style = document.createElement('style');
    style.textContent = resolved;
    document.head.appendChild(style);
    document.body.innerHTML = markup;
};
const luminance = color => {
    const channels = (color === 'white' ? 'rgb(255, 255, 255)' : color).match(/[\d.]+/g).slice(0, 3).map(value => {
        const channel = Number(value) / 255;
        return channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
};
const contrast = element => {
    const style = window.getComputedStyle(element);
    // jsdom can omit inherited colors even though the browser inherits them.
    let foregroundElement = element;
    while (foregroundElement && !window.getComputedStyle(foregroundElement).color) {
        foregroundElement = foregroundElement.parentElement;
    }
    const foreground = luminance(window.getComputedStyle(foregroundElement).color);
    const background = luminance(style.backgroundColor);
    return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
};

afterEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
});

test.each(['light', 'dark'])('toolbar and course controls have readable colors in the %s theme', async name => {
    const theme = Theme[name];
    render(await compile('components/menu-bar/toolbar-button.css'), theme, '<button class="button">Ask AI</button>');
    expect(contrast(document.querySelector('button'))).toBeGreaterThanOrEqual(4.5);
    render(await compile('components/courses/courses.css'), theme,
        '<input class="control"><select class="control"><option>Sort</option></select>' +
        '<button class="completion-button">Mark completed</button>');
    document.querySelectorAll('.control, button').forEach(control => {
        expect(contrast(control)).toBeGreaterThanOrEqual(4.5);
    });
});

test.each(['red', 'purple', 'blue', 'rainbow'])('course actions meet normal-text contrast with the %s accent', async accent => {
    render(await compile('components/courses/courses.css'), Theme.light.set('accent', accent),
        '<header class="header">Courses</header><article class="card"><a class="button">Start course</a></article>');
    document.querySelectorAll('header, a').forEach(control => {
        expect(contrast(control)).toBeGreaterThanOrEqual(4.5);
    });
});

test('Courses does not override nested Account controls in either stylesheet order', async () => {
    const courses = await compile('components/courses/courses.css');
    const account = await compile('components/account/account-menu.css');
    for (const css of [courses + account, account + courses]) {
        render(css, Theme.light,
            '<main class="page"><section class="panel"><button class="primary">Save profile</button>' +
            '<label class="field"><input></label></section></main>');
        const button = window.getComputedStyle(document.querySelector('button'));
        expect(button.backgroundColor).toBe('rgb(36, 92, 203)');
        expect(button.color).toBe('white');
        expect(button.borderRadius).toBe('8px');
        expect(window.getComputedStyle(document.querySelector('input')).borderRadius).toBe('7px');
    }
});

test('toolbar and course controls retain explicit keyboard focus styles', async () => {
    const toolbar = postcss.parse(await compile('components/menu-bar/toolbar-button.css'));
    const courses = postcss.parse(await compile('components/courses/courses.css'));
    for (const [css, selectors] of [[toolbar, ['.button']], [courses, ['.control', '.completion-button', '.button']]]) {
        for (const selector of selectors) {
            const rule = css.nodes.find(node => node.selector?.split(', ').includes(`${selector}:focus-visible`));
            expect(rule?.nodes.some(declaration => declaration.prop === 'outline' && declaration.value !== 'none')).toBe(true);
        }
    }
});

test.each(['light', 'dark'])('Tutor chat keeps message and composer contrast in the %s theme', async name => {
    render(await compile('components/tutor/tutor-menu.css'), Theme[name],
        '<section class="panel"><div class="message student">Student question</div>' +
        '<div class="message tutor">Tutor response</div><label class="question"><textarea></textarea></label>' +
        '<button class="action-button">JSON</button><div class="header-actions"><button class="close-button">Close</button></div>' +
        '<form class="composer"><button class="send-button">Send</button></form></section>');
    document.querySelectorAll('.message, textarea, button').forEach(control => {
        expect(contrast(control)).toBeGreaterThanOrEqual(4.5);
    });
});

test('Tutor chat confines scrolling to the conversation and bounds the panel to the viewport', async () => {
    const css = postcss.parse(await compile('components/tutor/tutor-menu.css'));
    const panel = css.nodes.find(node => node.selector === '.panel');
    expect(panel.nodes.find(node => node.prop === 'max-width').value).toBe('calc(100vw - 24px)');
    expect(panel.nodes.find(node => node.prop === 'height').value).toContain('100vh - 76px');
    const conversation = css.nodes.find(node => node.selector?.split(/,\s*/).includes('.conversation'));
    expect(conversation.nodes.find(node => node.prop === 'overflow-y').value).toBe('auto');
    expect(conversation.nodes.find(node => node.prop === 'min-height').value).toBe('0');
});

test('transparent text variables refer to the names actually emitted by the theme helper', () => {
    const colors = fs.readFileSync(path.join(sourceRoot, 'css/colors.css'), 'utf8');
    const defaults = fs.readFileSync(path.join(sourceRoot, 'css/default-colors.css'), 'utf8');
    expect(colors).toContain('$text-primary-transparent: var(--text-primary-transparent);');
    expect(defaults).toContain('$text-primary-transparent-default: var(--text-primary-transparent-default);');
    expect(Theme.light.getGuiColors()['text-primary-transparent']).toBeDefined();
});

test.each([
    ['button/button.css', '.outlined-button'],
    ['icon-button/icon-button.css', '.container'],
    ['close-button/close-button.css', '.close-button'],
    ['delete-button/delete-button.css', '.delete-button'],
    ['green-flag/green-flag.css', '.green-flag'],
    ['stop-all/stop-all.css', '.stop-all'],
    ['gui/gui.css', '.tab.is-selected'],
    ['gui/gui.css', '.extension-button'],
    ['play-button/play-button.css', '.play-button'],
    ['sound-editor/sound-editor.css', '.round-button'],
    ['record-modal/record-modal.css', '.main-button-row button']
])('%s gives %s an explicit keyboard focus ring', async (file, selector) => {
    const css = postcss.parse(await compile(`components/${file}`));
    const rule = css.nodes.find(node => node.selector?.split(/,\s*/).includes(`${selector}:focus-visible`));
    expect(rule?.nodes.some(node => node.prop === 'outline' && /^2px solid /.test(node.value))).toBe(true);
});

test('saving indicator stays visible without animation when reduced motion is preferred', async () => {
    const css = postcss.parse(await compile('components/menu-bar/save-status.css'));
    const media = css.nodes.find(node => node.type === 'atrule' && node.params === '(prefers-reduced-motion: reduce)');
    const spinner = media.nodes.find(node => node.selector === '.spinner');
    expect(spinner.nodes.find(node => node.prop === 'animation').value).toBe('none');
    expect(css.nodes.find(node => node.selector === '.spinner').nodes.some(node => node.prop === 'border')).toBe(true);
});
