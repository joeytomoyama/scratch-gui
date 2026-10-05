import './import-first';
import React from 'react';
import render from './app-target';
import AppStateHOC from '../lib/app-state-hoc.jsx';
import Courses from '../components/courses/courses.jsx';
import TWThemeManagerHOC from '../containers/tw-theme-manager-hoc.jsx';

const Page = AppStateHOC(TWThemeManagerHOC(Courses));
render(<Page />);
