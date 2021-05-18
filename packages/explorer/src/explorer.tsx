import * as React from 'react';
import * as model from './model';
import { connect } from 'react-redux';
import './explorer.module.css';

interface Props {
    script: string;
}

class Explorer extends React.Component<Props> {
    public render() {
        return <div>Bar</div>;
    }
}

const mapStateToProps = (state: model.AppState) => ({
    script: state.script,
});

const mapDispatchToProps = (_dispatch: model.Dispatch) => ({});

export default connect(mapStateToProps, mapDispatchToProps)(Explorer);
