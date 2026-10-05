import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import VM from 'scratch-vm';
import {configureExtensionPolicy} from '../lib/classroom-extension-policy';

// Install before loading any project, including featured projects.
const ExtensionPolicy = ({vm}) => {
    configureExtensionPolicy(vm);
    return null;
};
ExtensionPolicy.propTypes = {vm: PropTypes.instanceOf(VM).isRequired};

export default connect(state => ({vm: state.scratchGui.vm}))(ExtensionPolicy);
