import * as Immutable from 'immutable';
import * as React from 'react';
import * as duckdb from '@duckdb/duckdb-wasm/dist/duckdb.module.js';
import * as model from './model';
import * as examples from './example_data';
import { IAppContext } from './app_context';
import { AppState, Dispatch, LaunchStep, LaunchStepInfo, DEFAULT_LAUNCH_STEPS } from './model';
import { StatusIndicator } from './components';
import { connect } from 'react-redux';

import logo from '../static/svg/logo/duckdb.svg';

import styles from './app_launcher.module.css';

import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb.wasm';

function startStep(store: model.AppReduxStore, step: model.LaunchStep) {
    model.mutate(store.dispatch, {
        type: model.StateMutationType.UPDATE_LAUNCH_STEP,
        data: [step, model.Status.RUNNING, null],
    });
}

function stepSucceeded(store: model.AppReduxStore, step: model.LaunchStep) {
    model.mutate(store.dispatch, {
        type: model.StateMutationType.UPDATE_LAUNCH_STEP,
        data: [step, model.Status.COMPLETED, null],
    });
}

function stepFailed(store: model.AppReduxStore, step: model.LaunchStep, error: string | null = null) {
    model.mutate(store.dispatch, {
        type: model.StateMutationType.UPDATE_LAUNCH_STEP,
        data: [step, model.Status.FAILED, error],
    });
}

async function initDuckDB(ctx: IAppContext): Promise<boolean> {
    const workerURL = ctx.store.getState().config.workerURL;
    startStep(ctx.store, model.LaunchStep.INIT_DUCKDB);
    try {
        // Open database
        const worker = new Worker(workerURL);
        const db = new duckdb.AsyncDuckDB(ctx.logger, worker);
        await db.open(duckdb_wasm);

        // Create connection
        ctx.database = db;
        ctx.databaseConnection = await db.connect();
        stepSucceeded(ctx.store, model.LaunchStep.INIT_DUCKDB);
    } catch (e) {
        stepFailed(ctx.store, model.LaunchStep.INIT_DUCKDB);
        return false;
    }
    return true;
}

async function loadExampleFiles(ctx: IAppContext): Promise<boolean> {
    startStep(ctx.store, model.LaunchStep.FETCH_EXAMPLE_DATA);
    try {
        // Load the example data
        const exampleFileIDs = [examples.ExampleID.TEST_CSV];
        const examplePromises = exampleFileIDs.map(f => examples.loadExample(f));
        const exampleFiles = await Promise.all(examplePromises);

        // Register the data with duckdb
        const fileInfos: model.FileInfo[] = [];
        for (const file of exampleFiles) {
            fileInfos.push({
                name: file.name,
                sizeBytes: file.size,
            });
            ctx.database!.addFileBlob(file.name, file);
        }
        model.mutate(ctx.store.dispatch, {
            type: model.StateMutationType.REGISTER_FILES,
            data: fileInfos,
        });

        stepSucceeded(ctx.store, model.LaunchStep.FETCH_EXAMPLE_DATA);
    } catch (e) {
        console.log(e);
        stepFailed(ctx.store, model.LaunchStep.FETCH_EXAMPLE_DATA);
        return false;
    }
    return true;
}

export async function launchApp(ctx: IAppContext): Promise<void> {
    if (!(await initDuckDB(ctx))) return;
    if (!(await loadExampleFiles(ctx))) return;

    model.mutate(ctx.store.dispatch, {
        type: model.StateMutationType.MARK_LAUNCH_COMPLETE,
        data: null,
    });
    console.log(await ctx.database!.getVersion());
}

interface Props {
    launchComplete: boolean;
    launchSteps: Immutable.Map<LaunchStep, LaunchStepInfo>;
    children: JSX.Element;
}

class AppLauncher extends React.Component<Props> {
    public renderStep(s: LaunchStep) {
        const info = this.props.launchSteps.get(s);
        if (!info) return null;
        return (
            <div key={s as number} className={styles.step}>
                <div className={styles.step_status}>
                    <StatusIndicator width="14px" height="14px" status={info.status} />
                </div>
                <div className={styles.step_name}>{info.label}</div>
            </div>
        );
    }

    public render() {
        if (this.props.launchComplete) {
            return this.props.children;
        }
        return (
            <div className={styles.launcher}>
                <div className={styles.inner}>
                    <div className={styles.logo}>
                        <svg width="100px" height="100px">
                            <use xlinkHref={`${logo}#sym`} />
                        </svg>
                    </div>
                    <div className={styles.steps}>
                        {DEFAULT_LAUNCH_STEPS.map((s: model.LaunchStep) => this.renderStep(s))}
                    </div>
                </div>
            </div>
        );
    }
}

const mapStateToProps = (state: AppState) => ({
    launchComplete: state.launchComplete,
    launchSteps: state.launchSteps,
});

const mapDispatchToProps = (_dispatch: Dispatch) => ({});

export default connect(mapStateToProps, mapDispatchToProps)(AppLauncher);
