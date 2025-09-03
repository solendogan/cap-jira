const axios = require("axios");
require("dotenv").config();

class JiraClient {
  constructor() {
    this.config = {
      baseURL: process.env.JIRA_BASE_URL || "https://sanofi.atlassian.net",
      timeout: 30000,
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${process.env.JIRA_USERNAME}:${process.env.JIRA_API_TOKEN}`
        ).toString("base64")}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Cache-Control": "max-age=0",
      },
    };

    this.api = axios.create(this.config);
  }

  async testConnection() {
    try {
      const response = await this.api.get("/rest/api/3/myself");
      return {
        success: true,
        user: response.data.displayName,
        email: response.data.emailAddress,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status,
      };
    }
  }

  async getProjects() {
    try {
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
      AND key != ROLATAMP0G-3793 AND "Sub-Task Category[Dropdown]" not in ("Build %26 UT")
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
