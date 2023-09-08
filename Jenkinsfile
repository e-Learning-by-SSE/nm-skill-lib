@Library('web-service-helper-lib') _

pipeline {
    agent {
        label 'docker && maven'
    }

    environment {
        API_VERSION = packageJson.getVersion()
    }

    options {
        ansiColor('xterm')
    }

    stages {
        stage("Starting NodeJS Build") {
            agent {
                docker {
                    image 'node:18-bullseye'
                    reuseNode true
                    label 'docker'
                    args '--tmpfs /.cache -u root -v /var/run/docker.sock:/var/run/docker.sock '
                }
            }
            stages {
                stage("Prepare Build env") {
                    steps {
                        sh 'rm -rf output/'
                        sh 'rm -rf src/output/'
                        sh 'npm install'
                        sh 'apt update'
                        sh 'apt install -y docker.io'
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
                                healthyTarget: [methodCoverage: 70, conditionalCoverage: 80, statementCoverage: 80],   // optional, default is: method=70, conditional=80, statement=80
                                unhealthyTarget: [methodCoverage: 50, conditionalCoverage: 50, statementCoverage: 50], // optional, default is none
                                failingTarget: [methodCoverage: 0, conditionalCoverage: 0, statementCoverage: 0]       // optional, default is none
                            ])
                            junit 'output/test/junit*.xml'
                        }
                    }
                }
            }
        }
    }
}
