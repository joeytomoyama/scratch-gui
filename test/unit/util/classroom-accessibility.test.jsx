/** @jest-environment jsdom */
import React from 'react';
import {mount} from 'enzyme';
import {Provider} from 'react-redux';
import configureStore from 'redux-mock-store';
import {IntlProvider} from 'react-intl';
import Button from '../../../src/components/button/button';
import IconButton from '../../../src/components/icon-button/icon-button';
import CloseButton from '../../../src/components/close-button/close-button';
import DeleteButton from '../../../src/components/delete-button/delete-button';
import GreenFlag from '../../../src/components/green-flag/green-flag';
import StopAll from '../../../src/components/stop-all/stop-all';
import PlayButton from '../../../src/containers/play-button';

const controls = [
    ['shared action', Button, {children: 'Action', iconSrc: 'icon.svg'}],
    ['sound action', IconButton, {title: 'Copy', img: 'icon.svg'}],
    ['close', CloseButton, {}],
    ['delete', DeleteButton, {}],
    ['green flag', GreenFlag, {}],
    ['stop', StopAll, {}]
];
let wrapper;
let container;
const render = element => {
    container = document.createElement('div');
    document.body.appendChild(container);
    const store = configureStore()({scratchGui: {theme: {theme: {}}}});
    wrapper = mount(<Provider store={store}>{element}</Provider>, {attachTo: container});
    return container.querySelector('button');
};

afterEach(() => {
    if (wrapper) wrapper.unmount();
    if (container) container.remove();
});

test.each(controls)('%s is a named native button, activates once, and does not submit forms', (name, Control, props) => {
    const onClick = jest.fn();
    const onSubmit = jest.fn();
    const button = render(<form onSubmit={onSubmit}><Control {...props} onClick={onClick} /></form>);
    expect(button).not.toBeNull();
    expect(button.type).toBe('button');
    expect(button.getAttribute('aria-label') || button.textContent).toBeTruthy();
    expect(button.querySelector('img').getAttribute('alt')).toBe('');
    button.focus();
    expect(document.activeElement).toBe(button);
    button.click();
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
});

test.each(controls.slice(0, 2))('%s uses native disabled behavior', (name, Control, props) => {
    const onClick = jest.fn();
    const button = render(<Control {...props} disabled onClick={onClick} />);
    expect(button.disabled).toBe(true);
    button.focus();
    expect(document.activeElement).not.toBe(button);
    button.click();
    expect(onClick).not.toHaveBeenCalled();
});

test('back control has an accurate accessible name', () => {
    expect(render(<CloseButton buttonType="back" onClick={jest.fn()} />).getAttribute('aria-label')).toBe('Back');
});

test('delete retains its caller-selected tab order', () => {
    expect(render(<DeleteButton tabIndex={-1} onClick={jest.fn()} />).tabIndex).toBe(-1);
});

test('green flag retains right-click handling', () => {
    const onClick = jest.fn(event => event.type);
    const button = render(<GreenFlag onClick={onClick} />);
    button.dispatchEvent(new MouseEvent('contextmenu', {bubbles: true}));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick.mock.results[0].value).toBe('contextmenu');
});

test.each(['shiftKey', 'altKey'])('green flag retains %s click modifiers', modifier => {
    const onClick = jest.fn(event => event[modifier]);
    const button = render(<GreenFlag onClick={onClick} />);
    button.dispatchEvent(new MouseEvent('click', {bubbles: true, [modifier]: true}));
    expect(onClick.mock.results[0].value).toBe(true);
});

test.each([GreenFlag, StopAll])('stage controls keep mouse focus available for game keys', Control => {
    const button = render(<Control onClick={jest.fn()} />);
    const input = document.createElement('input');
    container.appendChild(input);
    input.focus();
    const event = new MouseEvent('mousedown', {bubbles: true, cancelable: true});
    button.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(document.body);
});

test.each([false, true])('sound preview keyboard activation toggles playback without selecting the card (%s)', isPlaying => {
    const onPlay = jest.fn();
    const onStop = jest.fn();
    const onSelect = jest.fn();
    const button = render(
        <IntlProvider locale="en">
            <div onClick={onSelect} onKeyPress={onSelect}>
                <PlayButton isPlaying={isPlaying} onPlay={onPlay} onStop={onStop} />
            </div>
        </IntlProvider>
    );
    expect(button.type).toBe('button');
    expect(button.getAttribute('aria-label')).toBe(isPlaying ? 'Stop' : 'Play');
    button.dispatchEvent(new KeyboardEvent('keypress', {key: 'Enter', charCode: 13, bubbles: true}));
    button.click();
    expect(isPlaying ? onStop : onPlay).toHaveBeenCalledTimes(1);
    expect(isPlaying ? onPlay : onStop).not.toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
});

test('sound preview mouse and touch activation do not toggle again on click', () => {
    const onPlay = jest.fn();
    const button = render(
        <IntlProvider locale="en"><PlayButton isPlaying={false} onPlay={onPlay} onStop={jest.fn()} /></IntlProvider>
    );
    button.dispatchEvent(new MouseEvent('mousedown', {bubbles: true, cancelable: true}));
    button.dispatchEvent(new MouseEvent('click', {bubbles: true, detail: 1}));
    expect(onPlay).toHaveBeenCalledTimes(1);
    onPlay.mockClear();
    button.dispatchEvent(new Event('touchstart', {bubbles: true, cancelable: true}));
    button.dispatchEvent(new MouseEvent('click', {bubbles: true, detail: 1}));
    expect(onPlay).toHaveBeenCalledTimes(1);
});
