// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as s3_assets from 'aws-cdk-lib/aws-s3-assets';
import path from 'path';
import { BundlerAssetOptions } from '../../../../lib/framework/bundler/base-asset-options';
import { PythonAssetOptions } from '../../../../lib/framework/bundler/runtime/python';
import { BundlerEnvValues } from './setup';

describe('When bundling JS lambda functions', () => {
    let bundlerAssetOption: BundlerAssetOptions;
    let assetOption: s3_assets.AssetOptions;
    let stack: cdk.Stack;
    const fakeModule = 'fake-module';
    const envValues = new BundlerEnvValues();

    beforeAll(() => {
        envValues.backupEnv();
        envValues.deleteEnvValues();
        stack = new cdk.Stack();
        bundlerAssetOption = new PythonAssetOptions();
        assetOption = bundlerAssetOption.options(stack, fakeModule);
    });

    afterAll(() => {
        envValues.restoreEnv();
    });

    it('should generate the following commands for a docker build', () => {
        expect(JSON.stringify(assetOption.bundling?.command)).toBe(
            JSON.stringify([
                'bash',
                '-c',
                `echo "Executing unit tests" && python3 -m venv .venv-test && source .venv-test/bin/activate && pip install poetry && poetry install && poetry run pytest --cov --cov-report=term-missing && deactivate && echo "local bundling failed for ${path
                    .dirname(__dirname)
                    .split('/')
                    .slice(0, -3)
                    .join(
                        '/'
                    )}/${fakeModule} and hence building with Docker image" && rm -fr .venv* && rm -fr dist && rm -fr .coverage && rm -fr coverage && python3 -m pip install poetry --upgrade && python3 -m pip install poetry --upgrade && poetry build && poetry install --only main && cp -au /asset-input/* /asset-output/ && python3 -m pip install poetry-plugin-export --upgrade && poetry export -f requirements.txt --output /asset-output/requirements.txt --without-hashes && poetry run pip install -r /asset-output/requirements.txt -t /asset-output && poetry run pip install --no-deps -t /asset-output dist/*.whl && find /asset-output | grep -E "(/__pycache__$|.pyc$|.pyo$|.coverage$)" | xargs rm -rf && rm -fr /asset-output/requirements.txt`
            ])
        );
    });

    it('should generate the following commands for a local build', () => {
        const localBuild = (bundlerAssetOption as any).localBuild;
        expect(JSON.stringify(localBuild.bundle(stack, fakeModule, 'fake-output-dir'))).toBe(
            JSON.stringify([
                'cd fake-module',
                'echo "Executing unit tests"',
                'python3 -m venv .venv-test',
                'source .venv-test/bin/activate',
                'pip install poetry',
                'poetry install',
                'poetry run pytest --cov --cov-report=term-missing',
                'deactivate',
                'echo local bundling fake-module',
                'cd fake-module',
                'rm -fr .venv*',
                'rm -fr dist',
                'rm -fr coverage',
                'rm -fr .coverage',
                'python3 -m venv .venv',
                '. .venv/bin/activate',
                'python3 -m pip install poetry --upgrade',
                'poetry build',
                'poetry install --only main',
                'cd fake-module',
                'python3 -m pip install poetry poetry-plugin-export --upgrade',
                'poetry export -f requirements.txt --output fake-output-dir/requirements.txt --without-hashes',
                'poetry run pip install -r fake-output-dir/requirements.txt -t fake-output-dir',
                'poetry run pip install --no-deps -t fake-output-dir dist/*.whl',
                'deactivate',
                'find fake-output-dir | grep -E "(/__pycache__$|.pyc$|.pyo$|.coverage$|dist$|.venv*$)" | xargs rm -rf',
                'rm -fr fake-output-dir/requirements.txt'
            ])
        );
    });
});
