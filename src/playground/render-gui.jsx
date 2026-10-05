import React from 'react';
import GUI from '../containers/gui.jsx';

const RenderGUI = props => (
    <GUI
        canUseCloud={false}
        hasCloudPermission={false}
        canSave={false}
        basePath={process.env.ROOT}
        canEditTitle
        enableCommunity={false}
        {...props}
    />
);

export default RenderGUI;
