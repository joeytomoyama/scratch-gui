// Display geometry only: never change the VM's native stage dimensions.
export const MOBILE_EDITOR_MAX_WIDTH = 1023;
export const MOBILE_NAV_HEIGHT = 72;
export const MIN_CODE_HEIGHT = 220;

export const fitStage = (nativeWidth, nativeHeight, width, height) => {
    const scale = Math.min(Math.max(1, width) / nativeWidth, Math.max(1, height) / nativeHeight);
    return {width: nativeWidth * scale,
        height: nativeHeight * scale,
        scale,
        widthDefault: nativeWidth,
        heightDefault: nativeHeight};
};

export const editorGeometry = ({width, height, nativeWidth, nativeHeight, panel, preview, drawerHeight}) => {
    const available = Math.max(180, height - MOBILE_NAV_HEIGHT);
    const compactHeight = Math.min(300, Math.max(180, height * 244 / 844));
    const previewHeight = preview === 'hidden' ? 64 : preview === 'expanded' ?
        Math.min(available - MIN_CODE_HEIGHT, height * .5) : compactHeight;
    const codeHeight = Math.min(available - 64, Math.max(MIN_CODE_HEIGHT, drawerHeight || available - previewHeight));
    const codeOpen = panel === 'code';
    const stageAreaHeight = codeOpen ? available - codeHeight : available - 56;
    return {codeHeight,
        previewHeight: codeOpen ? stageAreaHeight : available,
        stage: fitStage(nativeWidth, nativeHeight,
            codeOpen ? Math.max(80, width - 176) : width - 2,
            Math.max(1, stageAreaHeight - (codeOpen ? 24 : 2)))};
};
