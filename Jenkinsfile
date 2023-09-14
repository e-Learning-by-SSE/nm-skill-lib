@Library('web-service-helper-lib') _

pipeline {
    agent {
        docker {
            image 'node:18-bullseye'
            reuseNode true
            label 'docker'
            args '--tmpfs /.cache -v $HOME/.npm:/.npm'
        }
    }

    options {
        ansiColor('xterm')
    }

    stages {
        stage("Prepare Build env") {
            steps {
                sh 'rm -rf output/'
                sh 'rm -rf src/output/'
                sh 'npm ci --force'
            }
        }

        stage('Build and Lint') {
            steps {
                sh 'npm run build:jenkins'
                warnError('Linting failed') {
                    sh 'npm run lint:ci'
                }
            }
        }

        stage('Test') {
            steps {
                sh 'npm run test:jenkins'
            }
            post {
                success {
                    step([
                        $class: 'CloverPublisher',
                        cloverReportDir: 'output/test/coverage/',
                        cloverReportFileName: 'clover.xml',
                        healthyTarget: [methodCoverage: 70, conditionalCoverage: 80, statementCoverage: 80],
                        unhealthyTarget: [methodCoverage: 50, conditionalCoverage: 50, statementCoverage: 50],
                        failingTarget: [methodCoverage: 0, conditionalCoverage: 0, statementCoverage: 0]
                    ])
                    junit 'output/test/junit*.xml'
                }
            }
        }
    }
}
