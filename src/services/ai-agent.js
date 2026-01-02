const axios = require('axios');
const nconf = require('nconf');

// Load configuration for ai-agent
const config = nconf.get('ai-agent') || {};
const baseURL = config.endPoint;

// Create axios instance with default headers
const apiClient = axios.create({
    baseURL,
    headers: {
        'Content-Type': 'application/json',
        // Add any default headers you need here
        // 'Authorization': `Bearer ${config.apiKey || ''}`
    }
});

const AiAgentService = {

    // POST (Create)
    async post(path = '', data = {}, options = {}) {
        try {
            const response = await apiClient.post(path, data, options);
            return response.data;
        } catch (error) {
            throw handleError(error);
        }
    },

    // GET (Read)
    async get(path = '', options = {}) {
        try {
            const response = await apiClient.get(path, options);
            return response.data;
        } catch (error) {
            throw handleError(error);
        }
    },

    // PUT (Replace)
    async put(path = '', data = {}, options = {}) {
        try {
            const response = await apiClient.put(path, data, options);
            return response.data;
        } catch (error) {
            throw handleError(error);
        }
    },

    // PATCH (Partial Update)
    async patch(path = '', data = {}, options = {}) {
        try {
            const response = await apiClient.patch(path, data, options);
            return response.data;
        } catch (error) {
            throw handleError(error);
        }
    },

    // DELETE
    async delete(path = '', options = {}) {
        try {
            const response = await apiClient.delete(path, options);
            return response.data;
        } catch (error) {
            throw handleError(error);
        }
    }
};

// Error handling
function handleError(error) {
    if (error.response) {
        return new Error(`Request failed with status ${error.response.status}: ${error.response.data?.message || error.message}`);
    } else if (error.request) {
        return new Error('No response received from ai-agent microservice');
    } else {
        return new Error(`Error in request setup: ${error.message}`);
    }
}

module.exports = AiAgentService;
