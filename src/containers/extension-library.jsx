import PropTypes from 'prop-types';
import React from 'react';
import VM from 'scratch-vm';
import {defineMessages, injectIntl, intlShape} from 'react-intl';
import extensionLibraryContent from '../lib/libraries/extensions/index.jsx';
import {isExtensionAvailable} from '../lib/classroom-extension-policy';
import LibraryComponent from '../components/library/library.jsx';
import log from '../lib/log';

const messages = defineMessages({
    title: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

class ExtensionLibrary extends React.PureComponent {
    constructor (props) {
        super(props);
        this.handleItemSelect = this.handleItemSelect.bind(this);
    }
    handleItemSelect (item) {
        if (!isExtensionAvailable(item)) return;
        const id = item.extensionId;
        if (id === 'procedures_enable_return') {
            this.props.onEnableProcedureReturns();
            this.props.onCategorySelected('myBlocks');
        } else if (this.props.vm.extensionManager.isExtensionLoaded(id)) {
            this.props.onCategorySelected(id);
        } else {
            this.props.vm.extensionManager.loadExtensionURL(id)
                .then(() => this.props.onCategorySelected(id))
                .catch(log.error);
        }
    }
    render () {
        return (
            <LibraryComponent
                data={extensionLibraryContent.filter(isExtensionAvailable).map(item => ({
                    ...item,
                    rawURL: item.iconURL
                }))}
                filterable
                persistableKey="extensionId"
                id="extensionLibrary"
                title={this.props.intl.formatMessage(messages.title)}
                visible={this.props.visible}
                onItemSelected={this.handleItemSelect}
                onRequestClose={this.props.onRequestClose}
            />
        );
    }
}

ExtensionLibrary.propTypes = {
    intl: intlShape.isRequired,
    onCategorySelected: PropTypes.func,
    onEnableProcedureReturns: PropTypes.func,
    onRequestClose: PropTypes.func,
    visible: PropTypes.bool,
    vm: PropTypes.instanceOf(VM).isRequired
};

export default injectIntl(ExtensionLibrary);
