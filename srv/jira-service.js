const cds = require('@sap/cds');
const JiraClient = require('./jira-client');

class JiraService extends cds.ApplicationService {

  async init() {

    // Initialize JIRA client
    this.jiraClient = new JiraClient();

    // Register action handlers
    this.on('syncIssues', this.syncIssues);
    this.on('getIssueByKey', this.getIssueByKey);
    this.on('searchIssues', this.searchIssues);
    this.on('searchByJQL', this.searchByJQL);
    this.on('getMyOpenIssues', this.getMyOpenIssues);
    this.on('createIssue', this.createIssue);
    this.on('updateIssue', this.updateIssue);
    this.on('testConnection', this.testConnection);
    this.on('getProjects', this.getProjects);
    // Register entity handlers
    this.on('READ', 'Issues', this.readIssues);
    this.on('READ', 'Projects', this.readProjects);
    this.on('READ', 'Users', this.readUsers);

    return super.init();
  }


  async testConnection() {
    try {
      console.log('Testing JIRA connection...');
      const result = await this.jiraClient.testConnection();
      if (result.success) {
        console.log('Connection test successful:', result.user);
        return `Connection successful. Logged in as: ${result.user}`;
      } else {
        console.error('Connection test failed:', result.error);
        throw new Error(`Connection failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Connection test error:', error.message);
      throw new Error(`Connection failed: ${error.message}`);
    }
  }

  async getProjects() {
    try {
      console.log('Fetching projects from JIRA...');
      const result = await this.jiraClient.getProjects();
      if (result.success) {
        console.log(`Successfully fetched ${result.data.length} projects`);
        return result.data;
      } else {
        console.error('Failed to fetch projects:', result.error);
        throw new Error(`Failed to fetch projects: ${result.error}`);
      }
    } catch (error) {
      console.error('Error in getProjects:', error.message);
      throw new Error(`Failed to fetch projects: ${error.message}`);
    }
  }

  async getIssueByKey(req) {
    const { jiraKey } = req.data;

    try {
      const result = await this.jiraClient.getIssue(jiraKey);
      if (result.success) {
        return result.data;
      } else {
        throw new Error(`Failed to fetch issue: ${result.error}`);
      }
    } catch (error) {
      console.error(`Error fetching issue ${jiraKey}:`, error.message);
      throw new Error(`Failed to fetch issue: ${error.message}`);
    }
  }

  async searchIssues(req) {
    const { jql } = req.data;

    try {
      const result = await this.jiraClient.searchIssues(jql);
      if (result.success) {
        return result.data;
      } else {
        throw new Error(`Failed to search issues: ${result.error}`);
      }
    } catch (error) {
      console.error('Error searching issues:', error.message);
      throw new Error(`Failed to search issues: ${error.message}`);
    }
  }

  async searchByJQL(req) {
    const { jql, maxResults = 50, startAt = 0 } = req.data;

    console.log(`Searching JIRA with JQL: "${jql}", maxResults: ${maxResults}, startAt: ${startAt}`);

    try {
      const result = await this.jiraClient.searchByJQL(jql, maxResults, startAt);
      if (result.success) {
        console.log(`Search successful: found ${result.data.total} total issues, returning ${result.data.issues.length} issues`);
        // Return as JSON string since CDS action returns String
        return JSON.stringify({
          issues: result.data.issues,
          total: result.data.total,
          isLast: result.data.isLast,
          hasMore: !result.data.isLast
        });
      } else {
        throw new Error(`Failed to search issues: ${result.error}`);
      }
    } catch (error) {
      console.error('Error in advanced search:', error.message);
      throw new Error(`Failed to search issues: ${error.message}`);
    }
  }

  async getMyOpenIssues(req) {
    // For functions, parameters come in req.data for actions or directly in req for functions
    // const maxResults = req.maxResults || req.data?.maxResults || 50;
    // const startAt = req.startAt || req.data?.startAt || 0;

    console.log(`Fetching my open issues`);

    try {
      const result = await this.jiraClient.getMyOpenIssues();
      if (result.success) {
        console.log(`Found ${result.data.total} total open issues assigned to current user, returning ${result.data.issues.length} issues`);
        // Return as JSON string since CDS function returns String
        return JSON.stringify({
          issues: result.data.issues,
          total: result.data.total,
          isLast: result.data.isLast,
          hasMore: !result.data.isLast,
          jqlUsed: 'assignee = currentUser() AND status not in (Done, Closed, Resolved)'
        });
      } else {
        throw new Error(`Failed to fetch my open issues: ${result.error}`);
      }
    } catch (error) {
      console.error('Error fetching my open issues:', error.message);
      throw new Error(`Failed to fetch my open issues: ${error.message}`);
    }
  }

  async syncIssues() {
    try {
      const result = await this.jiraClient.searchIssues('updated >= -1d');
      if (result.success) {
        // Cache the issues
        for (const issue of result.data) {
          await this.cacheIssue(issue);
        }
        return `Successfully synced ${result.data.length} issues`;
      } else {
        throw new Error(`Failed to sync issues: ${result.error}`);
      }
    } catch (error) {
      console.error('Error syncing issues:', error.message);
      throw new Error(`Failed to sync issues: ${error.message}`);
    }
  }

  async createIssue(req) {
    // For now, return a placeholder since create operations need more complex implementation
    return "Create issue functionality not yet implemented";
  }

  async updateIssue(req) {
    // For now, return a placeholder since update operations need more complex implementation
    return "Update issue functionality not yet implemented";
  }

  async readIssues(req) {
    // For READ operations, you can either fetch from cache or live from JIRA
    // This example fetches from cache, but you could implement live fetching
    const { IssueCache } = this.entities;
    return cds.run(SELECT.from(IssueCache));
  }

  async readProjects(req) {
    // Only fetch projects if explicitly requested to avoid startup errors
    try {
      return await this.getProjects();
    } catch (error) {
      console.warn('Could not fetch projects from JIRA:', error.message);
      // Return empty array instead of throwing error to prevent service startup failure
      return [];
    }
  }

  async readUsers(req) {
    // Return empty array for now - user fetching can be implemented later
    return [];
  }

  async cacheIssue(issue) {
    const { IssueCache } = this.entities;

    await cds.run(
      UPSERT.into(IssueCache).entries({
        jiraKey: issue.jiraKey,
        summary: issue.summary,
        status: issue.status,
        lastSync: new Date(),
        rawData: JSON.stringify(issue)
      })
    );
  }
}

module.exports = JiraService;
