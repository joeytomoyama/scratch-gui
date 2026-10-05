// Hardware implementations remain installed for future courses.
export const HARDWARE_EXTENSIONS = new Set(['microbit', 'ev3', 'wedo2', 'boost', 'gdxfor', 'makeymakey']);

export const isExtensionAvailable = extension => (
    typeof extension === 'object' &&
    !extension.extensionURL &&
    extension.extensionId !== 'custom_extension' &&
    !HARDWARE_EXTENSIONS.has(extension.extensionId)
);

export const configureExtensionPolicy = vm => {
    const manager = vm.extensionManager;
    if (manager.classroomPolicyInstalled) return;
    manager.classroomPolicyInstalled = true;
    const load = manager.loadExtensionURL.bind(manager);
    manager.loadExtensionURL = id => {
        if (HARDWARE_EXTENSIONS.has(id) || !manager.isBuiltinExtension(id)) {
            return Promise.reject(new Error('This extension is not available in the classroom editor.'));
        }
        return load(id);
    };
    manager.securityManager.canLoadExtensionFromProject = () => false;
    manager.securityManager.getSandboxMode = () => 'worker';
    vm.setCloudProvider(null);
    vm.runtime.cloudOptions.limit = 0;
};
