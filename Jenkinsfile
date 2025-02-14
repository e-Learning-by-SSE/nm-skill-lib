@Library('web-service-helper-lib') _

pipeline {
    agent {
        docker {
            image 'node:20-bullseye'
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
                    // Test Results
                    junit 'output/test/junit*.xml'
                    
                    // New Coverage Tool: Cobertura + Coverage Plugin
                    recordCoverage qualityGates: [[metric: 'LINE', threshold: 72.0], [metric: 'BRANCH', threshold: 64.0]], tools: [[parser: 'COBERTURA', pattern: 'output/test/coverage/cobertura-coverage.xml'], [parser: 'JUNIT', pattern: 'output/test/junit*.xml']]
                }
            }
        }

        stage('Publish NPM Package') {
            steps {
                sh 'npm run dist'
                npmPublish('e-learning-by-sse')
            }
        }
    }
}
