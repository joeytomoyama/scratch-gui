/** @jest-environment jsdom */
import React from 'react';
import {mount} from 'enzyme';
import {act} from 'react-dom/test-utils';
import Courses from '../../../src/components/courses/courses.jsx';
import {createCourseAPI, selectCourses, courseContext, editorCourseURL} from '../../../src/lib/course-api';
import {getAccountService} from '../../../src/lib/account/service';

jest.mock('../../../src/components/account/account-menu.jsx', () => () => <span>Account</span>);
jest.mock('../../../src/lib/account/service', () => ({getAccountService: jest.fn()}));
jest.mock('../../../src/lib/course-api', () => ({...jest.requireActual('../../../src/lib/course-api'), createCourseAPI: jest.fn()}));

const course = {id: 'example', title: 'Build a game', description: 'Learn to jump', concepts: ['Loops'],
    difficulty: 'beginner', completed: false, thumbnail: null};
const settle = async wrapper => { await act(async () => { await Promise.resolve(); }); wrapper.update(); };

afterEach(() => {window.history.replaceState(null, '', '/'); jest.clearAllMocks();});

test('backend cards support search, completion and course details with separate demo and starter links', async () => {
    getAccountService.mockReturnValue({subscribe: fn => {fn({loading: false, user: {id: 'alice'}}); return () => {};}});
    const api = {list: jest.fn().mockResolvedValue({courses: [course]}), complete: jest.fn().mockResolvedValue({completed: true}), dispose: jest.fn()};
    createCourseAPI.mockReturnValue(api);
    let wrapper;
    act(() => {wrapper = mount(<Courses />);});
    await settle(wrapper);
    expect(wrapper.text()).toContain('Build a game');
    expect(wrapper.find('iframe')).toHaveLength(0);
    act(() => {wrapper.find('input').simulate('change', {target: {value: 'absent'}});});
    expect(wrapper.text()).toContain('No courses found');
    act(() => {wrapper.find('input').simulate('change', {target: {value: 'jump'}});});
    wrapper.update();
    await act(async () => {wrapper.find('button').simulate('click');});
    wrapper.update();
    expect(api.complete).toHaveBeenCalledWith('example', true);
    expect(wrapper.text()).toContain('✓ Completed');
    act(() => {window.location.hash = '#example'; window.dispatchEvent(new Event('hashchange'));});
    wrapper.update();
    expect(wrapper.text()).toContain('What you’ll learn');
    expect(wrapper.find('iframe').prop('src')).toBe('course-player.html?course=example');
    expect(wrapper.find('a[href="editor.html?course=example"]')).toHaveLength(1);
    act(() => {wrapper.unmount();});
    expect(api.dispose).toHaveBeenCalled();
});

test('signed out shows sign-in state without fetching private courses', () => {
    getAccountService.mockReturnValue({subscribe: fn => {fn({loading: false, user: null}); return () => {};}});
    let wrapper;
    act(() => {wrapper = mount(<Courses />);});
    expect(wrapper.text()).toContain('Sign in to explore courses');
    expect(createCourseAPI).not.toHaveBeenCalled();
    act(() => {wrapper.unmount();});
});

test('saved courses offer Continue on overview and details without replacing Start again', async () => {
    const projectId = '12345678-1234-1234-1234-123456789abc';
    getAccountService.mockReturnValue({subscribe: fn => {fn({loading: false, user: {id: 'alice'}}); return () => {};}});
    createCourseAPI.mockReturnValue({list: jest.fn().mockResolvedValue({courses: [{...course, resumeProjectId: projectId}]}), dispose: jest.fn()});
    let wrapper;
    act(() => {wrapper = mount(<Courses />);});
    await settle(wrapper);
    const resumeURL = `editor.html?course=example#${projectId}`;
    expect(wrapper.find(`a[href="${resumeURL}"]`).text()).toBe('Continue course');
    expect(wrapper.text()).toContain('Course details');
    act(() => {window.location.hash = '#example'; window.dispatchEvent(new Event('hashchange'));});
    wrapper.update();
    expect(wrapper.find(`a[href="${resumeURL}"]`).text()).toBe('Continue course');
    expect(wrapper.find('a[href="editor.html?course=example"]').text()).toBe('Start again');
    act(() => {wrapper.unmount();});
});

test('difficulty sorting, title/description search and editor course context are local', () => {
    const hard = {...course, id: 'hard', title: 'Advanced game', difficulty: 'advanced'};
    expect(selectCourses([hard, course], '', 'easiest').map(c => c.id)).toEqual(['example', 'hard']);
    expect(selectCourses([hard, course], '', 'hardest').map(c => c.id)).toEqual(['hard', 'example']);
    expect(selectCourses([course], ' JUMP ', 'title')).toHaveLength(1);
    window.history.replaceState(null, '', '/editor.html?course=example#uuid');
    expect(courseContext()).toEqual({course: 'example'});
    expect(editorCourseURL('example')).toBe('editor.html?course=example');
});
