import React from 'react';
import PropTypes from 'prop-types';
import {renderTutorPreview} from '../../lib/tutor/previews';
import styles from './tutor-menu.css';

class BlockPreview extends React.Component {
    componentDidMount () {
        if (renderTutorPreview(this.host, this.props.part, this.props.capture)) this.label.hidden = true;
    }
    render () {
        return (<span
            className={styles.blockPreview}
            role="img"
            aria-label={this.props.part.label}
        >
            <span
                ref={node => {
                    this.host = node;
                }}
                aria-hidden="true"
            />
            <span
                ref={node => {
                    this.label = node;
                }}
            >{this.props.part.label}</span>
        </span>);
    }
}
BlockPreview.propTypes = {part: PropTypes.object.isRequired, capture: PropTypes.object};

const TutorParts = ({feedback, capture}) => (<p>{feedback.parts.slice(0, 49).map((part, index) => {
    if (part.type === 'block') {
        return (<BlockPreview
            key={index}
            part={part}
            capture={capture}
        />);
    }
    if (part.type === 'value') {
        return (<span
            className={styles.valueChip}
            key={index}
        >{part.text}</span>);
    }
    return <React.Fragment key={index}>{part.text}</React.Fragment>;
})}</p>);
TutorParts.propTypes = {feedback: PropTypes.object.isRequired, capture: PropTypes.object};
export default TutorParts;
