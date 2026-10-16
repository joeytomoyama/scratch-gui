/** @jest-environment jsdom */
import React from 'react';
import {mount} from 'enzyme';
import TutorParts from '../../../src/components/tutor/tutor-parts';
import {renderTutorPreview} from '../../../src/lib/tutor/previews';

jest.mock('../../../src/lib/tutor/previews', () => ({renderTutorPreview: jest.fn(() => false)}));

test('parts render non-interactive chips and readable accessible fallback labels with escaped text', () => {
    const feedback = {parts: [{type: 'text', text: 'Use '}, {type: 'block', label: 'change x by'},
        {type: 'text', text: ' with '}, {type: 'value', text: '<script>10</script>'}]};
    const wrapper = mount(<TutorParts feedback={feedback} />);
    expect(wrapper.text()).toBe('Use change x by with <script>10</script>');
    expect(wrapper.find('[role="img"]').prop('aria-label')).toBe('change x by');
    expect(wrapper.getDOMNode().querySelectorAll('script, button, input, [tabindex]')).toHaveLength(0);
    expect(wrapper.html()).toContain('&lt;script&gt;');
    wrapper.unmount();
});

test('successful Blockly preview retains its spoken accessible label and hides only fallback text', () => {
    renderTutorPreview.mockImplementationOnce(host => {
        host.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'svg')); return true;
    });
    const wrapper = mount(<TutorParts feedback={{parts: [{type: 'block', label: 'wait'}]}} />);
    expect(wrapper.getDOMNode().querySelectorAll('svg')).toHaveLength(1);
    expect(wrapper.find('[role="img"]').prop('aria-label')).toBe('wait');
    expect(wrapper.getDOMNode().querySelector('[hidden]').textContent).toBe('wait');
    wrapper.unmount();
});
