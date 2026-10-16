/** @jest-environment jsdom */
import React from 'react';
import {shallow} from 'enzyme';
import {classroomLocale, classroomLocales} from '../../../src/lib/classroom-locales';
import {detectLocale, LANGUAGE_KEY} from '../../../src/lib/detect-locale';
import AppStateHOC from '../../../src/lib/app-state-hoc';
import reducer, {localesInitialState, initLocale, selectLocale} from '../../../src/reducers/locales';
import ConnectedLanguageMenu from '../../../src/components/menu-bar/language-menu';
import {MenuItem} from '../../../src/components/menu/menu';

jest.mock('@turbowarp/scratch-l10n/locales/editor-msgs', () => ({
    en: {}, de: {}, es: {}, 'es-419': {}, ja: {}, fr: {}, it: {}, nl: {}
}));

const originalStore = window.ReduxStore;
beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, '', '/');
    Object.defineProperty(window.navigator, 'language', {value: 'en-US', configurable: true});
});
afterEach(() => {
    localStorage.clear(); window.ReduxStore = originalStore;
});

test('Settings offers exactly the shared transcription/playback languages', () => {
    expect(classroomLocales).toEqual(['en', 'de', 'es', 'ja', 'fr', 'it', 'nl']);
    const onChangeLanguage = jest.fn();
    const wrapper = shallow(<ConnectedLanguageMenu.WrappedComponent currentLocale="de" onChangeLanguage={onChangeLanguage} />);
    const options = wrapper.find(MenuItem).slice(1);
    expect(options.map(node => node.key())).toEqual(classroomLocales);
    options.at(3).simulate('click');
    expect(onChangeLanguage).toHaveBeenCalledWith('ja');
    wrapper.unmount();
});

test.each(classroomLocales)('selection and initialization preserve supported locale %s', locale => {
    const selected = reducer(localesInitialState, selectLocale(locale));
    expect(selected.locale).toBe(locale);
    expect(selected.messages).toBe(selected.messagesByLocale[locale]);
    expect(localStorage.getItem(LANGUAGE_KEY)).toBe(locale);
    expect(initLocale(localesInitialState, locale).locale).toBe(locale);
});

test.each(['zh-cn', 'pt-br', 'ar', 'auto', undefined])('unsupported locale %s cannot enter app state', locale => {
    expect(classroomLocale(locale)).toBe('en');
    expect(selectLocale(locale).locale).toBe('en');
    expect(initLocale({...localesInitialState, locale: 'de'}, locale).locale).toBe('en');
    expect(reducer(localesInitialState, {type: selectLocale('en').type, locale}).locale).toBe('en');
});

test.each([['en-US', 'en'], ['de-DE', 'de'], ['es-419', 'es'], ['ja-Hira', 'ja']])(
    'regional locale %s reduces to supported tutor code %s', (locale, expected) => {
        expect(classroomLocale(locale)).toBe(expected);
        expect(selectLocale(locale).locale).toBe(expected);
    });

test.each(['stored', 'browser', 'url'])('app startup ignores unsupported %s language', source => {
    if (source === 'stored') localStorage.setItem(LANGUAGE_KEY, 'zh-cn');
    if (source === 'browser') Object.defineProperty(window.navigator, 'language', {value: 'pt-BR'});
    if (source === 'url') window.history.replaceState({}, '', '/?locale=ar');
    const App = AppStateHOC(() => null, true);
    const wrapper = shallow(<App />);
    expect(wrapper.instance().store.getState().locales.locale).toBe('en');
    wrapper.unmount();
});

test.each(classroomLocales)('stored language %s is applied at app startup', locale => {
    localStorage.setItem(LANGUAGE_KEY, locale);
    expect(detectLocale(classroomLocales)).toBe(locale);
    const App = AppStateHOC(() => null, true);
    const wrapper = shallow(<App />);
    expect(wrapper.instance().store.getState().locales.locale).toBe(locale);
    wrapper.unmount();
});
