import './import-first';
import React from 'react';
import render from './app-target';
import AppStateHOC from '../lib/app-state-hoc.jsx';
import GUI from './render-gui.jsx';
import {courseIdFromURL} from '../lib/course-api';

const Player = AppStateHOC(GUI);
render(<Player
    isPlayerOnly
    isEmbedded
    courseDemo
    noBeforeUnloadHandler
    courseId={courseIdFromURL()}
    projectId="0"
/>);
