/**
 * @module System
 *
 * @requires lib/check
 * @requires api/Api
 */
import Api from '../api/Api';

/**
 * Handles communication with the configuration endpoint. Can be used to get or set configuration options.
 */
class SystemConfiguration {
    constructor(api = Api.getApi()) {
        this.api = api;

        this._configuration = undefined;
        this._configPromise = null;
    }

    /**
     * Fetches all system configuration settings from the API and caches them so that future
     * calls to this function won't call the API again.
     *
     * @param {boolean=false} ignoreCache If set to true, calls the API regardless of cache status
     * @returns {Promise} Promise that resolves with all the individual configuration options from the api.
     */
    all(ignoreCache) {
        if (this._configPromise === null || ignoreCache === true) {
            this._configPromise = this.api.get('configuration')
                .then(configuration => {
                    this._configuration = configuration;
                    return this._configuration;
                });
        }

        return this._configPromise;
    }

    /**
     * Returns the value of the specified configuration option.
     *
     * This is a convenience method that works exactly the same as calling `configuration.all()[name]`.
     *
     * @param key {String}
     * @param {boolean=false} ignoreCache If set to true, calls the API regardless of cache status
     * @returns {Promise}
     */
    get(key, ignoreCache) {
        return this.all(ignoreCache).then(config => {
            if (config.hasOwnProperty(key)) {
                return Promise.resolve(config[key]);
            }

            return Promise.reject(`Unknown config option: ${key}`);
        });
    }


    /**
     * Send a query to the API to change the value of a configuration key to the specified value.
     *
     * @param key {String}
     * @param value {String|null}
     * @returns {Promise}
     */
    set(key, value) {
        const that = this;
        let req;

        if (key === 'systemId') {
            return Promise.reject('The system ID can\'t be changed');
        } else if (
            (key === 'feedbackRecipients' || key === 'selfRegistrationOrgUnit' || key === 'selfRegistrationRole') &&
            (value === 'null' || value === null)
        ) {
            // Only valid UIDs are accepted when POST'ing, so we have to use DELETE in stead of POST'ing a null value.
            req = this.api.delete(['configuration', key].join('/'), { dataType: 'text' });
        } else if (key === 'corsWhitelist') {
            // The corsWhitelist endpoint expects an array of URL's, while here value is expected to be a string.
            req = this.api.post(['configuration', key].join('/'), value.trim().split('\n'), { dataType: 'text' });
        } else {
            req = this.api.post(['configuration', key].join('/'), value, {
                dataType: 'text',
                contentType: 'text/plain',
            });
        }

        return req
            .then(() => {
                // Ideally we'd update the cache here, but doing so requires another trip to the server
                // For now, just bust the cache to ensure it's not incorrect
                that._configuration = undefined;
                return Promise.resolve();
            })
            .catch(() => Promise.reject(`No configuration found for ${key}`));
    }
}

export default SystemConfiguration;
