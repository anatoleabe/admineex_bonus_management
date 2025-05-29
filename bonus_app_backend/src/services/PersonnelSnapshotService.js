const axios = require("axios");
const dotenv = require("dotenv");
const PersonnelSnapshot = require("../models/PersonnelSnapshot");
const { ApiError, handleAxiosError } = require("../utils/ApiError"); // Assuming ApiError utility exists
const httpStatus = require("http-status");

dotenv.config();

const MAIN_APP_API_BASE_URL = process.env.MAIN_APP_API_BASE_URL;
const MAIN_APP_API_EMAIL = process.env.MAIN_APP_API_EMAIL;
const MAIN_APP_API_PASSWORD = process.env.MAIN_APP_API_PASSWORD;

let authToken = null;
let tokenExpiry = null;

/**
 * Gets an authentication token from the main application.
 * Handles caching and refreshing the token.
 * @returns {Promise<string>} The Bearer token.
 */
const getAuthToken = async () => {
    if (authToken && tokenExpiry && tokenExpiry > Date.now()) {
        return authToken;
    }

    try {
        console.log(`Attempting to authenticate with ${MAIN_APP_API_BASE_URL}/api/account/signin`);
        const response = await axios.post(`${MAIN_APP_API_BASE_URL}/api/account/signin`, {
            email: MAIN_APP_API_EMAIL,
            password: MAIN_APP_API_PASSWORD,
        });

        if (response.data && response.data.token) {
            authToken = response.data.token;
            // Set expiry slightly before actual expiry if known, otherwise cache for a fixed duration (e.g., 55 mins)
            tokenExpiry = Date.now() + 55 * 60 * 1000; 
            console.log("Successfully obtained auth token.");
            return authToken;
        } else {
            throw new Error("Authentication failed: No token received.");
        }
    } catch (error) {
        console.error("Error obtaining auth token:", error.message);
        authToken = null;
        tokenExpiry = null;
        // Rethrow a more specific error if needed, or handle based on error type
        throw new ApiError(httpStatus.UNAUTHORIZED, "Failed to authenticate with main application", true, error.stack);
    }
};

/**
 * Creates an Axios instance with the authorization header.
 * @returns {Promise<axios.AxiosInstance>} Axios instance with Bearer token.
 */
const createApiClient = async () => {
    const token = await getAuthToken();
    return axios.create({
        baseURL: MAIN_APP_API_BASE_URL,
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
};

// --- Data Fetching Functions ---

const fetchPersonnelData = async (apiClient, personnelId) => {
    try {
        const response = await apiClient.get(`/api/personnel/read/${personnelId}/false`); // Assuming /read/:id/:beautify based on routes.json
        return response.data;
    } catch (error) {
        handleAxiosError(error, `fetch personnel data for ID ${personnelId}`);
    }
};

const fetchActiveAffectation = async (apiClient, personnelId, date) => {
    try {
        // routes.json shows /api/affectations/:limit/:skip/:search/:filters
        // Need clarification if a specific endpoint exists for active affectation by date
        // Assuming a hypothetical endpoint or complex filtering needed on the list endpoint
        // For now, let's assume the contract /api/main/affectations?personnelId=...&date=... is implemented
        const response = await apiClient.get(`/api/affectations`, { 
            params: { personnelId, date } // Using the defined contract
        });
        // Assuming the API returns a single object or null/empty if not found
        return response.data;
    } catch (error) {
        handleAxiosError(error, `fetch active affectation for personnel ${personnelId} on ${date}`);
    }
};

const fetchPositionData = async (apiClient, positionId) => {
    if (!positionId) return null;
    try {
        const response = await apiClient.get(`/api/positions/read/${positionId}`); // Based on routes.json
        return response.data;
    } catch (error) {
        handleAxiosError(error, `fetch position data for ID ${positionId}`);
    }
};

const fetchStructureData = async (apiClient, structureId) => {
    if (!structureId) return null;
    try {
        const response = await apiClient.get(`/api/structures/read/${structureId}`); // Based on routes.json
        return response.data;
    } catch (error) {
        handleAxiosError(error, `fetch structure data for ID ${structureId}`);
    }
};

const fetchActiveSanctions = async (apiClient, personnelId, date) => {
    try {
        // routes.json shows /api/sanctions/:limit/:skip/:search/:filters
        // Need clarification if a specific endpoint exists for active sanctions by date
        // Assuming the contract /api/main/sanctions?personnelId=...&date=... is implemented
        const response = await apiClient.get(`/api/sanctions`, { 
             params: { personnelId, date } // Using the defined contract
        });
        // Assuming the API returns an array
        return response.data || [];
    } catch (error) {
        handleAxiosError(error, `fetch active sanctions for personnel ${personnelId} on ${date}`);
    }
};

// --- Service Methods ---

/**
 * Creates a personnel snapshot by fetching data from the main application.
 * @param {string} personnelId - The ID of the personnel.
 * @param {Date} snapshotDate - The date for the snapshot.
 * @returns {Promise<PersonnelSnapshot>} The created snapshot document.
 */
const createSnapshot = async (personnelId, snapshotDate) => {
    const apiClient = await createApiClient();
    const isoDate = snapshotDate.toISOString().split('T')[0]; // Format date as YYYY-MM-DD for API calls

    // Fetch all required data concurrently
    const [personnelData, affectationData, sanctionsData] = await Promise.all([
        fetchPersonnelData(apiClient, personnelId),
        fetchActiveAffectation(apiClient, personnelId, isoDate),
        fetchActiveSanctions(apiClient, personnelId, isoDate),
    ]);

    if (!personnelData) {
        throw new ApiError(httpStatus.NOT_FOUND, `Personnel with ID ${personnelId} not found in main application.`);
    }

    let positionData = null;
    let structureData = null;
    if (affectationData && affectationData.positionId) {
        positionData = await fetchPositionData(apiClient, affectationData.positionId);
        if (positionData && positionData.structureId) {
            structureData = await fetchStructureData(apiClient, positionData.structureId);
        }
    }

    // Assemble the snapshot data object
    const snapshotDataObject = {
        grade: personnelData.grade,
        category: personnelData.category,
        rank: affectationData ? affectationData.rank : null,
        index: personnelData.index, // Assuming 'index' comes from personnelData
        status: personnelData.status,
        salary: personnelData.salary,
        position: {
            id: positionData ? positionData._id : null,
            code: positionData ? positionData.code : null,
            structureId: structureData ? structureData._id : null,
            structureCode: structureData ? structureData.code : null,
            structureName: structureData ? (structureData.en || structureData.fr || structureData.name) : null, // Adapt based on actual structure fields
        },
        sanctions: sanctionsData.map(s => ({ // Map to the expected sub-schema structure
            type: s.type,
            nature: s.nature,
            startDate: s.startDate,
            endDate: s.endDate,
        })),
        customAttributes: { ...personnelData.customAttributes }, // Include any other relevant fields
    };

    // Create and save the snapshot
    const snapshot = new PersonnelSnapshot({
        personnelId,
        snapshotDate,
        data: snapshotDataObject,
    });

    await snapshot.save();
    console.log(`Snapshot created for personnel ${personnelId} on ${snapshotDate}`);
    return snapshot;
};

/**
 * Gets the latest snapshot for a personnel before or on a specific date.
 * @param {string} personnelId
 * @param {Date} date
 * @returns {Promise<PersonnelSnapshot|null>}
 */
const getLatestSnapshot = async (personnelId, date) => {
    return PersonnelSnapshot.findOne({
        personnelId,
        snapshotDate: { $lte: date },
    }).sort({ snapshotDate: -1 });
};

/**
 * Gets a snapshot by its ID.
 * @param {string} snapshotId
 * @returns {Promise<PersonnelSnapshot|null>}
 */
const getSnapshotById = async (snapshotId) => {
    return PersonnelSnapshot.findById(snapshotId);
};

module.exports = {
    createSnapshot,
    getLatestSnapshot,
    getSnapshotById,
    // Potentially add bulk creation method later
};
