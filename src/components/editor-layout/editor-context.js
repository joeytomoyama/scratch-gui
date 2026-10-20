import React from 'react';

export default React.createContext({mobile: false,
    panel: null,
    menuOpen: false,
    stageViewport: null,
    setPanel: () => {},
    setMenuOpen: () => {}});
