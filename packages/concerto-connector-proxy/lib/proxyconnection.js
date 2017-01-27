/*
 * IBM Confidential
 * OCO Source Materials
 * IBM Concerto - Blockchain Solution Framework
 * Copyright IBM Corp. 2016
 * The source code for this program is not published or otherwise
 * divested of its trade secrets, irrespective of what has
 * been deposited with the U.S. Copyright Office.
 */

'use strict';

const Connection = require('@ibm/concerto-common').Connection;
const inflaterr = require('./proxyutil').inflaterr;
const ProxySecurityContext = require('./proxysecuritycontext');

/**
 * Base class representing a connection to a business network.
 * @protected
 * @abstract
 */
class ProxyConnection extends Connection {

    /**
     * Constructor.
     * @param {ConnectionManager} connectionManager The owning connection manager.
     * @param {string} connectionProfile The name of the connection profile associated with this connection
     * @param {string} businessNetworkIdentifier The identifier of the business network for this connection
     * @param {object} socket The connected socket.io client to use.
     * @param {string} connectionID The connection ID.
     */
    constructor(connectionManager, connectionProfile, businessNetworkIdentifier, socket, connectionID) {
        super(connectionManager, connectionProfile, businessNetworkIdentifier);
        this.socket = socket;
        this.connectionID = connectionID;
    }

    /**
     * Terminate the connection to the business network.
     * @return {Promise} A promise that is resolved once the connection has been
     * terminated, or rejected with an error.
     */
    disconnect() {
        return new Promise((resolve, reject) => {
            this.socket.emit('/api/connectionDisconnect', this.connectionID, (error) => {
                if (error) {
                    return reject(inflaterr(error));
                }
                resolve();
            });
        });
    }

    /**
     * Login as a participant on the business network.
     * @param {string} enrollmentID The enrollment ID of the participant.
     * @param {string} enrollmentSecret The enrollment secret of the participant.
     * @return {Promise} A promise that is resolved with a {@link SecurityContext}
     * object representing the logged in participant, or rejected with a login error.
     */
    login(enrollmentID, enrollmentSecret) {
        return new Promise((resolve, reject) => {
            this.socket.emit('/api/connectionLogin', this.connectionID, enrollmentID, enrollmentSecret, (error, securityContextID) => {
                if (error) {
                    return reject(inflaterr(error));
                }
                let securityContext = new ProxySecurityContext(this, securityContextID);
                resolve(securityContext);
            });
        });
    }

    /**
     * Deploy a business network definition.
     * @param {SecurityContext} securityContext The participant's security context.
     * @param {boolean} [force] Force the deployment of the business network artifacts.
     * @param {BusinessNetworkDefinition} businessNetworkDefinition The BusinessNetworkDefinition to deploy
     * @return {Promise} A promise that is resolved once the business network
     * artifacts have been deployed, or rejected with an error.
     */
    deploy(securityContext, force, businessNetworkDefinition) {
        return businessNetworkDefinition.toArchive()
            .then((businessNetworkArchive) => {
                return new Promise((resolve, reject) => {
                    this.socket.emit('/api/connectionDeploy', this.connectionID, securityContext.securityContextID, force, businessNetworkArchive.toString('base64'), (error) => {
                        if (error) {
                            return reject(inflaterr(error));
                        }
                        resolve();
                    });
                });
            });
    }

    /**
     * Updates an existing deployed business network definition.
     * @param {SecurityContext} securityContext The participant's security context.
     * @param {BusinessNetworkDefinition} businessNetworkDefinition The BusinessNetworkDefinition to deploy
     * @return {Promise} A promise that is resolved once the business network
     * artifacts have been updated, or rejected with an error.
     */
    update(securityContext, businessNetworkDefinition) {
        return businessNetworkDefinition.toArchive()
            .then((businessNetworkArchive) => {
                return new Promise((resolve, reject) => {
                    this.socket.emit('/api/connectionUpdate', this.connectionID, securityContext.securityContextID, businessNetworkArchive.toString('base64'), (error) => {
                        if (error) {
                            return reject(inflaterr(error));
                        }
                        resolve();
                    });
                });
            });
    }

    /**
     * Undeploy a business network definition.
     * @param {SecurityContext} securityContext The participant's security context.
     * @param {string} businessNetworkIdentifier The identifier of the business network to remove
     * @return {Promise} A promise that is resolved once the business network
     * artifacts have been undeployed, or rejected with an error.
     */
    undeploy(securityContext, businessNetworkIdentifier) {
        return new Promise((resolve, reject) => {
            this.socket.emit('/api/connectionUndeploy', this.connectionID, securityContext.securityContextID, businessNetworkIdentifier, (error) => {
                if (error) {
                    return reject(inflaterr(error));
                }
                resolve();
            });
        });
    }

    /**
     * Test ("ping") the connection to the business network.
     * @param {SecurityContext} securityContext The participant's security context.
     * @return {Promise} A promise that is resolved once the connection to the
     * business network has been tested, or rejected with an error.
     */
    ping(securityContext) {
        return new Promise((resolve, reject) => {
            this.socket.emit('/api/connectionPing', this.connectionID, securityContext.securityContextID, (error, result) => {
                if (error) {
                    return reject(inflaterr(error));
                }
                resolve(result);
            });
        });
    }

    /**
     * Invoke a "query" chaincode function with the specified name and arguments.
     * @param {SecurityContext} securityContext The participant's security context.
     * @param {string} functionName The name of the chaincode function to invoke.
     * @param {string[]} args The arguments to pass to the chaincode function.
     * @return {Promise} A promise that is resolved with the data returned by the
     * chaincode function once it has been invoked, or rejected with an error.
     */
    queryChainCode(securityContext, functionName, args) {
        return new Promise((resolve, reject) => {
            this.socket.emit('/api/connectionQueryChainCode', this.connectionID, securityContext.securityContextID, functionName, args, (error, result) => {
                if (error) {
                    return reject(inflaterr(error));
                }
                resolve(Buffer.from(result));
            });
        });
    }

    /**
     * Invoke a "invoke" chaincode function with the specified name and arguments.
     * @param {SecurityContext} securityContext The participant's security context.
     * @param {string} functionName The name of the chaincode function to invoke.
     * @param {string[]} args The arguments to pass to the chaincode function.
     * @return {Promise} A promise that is resolved once the chaincode function
     * has been invoked, or rejected with an error.
     */
    invokeChainCode(securityContext, functionName, args) {
        return new Promise((resolve, reject) => {
            this.socket.emit('/api/connectionInvokeChainCode', this.connectionID, securityContext.securityContextID, functionName, args, (error) => {
                if (error) {
                    return reject(inflaterr(error));
                }
                resolve();
            });
        });
    }

    /**
     * Create a new identity for the specified user ID.
     * @param {SecurityContext} securityContext The participant's security context.
     * @param {string} userID The user ID.
     * @param {object} [options] Options for the new identity.
     * @param {boolean} [options.issuer] Whether or not the new identity should have
     * permissions to create additional new identities. False by default.
     * @param {string} [options.affiliation] Specify the affiliation for the new
     * identity. Defaults to 'institution_a'.
     * @return {Promise} A promise that is resolved with a generated user
     * secret once the new identity has been created, or rejected with an error.
     */
    createIdentity(securityContext, userID, options) {
        return new Promise((resolve, reject) => {
            this.socket.emit('/api/connectionCreateIdentity', this.connectionID, securityContext.securityContextID, userID, options, (error, result) => {
                if (error) {
                    return reject(inflaterr(error));
                }
                resolve(result);
            });
        });
    }

    /**
     * List all of the deployed business networks. The connection must
     * be connected for this method to succeed.
     * @param {SecurityContext} securityContext The participant's security context.
     * @return {Promise} A promise that will be resolved with an array of
     * business network identifiers, or rejected with an error.
     */
    list(securityContext) {
        return new Promise((resolve, reject) => {
            this.socket.emit('/api/connectionList', this.connectionID, securityContext.securityContextID, (error, result) => {
                if (error) {
                    return reject(inflaterr(error));
                }
                resolve(result);
            });
        });
    }

}

module.exports = ProxyConnection;
