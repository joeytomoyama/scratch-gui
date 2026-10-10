/** @jest-environment jsdom */
import React from 'react';
import {mount, shallow} from 'enzyme';
import {IntlProvider} from 'react-intl';
import ActionMenu from '../../../src/components/action-menu/action-menu.jsx';
import StageSelector from '../../../src/components/stage-selector/stage-selector.jsx';

jest.mock('react-tooltip', () => () => null);
const intl = new IntlProvider({locale: 'en'}, {}).getChildContext().intl;

test('Stage tile selects Stage while its backdrop library action remains separate', () => {
    const select = jest.fn();
    const library = jest.fn();
    const tile = shallow(<StageSelector.WrappedComponent
        backdropCount={1}
        intl={intl}
        raised={false}
        receivedBlocks={false}
        selected
        url="backdrop.svg"
        onClick={select}
        onNewBackdropClick={library}
    />);
    const menu = tile.find(ActionMenu);
    menu.prop('onClick')();
    expect(select).toHaveBeenCalledTimes(1);
    expect(library).not.toHaveBeenCalled();
    menu.prop('moreButtons')[3].onClick();
    expect(library).toHaveBeenCalledTimes(1);
    expect(menu.prop('mainContent')).toBeTruthy();
});

test('custom tile content updates with the backdrop and selection while hover menus still open', () => {
    const menu = mount(<ActionMenu
        title="Stage"
        mainContent={<span>first backdrop</span>}
        moreButtons={[]}
        onClick={jest.fn()}
    />);
    menu.setProps({mainContent: <span>second backdrop</span>});
    expect(menu.find('button').first().text()).toBe('second backdrop');
    menu.find('div').first().simulate('mouseEnter');
    expect(menu.state('isOpen')).toBe(true);
    menu.unmount();
});
