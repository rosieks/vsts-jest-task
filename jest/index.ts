import * as tl from 'vsts-task-lib/task';
import * as tr from 'vsts-task-lib/toolrunner';
import * as path from 'path';

let jestPath = tl.getPathInput('jestPath');
let projects = tl.getDelimitedInput('projects', '\n', false);
let codeCoverageEnabled = tl.getBoolInput('codeCoverageEnabled');

async function run() {
    for (let i = 0; i < projects.length; i++) {
        let projectPath = path.join(process.cwd(), projects[i]);
        await runJest(projectPath);
    }

    await publishTestResults(projects);
    if (codeCoverageEnabled) {
        await publishCodeCoverage(projects);
    }
}

async function runJest(projectPath) {
    let path = jestPath || './node_modules/.bin/jest.cmd';
    let jest = tl.tool(path);

    let options: tr.IExecOptions = {
        failOnStdErr: false,
        cwd: projectPath,
        env: <any>process.env,
        silent: false,
        ignoreReturnCode: false,
        outStream: undefined,
        errStream: undefined,
        windowsVerbatimArguments: undefined
    };

    jest.arg(['--testResultsProcessor', './node_modules/jest-junit']);
    if (codeCoverageEnabled) {
        jest.arg(['--coverage', '--coverageReporters', 'cobertura']);
    }

    try {
        return await jest.exec(options);
    }
    catch (err) {
        tl.setResult(tl.TaskResult.Failed, err.message);
    }
}

async function publishTestResults(projects) {
    let testResults = tl.findMatch(null, projects.map(p => path.join(p, 'junit.xml')));
    let tp = new tl.TestPublisher('JUnit');
    tp.publish(testResults, null, null, null, null, null);
}

async function publishCodeCoverage(projects) {
    let testResults = tl.findMatch(null, projects.map(p => path.join(p, 'coverage', 'cobertura-coverage.xml')));
    let ccPublisher = new tl.CodeCoveragePublisher();
    for (var i = 0; i < testResults.length; i++) {
        let testResult = testResults[i];
        ccPublisher.publish('Cobertura', testResult, null, null);
    }
}

run();