const axios = require('axios');
require('dotenv').config();

class JiraClient {
  constructor() {
    this.config = {
      baseURL: process.env.JIRA_BASE_URL || 'https://sanofi.atlassian.net',
      timeout: 30000,
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.JIRA_USERNAME}:${process.env.JIRA_API_TOKEN}`).toString('base64')}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0'
      }
    };

    this.api = axios.create(this.config);
  }

  async testConnection() {
    try {
      const response = await this.api.get('/rest/api/2/myself');
      return {
        success: true,
        user: response.data.displayName,
        email: response.data.emailAddress
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status
      };
    }
  }

  async getProjects() {
    try {
      const response = await this.api.get('/rest/api/2/project');
      return {
        success: true,
        data: response.data.map(project => ({
          jiraKey: project.key,
          name: project.name,
          description: project.description || '',
          projectType: project.projectTypeKey,
          lead: project.lead?.displayName || ''
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status
      };
    }
  }

  async searchIssues(jql = '') {
    try {
      const response = await this.api.get(`/rest/api/2/search?jql=${encodeURIComponent(jql)}`);
      return {
        success: true,
        data: response.data.issues.map(issue => this.mapJiraIssue(issue))
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status
      };
    }
  }

  async searchByJQL(jql = '') {
    try {
      const params = new URLSearchParams({
        jql: jql
      });

      const response = await this.api.get(`/rest/api/2/search?${params}`);

      return {
        success: true,
        data: {
          issues: response.data.issues.map(issue => this.mapJiraIssue(issue)),
          total: response.data.total,
          isLast: response.data.startAt + response.data.maxResults >= response.data.total
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status
      };
    }
  }

  async getIssue(issueKey) {
    try {
      const response = await this.api.get(`/rest/api/2/issue/${issueKey}`);
      return {
        success: true,
        data: this.mapJiraIssue(response.data)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status
      };
    }
  }





  async getMyOpenIssues() {
    try {
      // JQL to get open issues assigned to current user
      const jql = 'assignee = currentUser() AND status not in (Done, Closed, Resolved)';

      console.log('Fetching my open issues with JQL:', jql);

      // Use the existing searchByJQL method
      return await this.searchByJQL(jql);
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status
      };
    }
  }


  mapJiraIssue(jiraIssue) {
    return {
      jiraKey: jiraIssue.key,
      summary: jiraIssue.fields.summary,
      description: jiraIssue.fields.description?.content?.[0]?.content?.[0]?.text || '',
      issueType: jiraIssue.fields.issuetype?.name,
      status: jiraIssue.fields.status?.name,
      priority: jiraIssue.fields.priority?.name,
      assignee: jiraIssue.fields.assignee?.displayName,
      reporter: jiraIssue.fields.reporter?.displayName,
      project: jiraIssue.fields.project?.key,
      created: jiraIssue.fields.created,
      updated: jiraIssue.fields.updated
    };
  }
}

module.exports = JiraClient;
