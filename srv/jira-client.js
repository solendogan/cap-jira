const axios = require("axios");
const cds = require("@sap/cds");
require("dotenv").config();

class JiraClient {
  constructor() {
    this.destinationName = process.env.JIRA_DESTINATION_NAME || "jira";
    this.useDestination = process.env.USE_DESTINATION === "true" || process.env.NODE_ENV === "production";
    
    // Fallback configuration for local development
    this.fallbackConfig = {
      baseURL: process.env.JIRA_BASE_URL || "https://sanofi.atlassian.net",
      timeout: 30000,
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${process.env.JIRA_USERNAME}:${process.env.JIRA_API_TOKEN}`
        ).toString("base64")}`,
        Accept: "application/json"
      },
    };

    this.api = null;
    this.initializeClient();
  }

  async initializeClient() {
    if (this.useDestination) {
      try {
        // Use SAP Destination Service with OAuth support
        const { destination } = cds.env.requires;
        if (destination) {
          const destinationService = await cds.connect.to('destination');
          const jiraDestination = await destinationService.getDestination(this.destinationName);
          
          console.log("Destination configuration:", {
            url: jiraDestination.destinationConfiguration.URL,
            auth: jiraDestination.destinationConfiguration.Authentication
          });
          
          // For OAuth destinations, use the destination service's axios instance
          // which automatically handles OAuth token management
          if (jiraDestination.destinationConfiguration.Authentication?.includes('OAuth')) {
            // Create axios instance that leverages destination service OAuth handling
            this.api = axios.create({
              baseURL: jiraDestination.destinationConfiguration.URL,
              timeout: 30000,
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
              },
            });
            
            // Set up interceptor to use destination service for OAuth requests
            this.api.interceptors.request.use(async (config) => {
              try {
                // Get fresh destination with OAuth token
                const freshDestination = await destinationService.getDestination(this.destinationName);
                if (freshDestination.authTokens && freshDestination.authTokens.length > 0) {
                  const token = freshDestination.authTokens[0];
                  config.headers.Authorization = `${token.type} ${token.value}`;
                }
                return config;
              } catch (error) {
                console.error("Failed to get OAuth token from destination:", error);
                return config;
              }
            });
          } else {
            // Basic authentication
            this.api = axios.create({
              baseURL: jiraDestination.destinationConfiguration.URL,
              timeout: 30000,
              headers: {
                ...this.getAuthHeaders(jiraDestination),
                Accept: "application/json",
                "Content-Type": "application/json",
              },
            });
          }
        } else {
          console.warn("Destination service not configured, falling back to environment variables");
          this.api = axios.create(this.fallbackConfig);
        }
      } catch (error) {
        console.error("Failed to initialize destination-based client:", error.message);
        console.warn("Falling back to environment variable configuration");
        this.api = axios.create(this.fallbackConfig);
      }
    } else {
      // Use environment variables for local development
      this.api = axios.create(this.fallbackConfig);
    }
  }

  getAuthHeaders(destination) {
    const config = destination.destinationConfiguration;
    const headers = {};
    
    if (config.Authentication === "BasicAuthentication") {
      const auth = Buffer.from(`${config.User}:${config.Password}`).toString("base64");
      headers.Authorization = `Basic ${auth}`;
    } else if (config.Authentication === "OAuth2SAMLBearerAssertion" || 
               config.Authentication === "OAuth2ClientCredentials" ||
               config.Authentication === "OAuth2UserTokenExchange") {
      // For OAuth authentication, the destination service handles the token automatically
      // We don't need to set Authorization header manually as it's handled by the destination service
      console.log("Using OAuth authentication via destination service");
    }
    
    return headers;
  }

  async ensureInitialized() {
    if (!this.api) {
      await this.initializeClient();
    }
  }

  async testConnection() {
    try {
      await this.ensureInitialized();
      
      // Debug environment variables
      console.log("Environment debug:");
      console.log("JIRA_BASE_URL:", process.env.JIRA_BASE_URL);
      console.log("JIRA_USERNAME:", process.env.JIRA_USERNAME);
      console.log("JIRA_API_TOKEN length:", process.env.JIRA_API_TOKEN?.length || 0);
      console.log("NODE_ENV:", process.env.NODE_ENV);
      
      console.log("Testing JIRA connection with axios...");
      
      // Use axios to test the connection
      const response = await this.api.get('/rest/api/3/myself');
      
      console.log("Connection test successful with axios!");
      
      return {
        success: true,
        user: response.data.displayName,
        email: response.data.emailAddress,
        destinationUsed: this.useDestination,
        destinationName: this.useDestination ? this.destinationName : "environment variables"
      };
    } catch (error) {
      console.log("Connection test failed:", error.message);
      
      return {
        success: false,
        error: error.message,
        destinationUsed: this.useDestination,
        destinationName: this.useDestination ? this.destinationName : "environment variables"
      };
    }
  }

  async getProjects() {
    try {
      await this.ensureInitialized();
      const response = await this.api.get("/rest/api/3/project");
      return {
        success: true,
        data: response.data.map((project) => ({
          jiraKey: project.key,
          name: project.name,
          description: project.description || "",
          projectType: project.projectTypeKey,
          lead: project.lead?.displayName || "",
        })),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status,
      };
    }
  }

  async searchIssues(jql = "") {
    try {
      await this.ensureInitialized();
      const response = await this.api.get(
        `/rest/api/3/search?jql=${encodeURIComponent(jql)}`
      );
      return {
        success: true,
        data: response.data.issues.map((issue) => this.mapJiraIssue(issue)),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status,
      };
    }
  }

  async searchByJQL(jql = "") {
    try {
      await this.ensureInitialized();
      const params = new URLSearchParams({
        jql: jql,
      });

      const response = await this.api.get(`/rest/api/3/search?${params}`);

      return {
        success: true,
        data: {
          issues: response.data.issues.map((issue) => this.mapJiraIssue(issue)),
          total: response.data.total,
          isLast:
            response.data.startAt + response.data.maxResults >=
            response.data.total,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status,
      };
    }
  }

  async getIssue(issueKey) {
    try {
      await this.ensureInitialized();
      const response = await this.api.get(`/rest/api/3/issue/${issueKey}`);
      return {
        success: true,
        data: this.mapJiraIssue(response.data),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status,
      };
    }
  }

  async getAbapOpenIssues() {
    try {
      await this.ensureInitialized();
      // JQL to get open ABAP issues assigned to specific users, with exclusions
      const jql = `assignee IN (712020:c1db29d7-8dee-4163-91cc-8fa4cb2837eb, 63dce551614cb4ba53001678, 557058:afccb85b-0dcc-4fee-971c-af6bf9067bf7, 63c825b10385ff0c65469949, 5eec6415a228c50ab94c350b, 712020:da8104df-9dac-414a-a369-5a44ef5015e3, 5fb64810facfd60076ad4e0b, 6398260ffbf54baf29036d2a, 712020:5ef25df8-21f3-4be7-8127-59146eb0f2af, 712020:db10cee4-f448-4443-baf2-14fb88436c7c, 712020:9616c79b-8b48-4e05-ac27-e017434ce8ac) AND status = "In Progress"
      AND project != ISHPM
      AND key != ISHCHCMP-10451
      AND key != ISHCHCMP-10452
      AND key != ISHSINGTMS-996
      AND key != ISHSINGTMS-998
      AND key != ISHSINGTMS-1004
      AND key != ISHSINGTMS-1006
      AND key != ROLATAMP0G-3791
      AND key != ROLATAMP0G-3793 AND "Sub-Task Category[Dropdown]" not in ("Build & UT")
      ORDER BY assignee ASC, project ASC, created DESC`;

      console.log("Fetching my open ABAP issues with JQL:", jql);

      // Use the existing searchByJQL method
      return await this.searchByJQL(jql);
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status,
      };
    }
  }

  async getMyOpenIssues() {
    try {
      await this.ensureInitialized();
      // JQL to get open issues assigned to current user
      const jql =
        "assignee = currentUser() AND status not in (Done, Closed, Resolved)";

      console.log("Fetching my open issues with JQL:", jql);

      // Use the existing searchByJQL method
      return await this.searchByJQL(jql);
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status,
      };
    }
  }

  mapJiraIssue(jiraIssue) {
    return {
      jiraKey: jiraIssue.key,
      summary: jiraIssue.fields.summary,
      description:
        jiraIssue.fields.description?.content?.[0]?.content?.[0]?.text || "",
      issueType: jiraIssue.fields.issuetype?.name,
      status: jiraIssue.fields.status?.name,
      priority: jiraIssue.fields.priority?.name,
      assignee: jiraIssue.fields.assignee?.displayName,
      reporter: jiraIssue.fields.reporter?.displayName,
      project: jiraIssue.fields.project?.key,
      created: jiraIssue.fields.created,
      updated: jiraIssue.fields.updated,
    };
  }
}

module.exports = JiraClient;
