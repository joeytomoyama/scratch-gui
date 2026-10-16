/** @jest-environment jsdom */
import React from 'react';
import {Provider} from 'react-redux';
import {combineReducers, createStore} from 'redux';
import {mountWithIntl} from '../../helpers/intl-helpers';
import CoursesHeader from '../../../src/components/courses/courses-header.jsx';
import MenuLabel from '../../../src/components/menu-bar/tw-menu-label.jsx';
import menusReducer, {settingsMenuOpen} from '../../../src/reducers/menus';
import themeReducer from '../../../src/reducers/theme';
import localesReducer from '../../../src/reducers/locales';
import {Theme, GUI_DARK} from '../../../src/lib/themes';
import {LANGUAGE_KEY} from '../../../src/lib/detect-locale';

jest.mock('../../../src/components/account/account-menu.jsx', () => () => <button>Account</button>);
jest.mock('@turbowarp/scratch-l10n/locales/editor-msgs', () => ({
    en: {}, de: {}, es: {}, 'es-419': {}, ja: {}, fr: {}, it: {}, nl: {}
}));

const createHeader = () => {
    const store = createStore(combineReducers({
        locales: localesReducer,
        scratchGui: combineReducers({menus: menusReducer, theme: themeReducer})
    }), {scratchGui: {theme: {theme: Theme.light}}});
    const wrapper = mountWithIntl(<Provider store={store}><CoursesHeader /></Provider>);
    const openSettings = () => {
        const trigger = wrapper.find(MenuLabel).find('div').first();
        trigger.simulate('click', {target: trigger.getDOMNode()});
        wrapper.update();
    };
    return {store, wrapper, openSettings};
};

afterEach(() => localStorage.clear());

test('catalog settings change and persist the editor theme without a project VM', () => {
    const {store, wrapper, openSettings} = createHeader();
    expect(wrapper.find('a[aria-current="page"]').prop('href')).toBe('courses.html');
    expect(wrapper.find('a[href="editor.html"]')).toHaveLength(1);
    expect(wrapper.text()).toContain('Account');
    expect(wrapper.text()).not.toMatch(/Ask Tutor|Save|File|Advanced/);
    expect(store.getState().scratchGui.vm).toBeUndefined();

    openSettings();
    expect(settingsMenuOpen(store.getState())).toBe(true);
    expect(wrapper.text()).toContain('Language');
    expect(wrapper.text()).toContain('Block Colors');
    expect(wrapper.text()).toContain('Accent');
    wrapper.find('li').filterWhere(item => item.text() === 'Switch To Dark Mode').find('div').simulate('click');
    wrapper.update();
    expect(store.getState().scratchGui.theme.theme.gui).toBe(GUI_DARK);
    expect(JSON.parse(localStorage.getItem('tw:theme')).gui).toBe(GUI_DARK);
    expect(settingsMenuOpen(store.getState())).toBe(false);

    openSettings();
    document.body.dispatchEvent(new MouseEvent('mouseup', {bubbles: true}));
    wrapper.update();
    expect(settingsMenuOpen(store.getState())).toBe(false);
    wrapper.unmount();
});

test('catalog Settings uses the editor language preferences and closes after selection', () => {
    const {store, wrapper, openSettings} = createHeader();
    openSettings();
    wrapper.find('li').filterWhere(item => item.text() === 'Deutsch').simulate('click');
    wrapper.update();
    expect(store.getState().locales.locale).toBe('de');
    expect(localStorage.getItem(LANGUAGE_KEY)).toBe('de');
    expect(settingsMenuOpen(store.getState())).toBe(false);
    wrapper.unmount();
});
